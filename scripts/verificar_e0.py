"""Verifica evidências locais do E0, sem rede, escrita, provedores ou mídia.

Uso: python -B scripts/verificar_e0.py docs/validacao/e0-evidencias.exemplo.json
Python >= 3.11, somente biblioteca padrão. '-' lê JSON de stdin, relativo ao cwd.
Arquivos de evidência são relativos à pasta do JSON e devem permanecer nela.
Saídas: 1 BLOQUEADO; 0 CANDIDATO_A_REVISAO; 2 entrada ilegível/inválida.
Código 0 nunca aprova E0. --agora aceita instante ISO com timezone para replays.
Hashes confirmam integridade local, não autenticidade ou eficácia de proteção.
"""

import argparse
from datetime import datetime, timedelta, timezone
from decimal import Decimal, InvalidOperation
import hashlib
import json
import math
from pathlib import Path
import re
import sys


QUOTAS = {
    "sfu_turn": ("egress_gb",),
    "workers": ("requests_dia", "cpu_ms_por_invocacao"),
    "durable_objects": ("requests_dia", "gb_s_dia", "linhas_lidas_dia",
                        "linhas_escritas_dia", "armazenamento_gb"),
    "supabase": ("db_gb", "egress_gb", "cached_egress_gb", "storage_gb",
                 "mau", "realtime_conexoes", "realtime_mensagens"),
    "github": ("minutos_mes", "artefatos_gb", "cache_gb"),
}
COMPROVACOES = (
    "admissao_fechada_em_falha", "reserva_conservadora_bytes", "termino_remoto",
    "falha_controlador", "cliente_ignora_expulsao", "reconciliacao_autoritativa",
    "fechamento_sem_quota_controlador",
)
ORIGENS = ("documentacao_publica", "observacao_autenticada", "analise_local", "teste_real")


def projetar():
    """Hipótese do plano: GB decimal, 120 h de voz contendo 60 h de tela."""
    voz = Decimal(10 * 9 * 32000 * 120 * 3600) / 8 / 1_000_000_000
    tela = Decimal(9 * (1500000 + 96000) * 60 * 3600) / 8 / 1_000_000_000
    payload = voz + tela
    return {"voz_gb": float(voz), "tela_som_gb": float(tela),
            "payload_gb": float(payload), "com_margem_gb": float(payload * Decimal("1.30"))}


def resultado_base():
    return {
        "status": "BLOQUEADO", "gate_aprovado": False, "pode_iniciar_midia": False,
        "revisao_independente_pendente": True, "pendencias": [],
        "projecao_gb": projetar(),
        "limitacoes": [
            "Validação estrutural offline; não autentica contas, planos ou eficácia do corte.",
            "543,348/706,3524 GB e margem de 30% são hipóteses, não medição nem hard cap.",
            "Flags, origem declarada e SHA-256 não comprovam fatos; o principal revisa as fontes.",
            "Simulação não satisfaz proteção; E0 continua dependente de evidência real e revisão independente.",
            "Nenhuma saída autoriza serviços, mídia, cobrança, aplicação ou passagem do portão.",
        ],
    }


def avaliar(dados, pasta_evidencias, *, agora=None):
    """Retorna pendências; dados estruturalmente completos são só candidatos."""
    resultado = resultado_base()
    pendencias = resultado["pendencias"]
    agora = agora or datetime.now(timezone.utc)
    raiz = Path(pasta_evidencias).resolve()

    def erro(campo, motivo):
        pendencias.append({"campo": campo, "motivo": motivo})

    def objeto(valor, campo):
        if not isinstance(valor, dict):
            erro(campo, "Objeto obrigatório ausente ou inválido.")
            return {}
        return valor

    def texto(valor, campo):
        if not isinstance(valor, str) or not valor.strip():
            erro(campo, "Informe rótulo não secreto ou texto verificável.")
            return False
        return True

    def numero(valor, campo, positivo=False):
        if isinstance(valor, bool) or not isinstance(valor, (int, float, Decimal)):
            erro(campo, "Número finito obrigatório; booleanos e strings não são números.")
            return None
        try:
            valor = Decimal(str(valor))
            if not valor.is_finite() or not math.isfinite(float(valor)) or valor < 0:
                raise ValueError
            if positivo and valor == 0:
                raise ValueError
            return valor
        except (InvalidOperation, ValueError, OverflowError):
            erro(campo, "Número deve ser finito, não negativo e positivo quando exigido.")
            return None

    def instante(valor, campo):
        try:
            data = datetime.fromisoformat(valor)
            if data.utcoffset() is None:
                raise ValueError
            return data
        except (TypeError, ValueError, OverflowError):
            erro(campo, "Use ISO 8601 com timezone explícito.")
            return None

    if not isinstance(agora, datetime) or agora.utcoffset() is None:
        erro("agora", "Instante de avaliação exige timezone.")
        return resultado
    resultado["avaliado_em"] = agora.isoformat()
    dados = objeto(dados, "entrada")
    if type(dados.get("versao")) is not int or dados.get("versao") != 1:
        erro("versao", "Formato suportado: versão inteira 1.")
    if dados.get("estado") != "evidencias_para_revisao":
        erro("estado", "Dados não verificados ou exemplos não podem candidatar o E0.")
    coleta = instante(dados.get("coletado_em"), "coletado_em")
    if coleta and not agora - timedelta(hours=24) <= coleta <= agora:
        erro("coletado_em", "Exige coleta passada nas últimas 24 horas para esta avaliação.")

    fontes = objeto(dados.get("evidencias"), "evidencias")
    validas = {}
    for chave, valor in fontes.items():
        campo = f"evidencias.{chave}"
        inicio_erros = len(pendencias)
        fonte = objeto(valor, campo)
        data = instante(fonte.get("coletado_em"), campo + ".coletado_em")
        if data and (data > agora or (coleta and data > coleta)):
            erro(campo + ".coletado_em", "Evidência futura ou posterior à coleta declarada.")
        if fonte.get("sem_segredos") is not True:
            erro(campo + ".sem_segredos", "Anexe somente evidência sanitizada, sem credenciais.")
        if fonte.get("origem") not in ORIGENS:
            erro(campo + ".origem", "Declare documentação pública, observação autenticada, análise local ou teste real.")
        arquivo = fonte.get("arquivo")
        digest = fonte.get("sha256")
        if not isinstance(digest, str) or not re.fullmatch(r"[a-fA-F0-9]{64}", digest):
            erro(campo + ".sha256", "SHA-256 do arquivo local obrigatório.")
        try:
            if not isinstance(arquivo, str) or not arquivo or ":" in arquivo or arquivo.startswith(("/", "\\")):
                raise ValueError
            caminho = (raiz / arquivo).resolve()
            if not caminho.is_relative_to(raiz) or not caminho.is_file():
                raise ValueError
            if isinstance(digest, str) and hashlib.sha256(caminho.read_bytes()).hexdigest() != digest.lower():
                erro(campo + ".sha256", "Hash não confere com o arquivo local.")
        except (OSError, ValueError, RuntimeError):
            erro(campo + ".arquivo", "Arquivo local ausente ou fora da pasta de evidências; URLs/UNC não são aceitos.")
        if len(pendencias) == inicio_erros:
            validas[chave] = fonte

    def referencia(chave, campo, origem=None):
        fonte = validas.get(chave) if isinstance(chave, str) else None
        if fonte is None:
            erro(campo, "Referência local íntegra obrigatória.")
            return
        if origem and fonte["origem"] != origem:
            erro(campo, f"Exige origem {origem}; estimativa/simulação não substitui evidência real.")
        data = instante(fonte["coletado_em"], campo)
        if origem in ("observacao_autenticada", "teste_real") and data and data < agora - timedelta(hours=24):
            erro(campo, "Observação/teste real deve ter sido coletado nas últimas 24 horas.")

    servicos = objeto(dados.get("servicos"), "servicos")
    egress = {}
    for nome, obrigatorias in QUOTAS.items():
        campo = "servicos." + nome
        servico = objeto(servicos.get(nome), campo)
        for chave in ("conta", "recurso", "plano"):
            texto(servico.get(chave), campo + "." + chave)
        if servico.get("verificado") is not True:
            erro(campo + ".verificado", "Condições da conta ainda não foram verificadas.")
        referencia(servico.get("evidencia"), campo + ".evidencia", "observacao_autenticada")
        if servico.get("pagamento") not in ("sem_metodo", "metodo_cadastrado", "nao_exige"):
            erro(campo + ".pagamento", "Situação de pagamento não verificada.")
        if servico.get("itens_pagos_necessarios") is not False:
            erro(campo + ".itens_pagos_necessarios", "Ausência de itens pagos necessários não comprovada.")
        if nome in ("workers", "durable_objects", "supabase") and str(servico.get("plano", "")).lower() != "free":
            erro(campo + ".plano", "Arquitetura E0 exige plano Free neste serviço.")
        if nome == "durable_objects" and servico.get("armazenamento") != "sqlite":
            erro(campo + ".armazenamento", "Free candidato exige Durable Objects SQLite.")
        if nome == "sfu_turn" and servico.get("elegivel") is not True:
            erro(campo + ".elegivel", "Elegibilidade Realtime SFU/TURN não comprovada.")
        ciclo = objeto(servico.get("ciclo"), campo + ".ciclo")
        inicio = instante(ciclo.get("inicio"), campo + ".ciclo.inicio")
        fim = instante(ciclo.get("fim"), campo + ".ciclo.fim")
        observado = instante(servico.get("observado_em"), campo + ".observado_em")
        if observado and not agora - timedelta(hours=24) <= observado <= agora:
            erro(campo + ".observado_em", "Observação deve estar nas últimas 24 horas; fronteira inclusiva.")
        if inicio and fim:
            if not inicio <= agora < fim:
                erro(campo + ".ciclo", "Ciclo real deve conter o instante avaliado; fim é exclusivo.")
            if observado and (not inicio <= observado < fim or observado > agora or (coleta and observado > coleta)):
                erro(campo + ".observado_em", "Observação deve pertencer ao ciclo, sem estar no futuro.")
            chave_fonte = servico.get("evidencia")
            fonte = validas.get(chave_fonte) if isinstance(chave_fonte, str) else None
            if fonte:
                data_fonte = instante(fonte["coletado_em"], campo + ".evidencia")
                if data_fonte and not inicio <= data_fonte < fim:
                    erro(campo + ".evidencia", "Evidência da conta deve pertencer ao ciclo avaliado.")
                if data_fonte and observado and observado > data_fonte:
                    erro(campo + ".observado_em", "Observação não pode ser posterior à coleta da evidência vinculada.")
        if observado and nome in ("workers", "durable_objects") and observado.astimezone(timezone.utc).date() != agora.astimezone(timezone.utc).date():
            erro(campo + ".observado_em", "Consumo diário deve referir-se ao dia UTC avaliado.")
        local = nome == "github" and servico.get("modo") == "build_local"
        if nome == "github" and servico.get("modo") not in ("actions", "build_local"):
            erro(campo + ".modo", "Escolha Actions comprovado ou build local sem CI hospedada.")
        if nome != "sfu_turn" and not local and servico.get("suspensao_comprovada") is not True:
            erro(campo + ".suspensao_comprovada", "Suspensão sem cobrança/limites não comprovada.")
        quotas = objeto(servico.get("quotas", {} if local else None), campo + ".quotas")
        if not local:
            for chave in obrigatorias:
                if chave not in quotas:
                    erro(campo + ".quotas." + chave, "Quota relevante obrigatória ausente.")
        for chave, quota in quotas.items():
            base = campo + ".quotas." + chave
            quota = objeto(quota, base)
            limite = numero(quota.get("limite"), base + ".limite", True)
            consumo = numero(quota.get("consumo"), base + ".consumo")
            if limite is not None and consumo is not None and consumo >= limite:
                erro(base, "Quota sem margem remanescente; não provocar excedente real.")
            if nome == "sfu_turn" and chave == "egress_gb":
                egress = {"limite": limite, "consumo": consumo}

    orcamento = objeto(dados.get("orcamento"), "orcamento")
    campos = ("franquia_sfu_turn_gb", "operacional_gb", "consumo_agregado_sfu_turn_gb",
              "outros_consumos_previstos_gb", "reserva_seguranca_gb")
    valores = {chave: numero(orcamento.get(chave), "orcamento." + chave,
                            chave in ("franquia_sfu_turn_gb", "operacional_gb", "reserva_seguranca_gb"))
               for chave in campos}
    referencia(orcamento.get("evidencia"), "orcamento.evidencia", "observacao_autenticada")
    if valores["operacional_gb"] is not None and valores["operacional_gb"] > 800:
        erro("orcamento.operacional_gb", "800 GB é teto candidato do plano, não franquia garantida.")
    for chave, origem in (("franquia_sfu_turn_gb", "limite"), ("consumo_agregado_sfu_turn_gb", "consumo")):
        if valores[chave] is not None and valores[chave] != egress.get(origem):
            erro("orcamento." + chave, "Valor deve conferir com SFU/TURN agregado da conta.")

    protecao = objeto(dados.get("protecao_sfu_turn"), "protecao_sfu_turn")
    referencia(protecao.get("evidencia"), "protecao_sfu_turn.evidencia", "observacao_autenticada")
    for chave in ("cobre_sfu_e_turn", "nao_cobra_excedente"):
        if protecao.get(chave) is not True:
            erro("protecao_sfu_turn." + chave, "Proteção cobrindo SFU e TURN sem excedente pago não comprovada.")
    cap = numero(protecao.get("limite_gb"), "protecao_sfu_turn.limite_gb", True)
    if protecao.get("mecanismo") == "hard_cap_provedor":
        referencia(protecao.get("evidencia_condicao"), "protecao_sfu_turn.evidencia_condicao", "documentacao_publica")
    elif protecao.get("mecanismo") == "controlador_aplicacao":
        comprovacoes = objeto(protecao.get("comprovacoes"), "protecao_sfu_turn.comprovacoes")
        for chave in COMPROVACOES:
            referencia(comprovacoes.get(chave), "protecao_sfu_turn.comprovacoes." + chave, "teste_real")
    else:
        erro("protecao_sfu_turn.mecanismo", "Alertas, contadores e estimativa de bitrate não comprovam bloqueio de cobrança.")
    if cap is not None and valores["operacional_gb"] is not None and cap > valores["operacional_gb"]:
        erro("protecao_sfu_turn.limite_gb", "Corte declarado ultrapassa o orçamento operacional.")

    prova = objeto(dados.get("prova"), "prova")
    duracao = numero(prova.get("duracao_minutos"), "prova.duracao_minutos", True)
    reserva = numero(prova.get("reserva_gb"), "prova.reserva_gb", True)
    if duracao is not None and duracao > 15:
        erro("prova.duracao_minutos", "E1 candidato admite até 15 minutos após aprovação E0.")
    texto(prova.get("cancelamento"), "prova.cancelamento")
    referencia(prova.get("evidencia"), "prova.evidencia")
    if all(valor is not None for valor in valores.values()) and reserva is not None and cap is not None:
        saldo = min(valores["operacional_gb"], valores["franquia_sfu_turn_gb"], cap)
        saldo -= valores["consumo_agregado_sfu_turn_gb"] + valores["outros_consumos_previstos_gb"] + valores["reserva_seguranca_gb"]
        necessidade = Decimal(str(resultado["projecao_gb"]["com_margem_gb"])) + reserva
        if math.isfinite(float(saldo)) and math.isfinite(float(necessidade)):
            resultado["orcamento"] = {"saldo_disponivel_gb": float(saldo), "necessidade_ciclo_gb": float(necessidade)}
        else:
            erro("orcamento.saldo_gb", "A soma não cabe em número finito do relatório JSON.")
        if necessidade >= saldo:
            erro("orcamento.saldo_gb", "Projeção mais reserva da prova atinge/excede saldo; fronteira exata bloqueia.")
    if not pendencias:
        resultado["status"] = "CANDIDATO_A_REVISAO"
    return resultado


def json_estrito(conteudo):
    def constante(_):
        raise ValueError("NaN/Infinity não são JSON de evidência válido.")

    def pares(itens):
        dados = {}
        for chave, valor in itens:
            if chave in dados:
                raise ValueError("Chaves JSON duplicadas não são aceitas.")
            dados[chave] = valor
        return dados

    return json.loads(conteudo, parse_float=Decimal, parse_constant=constante, object_pairs_hook=pares)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("entrada", help="JSON local ou '-' para stdin; nunca tokens/credenciais.")
    parser.add_argument("--agora", help="ISO 8601 com timezone para avaliação reprodutível.")
    args = parser.parse_args()
    try:
        if args.entrada.startswith(("\\\\", "//")) or "://" in args.entrada:
            raise ValueError("Entrada deve ser local; rede/URLs não são permitidas.")
        arquivo = Path(args.entrada).resolve() if args.entrada != "-" else None
        raiz = arquivo.parent if arquivo else Path.cwd()
        conteudo = arquivo.read_text(encoding="utf-8-sig") if arquivo else sys.stdin.read()
        agora = datetime.fromisoformat(args.agora) if args.agora else None
        resultado = avaliar(json_estrito(conteudo), raiz, agora=agora)
        codigo = 0 if resultado["status"] == "CANDIDATO_A_REVISAO" else 1
    except (OSError, ValueError, OverflowError, RecursionError):
        resultado = resultado_base()
        resultado["pendencias"].append({"campo": "entrada", "motivo": "JSON/arquivo/instante inválido ou ilegível; nenhuma aprovação."})
        codigo = 2
    print(json.dumps(resultado, indent=2, allow_nan=False))
    return codigo


if __name__ == "__main__":
    sys.exit(main())

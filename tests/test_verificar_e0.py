"""Contratos do E0 local; fixtures sintéticas nunca autorizam ativação."""

from datetime import datetime, timezone
import hashlib
import importlib.util
import json
from pathlib import Path
import subprocess
import sys
import unittest


sys.dont_write_bytecode = True
ROOT = Path(__file__).resolve().parents[1]
SCRIPT = ROOT / "scripts" / "verificar_e0.py"
AGORA = datetime(2026, 10, 14, 12, tzinfo=timezone.utc)
INICIO = "2026-10-01T00:00:00+00:00"
FIM = "2026-11-01T00:00:00+00:00"
COLETA = "2026-10-14T11:00:00+00:00"
QUOTAS = {
    "sfu_turn": ("egress_gb",),
    "workers": ("requests_dia", "cpu_ms_por_invocacao"),
    "durable_objects": ("requests_dia", "gb_s_dia", "linhas_lidas_dia",
                        "linhas_escritas_dia", "armazenamento_gb"),
    "supabase": ("db_gb", "egress_gb", "cached_egress_gb", "storage_gb",
                 "mau", "realtime_conexoes", "realtime_mensagens"),
    "github": ("minutos_mes", "artefatos_gb", "cache_gb"),
}


def fixture_completa():
    """Declarações inventadas apenas para testar o contrato, não contas reais."""
    servicos = {}
    for nome in ("sfu_turn", "workers", "durable_objects", "supabase", "github"):
        servicos[nome] = {
            "conta": "conta-ficticia-unittest",
            "recurso": "recurso-ficticio-unittest",
            "plano": "Free",
            "verificado": True,
            "evidencia": "teste",
            "pagamento": "sem_metodo",
            "itens_pagos_necessarios": False,
            "ciclo": {"inicio": INICIO, "fim": FIM},
            "observado_em": COLETA,
            "quotas": {chave: {"limite": 100, "consumo": 1}
                       for chave in QUOTAS[nome]},
            "suspensao_comprovada": True,
        }
    servicos["sfu_turn"]["elegivel"] = True
    servicos["sfu_turn"]["quotas"]["egress_gb"] = {"limite": 1000, "consumo": 0}
    servicos["durable_objects"]["armazenamento"] = "sqlite"
    servicos["github"]["modo"] = "build_local"
    return {
        "versao": 1,
        "estado": "evidencias_para_revisao",
        "coletado_em": COLETA,
        "evidencias": {
            "teste": {
                "arquivo": Path(__file__).name,
                "sha256": hashlib.sha256(Path(__file__).read_bytes()).hexdigest(),
                "coletado_em": COLETA,
                "sem_segredos": True,
                "origem": "observacao_autenticada",
            }
        },
        "servicos": servicos,
        "orcamento": {
            "franquia_sfu_turn_gb": 1000,
            "operacional_gb": 800,
            "consumo_agregado_sfu_turn_gb": 0,
            "outros_consumos_previstos_gb": 0,
            "reserva_seguranca_gb": 20,
            "evidencia": "teste",
            "evidencia_condicao": "documentacao",
        },
        "protecao_sfu_turn": {
            "mecanismo": "hard_cap_provedor",
            "cobre_sfu_e_turn": True,
            "nao_cobra_excedente": True,
            "limite_gb": 800,
            "evidencia": "teste",
        },
        "prova": {
            "duracao_minutos": 15,
            "reserva_gb": 2,
            "cancelamento": "Cancelar se orçamento ou proteção perder validade.",
            "evidencia": "teste",
        },
    }


def adicionar_proveniencia(dados):
    for chave, origem in (("documentacao", "documentacao_publica"),
                          ("ensaio", "teste_real")):
        dados["evidencias"][chave] = dict(dados["evidencias"]["teste"], origem=origem)
    dados["protecao_sfu_turn"]["evidencia_condicao"] = "documentacao"
    return dados


class VerificacaoE0Tests(unittest.TestCase):
    def carregar(self):
        self.assertTrue(SCRIPT.is_file(), "verificador E0 ainda não implementado")
        spec = importlib.util.spec_from_file_location("verificar_e0", SCRIPT)
        module = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(module)
        return module

    def avaliar(self, dados=None):
        module = self.carregar()
        self.assertTrue(callable(getattr(module, "avaliar", None)),
                        "validação de evidências E0 ainda não implementada")
        return module.avaliar(dados if dados is not None else fixture_completa(),
                              Path(__file__).parent, agora=AGORA)

    def assert_bloqueado(self, dados, campo):
        resultado = self.avaliar(dados)
        self.assertEqual(resultado["status"], "BLOQUEADO")
        self.assertFalse(resultado["gate_aprovado"])
        self.assertTrue(any(item["campo"].startswith(campo)
                            for item in resultado["pendencias"]), resultado)

    def test_reproduz_trafego_decimal_sem_confundir_horas_participantes(self):
        module = self.carregar()
        self.assertTrue(callable(getattr(module, "projetar", None)),
                        "projeção E0 ainda não implementada")
        self.assertEqual(module.projetar(), {
            "voz_gb": 155.52, "tela_som_gb": 387.828,
            "payload_gb": 543.348, "com_margem_gb": 706.3524,
        })

    def test_falta_de_conta_bloqueia_mesmo_com_outros_dados_completos(self):
        dados = fixture_completa()
        dados["servicos"]["sfu_turn"]["conta"] = " "
        self.assert_bloqueado(dados, "servicos.sfu_turn.conta")

    def test_servico_ausente_bloqueia(self):
        dados = fixture_completa()
        del dados["servicos"]["supabase"]
        self.assert_bloqueado(dados, "servicos.supabase")

    def test_somente_alertas_nao_comprovam_protecao_contra_cobranca(self):
        dados = fixture_completa()
        dados["protecao_sfu_turn"]["mecanismo"] = "somente_alertas"
        self.assert_bloqueado(dados, "protecao_sfu_turn.mecanismo")

    def test_estimativa_de_bitrate_nao_e_hard_cap(self):
        dados = fixture_completa()
        dados["protecao_sfu_turn"]["mecanismo"] = "estimativa_bitrate"
        self.assert_bloqueado(dados, "protecao_sfu_turn.mecanismo")

    def test_controlador_precisa_fechar_midia_mesmo_sem_quota_ou_disponibilidade(self):
        dados = fixture_completa()
        protecao = dados["protecao_sfu_turn"]
        protecao["mecanismo"] = "controlador_aplicacao"
        protecao["comprovacoes"] = {
            chave: "teste" for chave in (
                "admissao_fechada_em_falha", "reserva_conservadora_bytes",
                "termino_remoto", "falha_controlador", "cliente_ignora_expulsao",
                "reconciliacao_autoritativa", "fechamento_sem_quota_controlador",
            )
        }
        del protecao["comprovacoes"]["fechamento_sem_quota_controlador"]
        self.assert_bloqueado(dados, "protecao_sfu_turn.comprovacoes")

    def test_fronteira_exata_do_orcamento_bloqueia_por_precaucao(self):
        dados = fixture_completa()
        dados["orcamento"]["operacional_gb"] = 728.3524
        dados["protecao_sfu_turn"]["limite_gb"] = 728.3524
        self.assert_bloqueado(dados, "orcamento.saldo_gb")

    def test_consumo_ja_existente_reduz_orcamento_disponivel(self):
        dados = fixture_completa()
        dados["orcamento"]["consumo_agregado_sfu_turn_gb"] = 100
        self.assert_bloqueado(dados, "orcamento.saldo_gb")

    def test_nao_aceita_booleanos_negativos_nan_inf_ou_strings_como_numeros(self):
        for valor in (True, False, -1, float("nan"), float("inf"), "800", None):
            with self.subTest(valor=valor):
                dados = fixture_completa()
                dados["orcamento"]["operacional_gb"] = valor
                self.assert_bloqueado(dados, "orcamento.operacional_gb")

    def test_numeros_invalidos_em_quotas_e_prova_bloqueiam(self):
        for grupo, campo, valor in (
                ("prova", "reserva_gb", True),
                ("prova", "duracao_minutos", 16),
                ("orcamento", "reserva_seguranca_gb", 0)):
            with self.subTest(campo=campo):
                dados = fixture_completa()
                dados[grupo][campo] = valor
                self.assert_bloqueado(dados, f"{grupo}.{campo}")
        dados = fixture_completa()
        dados["servicos"]["workers"]["quotas"]["quota-ficticia"]["consumo"] = True
        self.assert_bloqueado(dados, "servicos.workers.quotas")

    def test_timestamp_sem_timezone_e_ciclo_expirado_bloqueiam(self):
        dados = fixture_completa()
        dados["coletado_em"] = "2026-10-14T11:00:00"
        self.assert_bloqueado(dados, "coletado_em")
        dados = fixture_completa()
        dados["servicos"]["supabase"]["ciclo"]["fim"] = "2026-10-14T12:00:00Z"
        self.assert_bloqueado(dados, "servicos.supabase.ciclo")

    def test_coleta_futura_e_observacao_fora_do_ciclo_bloqueiam(self):
        dados = fixture_completa()
        dados["coletado_em"] = "2026-10-15T11:00:00Z"
        self.assert_bloqueado(dados, "coletado_em")
        dados = fixture_completa()
        dados["servicos"]["workers"]["observado_em"] = "2026-09-30T11:00:00Z"
        self.assert_bloqueado(dados, "servicos.workers.observado_em")

    def test_arquivo_ausente_hash_incorreto_e_caminho_externo_bloqueiam(self):
        for campo, valor in (("arquivo", "inexistente.md"), ("sha256", "0" * 64),
                             ("arquivo", "../AGENTS.md"),
                             ("arquivo", "https://example.invalid/e0.md"),
                             ("arquivo", "\\\\servidor\\e0.md")):
            with self.subTest(campo=campo, valor=valor):
                dados = fixture_completa()
                dados["evidencias"]["teste"][campo] = valor
                self.assert_bloqueado(dados, "evidencias.teste")

    def test_referencia_ou_evidencia_de_protecao_ausente_bloqueia(self):
        dados = fixture_completa()
        dados["protecao_sfu_turn"]["evidencia"] = "desconhecida"
        self.assert_bloqueado(dados, "protecao_sfu_turn.evidencia")

    def test_plano_pago_e_durable_object_nao_sqlite_bloqueiam(self):
        dados = fixture_completa()
        dados["servicos"]["supabase"]["plano"] = "Pro"
        self.assert_bloqueado(dados, "servicos.supabase.plano")
        dados = fixture_completa()
        dados["servicos"]["durable_objects"]["armazenamento"] = "kv"
        self.assert_bloqueado(dados, "servicos.durable_objects.armazenamento")

    def test_actions_requer_quota_e_suspensao_comprovada(self):
        dados = fixture_completa()
        dados["servicos"]["github"]["modo"] = "actions"
        dados["servicos"]["github"]["suspensao_comprovada"] = False
        self.assert_bloqueado(dados, "servicos.github.suspensao_comprovada")

    def test_dados_completos_ainda_requerem_revisao_independente(self):
        resultado = self.avaliar()
        self.assertEqual(resultado["status"], "CANDIDATO_A_REVISAO")
        self.assertEqual(resultado["pendencias"], [])
        self.assertFalse(resultado["gate_aprovado"])
        self.assertFalse(resultado["pode_iniciar_midia"])
        self.assertTrue(resultado["revisao_independente_pendente"])
        self.assertEqual(resultado["orcamento"]["saldo_disponivel_gb"], 780.0)
        self.assertEqual(resultado["orcamento"]["necessidade_ciclo_gb"], 708.3524)

    def test_exemplo_nao_verificado_permanece_bloqueado(self):
        dados = fixture_completa()
        dados["estado"] = "exemplo_nao_verificado"
        self.assert_bloqueado(dados, "estado")

    def test_entrada_malformada_retorna_bloqueado_sem_excecao(self):
        for dados in (None, [], "nao-e-objeto", {"versao": 1}):
            with self.subTest(dados=dados):
                module = self.carregar()
                self.assertTrue(callable(getattr(module, "avaliar", None)))
                resultado = module.avaliar(dados, Path(__file__).parent, agora=AGORA)
                self.assertEqual(resultado["status"], "BLOQUEADO")
                self.assertFalse(resultado["gate_aprovado"])

    def test_cli_com_dados_completos_nao_autoriza_midia(self):
        self.carregar()
        processo = subprocess.run(
            [sys.executable, "-B", str(SCRIPT), "-", "--agora", AGORA.isoformat()],
            cwd=Path(__file__).parent, input=json.dumps(fixture_completa()),
            capture_output=True, text=True, encoding="utf-8", check=False,
        )
        self.assertEqual(processo.returncode, 0, processo.stderr)
        resultado = json.loads(processo.stdout)
        self.assertEqual(resultado["status"], "CANDIDATO_A_REVISAO")
        self.assertFalse(resultado["pode_iniciar_midia"])

    def test_cli_json_com_nan_ou_chaves_duplicadas_falha_fechado(self):
        self.carregar()
        for entrada in ('{"versao": NaN}', '{"versao": 1, "versao": 2}'):
            with self.subTest(entrada=entrada):
                processo = subprocess.run(
                    [sys.executable, "-B", str(SCRIPT), "-"],
                    cwd=Path(__file__).parent, input=entrada, capture_output=True,
                    text=True, encoding="utf-8", check=False,
                )
                self.assertEqual(processo.returncode, 2, processo.stderr)
                self.assertEqual(json.loads(processo.stdout)["status"], "BLOQUEADO")


if __name__ == "__main__":
    unittest.main()

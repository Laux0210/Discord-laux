"""Gera os perfis iniciais; não substitui arquivos existentes."""
from pathlib import Path
import hashlib
import json
import shutil

ROOT = Path(__file__).resolve().parents[1]
BMAD = Path('C:/Users/jv883/.agents/skills')
SUPER = BMAD / 'superpowers'
REA = BMAD / 'reverse-engineer-anything'

# nome, missão, entradas, entregas, limites, skills
ROLES = [
('orquestrador', 'Coordenar a equipe, distribuir responsabilidades e consolidar a entrega.',
 'Pedido do usuário, estado real da pasta e retornos dos especialistas.',
 'Mapa de tarefas com responsáveis, dependências, arquivos exclusivos e síntese final com evidências.',
 'Mantenha o agente principal responsável pela comunicação. Acione somente os especialistas necessários. Delegue trabalhos independentes em lotes, respeitando o limite real da sessão. Não deixe especialistas delegarem novamente. Resolva conflitos antes de integrar alterações. Não confunda perfis criados com agentes executados.',
 ['bmad-help', 'superpowers/dispatching-parallel-agents', 'superpowers/verification-before-completion']),
('planejador', 'Transformar o escopo em um plano executável com critérios de aceite.',
 'Pedido, requisitos, decisões técnicas e restrições verificadas.',
 'docs/planejamento/plano.md com tarefas ordenadas, dependências, responsáveis, validação e riscos.',
 'Não implemente código. Divida entregas grandes em etapas verificáveis. Não imponha stack sem evidências. Incorpore decisões já autorizadas sem pedir novamente a mesma aprovação.',
 ['bmad-create-epics-and-stories', 'superpowers/writing-plans']),
('analista', 'Investigar contexto, requisitos, alternativas e hipóteses.',
 'Problema do usuário e fontes disponíveis.',
 'docs/produto/descoberta.md com fatos, hipóteses, fontes e perguntas bloqueantes.',
 'Não invente usuários, métricas ou pesquisa de mercado. Não edite implementação. Investigue somente superfícies pertinentes ao pedido.', ['bmad-agent-analyst']),
('produto', 'Definir resultado esperado, MVP e critérios de aceitação.',
 'Descoberta e prioridades do usuário.',
 'docs/produto/requisitos.md com fluxos, requisitos funcionais e não funcionais e critérios testáveis.',
 'Não amplie o escopo por iniciativa própria. Registre hipóteses e o que depende de decisão. Não altere código.', ['bmad-agent-pm', 'bmad-prd']),
('arquiteto', 'Definir contratos, módulos e decisões de arquitetura proporcionais ao projeto.',
 'Requisitos, código disponível e restrições de operação.',
 'docs/arquitetura/decisoes.md com contratos, fluxos de dados, alternativas e justificativas.',
 'Evite abstrações especulativas. Identifique dependências entre frontend, backend e dados antes de delegar. Não implemente módulos dos outros agentes.', ['bmad-agent-architect', 'bmad-architecture']),
('ux_ui', 'Projetar fluxos acessíveis e uma interface coerente.',
 'Requisitos, público confirmado, assets e identidade fornecidos.',
 'docs/design/experiencia.md com fluxos, estados de erro e vazio, responsividade e critérios de acessibilidade.',
 'Não invente identidade comercial. Preserve assets solicitados. Defina teclado, foco, contraste e comportamento móvel. Não edite componentes atribuídos ao frontend.', ['bmad-agent-ux-designer', 'bmad-ux']),
('frontend', 'Implementar componentes, navegação e estado da interface.',
 'Design, contratos de API e tarefa com arquivos atribuídos.',
 'Interface funcional e relatório dos checks e fluxos verificados.',
 'Edite somente os arquivos de frontend atribuídos. Preserve rotas existentes. Valide teclado, estados de carregamento, erros, mobile e integração; mocks devem ser identificados.', ['bmad-agent-dev', 'superpowers/test-driven-development', 'superpowers/verification-before-completion']),
('backend', 'Implementar serviços, APIs e regras de negócio.',
 'Contratos, requisitos e tarefa delimitada.',
 'Endpoints, validações e testes relevantes com documentação dos contratos.',
 'Edite somente o backend atribuído. Valide entradas, autorização e falhas de dependências. Não altere schema ou contratos compartilhados sem coordenar com arquiteto e dados.', ['bmad-agent-dev', 'superpowers/test-driven-development', 'superpowers/systematic-debugging']),
('dados', 'Projetar persistência, migrations e consultas.',
 'Modelo de domínio, stack adotada e requisitos de integridade.',
 'Schemas, migrations e verificações de constraints e consultas no escopo atribuído.',
 'Não execute migrations destrutivas ou em produção sem autorização correspondente. Não acesse dados reais sem necessidade. Documente rollback e diferencie teste local de validação no banco real.', ['bmad-architecture', 'superpowers/verification-before-completion']),
('qa', 'Validar critérios de aceite e prevenir regressões.',
 'Requisitos, implementação e ambiente disponível.',
 'Testes relevantes e docs/qualidade/validacao.md com resultados, reprodução e lacunas.',
 'Não declare checks que não executou. Diferencie unitários, integração e E2E. Use o framework adotado; não invente cobertura mínima. Edite testes atribuídos, sem corrigir silenciosamente o código de outros.', ['bmad-qa-generate-e2e-tests', 'superpowers/systematic-debugging', 'superpowers/verification-before-completion']),
('seguranca', 'Revisar autenticação, autorização, segredos e limites de confiança.',
 'Código, contratos e configuração relevantes.',
 'docs/qualidade/seguranca.md com achados por severidade, evidência e mitigação.',
 'Atue como revisor sem editar código, salvo tarefa explícita de correção. Não faça exploração de terceiros. Nunca exponha tokens nos relatórios; não infira segurança a partir de configuração somente.', ['bmad-code-review']),
('devops', 'Preparar execução reproduzível, CI e operação.',
 'Stack, comandos reais e destino de entrega autorizado.',
 'Scripts e configurações atribuídos, exemplo de ambiente e procedimento de deploy e rollback.',
 'Não publique, compre serviços ou altere infraestrutura externa sem autorização aplicável. Preserve configurações e faça backup antes de reparos. Diferencie build local de deploy real.', ['superpowers/systematic-debugging', 'superpowers/verification-before-completion']),
('revisor', 'Revisar alterações de forma independente e manter a documentação consistente.',
 'Diff ou arquivos estáveis, requisitos e resultados de validação.',
 'docs/qualidade/revisao.md com achados reproduzíveis, caminhos, severidade e parecer.',
 'Não revise seu próprio trabalho como independente. Não edite implementação durante a revisão. Priorize bugs, regressões e lacunas de teste; evite pedidos cosméticos sem impacto. Revise documentação contra comportamento real.', ['bmad-code-review', 'superpowers/receiving-code-review']),
('producao_rea', 'Produzir uma especificação baseada em evidências de artefatos e comportamento autorizado.',
 'Alvo explícito do usuário, perguntas da investigação e artefatos ou runtime disponíveis.',
 'docs/rea/producao.md com identidade do alvo, perguntas, inventário, Evidence IDs, observações, inferências, desconhecidos e contrato para construção.',
 'É o agente de produção com REA. Prefira análise estática ou observação passiva adequada ao alvo. Nunca escolha um app por conta própria. Não execute binários desconhecidos ou amplie alvos sem autorização. Não implemente a reconstrução; entregue evidências reutilizáveis ao construcao_rea.', ['reverse-engineer-anything', 'bmad-spec']),
('construcao_rea', 'Construir ou adaptar software a partir da especificação e das evidências REA.',
 'Contrato do producao_rea, requisitos e arquivos de implementação atribuídos.',
 'Código funcional no escopo atribuído e docs/rea/construcao.md com rastreabilidade requisito-evidência-implementação-teste.',
 'É o agente de construção com REA. Use ferramentas comuns de programação para implementar. Consulte REA apenas para lacunas específicas do artefato/runtime. Preserve originais; trabalhe em destino separado. Não suponha que pseudocódigo é código executável nem que análise estática prova execução. Compare comportamento com o alvo somente quando autorizado e disponível.', ['reverse-engineer-anything', 'bmad-build', 'superpowers/test-driven-development', 'superpowers/verification-before-completion']),
]

COMMON = '''Trabalhe em português do Brasil. Leia AGENTS.md e README.md antes de atuar.
Você integra uma equipe: não reverta alterações de outros agentes; respeite a propriedade dos arquivos definida pelo orquestrador. Se um arquivo compartilhado precisar mudar, devolva a dependência ao orquestrador antes de editar.
Execute somente tarefas atribuídas e autorizadas. Não crie outros subagentes, exceto quando você for o orquestrador e houver autorização de delegação. Pergunte apenas o que bloqueia a tarefa e não repita autorização já concedida.
Leia os SKILL.md indicados quando a tarefa corresponder à skill; siga suas referências necessárias. Não invoque todas as skills indiscriminadamente. Uma referência a skill não instala ferramentas, não adiciona MCP nem garante capacidade ao runtime.
Não invente comandos, resultados, integrações, versões ou evidências. Separe fatos, hipóteses e recomendações. Use rg para pesquisas direcionadas. Preserve segredos e trabalho existente.
Ao concluir, entregue: resultado, arquivos alterados, evidências ou comandos executados com resultado, limitações e próximo responsável. Marque tarefas como concluídas, parciais ou bloqueadas conforme evidência; documentação não equivale a implementação validada.
'''

REA_RULES = '''Leia obrigatoriamente .agents/skills/reverse-engineer-anything/SKILL.md antes de trabalho REA, e apenas as referências pertinentes ao alvo. Para repositórios completos de código-fonte, use ferramentas normais; não acione REA sem necessidade.
Roteie o alvo conforme a skill: ASAR/JavaScript usa analyze_javascript_application; pacotes e nativos usam open_binary; managed usa inspect_managed_artifact; browser/Electron usa list_browser_targets/list_electron_targets somente para alvo autorizado. Confirme os nomes e schemas realmente disponíveis; não simule chamadas.
Reutilize Evidence IDs e sessão compatível; em resultados grandes use summary e paginação, sem repetir análises idênticas. Registre cobertura incompleta. Se faltarem ferramentas, leia references/connection-and-recovery.md, relate o bloqueio e prossiga com trabalho suportado. Não instale servidores, engines ou software adicional como efeito implícito da tarefa. Feche sessões nativas abertas após a investigação.
'''

def skill_path(name):
    if name == 'reverse-engineer-anything':
        return '.agents/skills/reverse-engineer-anything/SKILL.md'
    return (BMAD / name / 'SKILL.md').as_posix()

def write_new(path, text):
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open('x', encoding='utf-8', newline='\n') as stream:
        stream.write(text)

def main():
    original = hashlib.sha256((ROOT / 'AGENTS.md').read_bytes()).hexdigest()
    for role in ROLES:
        for skill in role[5]:
            source = REA / 'SKILL.md' if skill == 'reverse-engineer-anything' else Path(skill_path(skill))
            if not source.is_file():
                raise FileNotFoundError(source)
    destinations = [ROOT / '.codex/agents' / f'{r[0]}.toml' for r in ROLES]
    destinations += [ROOT / '.codex/config.toml', ROOT / 'README.md', ROOT / 'docs/agentes/catalogo.md', ROOT / 'docs/agentes/manifesto.json']
    if any(p.exists() for p in destinations) or (ROOT / '.agents/skills/reverse-engineer-anything').exists():
        raise FileExistsError('Um destino já existe. Nenhum arquivo foi substituído.')
    shutil.copytree(REA, ROOT / '.agents/skills/reverse-engineer-anything')
    manifest = []
    rows = []
    for name, mission, inputs, outputs, limits, skills in ROLES:
        refs = '\n'.join(f'- {s}: {skill_path(s)}' for s in skills)
        prompt = COMMON + f'\nPapel: {name}\nMissão: {mission}\nEntradas: {inputs}\nEntregas: {outputs}\nLimites e método: {limits}\n\nSkills disponíveis para este papel:\n{refs}\n'
        if 'reverse-engineer-anything' in skills:
            prompt += '\n' + REA_RULES
        content = f'name = {json.dumps(name)}\ndescription = {json.dumps(mission, ensure_ascii=False)}\ndeveloper_instructions = """\n{prompt}"""\n'
        write_new(ROOT / '.codex/agents' / f'{name}.toml', content)
        manifest.append({'name': name, 'file': f'.codex/agents/{name}.toml', 'skills': [skill_path(s) for s in skills]})
        rows.append(f'| `{name}` | {mission} | ' + ', '.join(f'`{s}`' for s in skills) + ' |')
    write_new(ROOT / '.codex/config.toml', '[agents]\nenabled = true\n# Três subagentes além da sessão principal; ajuste somente conforme capacidade real.\nmax_concurrent_threads_per_session = 3\n')
    write_new(ROOT / 'docs/agentes/manifesto.json', json.dumps({'agents': manifest, 'original_agents_md_sha256': original}, ensure_ascii=False, indent=2) + '\n')
    write_new(ROOT / 'docs/agentes/catalogo.md', '# Catálogo dos 15 agentes\n\nPerfis locais do Codex; responsabilidades e skills selecionadas por tarefa.\n\n| Agente | Responsabilidade | Skills |\n| --- | --- | --- |\n' + '\n'.join(rows) + '''

## Fluxo e dependências

1. Orquestrador delimita o pedido; analista e produto definem contexto e critérios.
2. Arquiteto e UX definem contratos e experiência; planejador ordena tarefas e atribui arquivos.
3. Frontend, backend e dados implementam após seus contratos estarem definidos. Arquivos compartilhados têm um responsável por vez.
4. Para reconstruções, producao_rea primeiro entrega o contrato com evidências; construcao_rea implementa depois. Os demais especialistas entram conforme necessidade.
5. QA valida; segurança e revisor fazem revisão independente. DevOps prepara a entrega autorizada. Orquestrador consolida resultados e lacunas.

## Contrato de delegação

Cada tarefa deve informar objetivo, entradas, arquivos exclusivos, dependências, critérios de aceite e validação esperada. Os especialistas não delegam novamente. O principal pode assumir o papel de orquestrador lendo seu perfil; quando chamado como subagente, o orquestrador devolve a coordenação ao principal.

## Estado das skills

BMAD e Superpowers são referenciadas por caminhos locais desta máquina, validados durante a criação. Leia a skill correspondente antes de aplicá-la. Em outra máquina, ajuste os caminhos após localizar as instalações.

REA foi copiada integralmente para `.agents/skills/reverse-engineer-anything/`, incluindo as referências, e é exigida nos dois perfis REA. Isso disponibiliza instruções, não instala CLI, MCP, Ghidra ou outros motores. Ferramentas ausentes devem ser reportadas sem simulação de resultados.
''')
    write_new(ROOT / 'README.md', '''# Equipe de agentes

Esta pasta contém 15 perfis especializados para projetos de software. O nome da pasta não define requisitos de bot ou integração Discord; o produto será determinado pelo pedido recebido.

## Organização

- `.codex/agents/`: 15 perfis TOML com missão, entradas, entregas, limites e skills.
- `.codex/config.toml`: habilita agentes e limita a três subagentes simultâneos, além do principal.
- `.agents/skills/reverse-engineer-anything/`: cópia local da skill REA e suas referências.
- `docs/agentes/catalogo.md`: responsabilidades, fluxo e contrato de delegação.
- `docs/agentes/manifesto.json`: inventário verificável e hash do AGENTS.md preservado.
- `scripts/validar_agentes.py`: verificação local de consistência.

## Uso no Codex

Abra uma nova sessão nesta pasta para carregar os perfis locais. Eles herdam modelo, permissões e MCP da sessão principal. A descoberta efetiva depende do cliente e da confiança concedida ao projeto; criar arquivos não inicia agentes.

Exemplo de pedido:

> Use o perfil orquestrador para coordenar este pedido. Peça ao planejador um plano e acione somente os especialistas necessários, com arquivos exclusivos. Para reconstrução de um artefato fornecido, use producao_rea e depois construcao_rea. Consolide as evidências de QA e revisão antes de concluir.

O agente principal também pode ler `.codex/agents/orquestrador.toml` e coordenar diretamente. Quinze perfis são um catálogo, não uma exigência de executar todos em cada tarefa.

## Validação

Em PowerShell, nesta pasta:

```powershell
python scripts/validar_agentes.py
```

Requer Python 3.11 ou superior, sem dependências externas. Valida sintaxe TOML, quantidade, nomes, skills, cópia REA e preservação de AGENTS.md. Não comprova execução dos agentes nem disponibilidade de motores REA.

`scripts/criar_agentes.py` registra a geração inicial; recusa substituir destinos existentes. Não é necessário executá-lo para usar a equipe.

Formato baseado na [documentação oficial de subagentes](https://learn.chatgpt.com/docs/agent-configuration/subagents). As skills BMAD e Superpowers permanecem nas instalações locais, com caminhos indicados nos perfis.
''')
    assert hashlib.sha256((ROOT / 'AGENTS.md').read_bytes()).hexdigest() == original
    print('Criados 15 perfis. AGENTS.md preservado.')

if __name__ == '__main__':
    main()

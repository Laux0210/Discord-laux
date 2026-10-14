"""Verifica os perfis e dependências sem executar agentes ou instalar ferramentas."""
from pathlib import Path
import hashlib
import json
import tomllib

ROOT = Path(__file__).resolve().parents[1]
CONTRACTS = ('docs/agentes/ORQUESTRACAO.md', 'docs/agentes/CONTRATO-TAREFA.md')
DELEGATION_RULE = 'Nenhum subagente pode iniciar novas delegações sem autorização específica do principal'


def validate_coordination(instructions, source):
    for contract in CONTRACTS:
        assert contract in instructions, f'Contrato não vinculado: {source}: {contract}'
    assert DELEGATION_RULE in instructions, f'Regra de delegação ausente: {source}'
    assert 'inclusive um subagente com perfil orquestrador' in instructions, source
    assert 'A identidade do perfil não concede autorização de redelegação.' in instructions, source
    assert 'exceto quando você for o orquestrador' not in instructions, source


def validate_contracts(names):
    documents = {}
    for contract in CONTRACTS:
        path = ROOT / contract
        assert path.is_file(), f'Contrato ausente: {contract}'
        documents[contract] = path.read_text(encoding='utf-8')
    operational = documents[CONTRACTS[0]]
    for name in names:
        assert f'| `{name}` |' in operational, f'Competência ausente: {name}'
    for heading in ('## Autoridade e execução', '## Limite e mecanismos',
                    '## Seleção conforme a tarefa', '## Dependências e paralelismo',
                    '## Propriedade e aceite do estado compartilhado',
                    '## Memória e limites de garantia'):
        assert heading in operational, f'Regra operacional ausente: {heading}'
    task = documents[CONTRACTS[1]]
    for field in ('ID e objetivo', 'Autorização e modo', 'Responsável',
                  'Entradas e estado', 'Arquivos de escrita', 'Arquivos de leitura',
                  'Proibições', 'Dependências e início', 'Critérios de aceite',
                  'Validação esperada', 'Destino da entrega',
                  'Liberação e próximo responsável', 'Estado da tarefa',
                  'Evidências', 'Limitações', 'Parecer'):
        assert f'**{field}:**' in task, f'Campo do contrato ausente: {field}'
    for path in ('README.md', 'docs/agentes/catalogo.md'):
        text = (ROOT / path).read_text(encoding='utf-8')
        for contract in CONTRACTS:
            assert Path(contract).name in text, f'Referência ausente: {path}: {contract}'

def main():
    manifest = json.loads((ROOT / 'docs/agentes/manifesto.json').read_text(encoding='utf-8'))
    entries = manifest['agents']
    files = sorted((ROOT / '.codex/agents').glob('*.toml'))
    assert len(entries) == len(files) == 15, 'A equipe deve conter exatamente 15 perfis.'
    names = set()
    for entry in entries:
        file = ROOT / entry['file']
        with file.open('rb') as stream:
            role = tomllib.load(stream)
        assert set(role) == {'name', 'description', 'developer_instructions'}, file
        assert role['name'] == entry['name'] == file.stem, file
        assert role['name'] not in names, 'Nome duplicado'
        names.add(role['name'])
        assert role['description'] and role['developer_instructions'], file
        assert 'Política de memória deste projeto:' in role['developer_instructions'], file
        assert 'E:/Memoria' in role['developer_instructions'] and 'project=discord' in role['developer_instructions'], file
        validate_coordination(role['developer_instructions'], file)
        for skill in entry['skills']:
            path = Path(skill)
            if not path.is_absolute():
                path = ROOT / path
            assert path.is_file(), f'Skill ausente: {path}'
            assert skill in role['developer_instructions'], f'Skill não vinculada: {file}'
    assert {'orquestrador', 'planejador', 'producao_rea', 'construcao_rea'} <= names
    validate_contracts(names)
    rea_roles = [e['name'] for e in entries if '.agents/skills/reverse-engineer-anything/SKILL.md' in e['skills']]
    assert sorted(rea_roles) == ['construcao_rea', 'producao_rea']
    rea = ROOT / '.agents/skills/reverse-engineer-anything'
    assert (rea / 'references/connection-and-recovery.md').is_file()
    with (ROOT / '.codex/config.toml').open('rb') as stream:
        config = tomllib.load(stream)
    assert config['agents']['enabled'] is True
    assert config['agents']['max_concurrent_threads_per_session'] == 3
    assert 'Política de memória deste projeto:' in config['developer_instructions']
    validate_coordination(config['developer_instructions'], '.codex/config.toml')
    assert 'no máximo três especialistas simultâneos, além do principal' in config['developer_instructions']
    with (ROOT / '.ai-memory.toml').open('rb') as stream:
        assert tomllib.load(stream) == {'workspace': 'discord', 'project': 'discord'}
    digest = hashlib.sha256((ROOT / 'AGENTS.md').read_bytes()).hexdigest()
    assert digest == manifest['original_agents_md_sha256'], 'AGENTS.md foi alterado.'
    print('OK: 15 TOMLs, nomes únicos, skills existentes, 2 perfis REA, contratos, regra de delegação, limite de 3 especialistas, política Obsidian/ai-memory e AGENTS.md preservado.')
    print('Limite: validação estática; não comprova bloqueio técnico, execução de agentes ou captura completa dos hooks.')

if __name__ == '__main__':
    main()

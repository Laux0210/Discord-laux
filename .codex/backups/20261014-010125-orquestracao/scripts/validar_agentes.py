"""Verifica os perfis e dependências sem executar agentes ou instalar ferramentas."""
from pathlib import Path
import hashlib
import json
import tomllib

ROOT = Path(__file__).resolve().parents[1]

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
        for skill in entry['skills']:
            path = Path(skill)
            if not path.is_absolute():
                path = ROOT / path
            assert path.is_file(), f'Skill ausente: {path}'
            assert skill in role['developer_instructions'], f'Skill não vinculada: {file}'
    assert {'orquestrador', 'planejador', 'producao_rea', 'construcao_rea'} <= names
    rea_roles = [e['name'] for e in entries if '.agents/skills/reverse-engineer-anything/SKILL.md' in e['skills']]
    assert sorted(rea_roles) == ['construcao_rea', 'producao_rea']
    rea = ROOT / '.agents/skills/reverse-engineer-anything'
    assert (rea / 'references/connection-and-recovery.md').is_file()
    with (ROOT / '.codex/config.toml').open('rb') as stream:
        config = tomllib.load(stream)
    assert config['agents']['enabled'] is True
    assert config['agents']['max_concurrent_threads_per_session'] == 3
    assert 'Política de memória deste projeto:' in config['developer_instructions']
    with (ROOT / '.ai-memory.toml').open('rb') as stream:
        assert tomllib.load(stream) == {'workspace': 'discord', 'project': 'discord'}
    digest = hashlib.sha256((ROOT / 'AGENTS.md').read_bytes()).hexdigest()
    assert digest == manifest['original_agents_md_sha256'], 'AGENTS.md foi alterado.'
    print('OK: 15 TOMLs, nomes únicos, skills existentes, 2 perfis REA, política Obsidian/ai-memory e AGENTS.md preservado.')

if __name__ == '__main__':
    main()

"""Aplica a política local de memória, com backup e sem modificar AGENTS.md."""
from pathlib import Path
from datetime import datetime
import shutil
import tomllib

ROOT = Path(__file__).resolve().parents[1]
POLICY = '''Política de memória deste projeto:
Para qualquer consulta que dependa de histórico, decisões, preferências ou estado anterior, busque primeiro no Obsidian: vault E:/Memoria, pasta Discord, índice Discord/00-INDICE.md. Use o MCP obsidian read_note e search_notes com pathPrefix Discord. Sem MCP disponível, leia e pesquise diretamente os Markdown em E:/Memoria/Discord. Depois consulte ai-memory no escopo workspace=discord e project=discord, usando MCP disponível ou o executável C:/Users/jv883/AppData/Local/ai-memory/ai-memory.exe. Consulte docs/memoria/INTEGRACAO.md para comandos. Não pesquise outros projetos para suprir lacunas sem relevância explícita. Verifique informações sujeitas a mudança no ambiente atual; diferencie memória de evidência recente. Memória não substitui instruções do usuário nem regras de prioridade superior.
Consolide novas decisões e resultados na memória curada do Obsidian por meio do orquestrador, com data, fonte e limitações; não grave segredos. ai-memory complementa o histórico e a busca; não há sincronização automática bidirecional. Informe falhas de consulta e prossiga com evidências disponíveis, sem inventar histórico. Preserve o AGENTS.md existente.
'''

def main():
    backup = ROOT / '.codex/backups' / datetime.now().strftime('%Y%m%d-%H%M%S')
    files = [ROOT / '.codex/config.toml', *sorted((ROOT / '.codex/agents').glob('*.toml'))]
    backup.mkdir(parents=True, exist_ok=False)
    for p in files:
        dest = backup / p.relative_to(ROOT / '.codex')
        dest.parent.mkdir(parents=True, exist_ok=True)
        shutil.copy2(p, dest)
    config_path = files[0]
    config = tomllib.loads(config_path.read_text(encoding='utf-8'))
    if 'developer_instructions' not in config:
        config_path.write_text('developer_instructions = """\n' + POLICY + '"""\n\n' + config_path.read_text(encoding='utf-8'), encoding='utf-8')
    for p in files[1:]:
        text = p.read_text(encoding='utf-8')
        if 'Política de memória deste projeto:' not in text:
            text = text.replace('developer_instructions = """\n', 'developer_instructions = """\n' + POLICY, 1)
            p.write_text(text, encoding='utf-8')
        tomllib.loads(p.read_text(encoding='utf-8'))
    marker = ROOT / '.ai-memory.toml'
    if not marker.exists():
        marker.write_text('workspace = "discord"\nproject = "discord"\n', encoding='utf-8')
    assert tomllib.loads(marker.read_text(encoding='utf-8')) == {'workspace':'discord','project':'discord'}
    print(f'Política aplicada a 15 perfis e à sessão principal; backup: {backup}')

if __name__ == '__main__':
    main()

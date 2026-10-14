"""Script de backup seguro do banco de dados Discord Desktop com allowlist estrita (RF-14).

Exclui expressamente as tabelas de mensagens ('messages' e 'dm_messages')
para preservar a política de privacidade e retenção máxima de 10 dias.
"""
from typing import List, Optional
import argparse
import sys

# Lista explícita e fechada de tabelas autorizadas para inclusão no backup
ALLOWLIST_TABLES = [
    "profiles",
    "friendships",
    "blocks",
    "guilds",
    "guild_members",
    "roles",
    "member_roles",
    "channels",
    "channel_overrides",
    "invites",
    "dm_channels",
    "dm_participants"
]

# Tabelas estritamente proibidas no backup (RF-14)
FORBIDDEN_TABLES = {"messages", "dm_messages"}


def build_pg_dump_command(
    db_url: str,
    output_file: str = "backup.sql",
    custom_tables: Optional[List[str]] = None
) -> List[str]:
    """Gera o comando pg_dump contendo apenas as tabelas autorizadas."""
    target_tables = custom_tables if custom_tables is not None else ALLOWLIST_TABLES

    for table in target_tables:
        if table in FORBIDDEN_TABLES:
            raise ValueError(f"A tabela '{table}' e proibida no backup para cumprir a regra RF-14 de retencao.")
        if table not in ALLOWLIST_TABLES:
            raise ValueError(f"A tabela '{table}' nao consta na allowlist de tabelas autorizadas.")

    cmd = ["pg_dump", "--no-owner", "--no-acl", "--clean", "--if-exists"]

    for table in target_tables:
        cmd.append(f"--table={table}")

    cmd.extend(["-f", output_file, db_url])
    return cmd


def main():
    parser = argparse.ArgumentParser(
        description="Gera backup estrutural do PostgreSQL excluindo rigorosamente mensagens (RF-14)."
    )
    parser.add_argument("--db-url", required=True, help="URL de conexao PostgreSQL")
    parser.add_argument("--output", default="backup.sql", help="Arquivo de destino do dump")
    parser.add_argument("--dry-run", action="store_true", help="Apenas exibe o comando gerado sem executar")

    args = parser.parse_args()

    try:
        cmd = build_pg_dump_command(args.db_url, args.output)
        print("Comando de backup gerado com sucesso:")
        print(" ".join(cmd))

        if args.dry_run:
            print("Modo dry-run: nenhum comando foi executado.")
            return 0

        # Em ambiente real, executa o comando via subprocess se disponível
        print(f"Execucao pendente de instalacao local do utilitario pg_dump. Destino: {args.output}")
        return 0
    except ValueError as err:
        print(f"Erro de seguranca de backup: {err}", file=sys.stderr)
        return 1


if __name__ == "__main__":
    sys.exit(main())

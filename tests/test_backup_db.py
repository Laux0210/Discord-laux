import unittest
from scripts.backup_db import build_pg_dump_command, ALLOWLIST_TABLES, FORBIDDEN_TABLES

class TestBackupDb(unittest.TestCase):
    def test_allowlist_contains_only_structural_and_permission_tables(self):
        # As tabelas estruturais devem estar na allowlist
        self.assertIn("profiles", ALLOWLIST_TABLES)
        self.assertIn("guilds", ALLOWLIST_TABLES)
        self.assertIn("channels", ALLOWLIST_TABLES)
        self.assertIn("roles", ALLOWLIST_TABLES)
        self.assertIn("channel_overrides", ALLOWLIST_TABLES)
        self.assertIn("dm_participants", ALLOWLIST_TABLES)

        # As tabelas de mensagens NUNCA podem estar na allowlist
        self.assertNotIn("messages", ALLOWLIST_TABLES)
        self.assertNotIn("dm_messages", ALLOWLIST_TABLES)

    def test_forbidden_tables_explicitly_blocks_messages(self):
        self.assertIn("messages", FORBIDDEN_TABLES)
        self.assertIn("dm_messages", FORBIDDEN_TABLES)

    def test_build_pg_dump_command_includes_only_allowlist(self):
        cmd = build_pg_dump_command(
            db_url="postgresql://user:pass@localhost:5432/discord",
            output_file="backup_test.sql"
        )

        # Verifica que cada tabela da allowlist tem seu flag --table
        for table in ALLOWLIST_TABLES:
            self.assertIn(f"--table={table}", cmd)

        # Verifica que NENHUMA tabela de mensagem é mencionada
        self.assertNotIn("--table=messages", cmd)
        self.assertNotIn("--table=dm_messages", cmd)

    def test_rejects_attempt_to_include_forbidden_tables(self):
        with self.assertRaises(ValueError) as ctx:
            build_pg_dump_command(
                db_url="postgresql://user:pass@localhost:5432/discord",
                custom_tables=["guilds", "messages"]
            )
        self.assertIn("A tabela 'messages' e proibida no backup", str(ctx.exception))

if __name__ == "__main__":
    unittest.main()

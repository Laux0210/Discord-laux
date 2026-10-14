# E0-02 — Ferramenta offline verificada

Data: 2026-10-14. Implementação: devops. Revisão independente: QA-E0-02B/C. Aceite do principal: suporte local a E0, sem aprovação do portão financeiro.

## Entrega

- `scripts/verificar_e0.py`: valida evidências locais e orçamento, sem rede, escrita, SDK ou ativação de provedores.
- `tests/test_verificar_e0.py`: testes da projeção, lacunas, números inválidos, integridade das referências, ciclo/atualidade, saldo e limites de candidatar o relatório.
- `docs/validacao/e0-evidencias.exemplo.json`: entrada não verificada, que permanece bloqueada.

O validador verifica estrutura e consistência; arquivos/flags/hashes não provam autenticidade da conta nem eficácia do corte. A cadeia temporal exige observação em até 24h, não posterior à coleta da evidência, e coleta não posterior ao instante avaliado. A janela de 24h é regra conservadora local; `--agora` permite replay, não constitui verificação presente da conta.

## Resultados reproduzidos

`python -B -m unittest discover -s tests -v`: 35 testes OK, código 0, executados pelo autor, pelo principal e pelo QA independente após a correção F1.

`python -B scripts/verificar_e0.py docs/validacao/e0-evidencias.exemplo.json`: código 1, BLOQUEADO, 103 pendências, `gate_aprovado=false`, `pode_iniciar_midia=false`. Projeção decimal: voz 155,52 GB; tela/som 387,828 GB; payload 543,348 GB; margem hipotética de 30%: 706,3524 GB.

Código 0 significa somente CANDIDATO_A_REVISAO; código 1, BLOQUEADO; código 2, erro de leitura/parse/instante. Nenhuma saída aprova GO ou inicia mídia.

## Revisão e correção F1

A primeira versão passou em 30 testes, mas QA reproduziu observações antigas e posteriores à evidência aceitas como dados estruturalmente completos. O achado foi devolvido ao autor. Foram acrescentados testes de regressão, com falhas antes do ajuste, e aplicada a verificação temporal. QA-E0-02C reproduziu os casos anteriores, executou 17 cenários adicionais e aprovou a ferramenta corrigida no escopo offline.

| Arquivo final | SHA-256 verificado |
| --- | --- |
| scripts/verificar_e0.py | `c6a51821bb270762726d57c956c64ae2dda6b3358835210085926dfa714cc5ac` |
| tests/test_verificar_e0.py | `5de625621ff12ded10a1b377b51e6b21e7396cf92febeea12007c3c7cf300fab` |
| docs/validacao/e0-evidencias.exemplo.json | `80c57772fa6b5d0c611bf3a818135e08261670ff7b8368d91a4865f3bbfb537a` |

Dados de teste são sintéticos. Não foram comprovados planos/consumo das contas, mecanismo real de não cobrança ou término remoto de mídia. E0 permanece BLOQUEADO; a ferramenta e sua aprovação local não liberam E1, E2, BASE ou aplicação completa.

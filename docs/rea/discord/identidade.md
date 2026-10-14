# REA-REF-01A — Identidade e análise estática inicial do Discord

Data: 2026-10-14. Responsável pela investigação: `producao_rea`, somente leitura; consolidação: principal. Estado: identidade e análise mínima concluídas, cobertura parcial. REA-REF-01 integral e REA-REF-02/03/04 continuam pendentes.

## Artefato observado

Foi encontrada uma única pasta `app-*` na instalação `C:\Users\jv883\AppData\Local\Discord`: `app-1.0.9261`. `Discord.exe` declara Product/FileVersion 1.0.9261, ProductName Discord e CompanyName Discord Inc. `resources/build_info.json` informa `releaseChannel=stable`, `sentryDist=stable-win-x64` e versão 1.0.9261. Esses são metadados locais, não atestado de autenticidade oficial.

| Artefato | SHA-256 |
| --- | --- |
| Discord.exe | `08f12bded9410c45363aae2311dba9cff61b655aab7afcbe4ca58774bc9be5c1` |
| resources/app.asar | `535bcb3de917fa65289519e399ea82ab93d9e4df35f7b437ae8433e5ca9d39ca` |
| resources/build_info.json | `5e580c86634a063f56fb61b88a418d19649cd95bf7ee1b6d0bc929c552d61744` |

O ASAR tem 3.619.342 bytes. Seus hashes antes/depois da REA coincidiram; o principal verificou novamente os três hashes acima. Nenhum original foi alterado ou executado.

## Chamadas e evidências reais

Uma chamada `analyze_javascript_application`, com `format: asar` e `detail: summary`, analisou o ASAR. Duas chamadas `inspect_analysis_view` consultaram páginas de módulos da mesma evidência retida, offsets 0 e 8 com limit 8, percorrendo 11 entradas. Não houve repetição da análise nem alteração dos limites do motor.

| Evidência | ID |
| --- | --- |
| Registro completo retido / parent | `ev_29c909220a39cbc2854eabe746d7a327c192ea08a95f265dfe02a61c8cca19bb` |
| Resumo | `ev_eec2ba95f7f8912ab876bbd3d20329f4a6813ca1c38b994f66ca85d9e0d6397f` |
| Página de identidades 0 | `ev_b1030f58218b94f64eb3935cc930b6a83f70959e712090593e738d52b2c8c807` |
| Página de identidades 8 | `ev_a6bdadde69b675e611bf0a8c8e98ca302ebd89a5c91411d053e9837997167c90` |

O resumo reporta cinco arquivos relevantes, dois JavaScript parseados, 3.074.871 bytes de texto lidos, 3.159 findings e nenhum erro de parse. As páginas identificam `bundle.js`, `splashScreenPreload.js` e nós de módulos do preload. Findings individuais não foram investigados e não representam automaticamente defeitos ou vulnerabilidades.

## Cobertura e desconhecidos

- Grafo da aplicação: partial. Grafo semântico: partial/truncated; 329 desconhecidos semânticos e dois desconhecidos da aplicação.
- Relações expandidas de `bundle.js` excederam o orçamento de resultado. Fatos estáticos foram retidos no nó do arquivo; a análise semântica integral desse bundle não começou.
- Contagens zero de BrowserWindow/IPC não comprovam ausência: a cobertura é incompleta e a resolução dinâmica é limitada.
- Nenhum renderer remoto, origem, tela, interação, chamada ou fluxo de UI foi observado. Não se inferiu a localização ou cobertura de recursos remotos.
- Há uma configuração adicional `resources/app/injection.conf`, 95 bytes, com endereço HTTP e campo de credencial. Seus valores não foram copiados; nenhum destino foi acessado. Origem/uso são desconhecidos. Não foi atestada assinatura oficial nem instalação sem personalizações.
- Evidence IDs ficaram retidos no servidor REA; não houve exportação completa para arquivo nem abertura de sessão nativa.

Próximo trabalho: aprofundar perguntas delimitadas e, quando houver acesso e cenário autorizados, observar funções/modos/interface. O contrato de reprodução e a implementação ainda não estão entregues. E0/E1/E2 continuam vinculantes para o aplicativo próprio.

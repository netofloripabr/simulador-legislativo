# apuracao-tse — como ligar no dia da eleição

1. Conferir no TSE (semanas antes) o código da eleição de 2026 e atualizar:
   `update public.config_app set valor='2026' where chave='apuracao_ano';`
   `update public.config_app set valor='<cd_eleicao>' where chave='apuracao_cd_eleicao';`
   (o de 2022 era 546; o formato do arquivo é
   `oficial/ele{ano}/{cd}/dados-simplificados/sc/sc-c000{7|6|5}-e000{cd}-r.json`.)
2. Ligar: `update public.config_app set valor='true' where chave='apuracao_ativa';`
   O pg_cron chama a função a cada minuto; ela desliga sozinha quando os 3
   cargos chegarem à totalização final.
3. Rodar agora (teste): POST na URL da função com header `x-rotina-token`
   (valor em `public.config_privada`, chave `apuracao_rotina_token`);
   `?forcar=1` ignora a chave `apuracao_ativa`.
4. A tela de Resultados lê `storage://apuracao/sc-{ano}/{cargo}.json`
   quando `RES_AO_VIVO` estiver ligado em interface/95-resultados.js.

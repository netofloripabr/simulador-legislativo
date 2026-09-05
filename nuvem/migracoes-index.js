// GERADO por ferramentas/gerar_indice_migracoes.py — não editar à mão.
// Rode o script de novo sempre que criar uma migração em nuvem/.
const MIGRACOES_INDEX = [
 {
  "num": 2,
  "arquivo": "migracao-2-vagas-por-partido.sql",
  "descricao": "Migração adicional (rodar depois do nuvem/schema.sql original, no mesmo",
  "objetos": [
   [
    "column",
    "palpites.vagas_por_partido"
   ]
  ]
 },
 {
  "num": 3,
  "arquivo": "migracao-3-partido-escopo-todos.sql",
  "descricao": "Migração adicional (rodar depois das migrações 1 e 2, no mesmo SQL Editor):",
  "objetos": []
 },
 {
  "num": 4,
  "arquivo": "migracao-4-cpf.sql",
  "descricao": "Migração adicional (rodar no SQL Editor, depois das anteriores): adiciona",
  "objetos": [
   [
    "index",
    "perfis_cpf_hash_key"
   ],
   [
    "column",
    "perfis.cpf_hash"
   ],
   [
    "column",
    "perfis.lgpd_aceite_em"
   ]
  ]
 },
 {
  "num": 5,
  "arquivo": "migracao-5-listas-salvas.sql",
  "descricao": "Migração 5: \"salvamentos\" nomeados por pessoa — cada um é UMA lista com",
  "objetos": [
   [
    "table",
    "salvamentos"
   ],
   [
    "index",
    "salvamentos_perfil_estado_idx"
   ],
   [
    "function",
    "salvamentos_unicidade_oficial"
   ],
   [
    "trigger",
    "salvamentos_oficial_unica"
   ],
   [
    "policy",
    "salvamentos_select_publico"
   ],
   [
    "policy",
    "salvamentos_insert_proprio"
   ],
   [
    "policy",
    "salvamentos_update_proprio"
   ],
   [
    "policy",
    "salvamentos_delete_proprio"
   ],
   [
    "table",
    "listas_salvas"
   ],
   [
    "index",
    "listas_salvas_salvamento_idx"
   ],
   [
    "policy",
    "listas_salvas_select_publico"
   ],
   [
    "policy",
    "listas_salvas_insert_proprio"
   ],
   [
    "policy",
    "listas_salvas_update_proprio"
   ],
   [
    "policy",
    "listas_salvas_delete_proprio"
   ],
   [
    "view",
    "listas_salvas_publicas"
   ]
  ]
 },
 {
  "num": 6,
  "arquivo": "migracao-6-rascunho-por-cargo.sql",
  "descricao": "Migração 6: salva o rascunho de cada cargo (Estadual/Federal/Senador)",
  "objetos": [
   [
    "column",
    "palpites.rascunho_estadual"
   ]
  ]
 },
 {
  "num": 7,
  "arquivo": "migracao-7-rascunhos-publicos.sql",
  "descricao": "Migração 7: expõe os rascunhos por cargo (Estadual/Federal/Senador,",
  "objetos": [
   [
    "view",
    "rascunhos_publicos"
   ]
  ]
 },
 {
  "num": 8,
  "arquivo": "migracao-8-grupos.sql",
  "descricao": "Migração 8: grupos privados de comparação — uma pessoa cria um grupo com",
  "objetos": [
   [
    "table",
    "grupos"
   ],
   [
    "policy",
    "grupos_select_publico"
   ],
   [
    "policy",
    "grupos_insert_proprio"
   ],
   [
    "table",
    "grupo_membros"
   ],
   [
    "policy",
    "grupo_membros_select_publico"
   ],
   [
    "policy",
    "grupo_membros_insert_proprio"
   ],
   [
    "function",
    "grupos_criador_vira_membro"
   ],
   [
    "trigger",
    "grupos_apos_criar_adiciona_criador"
   ],
   [
    "view",
    "grupo_comparacao"
   ]
  ]
 },
 {
  "num": 9,
  "arquivo": "migracao-9-creditos.sql",
  "descricao": "Migração 9: créditos por conta — a partir do 2º salvamento (lista) ou do",
  "objetos": [
   [
    "table",
    "creditos_conta"
   ],
   [
    "policy",
    "creditos_conta_select_proprio"
   ],
   [
    "function",
    "consumir_credito"
   ],
   [
    "function",
    "consumir_credito_proprio"
   ],
   [
    "function",
    "conceder_credito"
   ]
  ]
 },
 {
  "num": 10,
  "arquivo": "migracao-10-grupo-comparacao-depositado.sql",
  "descricao": "Migração 10: a comparação do grupo passa a usar só a cédula DEPOSITADA de",
  "objetos": [
   [
    "view",
    "grupo_comparacao"
   ]
  ]
 },
 {
  "num": 11,
  "arquivo": "migracao-11-limite-membros-grupo.sql",
  "descricao": "Migração 11: grupo grátis tem no máximo 5 membros. Colar no SQL Editor do",
  "objetos": [
   [
    "function",
    "grupo_membros_checa_limite"
   ],
   [
    "trigger",
    "grupo_membros_antes_de_entrar"
   ]
  ]
 },
 {
  "num": 12,
  "arquivo": "migracao-12-telefone-perfil.sql",
  "descricao": "Migração 12: adiciona telefone ao perfil (opcional por enquanto, sem",
  "objetos": [
   [
    "column",
    "perfis.telefone"
   ]
  ]
 },
 {
  "num": 13,
  "arquivo": "migracao-13-cep-genero-perfil.sql",
  "descricao": "Migração 13: adiciona CEP (+ município/UF resolvidos automaticamente a",
  "objetos": [
   [
    "column",
    "perfis.cep"
   ],
   [
    "column",
    "perfis.municipio_residencia"
   ],
   [
    "column",
    "perfis.uf_residencia"
   ],
   [
    "column",
    "perfis.genero"
   ]
  ]
 },
 {
  "num": 14,
  "arquivo": "migracao-14-codigo-cedula.sql",
  "descricao": "Migração 14: código único por cédula depositada (compartilhamento/consulta",
  "objetos": [
   [
    "index",
    "salvamentos_codigo_key"
   ],
   [
    "column",
    "salvamentos.codigo"
   ]
  ]
 },
 {
  "num": 15,
  "arquivo": "migracao-15-cedula-escolhida-grupo.sql",
  "descricao": "Migração 15: escolher qual cédula depositada representa a pessoa em cada",
  "objetos": [
   [
    "view",
    "salvamentos_depositados_publicos"
   ],
   [
    "view",
    "grupo_comparacao"
   ],
   [
    "column",
    "grupo_membros.salvamento_escolhido_id"
   ]
  ]
 },
 {
  "num": 16,
  "arquivo": "migracao-16-busca-cedula-publica.sql",
  "descricao": "Migração 16: expõe o código da cédula (SLxx-xxxx) na view pública de",
  "objetos": [
   [
    "view",
    "salvamentos_depositados_publicos"
   ]
  ]
 },
 {
  "num": 17,
  "arquivo": "migracao-17-indice-cedula-escolhida-grupo.sql",
  "descricao": "Migração 17: índice na coluna nova de chave estrangeira da migração 15",
  "objetos": [
   [
    "index",
    "grupo_membros_salvamento_escolhido_idx"
   ]
  ]
 },
 {
  "num": 18,
  "arquivo": "migracao-18-admin.sql",
  "descricao": "Migração 18: base do painel do administrador (PROJETO.md, ponto em",
  "objetos": [
   [
    "table",
    "admins"
   ],
   [
    "policy",
    "admins_select_proprio"
   ],
   [
    "function",
    "sou_admin"
   ],
   [
    "table",
    "problemas_reportados"
   ],
   [
    "policy",
    "problemas_select_proprio_ou_admin"
   ],
   [
    "policy",
    "problemas_insert_proprio"
   ],
   [
    "policy",
    "problemas_update_admin"
   ],
   [
    "index",
    "problemas_reportados_status_idx"
   ],
   [
    "table",
    "execucoes_rotina"
   ],
   [
    "policy",
    "execucoes_rotina_select_admin"
   ],
   [
    "function",
    "admin_estatisticas_usuarios"
   ],
   [
    "function",
    "admin_pesquisa_agregada"
   ],
   [
    "function",
    "admin_estatisticas_creditos"
   ]
  ]
 },
 {
  "num": 19,
  "arquivo": "migracao-19-usuario-final.sql",
  "descricao": "Migração 19: acesso do \"Usuário final\" (PROJETO.md, seção 3 — \"parceiro",
  "objetos": [
   [
    "table",
    "usuarios_finais"
   ],
   [
    "policy",
    "usuarios_finais_select_proprio"
   ],
   [
    "function",
    "sou_usuario_final"
   ],
   [
    "function",
    "usuario_final_pesquisa_agregada"
   ]
  ]
 },
 {
  "num": 20,
  "arquivo": "migracao-20-mini-pesquisa.sql",
  "descricao": "Migração 20: mini-pesquisa de cadastro (PROJETO.md, Fase 2.7 — \"o plano",
  "objetos": [
   [
    "column",
    "perfis.mini_pesquisa_respostas"
   ],
   [
    "column",
    "perfis.mini_pesquisa_em"
   ]
  ]
 },
 {
  "num": 21,
  "arquivo": "migracao-21-usuarios-ficticios.sql",
  "descricao": "Migração 21: base pros 155 usuários fictícios de \"cold start\" do Quadro",
  "objetos": [
   [
    "index",
    "perfis_indice_ficticio_idx"
   ],
   [
    "function",
    "contagem_depositos_reais"
   ],
   [
    "view",
    "rascunhos_publicos"
   ],
   [
    "column",
    "perfis.eh_ficticio"
   ],
   [
    "column",
    "perfis.indice_ficticio"
   ]
  ]
 },
 {
  "num": 21,
  "arquivo": "migracao-21-ledger-creditos.sql",
  "descricao": "Migração 21: ledger de créditos + concessão pelo painel do admin.",
  "objetos": [
   [
    "table",
    "transacoes_creditos"
   ],
   [
    "index",
    "transacoes_creditos_perfil_idx"
   ],
   [
    "policy",
    "transacoes_select_proprio_ou_admin"
   ],
   [
    "policy",
    "creditos_conta_select_admin"
   ],
   [
    "function",
    "consumir_credito"
   ],
   [
    "function",
    "conceder_credito"
   ],
   [
    "function",
    "admin_conceder_creditos_por_email"
   ],
   [
    "function",
    "admin_extrato_geral"
   ],
   [
    "function",
    "admin_saldos"
   ]
  ]
 },
 {
  "num": 22,
  "arquivo": "migracao-22-limites-gratis.sql",
  "descricao": "Migração 22: limites do grátis (economia fase 1, etapa 3 —",
  "objetos": [
   [
    "function",
    "gastar_creditos"
   ],
   [
    "function",
    "gastar_creditos_proprio"
   ],
   [
    "function",
    "checar_capacidade_grupo"
   ],
   [
    "trigger",
    "grupo_membros_capacidade"
   ],
   [
    "column",
    "grupos.capacidade"
   ]
  ]
 },
 {
  "num": 22,
  "arquivo": "migracao-22-admin-problemas-nome.sql",
  "descricao": "Migração 22: corrige um bug real no Painel do administrador, aba",
  "objetos": [
   [
    "function",
    "admin_listar_problemas"
   ],
   [
    "index",
    "problemas_reportados_perfil_id_idx"
   ]
  ]
 },
 {
  "num": 23,
  "arquivo": "migracao-23-notificacoes-email.sql",
  "descricao": "Migração 23: preferência de notificação por e-mail (tela Menu, item",
  "objetos": [
   [
    "column",
    "perfis.notif_email"
   ]
  ]
 },
 {
  "num": 23,
  "arquivo": "migracao-23-mediana-contagotas.sql",
  "descricao": "Migração 23: mediana em conta-gotas (economia fase 1, etapa 4 —",
  "objetos": [
   [
    "table",
    "mediana_revelacao"
   ],
   [
    "policy",
    "mediana_select_proprio"
   ],
   [
    "function",
    "registrar_acesso_mediana"
   ],
   [
    "function",
    "acelerar_mediana"
   ]
  ]
 },
 {
  "num": 24,
  "arquivo": "migracao-24-instagram-candidato.sql",
  "descricao": "Migração 24: link de Instagram por candidato, editável só por admin,",
  "objetos": [
   [
    "table",
    "candidato_links"
   ],
   [
    "policy",
    "candidato_links_select_public"
   ],
   [
    "function",
    "admin_definir_instagram_candidato"
   ]
  ]
 },
 {
  "num": 24,
  "arquivo": "migracao-24-vagas-grupo.sql",
  "descricao": "Migração 24: vagas de grupo pagas + teto VIP (economia fase 1, etapa 5",
  "objetos": [
   [
    "function",
    "ampliar_capacidade_grupo"
   ]
  ]
 },
 {
  "num": 25,
  "arquivo": "migracao-25-edicao-cedula.sql",
  "descricao": "Migração 25: edição progressiva de cédula depositada (economia fase 1,",
  "objetos": [
   [
    "function",
    "editar_cedula_depositada"
   ],
   [
    "column",
    "salvamentos.edicoes"
   ],
   [
    "column",
    "salvamentos.editada_em"
   ]
  ]
 },
 {
  "num": 26,
  "arquivo": "migracao-26-convite-marcos.sql",
  "descricao": "Migração 26: convite convertido + marcos de presença (economia fase 1,",
  "objetos": [
   [
    "function",
    "gerar_codigo_convite_perfil"
   ],
   [
    "trigger",
    "perfis_codigo_convite"
   ],
   [
    "function",
    "perfil_por_codigo_convite"
   ],
   [
    "function",
    "conceder_creditos_interno"
   ],
   [
    "function",
    "premiar_convite_no_deposito"
   ],
   [
    "trigger",
    "salvamentos_convite_convertido"
   ],
   [
    "table",
    "presenca_conta"
   ],
   [
    "policy",
    "presenca_select_proprio"
   ],
   [
    "table",
    "marcos_conquistados"
   ],
   [
    "policy",
    "marcos_select_proprio"
   ],
   [
    "function",
    "registrar_presenca"
   ],
   [
    "column",
    "perfis.convidado_por"
   ]
  ]
 },
 {
  "num": 27,
  "arquivo": "migracao-27-estado-palpite.sql",
  "descricao": "Migração 27 (21/08/2026): estado (UF) dos rascunhos da linha de",
  "objetos": [
   [
    "view",
    "rascunhos_publicos"
   ],
   [
    "column",
    "palpites.estado"
   ]
  ]
 },
 {
  "num": 28,
  "arquivo": "migracao-28-desafios-notificacoes.sql",
  "descricao": "Migração 28: Desafios 1×1, notificações e ajuste do prêmio de convite —",
  "objetos": [
   [
    "function",
    "gastar_creditos_proprio"
   ],
   [
    "function",
    "premiar_convite_no_deposito"
   ],
   [
    "table",
    "notificacoes"
   ],
   [
    "index",
    "notificacoes_perfil_idx"
   ],
   [
    "policy",
    "notificacoes_select_proprio"
   ],
   [
    "policy",
    "notificacoes_update_proprio"
   ],
   [
    "function",
    "criar_notificacao_interna"
   ],
   [
    "function",
    "marcar_notificacoes_lidas"
   ],
   [
    "function",
    "contar_notificacoes_nao_lidas"
   ],
   [
    "function",
    "listar_minhas_notificacoes"
   ],
   [
    "function",
    "notificar_convite_convertido"
   ],
   [
    "trigger",
    "salvamentos_notificar_convite"
   ],
   [
    "table",
    "desafios"
   ],
   [
    "index",
    "desafios_criador_idx"
   ],
   [
    "index",
    "desafios_desafiado_idx"
   ],
   [
    "policy",
    "desafios_select_participante"
   ],
   [
    "function",
    "desafios_gratis_restantes"
   ],
   [
    "function",
    "criar_desafio"
   ],
   [
    "function",
    "aceitar_desafio"
   ],
   [
    "function",
    "recusar_desafio"
   ],
   [
    "function",
    "cancelar_desafio"
   ],
   [
    "function",
    "contar_meus_desafios_ativos"
   ],
   [
    "function",
    "expirar_meus_desafios_vencidos"
   ],
   [
    "table",
    "termometro_revelacoes"
   ],
   [
    "policy",
    "termometro_revelacoes_select_proprio"
   ],
   [
    "function",
    "listar_minhas_revelacoes"
   ],
   [
    "function",
    "revelar_candidatos_termometro"
   ]
  ]
 },
 {
  "num": 29,
  "arquivo": "migracao-29-pagamento-real.sql",
  "descricao": "Migração 29: cobrança real pela Loja (Mercado Pago) — 24/08/2026.",
  "objetos": [
   [
    "table",
    "pedidos_pagamento"
   ],
   [
    "index",
    "pedidos_pagamento_perfil_idx"
   ],
   [
    "policy",
    "pedidos_pagamento_select_proprio"
   ],
   [
    "function",
    "registrar_pedido_pagamento"
   ],
   [
    "function",
    "marcar_preferencia_pedido"
   ],
   [
    "function",
    "aprovar_pedido_pagamento"
   ],
   [
    "function",
    "rejeitar_pedido_pagamento"
   ]
  ]
 },
 {
  "num": 30,
  "arquivo": "migracao-30-admin-acesso-total.sql",
  "descricao": "Migração 30: administrador tem acesso total às funções pagas —",
  "objetos": [
   [
    "function",
    "gastar_creditos"
   ]
  ]
 },
 {
  "num": 31,
  "arquivo": "migracao-31-financeiro-valor-faturado.sql",
  "descricao": "Migração 31: \"valor faturado\" no painel Financeiro do admin —",
  "objetos": [
   [
    "function",
    "admin_estatisticas_creditos"
   ]
  ]
 },
 {
  "num": 32,
  "arquivo": "migracao-32-admin-lista-usuarios.sql",
  "descricao": "Migração 32: lista de usuários individuais no painel Financeiro/Usuários",
  "objetos": [
   [
    "function",
    "admin_listar_usuarios"
   ]
  ]
 },
 {
  "num": 33,
  "arquivo": "migracao-33-desafios-candidatos-especificos.sql",
  "descricao": "Migração 33: Desafio 1×1 passa de \"cédula inteira depositada\" pra",
  "objetos": [
   [
    "index",
    "desafios_codigo_key"
   ],
   [
    "function",
    "criar_desafio"
   ],
   [
    "function",
    "aceitar_desafio"
   ],
   [
    "column",
    "desafios.cargo"
   ],
   [
    "column",
    "desafios.codigo"
   ],
   [
    "column",
    "desafios.escopo_candidatos"
   ],
   [
    "column",
    "desafios.votos_criador"
   ],
   [
    "column",
    "desafios.votos_desafiado"
   ]
  ]
 },
 {
  "num": 34,
  "arquivo": "migracao-34-desafiar-por-codigo.sql",
  "descricao": "Migração 34: desafiar por código de usuário, sem precisar estar no",
  "objetos": [
   [
    "function",
    "perfil_publico_por_codigo"
   ]
  ]
 },
 {
  "num": 35,
  "arquivo": "migracao-35-termometro-atomico.sql",
  "descricao": "Migração 35: revelação do Termômetro atômica (débito + revelação numa",
  "objetos": [
   [
    "function",
    "revelar_candidatos_termometro_pago"
   ]
  ]
 },
 {
  "num": 36,
  "arquivo": "migracao-36-bots-admin.sql",
  "descricao": "Migração 36: aba \"Bots\" do painel do administrador — lista de",
  "objetos": [
   [
    "table",
    "bots_config"
   ],
   [
    "policy",
    "bots_config_admin_select"
   ],
   [
    "policy",
    "bots_config_admin_insert"
   ],
   [
    "policy",
    "bots_config_admin_update"
   ],
   [
    "table",
    "bots_referencia"
   ],
   [
    "index",
    "bots_referencia_estado_idx"
   ],
   [
    "index",
    "bots_referencia_ativa_unica_idx"
   ],
   [
    "policy",
    "bots_referencia_admin_select"
   ],
   [
    "policy",
    "bots_referencia_admin_insert"
   ],
   [
    "policy",
    "bots_referencia_admin_update"
   ]
  ]
 },
 {
  "num": 37,
  "arquivo": "migracao-37-analitico.sql",
  "descricao": "Migração 37: aba \"Analítico\" do painel do administrador (nível Sistema)",
  "objetos": [
   [
    "function",
    "admin_analitico"
   ]
  ]
 },
 {
  "num": 38,
  "arquivo": "migracao-38-duelo-recortes.sql",
  "descricao": "Migração 38: Duelo 1×1 — tipos de disputa, visibilidade dos votos e o",
  "objetos": [
   [
    "function",
    "desafio_detalhe"
   ],
   [
    "function",
    "criar_desafio"
   ],
   [
    "function",
    "aceitar_desafio"
   ],
   [
    "column",
    "desafios.tipo_disputa"
   ],
   [
    "column",
    "desafios.votos_visiveis"
   ],
   [
    "column",
    "desafios.eleitos_criador"
   ],
   [
    "column",
    "desafios.eleitos_desafiado"
   ]
  ]
 },
 {
  "num": 39,
  "arquivo": "migracao-39-historico-acoes.sql",
  "descricao": "Migração 39: histórico de ações no fim da aba \"Analítico\" do painel do",
  "objetos": [
   [
    "function",
    "admin_historico_acoes"
   ]
  ]
 },
 {
  "num": 40,
  "arquivo": "migracao-40-duelo-aberto.sql",
  "descricao": "Migração 40: DUELO ABERTO — desafiar quem ainda NÃO está no jogo",
  "objetos": [
   [
    "function",
    "desafio_por_codigo"
   ],
   [
    "function",
    "criar_desafio"
   ],
   [
    "function",
    "aceitar_desafio"
   ],
   [
    "function",
    "desafio_detalhe"
   ]
  ]
 },
 {
  "num": 41,
  "arquivo": "migracao-41-lembrete-duelo.sql",
  "descricao": "============================================================",
  "objetos": [
   [
    "function",
    "lembrar_meus_desafios_parados"
   ],
   [
    "column",
    "desafios.lembrete_em"
   ]
  ]
 },
 {
  "num": 42,
  "arquivo": "migracao-42-duelo-gratis.sql",
  "descricao": "============================================================",
  "objetos": [
   [
    "function",
    "desafios_gratis_restantes"
   ]
  ]
 },
 {
  "num": 43,
  "arquivo": "migracao-43-controle-migracoes.sql",
  "descricao": "Migração 43: controle de migrações (04/09/2026, item \"controle de",
  "objetos": [
   [
    "function",
    "admin_migracoes_status"
   ]
  ]
 },
 {
  "num": 45,
  "arquivo": "migracao-45-duelo-votos-publicos.sql",
  "descricao": "Migração 45: Votos dados DENTRO de um Duelo entram no Termômetro",
  "objetos": [
   [
    "function",
    "duelo_votos_publicos"
   ]
  ]
 },
 {
  "num": 46,
  "arquivo": "migracao-46-historico-acoes-bot-flag.sql",
  "descricao": "Migração 46: filtros client-side no \"Histórico de ações\" da aba",
  "objetos": [
   [
    "function",
    "admin_historico_acoes"
   ]
  ]
 },
 {
  "num": 47,
  "arquivo": "migracao-47-notificar-mudanca-candidatos.sql",
  "descricao": "Migração 47: notificação obrigatória de mudança no elenco de candidatos",
  "objetos": [
   [
    "function",
    "admin_notificar_mudanca_candidatos"
   ]
  ]
 },
 {
  "num": 48,
  "arquivo": "migracao-48-duelo-molde-reutilizavel.sql",
  "descricao": "============================================================",
  "objetos": [
   [
    "index",
    "desafios_modelo_de_idx"
   ],
   [
    "index",
    "desafios_modelo_desafiado_unico"
   ],
   [
    "function",
    "gerar_codigo_duelo"
   ],
   [
    "function",
    "aceitar_desafio"
   ],
   [
    "function",
    "expirar_meus_desafios_vencidos"
   ],
   [
    "function",
    "lembrar_meus_desafios_parados"
   ],
   [
    "function",
    "desafio_por_codigo"
   ],
   [
    "column",
    "desafios.modelo_de"
   ]
  ]
 }
];

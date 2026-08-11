# Backlog — organizado por página

> Fonte da verdade da fila de trabalho. Atualizado por mim (Claude) a cada
> pedido novo ou item concluído — não editar à mão sem avisar, pra não
> perder sincronia com o que já foi de fato implementado.
>
> Cada página tem três blocos: **✅ Concluído**, **🔄 Em andamento**,
> **⬜ Pendente** (pendente já vem na ordem sugerida de execução — de cima
> pra baixo). Pra pedir algo novo, é só falar — eu classifico na página
> certa e coloco na ordem que fizer mais sentido.

_Última atualização: 11/08/2026_

---

## Login / Cadastro

**✅ Concluído**
- Login social com Google (Login e Cadastro), com etapa de completar CPF/CEP/gênero pra quem entra por ele
- CEP no cadastro, com resolução automática de município/UF (ViaCEP)
- Gênero no cadastro (Masculino/Feminino/Outro)
- "Esqueci minha senha"
- Redesenho da tela de Cadastro (telefone, regra de senha, remoção de escopo/mostrar-nome)

**🔄 Em andamento**
- _(nenhum agora)_

**⬜ Pendente**
- _(nenhum agora)_

---

## P02 — Escolha de estado

**✅ Concluído**
- Tela de escolha de estado (27 estados + DF listados, só SC habilitado)

**⬜ Pendente**
1. Ajustar textos: trocar "Gire e solte no seu estado" por "Selecione o estado"; remover o aviso "Lista de candidatos pronta" quando a lista final de 2026 estiver no ar (**avisar antes de executar**)
2. Pré-selecionar o estado de residência usando a UF que já vem do CEP salvo no cadastro
3. Permitir trocar de estado dentro do app + participação multi-estado

---

## P03 — Seleção de candidatos

**✅ Concluído**
- Corrigir sobreposição em "Soma de Votos" / conflito de camadas de fundo
- Botão "zerar" (por partido) só com ícone de borracha
- Selo "SOBRA" com legenda específica por caso e cor sólida
- Vista agrupada por partido (soma de votos + falta-pra-próxima-vaga ao lado do nº de eleitos)
- Bug: editar votos de vários candidatos de um partido não atualizava o painel
- Ajuste do teto de 80% pra nunca suprimir abaixo do voto real de 2022

**🔄 Em andamento**
1. **CRÍTICO** — matemática eleitoral zero-sum na Revisão: votos e condição de eleito precisam se atualizar juntos
2. Bug: botão de autopreenchimento (✦) não aparece em todos os candidatos

**⬜ Pendente**
3. Cabeçalho do cargo trunca texto (ex.: "5 do seu pal...") — mover o filtro pra dentro do card, só ao abrir
4. Padronizar alinhamento das caixas de contagem de eleitos por partido

---

## Revisão / Lobby

**✅ Concluído**
- Habilitar "Impressão/PDF" só depois de salvar
- Botão "Impressão/PDF" virou ícone-only (impressora + avião de papel)
- Aviso "Você não precisa zerar todos os avisos..." começa fechado
- Cards de cargo começam fechados por padrão
- Texto do modal "Dê um nome pra essa lista" corrigido
- Botão "← Ajustar" esclarecido

**⬜ Pendente**
1. Botão salvar/exportar em destaque, canto superior direito do cabeçalho
2. Interruptor pra gerar resumo de Dep. Federal e Senador (hoje só sai o de Dep. Estadual)
3. Permitir escolher qual cédula depositada aparece em cada grupo (hoje é só uma "oficial" global)

---

## Geral / Multi-estado

**⬜ Pendente**
1. Confirmar a regra de vagas de Senador por estado em 2026 (renovação por terços — já mapeado no PROJETO.md, falta só validar a fonte)
2. Ranking "Brasil" — pool geral, independente de quantos estados a pessoa participou

---

## Visual / Identidade

**✅ Concluído**
- Tema escuro com verde neon confirmado (substitui a ideia anterior de tema claro/glassmorphism)

**⬜ Pendente**
1. Padrão sutil de textura de fundo com blur nas bordas, em todas as telas
2. Revisar se falta mais alguma coisa pra fechar de vez a identidade visual antes do lançamento (item antigo, pode já estar resolvido — validar com o usuário)

---

## Estratégico / Negócio

_Itens grandes, sem detalhamento técnico ainda — cada um precisa de uma
conversa própria antes de virar tarefa executável._

**⬜ Pendente**
1. Capacidade operacional do servidor (armazenamento/processamento)
2. Limites do Supabase no plano atual + o que precisa além dele pra crescer
3. Rotina de triagem diária de bugs e correções
4. Apps nativos (iOS e Android), além do site
5. Sistema de monetização via desbloqueio de funções
6. Estratégia de mailing com a base de e-mails já disponível (Deputados do Brasil + vereadores de SC)
7. Criação de e-mail e mídia de divulgação pra captar usuários
8. Criar Instagram do app
9. Desenhar o sistema de rankeamento (pontuação por atividade + acerto de candidatos)
10. Pesquisar viabilidade de registrar a ideia (propriedade intelectual)

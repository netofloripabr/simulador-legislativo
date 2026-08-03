// Lista de estados pra tela de escolha (Prospecção Coletiva). Os 27 têm
// candidatos reais de 2022 carregados (Dep. Estadual, Dep. Federal, Senador
// — ver dados/estados/registro-2022.js) desde 2026-07-25. Distrito Federal
// não elege Dep. Estadual (elege Distrital, cargo que o app não modela) —
// a aba fica vazia (0/0) pra esse estado especificamente, não é bug.
const ESTADOS_BRASIL = [
  { sigla: "SC", nome: "Santa Catarina", disponivel: true },
  { sigla: "AC", nome: "Acre", disponivel: true },
  { sigla: "AL", nome: "Alagoas", disponivel: true },
  { sigla: "AP", nome: "Amapá", disponivel: true },
  { sigla: "AM", nome: "Amazonas", disponivel: true },
  { sigla: "BA", nome: "Bahia", disponivel: true },
  { sigla: "CE", nome: "Ceará", disponivel: true },
  { sigla: "DF", nome: "Distrito Federal", disponivel: true },
  { sigla: "ES", nome: "Espírito Santo", disponivel: true },
  { sigla: "GO", nome: "Goiás", disponivel: true },
  { sigla: "MA", nome: "Maranhão", disponivel: true },
  { sigla: "MT", nome: "Mato Grosso", disponivel: true },
  { sigla: "MS", nome: "Mato Grosso do Sul", disponivel: true },
  { sigla: "MG", nome: "Minas Gerais", disponivel: true },
  { sigla: "PA", nome: "Pará", disponivel: true },
  { sigla: "PB", nome: "Paraíba", disponivel: true },
  { sigla: "PR", nome: "Paraná", disponivel: true },
  { sigla: "PE", nome: "Pernambuco", disponivel: true },
  { sigla: "PI", nome: "Piauí", disponivel: true },
  { sigla: "RJ", nome: "Rio de Janeiro", disponivel: true },
  { sigla: "RN", nome: "Rio Grande do Norte", disponivel: true },
  { sigla: "RS", nome: "Rio Grande do Sul", disponivel: true },
  { sigla: "RO", nome: "Rondônia", disponivel: true },
  { sigla: "RR", nome: "Roraima", disponivel: true },
  { sigla: "SP", nome: "São Paulo", disponivel: true },
  { sigla: "SE", nome: "Sergipe", disponivel: true },
  { sigla: "TO", nome: "Tocantins", disponivel: true },
];

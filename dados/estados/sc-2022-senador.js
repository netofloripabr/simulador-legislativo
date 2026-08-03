// Candidatos a Senador — SC — 2022 (1 das 3 vagas do estado estava em
// disputa nesse ciclo — a outra é renovada em 2026). Tratado a partir dos
// dados abertos do TSE ("votação de candidato por município e zona",
// votacao_candidato_munzona_2022_SC.csv, dadosabertos.tse.jus.br),
// processado por ferramentas/tratar_resultados_2022.py em 2026-07-25.
//
// Mesmo formato de dados/base-2022.js (BASE_2022, Deputado Estadual) — ver
// aquele arquivo para a explicação dos campos.
const BASE_2022_SENADOR_SC = [
  { nome:"PL", vagas2022:1, candidatos:[
    { nome:"Jorge Seif Junior", municipio:"Blumenau", votos:1484110, fonte:"oficial", id:"pl-sc-jorge-seif-junior", eleito2022:true, nomeUrna:"Jorge Seif" },
  ]},
  { nome:"MDB", vagas2022:0, candidatos:[
    { nome:"Celso Maldaner", municipio:"Palhoça", votos:304799, fonte:"oficial", id:"mdb-sc-celso-maldaner", eleito2022:false, nomeUrna:"Celso Maldaner" },
  ]},
  { nome:"NOVO", vagas2022:0, candidatos:[
    { nome:"Luiz Barboza Neto", municipio:"Joinville", votos:99107, fonte:"oficial", id:"novo-sc-luiz-barboza-neto", eleito2022:false, nomeUrna:"Luiz Barboza" },
  ]},
  { nome:"PDT", vagas2022:0, candidatos:[
    { nome:"Hilda Carolina Deola", municipio:"Itajaí", votos:66496, fonte:"oficial", id:"pdt-sc-hilda-carolina-deola", eleito2022:false, nomeUrna:"Hilda Deola" },
  ]},
  { nome:"PSB", vagas2022:0, candidatos:[
    { nome:"Dario Elias Berger", municipio:"Florianópolis", votos:605258, fonte:"oficial", id:"psb-sc-dario-elias-berger", eleito2022:false, nomeUrna:"Dário" },
  ]},
  { nome:"PSD", vagas2022:0, candidatos:[
    { nome:"João Raimundo Colombo", municipio:"Florianópolis", votos:608213, fonte:"oficial", id:"psd-sc-joao-raimundo-colombo", eleito2022:false, nomeUrna:"Raimundo Colombo" },
  ]},
  { nome:"PSOL", vagas2022:0, candidatos:[
    { nome:"Afrânio Tadeu Boppré", municipio:"Florianópolis", votos:116189, fonte:"oficial", id:"psol-sc-afranio-tadeu-boppre", eleito2022:false, nomeUrna:"Afrânio Boppré" },
  ]},
  { nome:"PSTU", vagas2022:0, candidatos:[
    { nome:"Gilmar Salgado dos Santos", municipio:"Florianópolis", votos:2657, fonte:"oficial", id:"pstu-sc-gilmar-salgado-dos-santos", eleito2022:false, nomeUrna:"Gilmar Salgado" },
  ]},
  { nome:"PTB", vagas2022:0, candidatos:[
    { nome:"Clarikennedy Nunes", municipio:"Joinville", votos:443425, fonte:"oficial", id:"ptb-sc-clarikennedy-nunes", eleito2022:false, nomeUrna:"Kennedy Nunes" },
  ]},];

// Elenco fictício usado só no modo demonstração (?demo=1, ver
// interface/01-demo.js) — nomes inventados, sem relação com nenhum
// candidato real de nenhum ano. Escolha determinística por chave: o mesmo
// candidato real sempre vira o mesmo nome fictício, então uma captura de
// tela/vídeo fica consistente entre telas e entre gravações diferentes.
const NOMES_FICTICIOS_DEMO = [
  "Marina Bittencourt", "Rogério Xavier", "Adriana Kellner", "Tiago Fonteles",
  "Camila Andrade", "Bruno Salgado", "Renata Vasconcelos", "Diego Marambaia",
  "Patrícia Wender", "Felipe Aragão", "Larissa Montenegro", "Gustavo Reine",
  "Beatriz Falcão", "Rafael Quintana", "Juliana Prestes", "Eduardo Malta",
  "Vanessa Cordovil", "Lucas Petrov", "Fernanda Aquino", "Marcelo Brant",
  "Isabela Sarmento", "André Kowalski", "Priscila Dornelles", "Thiago Vergueiro",
  "Débora Salum", "Rodrigo Fontenele", "Sabrina Wolff", "Caio Medrado",
  "Natália Bezerra", "Vinícius Homrich", "Cristina Abath", "Leonardo Sardá",
  "Amanda Freitas", "Diogo Carrasco", "Letícia Trombini", "Marcos Vilela",
  "Tatiana Grumann", "Henrique Bousfield", "Vitória Camargo", "Otávio Linhares",
];

function nomeFicticioPara(chave) {
  const s = String(chave || "x");
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return NOMES_FICTICIOS_DEMO[h % NOMES_FICTICIOS_DEMO.length];
}

"""
Helper interno (não faz parte do fluxo normal do usuário): lê o arquivo
.txt salvo automaticamente quando o resultado do javascript_tool do
navegador excede o limite de tokens, extrai o JSON {cargo: [candidatos]}
e grava em cache/{cargo}.json pra alimentar conferir_rrc.py --cache.

Uso:
    python3 _cache_from_toolresult.py <arquivo.txt> <dir_cache_saida>
"""
import json
import sys
from pathlib import Path

def main():
    arq_txt, dir_saida = sys.argv[1], sys.argv[2]
    conteudo = Path(arq_txt).read_text(encoding="utf-8")
    blocos = json.loads(conteudo)
    texto = blocos[0]["text"]
    marcador = "\n\n(captured at origin"
    if marcador in texto:
        texto = texto[:texto.index(marcador)]
    dados = json.loads(texto)
    if isinstance(dados, str):
        dados = json.loads(dados)
    Path(dir_saida).mkdir(parents=True, exist_ok=True)
    for cargo, lista in dados.items():
        (Path(dir_saida) / f"{cargo}.json").write_text(
            json.dumps(lista, ensure_ascii=False), encoding="utf-8"
        )
    print(f"OK: {len(dados)} cargos gravados em {dir_saida}")

if __name__ == "__main__":
    main()

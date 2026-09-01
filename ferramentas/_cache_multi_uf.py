"""
Helper interno: lê o arquivo .txt salvo automaticamente pelo javascript_tool
(quando o resultado excede o limite de tokens) contendo {UF: {cargo: [candidatos]}}
pra várias UFs de uma vez, grava cache/{uf}/{cargo}.json pra cada uma e roda
conferir_rrc.py --cache pra cada UF.

Uso:
    python3 _cache_multi_uf.py <arquivo.txt> <dir_cache_base>
"""
import json
import subprocess
import sys
from pathlib import Path

def main():
    arq_txt, dir_base = sys.argv[1], sys.argv[2]
    conteudo = Path(arq_txt).read_text(encoding="utf-8")
    blocos = json.loads(conteudo)
    texto = blocos[0]["text"]
    marcador = "\n\n(captured at origin"
    if marcador in texto:
        texto = texto[:texto.index(marcador)]
    dados = json.loads(texto)
    if isinstance(dados, str):
        dados = json.loads(dados)

    for uf, por_cargo in dados.items():
        cache_dir = Path(dir_base) / uf
        cache_dir.mkdir(parents=True, exist_ok=True)
        for cargo, lista in por_cargo.items():
            (cache_dir / f"{cargo}.json").write_text(
                json.dumps(lista, ensure_ascii=False), encoding="utf-8"
            )
        prov = Path("dados/estados") / f"{uf.lower()}-2026-provisorio.js"
        if not prov.exists():
            print(f"[{uf}] SEM provisorio, pulando.")
            continue
        r = subprocess.run(
            ["python3", "ferramentas/conferir_rrc.py", "--uf", uf,
             "--cache", str(cache_dir), "--provisorio", str(prov), "--saida", "dados/estados"],
            capture_output=True, text=True
        )
        print(f"=== {uf} ===")
        print(r.stdout)
        if r.returncode != 0:
            print("ERRO:", r.stderr)

if __name__ == "__main__":
    main()

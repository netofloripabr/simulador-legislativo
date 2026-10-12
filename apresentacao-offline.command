#!/bin/bash
# Abre o SimulaLEGIS sem internet: serve a pasta do projeto neste Mac e abre a página Parlamentares.
# Uso: dois cliques neste arquivo. Para encerrar, feche a janela do Terminal.
cd "$(dirname "$0")"
(sleep 1; open "http://localhost:8800/painel/novos.html") &
python3 -m http.server 8800

// Extrai o texto de um PDF com o PDFKit do macOS (sem dependências). Uso: swift pdftexto.swift arquivo.pdf > arquivo.txt
import PDFKit
guard CommandLine.arguments.count > 1, let d = PDFDocument(url: URL(fileURLWithPath: CommandLine.arguments[1])) else { exit(1) }
for i in 0..<d.pageCount { if let t = d.page(at: i)?.string { print(t); print("\u{0C}") } }

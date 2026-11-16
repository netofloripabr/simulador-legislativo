// Extrai o texto de PDFs (pautas das comissões) com o PDFKit do macOS e imprime {"<id>": "texto"} em JSON.
// Uso: swift pdftexto.swift a.pdf b.pdf …   (o id é o nome do arquivo sem .pdf)
import Foundation
import PDFKit
var R: [String: String] = [:]
for p in CommandLine.arguments.dropFirst() {
  let u = URL(fileURLWithPath: p), id = u.deletingPathExtension().lastPathComponent
  R[id] = PDFDocument(url: u)?.string ?? ""
}
let d = try! JSONSerialization.data(withJSONObject: R, options: [])
FileHandle.standardOutput.write(d)

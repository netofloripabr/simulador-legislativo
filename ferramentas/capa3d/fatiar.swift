// Fatia os mosaicos da capa 3D (relevo e satélite) em pedaços de 256 px, para cada visita baixar só o que a vista usa
// (DESIGN-GABINETE.md §5.1; aprovado pelo usuário em 16/11/2026 pela REGRA DE OURO: +~29 MB no Pages, ~3–4 MB por 1ª visita).
// Uso: swift ferramentas/capa3d/fatiar.swift <pasta dos mosaicos> <pasta de saída>
// Gera <saída>/{rel,sat}/<z>/<x>-<y>.{png,jpg} e <saída>/indice.json.
// - Níveis prontos: z4, z7 e z10 (cortes exatos, sem reamostrar).
// - Nível z8 é feito a partir do z10: relevo com vizinho mais próximo (o relevo é codificado nas cores — "Terrarium" —
//   e interpolar estragaria a altura); satélite com interpolação boa. Pedaços de borda (parciais) saem em PNG com fundo
//   transparente, para não cobrir o nível mais grosso.
import Foundation
import CoreGraphics
import ImageIO
import UniformTypeIdentifiers

let args = CommandLine.arguments
guard args.count >= 3 else { print("uso: swift fatiar.swift <mosaicos> <saida>"); exit(1) }
let ENT = URL(fileURLWithPath: args[1]), SAI = URL(fileURLWithPath: args[2])

func abre(_ nome: String) -> CGImage {
  let src = CGImageSourceCreateWithURL(ENT.appendingPathComponent(nome) as CFURL, nil)!
  return CGImageSourceCreateImageAtIndex(src, 0, nil)!
}
func grava(_ img: CGImage, _ url: URL, jpg: Bool) {
  try? FileManager.default.createDirectory(at: url.deletingLastPathComponent(), withIntermediateDirectories: true)
  let tipo = (jpg ? UTType.jpeg : UTType.png).identifier as CFString
  let d = CGImageDestinationCreateWithURL(url as CFURL, tipo, 1, nil)!
  CGImageDestinationAddImage(d, img, jpg ? [kCGImageDestinationLossyCompressionQuality: 0.82] as CFDictionary : nil)
  CGImageDestinationFinalize(d)
}
// mosaico (várias imagens lado a lado) como uma imagem só
func junta(_ nomes: [String], w: Int, h: Int) -> CGImage {
  if nomes.count == 1 { return abre(nomes[0]) }
  let ctx = CGContext(data: nil, width: w * 256, height: h * 256, bitsPerComponent: 8, bytesPerRow: 0, space: CGColorSpaceCreateDeviceRGB(), bitmapInfo: CGImageAlphaInfo.premultipliedLast.rawValue)!
  ctx.interpolationQuality = .none; var x = 0
  for n in nomes { let im = abre(n); ctx.draw(im, in: CGRect(x: x, y: h * 256 - im.height, width: im.width, height: im.height)); x += im.width }
  return ctx.makeImage()!
}
var indice: [String: [String: [Int]]] = ["rel": [:], "sat": [:]]
var parciais: [String] = []

func corta(_ tipo: String, _ z: Int, _ im: CGImage, x0: Int, y0: Int, jpg: Bool) {
  let w = im.width / 256, h = im.height / 256
  for j in 0..<h { for i in 0..<w {
    let p = im.cropping(to: CGRect(x: i * 256, y: j * 256, width: 256, height: 256))!
    grava(p, SAI.appendingPathComponent("\(tipo)/\(z)/\(x0 + i)-\(y0 + j).\(jpg ? "jpg" : "png")"), jpg: jpg)
  } }
  indice[tipo]![String(z)] = [x0, y0, w, h]
  print(tipo, z, "\(w)x\(h) pedaços")
}
// z8 a partir do z10 (x0,y0 do z10; cada pedaço z8 = 4×4 do z10)
func reduz(_ tipo: String, _ im: CGImage, x0: Int, y0: Int, jpg: Bool) {
  let w = im.width / 256, h = im.height / 256
  let X0 = Int(floor(Double(x0) / 4)), Y0 = Int(floor(Double(y0) / 4)), X1 = Int(floor(Double(x0 + w - 1) / 4)), Y1 = Int(floor(Double(y0 + h - 1) / 4))
  for Y in Y0...Y1 { for X in X0...X1 {
    // região do z10 coberta por este pedaço z8, recortada ao que existe
    let ax = max(X * 4, x0), bx = min(X * 4 + 4, x0 + w), ay = max(Y * 4, y0), by = min(Y * 4 + 4, y0 + h)
    let parcial = ax != X * 4 || bx != X * 4 + 4 || ay != Y * 4 || by != Y * 4 + 4
    let reg = im.cropping(to: CGRect(x: (ax - x0) * 256, y: (ay - y0) * 256, width: (bx - ax) * 256, height: (by - ay) * 256))!
    let ctx = CGContext(data: nil, width: 256, height: 256, bitsPerComponent: 8, bytesPerRow: 0, space: CGColorSpaceCreateDeviceRGB(), bitmapInfo: CGImageAlphaInfo.premultipliedLast.rawValue)!
    ctx.interpolationQuality = tipo == "rel" ? .none : .high
    ctx.clear(CGRect(x: 0, y: 0, width: 256, height: 256))
    // CoreGraphics desenha de baixo para cima: converter a posição do topo
    let dx = Double(ax - X * 4) * 64, dyTopo = Double(ay - Y * 4) * 64, dw = Double(bx - ax) * 64, dh = Double(by - ay) * 64
    ctx.draw(reg, in: CGRect(x: dx, y: 256 - dyTopo - dh, width: dw, height: dh))
    let usaJpg = jpg && !parcial
    grava(ctx.makeImage()!, SAI.appendingPathComponent("\(tipo)/8/\(X)-\(Y).\(usaJpg ? "jpg" : "png")"), jpg: usaJpg)
    if parcial && jpg { parciais.append("\(tipo)/8/\(X)-\(Y)") }
  } }
  indice[tipo]!["8"] = [X0, Y0, X1 - X0 + 1, Y1 - Y0 + 1]
  print(tipo, 8, "\(X1 - X0 + 1)x\(Y1 - Y0 + 1) pedaços (\(parciais.count) parciais em png)")
}

let r10 = junta(["relevo-10-a.png", "relevo-10-b.png"], w: 19, h: 14), s10 = abre("satelite-10.jpg")
corta("rel", 4, abre("relevo-4.png"), x0: 3, y0: 7, jpg: false)
corta("rel", 7, abre("relevo-7.png"), x0: 41, y0: 69, jpg: false)
corta("rel", 10, r10, x0: 357, y0: 587, jpg: false)
reduz("rel", r10, x0: 357, y0: 587, jpg: false)
corta("sat", 4, abre("satelite-4.jpg"), x0: 3, y0: 7, jpg: true)
corta("sat", 7, abre("satelite-7.jpg"), x0: 41, y0: 69, jpg: true)
corta("sat", 10, s10, x0: 357, y0: 587, jpg: true)
reduz("sat", s10, x0: 357, y0: 587, jpg: true)

let saida: [String: Any] = ["fonte": "relevo: AWS Terrain Tiles (Terrarium); satélite: EOxCloudless 2016 (Sentinel-2, CC BY 4.0). Gerado por ferramentas/capa3d/fatiar.swift.", "niveis": indice, "png_parciais": parciais]
let js = try! JSONSerialization.data(withJSONObject: saida, options: [.sortedKeys])
try! js.write(to: SAI.appendingPathComponent("indice.json"))
print("ok")

import struct
def ler_dbf(p):
  f=open(p,'rb');h=f.read(32);n,hl,rl=struct.unpack('<IHH',h[4:12]);campos=[]
  while True:
    d=f.read(32)
    if d[0]==0x0D: break
    campos.append((d[:11].split(b'\0')[0].decode(),d[11:12].decode(),d[16]))
  f.seek(hl);out=[]
  for _ in range(n):
    r=f.read(rl);i=1;o={}
    for nm,t,ln in campos: o[nm]=r[i:i+ln].decode('utf-8','replace').strip();i+=ln
    out.append(o)
  return out
def ler_shp(p):
  b=open(p,'rb').read();i=100;out=[]
  while i<len(b):
    _,cl=struct.unpack('>II',b[i:i+8]);c=b[i+8:i+8+cl*2];i+=8+cl*2
    st=struct.unpack('<i',c[:4])[0]
    if st==0: out.append([]);continue
    np_,npt=struct.unpack('<ii',c[36:44]);parts=list(struct.unpack('<%di'%np_,c[44:44+4*np_]));o=44+4*np_
    pts=[struct.unpack('<dd',c[o+16*k:o+16*k+16]) for k in range(npt)];parts.append(npt)
    out.append([pts[parts[k]:parts[k+1]] for k in range(np_)])
  return out

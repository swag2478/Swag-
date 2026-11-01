# python3 -I tools/compress.py src.pdf dst.pdf : recompresse les images (le texte et les tracés ne changent pas)
import sys,pymupdf,os
src,dst=sys.argv[1],sys.argv[2]
d=pymupdf.open(src)
try:d.rewrite_images(dpi_threshold=170,dpi_target=150,quality=78)
except Exception as e:pass
d.save(dst+'.tmp',garbage=4,deflate=True,deflate_images=True,deflate_fonts=True)
if os.path.getsize(dst+'.tmp')<os.path.getsize(src):os.replace(dst+'.tmp',dst)
else:
  os.remove(dst+'.tmp')
  import shutil;shutil.copyfile(src,dst)

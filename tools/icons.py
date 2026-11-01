# python3 -I tools/icons.py : dessine les icônes de l'app (src/icons/*.png)
import os
from PIL import Image, ImageDraw, ImageFont
OUT=os.path.join(os.path.dirname(os.path.abspath(__file__)),'..','src','icons')
FONT='/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf'
def icon(size,pad=0.0,round_=True):
    S=size*4;im=Image.new('RGBA',(S,S),(0,0,0,0));d=ImageDraw.Draw(im)
    if round_:d.rounded_rectangle([0,0,S-1,S-1],radius=int(S*.22),fill=(22,22,27,255))
    else:d.rectangle([0,0,S,S],fill=(22,22,27,255))
    k=1-2*pad;f=ImageFont.truetype(FONT,int(S*.62*k))
    bb=d.textbbox((0,0),'s',font=f);w,h=bb[2]-bb[0],bb[3]-bb[1]
    x=(S-w)/2-bb[0]-S*.06*k;y=(S-h)/2-bb[1]
    d.text((x,y),'s',font=f,fill=(255,255,255,255))
    r=S*.075*k;cx=x+bb[2]+r*1.2;cy=y+bb[3]-r
    d.ellipse([cx-r,cy-r,cx+r,cy+r],fill=(215,38,61,255))
    return im.resize((size,size),Image.LANCZOS)
icon(192).save(os.path.join(OUT,'icon-192.png'))
icon(512).save(os.path.join(OUT,'icon-512.png'))
icon(512,pad=.12,round_=False).save(os.path.join(OUT,'icon-maskable-512.png'))
icon(180,round_=False).convert('RGB').save(os.path.join(OUT,'apple-touch-icon.png'))
print('ok')

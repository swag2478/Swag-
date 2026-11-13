# python3 build.py : assemble le site autonome dans dist/ (aucune dépendance : Python 3 seul).
# Publier le dossier dist/ tel quel (Cloudflare Pages, Netlify…). Voir DEPLOIEMENT.md.
import os, shutil, hashlib, json
ROOT = os.path.dirname(os.path.abspath(__file__))
SRC, DIST = os.path.join(ROOT, 'src'), os.path.join(ROOT, 'dist')
s = lambda p: open(os.path.join(SRC, p), encoding='utf8').read()

HEAD = '''<!doctype html>
<html lang="fr"><head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<title>Swag</title>
<meta name="description" content="Entraînement aux annales corrigées : réponses masquées, barème EDN, carnet d'erreurs, sujet vierge. Tes PDF restent sur ton appareil.">
<meta name="referrer" content="no-referrer">
<meta name="robots" content="noindex">
<meta name="theme-color" content="#ffffff" media="(prefers-color-scheme: light)">
<meta name="theme-color" content="#1a1a1f" media="(prefers-color-scheme: dark)">
<link rel="manifest" href="manifest.webmanifest">
<link rel="icon" type="image/png" href="icons/icon-192.png">
<link rel="apple-touch-icon" href="icons/apple-touch-icon.png">
<meta name="mobile-web-app-capable" content="yes">
<meta name="apple-mobile-web-app-capable" content="yes">
<meta name="apple-mobile-web-app-title" content="Swag">
<meta name="apple-mobile-web-app-status-bar-style" content="default">
<script>if(window.top!==window.self){document.documentElement.innerHTML='<p style="font:16px system-ui;padding:20px">Swag ne s\u2019ouvre pas dans un cadre : <a href="'+location.href.replace(/"/g,'')+'" target="_top">ouvrir Swag</a>.</p>';throw new Error('cadre')}</script>
<style>:root{color-scheme:light;box-sizing:border-box;padding-top:env(safe-area-inset-top,0px);padding-bottom:env(safe-area-inset-bottom,0px)}body{margin:0;font:14px system-ui}img{max-width:100%}[hidden]{display:none!important}</style>
'''
SW_REG = '''<script>
if("serviceWorker" in navigator&&(location.protocol==="https:"||location.hostname==="localhost"||location.hostname==="127.0.0.1"))addEventListener("load",()=>navigator.serviceWorker.register("sw.js").catch(()=>{}));
</script>
'''

def build():
    if os.path.isdir(DIST):
        shutil.rmtree(DIST)
    os.makedirs(os.path.join(DIST, 'icons'))
    js = lambda f: '<script>\n' + s(f) + '\n</script>\n'
    html = (HEAD + s('style.html') + '</head>\n<body>\n' + s('shell.html')
            + js('meta.js') + js('parse3.js') + js('check-core.js') + js('app.js') + js('auth.js') + SW_REG
            + '</body></html>\n')
    assert 'window.claude' not in html and 'CATALOG' not in html, 'reste de la version artefact'
    # politique de sécurité du contenu : seuls les scripts de ce fichier (empreintes) et des deux CDN figés s'exécutent ;
    # un texte piégé (nom de fichier, sauvegarde, PDF) ne peut donc pas lancer de script même s'il échappait à l'échappement
    import re, base64
    hashes = ["'sha256-%s'" % base64.b64encode(hashlib.sha256(m.encode('utf8')).digest()).decode()
              for m in re.findall(r'<script>(.*?)</script>', html, re.S)]
    sb = re.search(r'supabaseUrl:\s*"(https://[^"]+)"', s('config.js'))
    sb = sb.group(1) if sb else ''
    csp = ("default-src 'self'; script-src 'self' https://cdnjs.cloudflare.com https://cdn.jsdelivr.net " + ' '.join(hashes)
           + "; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' data: https://fonts.gstatic.com"
           + "; img-src 'self' data: blob:; worker-src 'self' blob:; connect-src 'self' https://cdnjs.cloudflare.com https://cdn.jsdelivr.net https://fonts.googleapis.com https://fonts.gstatic.com"
           + ' https://*.supabase.co' + (' ' + sb if sb and not sb.endswith('.supabase.co') else '') + "; object-src 'none'; base-uri 'none'; form-action 'none'")
    html = html.replace('<meta charset="utf-8">', '<meta charset="utf-8">\n<meta http-equiv="Content-Security-Policy" content="%s">' % csp, 1)
    open(os.path.join(DIST, 'index.html'), 'w', encoding='utf8').write(html)
    for f in ['config.js', 'manifest.webmanifest', '_headers']:
        shutil.copyfile(os.path.join(SRC, f), os.path.join(DIST, f))
    for f in sorted(os.listdir(os.path.join(SRC, 'icons'))):
        shutil.copyfile(os.path.join(SRC, 'icons', f), os.path.join(DIST, 'icons', f))
    # version du service worker = empreinte de tout ce qui est publié (sauf config.js, relu en réseau d'abord)
    h = hashlib.sha256()
    for dp, _, fs in sorted(os.walk(DIST)):
        for f in sorted(fs):
            if f != 'config.js':
                h.update(f.encode()); h.update(open(os.path.join(dp, f), 'rb').read())
    ver = h.hexdigest()[:12]
    open(os.path.join(DIST, 'sw.js'), 'w', encoding='utf8').write(s('sw.js').replace('__BUILD__', ver))
    json.loads(s('manifest.webmanifest'))
    print('dist/index.html : %d octets · version %s' % (len(html), ver))

if __name__ == '__main__':
    build()

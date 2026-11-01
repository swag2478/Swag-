# Assemble dist/index.html à partir de src/ (version actuelle = version artefact, à adapter : voir CLAUDE.md)
import os
s=lambda p:open(os.path.join('src',p),encoding='utf8').read()
os.makedirs('dist',exist_ok=True)
html=s('style.html')+s('shell.html')+"<script>const CATALOG=[];</script>\n<script>\n"+s('parse3.js')+"\n</script>\n<script>\n"+s('check-core.js')+"\n</script>\n<script>\n"+s('app.js')+"\n</script>\n"
open('dist/index.html','w',encoding='utf8').write(html);print(len(html))

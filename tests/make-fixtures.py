# python3 -I tests/make-fixtures.py : écrit des corrigés FICTIFS dans tests/fixtures/ (ignoré par git).
# Le contenu est inventé : il reproduit seulement la mise en page des trois formats lus par src/parse3.js
# (1 « Valide / Faux » UNESS, 2 « Réponse attendue » avec cases en texte, 2 bis cases dessinées en couleur).
# Les vrais corrigés de l'étudiant peuvent être ajoutés dans le même dossier : les tests les prennent aussi.
import os, shutil
from reportlab.pdfgen import canvas
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, 'fixtures')
os.makedirs(OUT, exist_ok=True)
for f in os.listdir(OUT):
    if f.startswith('fx-'):
        os.remove(os.path.join(OUT, f))
pdfmetrics.registerFont(TTFont('DV', '/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf'))
pdfmetrics.registerFont(TTFont('DVB', '/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf'))
W, H = 595.0, 842.0


class Doc:
    def __init__(self, name, title=None):
        self.path = os.path.join(OUT, name)
        self.c = canvas.Canvas(self.path, pagesize=(W, H))
        if title:
            self.c.setTitle(title)
        self.page = 1

    def t(self, x, y, s, size=11, bold=False, font=None):
        self.c.setFont(font or ('DVB' if bold else 'DV'), size)
        self.c.drawString(x, H - y, s)

    def box(self, x, y, w, h, rgb):
        self.c.setFillColorRGB(*rgb)
        self.c.rect(x, H - y - h, w, h, stroke=0, fill=1)
        self.c.setFillColorRGB(0, 0, 0)

    def new_page(self):
        self.c.showPage()
        self.page += 1

    def save(self):
        self.c.save()
        return self.path


# ---------------- format 1 : UNESS « Valide / Faux » ----------------
def f1_header(d, ref):
    d.t(40, 40, 'Référence : ' + ref, 9)
    d.t(40, 818, 'Auteurs : collège fictif · Relecteurs : équipe de test', 8)


def f1_qcm(d, y, n, typ, stem, props, comment=None):
    """props : liste de (coché, mention, texte, justification ou None)"""
    d.t(40, y, 'Question %d :' % n, 12, True)
    d.t(150, y, '(Type: %s)' % typ, 11)
    y += 20
    for line in stem:
        d.t(40, y, line, 11)
        y += 15
    y += 4
    for i, (ok, label, text, just) in enumerate(props):
        L = chr(65 + i)
        d.t(44, y, '☑' if ok else '☐', 11)
        d.t(62, y, label, 8)
        d.t(112, y, L + '.', 11, True)
        d.t(140, y, text, 11)
        y += 15
        if just:
            d.t(140, y, just, 8)
            y += 12
        y += 3
    if comment:
        y += 4
        d.t(40, y, 'Commentaire pédagogique de correction', 11, True)
        y += 15
        for line in comment:
            d.t(40, y, line, 11)
            y += 15
    return y + 16


def f1_qroc(d, y, n, stem, answers):
    d.t(40, y, 'Question %d :' % n, 12, True)
    d.t(150, y, '(Type: QROC)', 11)
    y += 20
    for line in stem:
        d.t(40, y, line, 11)
        y += 15
    y += 6
    d.t(40, y, 'Réponses valides', 11, True)
    y += 15
    d.t(40, y, ' ; '.join(answers), 11)
    return y + 30


def f1_tcs(d, y, n, hyp, experts):
    d.t(40, y, 'Question %d :' % n, 12, True)
    d.t(150, y, '(Type: TCS)', 11)
    y += 20
    for line in hyp:
        d.t(40, y, line, 11)
        y += 15
    y += 4
    labels = ['Très négatif', 'Négatif', 'Ni plus ni moins', 'Positif', 'Très positif']
    best = max(experts)
    for i, (lab, ex) in enumerate(zip(labels, experts)):
        d.t(44, y, '◉' if ex == best else '◎', 11)
        d.t(62, y, '(%d Experts)' % ex, 8)
        d.t(112, y, chr(65 + i) + '.', 11, True)
        d.t(140, y, lab, 11)
        y += 18
    return y + 16


def make_f1(name, ue, ref, bad_qru=False, reveal_in_enonce=False, title=None):
    d = Doc(name, title)
    f1_header(d, ref)
    d.t(40, 70, "Élément d'épreuve 1", 12, True)
    d.t(200, 70, 'Dossier progressif', 11)
    y = 92
    en = ['Un patient fictif de 62 ans consulte pour une dyspnée d\'effort apparue il y a trois mois.',
          'Il n\'a pas d\'antécédent notable. L\'examen clinique est décrit dans les questions.']
    if reveal_in_enonce:
        en.append('Valide')
    for line in en:
        d.t(40, y, line, 11)
        y += 15
    y += 12
    y = f1_qcm(d, y, 1, 'QRM', ['Quels examens demandez-vous en première intention ?'], [
        (True, 'Valide', 'Électrocardiogramme', 'Justification : examen simple et indispensable.'),
        (False, 'Faux', 'Scintigraphie osseuse', 'Justification : sans rapport avec le tableau.'),
        (True, 'Valide', 'Radiographie thoracique', None),
        (False, 'Faux', 'Ponction lombaire', 'Justification : aucune indication.'),
        (True, 'Valide', 'Bilan biologique standard', None),
    ], comment=['Le bilan initial reste simple et non invasif.'])
    y = f1_qcm(d, y, 2, 'QRU', ['Quel est le diagnostic le plus probable ?'], [
        (False, 'Faux', 'Asthme', None),
        (True, 'Valide', 'Insuffisance cardiaque', 'Justification : le tableau est typique.'),
        (bad_qru, 'Valide' if bad_qru else 'Faux', 'Embolie pulmonaire', None),
        (False, 'Faux', 'Pneumothorax', None),
    ])
    y = f1_qroc(d, y, 3, ['Quel dosage biologique confirme l\'orientation ? (un mot)'], ['BNP', 'NT-proBNP', 'peptide natriurétique'])
    d.new_page()
    f1_header(d, ref)
    y = 70
    y = f1_tcs(d, y, 4, ['Si vous pensiez à une insuffisance cardiaque', 'et que vous trouvez une fraction d\'éjection à 30 %,',
                         'cette hypothèse devient :'], [0, 0, 1, 4, 9])
    y = f1_qcm(d, y, 5, 'QRP', ['Choisissez les 2 traitements de fond prioritaires (2 réponses attendues).'], [
        (True, 'Indispensable', 'Bêtabloquant', None),
        (False, 'Faux', 'Antibiotique', 'Justification : aucune infection.'),
        (True, 'Valide', 'Inhibiteur de l\'enzyme de conversion', None),
        (False, 'Inacceptable', 'Anti-inflammatoire non stéroïdien', 'Justification : aggrave la rétention hydrosodée.'),
    ])
    return d.save()


# ---------------- format 2 : « Réponse attendue » ----------------
def f2_footer(d, n, tot):
    d.t(285, 820, '%d / %d' % (n, tot), 9)


def f2_head(d, y, n, label):
    d.t(40, y, 'Question %d' % n, 12, True)
    d.t(380, y, label, 10)
    return y + 22


def f2_qcm(d, y, n, label, stem, props, colored=False, comment=None):
    y = f2_head(d, y, n, label)
    for line in stem:
        d.t(40, y, line, 11)
        y += 15
    y += 6
    for i, (ok, text, tag) in enumerate(props):
        d.t(42, y, chr(65 + i), 11, True)
        if colored:
            d.box(60, y - 9, 10, 10, (0.15, 0.65, 0.3) if ok else (0.85, 0.15, 0.2))
        else:
            d.t(58, y, '☑' if ok else '☐', 11)
        if tag:
            d.t(76, y, tag, 6)
        d.t(130, y, text, 11)
        y += 20
    if comment:
        y += 2
        d.t(40, y, 'Commentaire', 11, True)
        y += 15
        for line in comment:
            d.t(40, y, line, 11)
            y += 15
    return y + 14


def f2_qroc(d, y, n, stem, answers):
    y = f2_head(d, y, n, 'Question à réponse ouverte et courte')
    for line in stem:
        d.t(40, y, line, 11)
        y += 15
    y += 6
    d.t(40, y, 'Réponse attendue', 11, True)
    y += 15
    d.t(40, y, ' ; '.join(answers), 11)
    return y + 28


def f2_tcs(d, y, n, hyp, experts):
    y = f2_head(d, y, n, 'Test de concordance de script')
    for line in hyp:
        d.t(40, y, line, 11)
        y += 15
    y += 6
    d.t(330, y, 'Réponses des experts', 10, True)
    y += 16
    labels = ['Très négatif', 'Négatif', 'Ni plus ni moins', 'Positif', 'Très positif']
    tot = sum(experts)
    for lab, ex in zip(labels, experts):
        d.t(70, y, lab, 11)
        d.t(340, y, '%d / %d' % (ex, tot), 8)
        y += 18
    return y + 14


def make_f2(name, colored=False, title_line=None, title=None, variant=0):
    d = Doc(name, title)
    y = 40
    if title_line:
        d.t(40, y, title_line, 16, True)
        y += 30
    d.t(40, y, 'DP 1 - Dossier progressif', 14, True)
    y += 22
    for line in ['Une patiente fictive de 34 ans consulte pour une toux fébrile depuis cinq jours.',
                 'Température 39 °C, fréquence respiratoire 24 / min.' if variant == 0 else 'Température 38,5 °C, saturation 93 %.']:
        d.t(40, y, line, 11)
        y += 15
    y += 12
    y = f2_qcm(d, y, 1, 'Question à réponses multiples', ['Quels éléments recherchez-vous à l\'examen ?'], [
        (True, 'Crépitants en foyer', None), (False, 'Souffle cardiaque diastolique', None),
        (True, 'Signes de gravité respiratoire', None), (False, 'Hépatomégalie', None)],
        colored=colored, comment=['La recherche de signes de gravité conditionne l\'orientation.'])
    y = f2_qroc(d, y, 2, ['Quel germe est le plus fréquent dans cette situation ? (un mot)'], ['pneumocoque', 'Streptococcus pneumoniae'])
    y = f2_qcm(d, y, 3, 'Question à réponse unique', ['Quel examen d\'imagerie demandez-vous ?'], [
        (False, 'Scanner cérébral', None), (True, 'Radiographie thoracique', None), (False, 'IRM lombaire', None)],
        colored=colored)
    f2_footer(d, 1, 2)
    d.new_page()
    y = 40
    y = f2_tcs(d, y, 4, ['Si vous pensiez à une pneumonie bactérienne', 'et que la CRP est à 250 mg/L,', 'cette hypothèse devient :'], [0, 1, 1, 5, 3])
    d.t(40, y, 'Questions isolées', 14, True)
    y += 24
    y = f2_qcm(d, y, 5, 'Question à réponses multiples', ['Parmi ces vaccins, lesquels sont recommandés chez l\'adulte de 65 ans ?'], [
        (True, 'Grippe saisonnière', None), (False, 'BCG', None), (True, 'Pneumocoque', None), (False, 'Fièvre jaune', None)],
        colored=colored)
    f2_footer(d, 2, 2)
    return d.save()


def make_empty(name):
    d = Doc(name)
    d.t(40, 60, 'Ceci est un document sans question corrigée.', 12)
    d.t(40, 80, 'Il ne contient ni proposition ni réponse attendue.', 11)
    return d.save()


paths = [
    make_f1('fx-Corrige_Cardio_MM1_Nov_25.pdf', 'Cardiologie', 'MM1 Cardiologie novembre 2025'),
    make_f1('fx-MM2-Nephro-Juin-2024.pdf', 'Néphrologie', 'MM2 Néphrologie juin 2024', bad_qru=True),
    make_f2('fx-MM1_Pneumo_2023-12.pdf'),
    make_f2('fx-mm2-pedia-mars-2025-couleur.pdf', colored=True, variant=1),
    make_f2('fx-scan_003.pdf', title_line='Maladies infectieuses – MM2 – juin 2024', variant=1),
    make_f2('fx-document.pdf', variant=2),
    make_f1('fx-Psy-revele.pdf', 'Psychiatrie', 'MM1 Psychiatrie', reveal_in_enonce=True),
    make_empty('fx-Dermato-vide.pdf'),
]
shutil.copyfile(os.path.join(OUT, 'fx-MM1_Pneumo_2023-12.pdf'), os.path.join(OUT, 'fx-copie-pneumo.pdf'))
with open(os.path.join(OUT, 'fx-corrompu.pdf'), 'wb') as f:
    f.write(b'%PDF-1.4\n' + bytes(range(256)) * 8)
print('\n'.join(sorted(f for f in os.listdir(OUT) if f.startswith('fx-'))))

# Generates src/skins.css: the seven extra looks players pick in ☰ → Theme (web app only), each with light and dark
# colour tokens, title fonts, the line under the header, the background grid and a textured roll sheet and tooltip.
# usage: python3 tools/gen-skins.py <repo root>   then node tools/build.js (which copies skins.css to dist/web/engine)
# src/skins.css is generated and committed: edit the palettes here, never the CSS. Token names are the ones in
# src/theme.css (pirate, the default look, has no data-skin). The skin keys must match web/sw-register.js and the
# .bdg-<key> symbols in src/bgdice.html.
from urllib.parse import quote
import sys
R=sys.argv[1]
# A small SVG as a CSS url(): only <, >, # and double quotes are escaped, which is enough inside url("…").
def svg(s): return "url(\"data:image/svg+xml,"+s.replace('<','%3C').replace('>','%3E').replace('#','%23').replace('"',"'")+"\")"
# ── Palettes ────────────────────────────────────────────────────────────────────────────────────────────────
# Per skin: label (the name in ☰ → Theme), light and dark tokens, fonts (title, and optionally display/body),
# orn (an ornament SVG; not drawn any more: the theme symbols float with the dice instead) and line (the SVG mask
# repeated under the header, None for a plain line).
SK={
 'fantasy':dict(label='Dragon Keep',
  light=dict(bg='#F1EBDD',surface='#FAF6EC',raised='#FFFCF4',ink='#231D35',muted='#615878',line='#DCD1BA',rope='#B89A5A',chart='#E9E1CE',
    sea='#2D4C93',**{'sea-ink':'#FFFCF4','sea-soft':'#D9E1F2'},brass='#9A7414',**{'brass-soft':'#F2E4BC'},hp='#9C1F33',good='#2F6B47',aye='#2D6342',warn='#9A5B00'),
  dark=dict(bg='#0F1124',surface='#171B36',raised='#1F2444',ink='#EEE7D3',muted='#C2B9D8',line='#2C3260',rope='#6C5B2C',chart='#13162C',
    sea='#93B4FF',**{'sea-ink':'#0F1124','sea-soft':'#1E2A55'},brass='#E9C766',**{'brass-soft':'#3A3016'},hp='#F07C8C',good='#79CF98',aye='#2F7A4D',warn='#E8AE55'),
  fonts=dict(title='"Cinzel Decorative","Cinzel",Georgia,serif',display='"Cinzel",Georgia,serif'),
  orn='<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200"><g fill="none" stroke="#C9A55A" stroke-opacity=".11" stroke-width="1"><circle cx="100" cy="100" r="90"/><circle cx="100" cy="100" r="62"/><path d="M100 10 L118 82 L190 100 L118 118 L100 190 L82 118 L10 100 L82 82Z"/><path d="M100 38 L110 90 L162 100 L110 110 L100 162 L90 110 L38 100 L90 90Z"/></g></svg>',
  line='<svg xmlns="http://www.w3.org/2000/svg" width="24" height="8" viewBox="0 0 24 8"><path d="M0 4h7l5-3 5 3h7" fill="none" stroke="#000" stroke-width="1.4"/><path d="M12 2.2l1.8 1.8L12 5.8 10.2 4z" fill="#000"/></svg>'),
 'space':dict(label='Starfarer',
  light=dict(bg='#E9EEF5',surface='#F5F8FC',raised='#FFFFFF',ink='#111C2E',muted='#55647C',line='#C9D3E2',rope='#8EA2C2',chart='#E0E7F1',
    sea='#5B3FD6',**{'sea-ink':'#FFFFFF','sea-soft':'#E3DDFB'},brass='#0A7F95',**{'brass-soft':'#D2EEF3'},hp='#C42A5E',good='#1E7A52',aye='#1B6E4A',warn='#B45F06'),
  dark=dict(bg='#060A14',surface='#0D1424',raised='#131C32',ink='#E3EBFA',muted='#A3B2CD',line='#1F2C48',rope='#2B4170',chart='#08101E',
    sea='#A99BFF',**{'sea-ink':'#060A14','sea-soft':'#1C1A44'},brass='#4FE0EE',**{'brass-soft':'#0E3440'},hp='#FF6B9A',good='#5FE0A1',aye='#1C7A55',warn='#FFB65C'),
  fonts=dict(title='"Orbitron","Exo 2",system-ui,sans-serif'),
  orn='<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200"><g fill="none" stroke="#7FD6F0" stroke-opacity=".12" stroke-width="1"><circle cx="100" cy="100" r="34"/><ellipse cx="100" cy="100" rx="88" ry="26" transform="rotate(-18 100 100)"/><ellipse cx="100" cy="100" rx="70" ry="18" transform="rotate(-18 100 100)"/></g><g fill="#BFE9FF" fill-opacity=".22"><circle cx="20" cy="30" r="1"/><circle cx="170" cy="22" r="1.2"/><circle cx="150" cy="170" r="1"/><circle cx="35" cy="160" r=".8"/><circle cx="185" cy="120" r=".8"/><circle cx="60" cy="90" r=".6"/></g></svg>',
  line='<svg xmlns="http://www.w3.org/2000/svg" width="24" height="8" viewBox="0 0 24 8"><path d="M0 4h9" stroke="#000" stroke-width="1.4"/><circle cx="14" cy="4" r="1.6" fill="#000"/><path d="M19 4h5" stroke="#000" stroke-width="1.4"/></svg>'),
 'woodland':dict(label='Feywild',
  light=dict(bg='#E6ECD8',surface='#F2F6E8',raised='#FAFCF3',ink='#1C2619',muted='#57684F',line='#C8D3B1',rope='#8BA266',chart='#DEE6CC',
    sea='#2D6A4C',**{'sea-ink':'#FAFCF3','sea-soft':'#D5E6D8'},brass='#946719',**{'brass-soft':'#EFE2BE'},hp='#A3302A',good='#2C7A45',aye='#2A6E40',warn='#9A5B00'),
  dark=dict(bg='#0C1510',surface='#132119',raised='#1A2C21',ink='#E2EBD5',muted='#B5C6A4',line='#253B2B',rope='#4E6B42',chart='#0F1B13',
    sea='#86D3A6',**{'sea-ink':'#0C1510','sea-soft':'#173326'},brass='#DCB867',**{'brass-soft':'#352D16'},hp='#EE7C6C',good='#7FD89C',aye='#2B7647',warn='#E8AE55'),
  fonts=dict(title='"Uncial Antiqua","Alegreya SC",Georgia,serif'),
  orn='<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200"><g fill="none" stroke="#9CC27A" stroke-opacity=".12" stroke-width="1"><circle cx="100" cy="100" r="80"/><path d="M100 20c22 26 22 54 0 80c-22-26-22-54 0-80z"/><path d="M100 100c26 22 54 22 80 0c-26-22-54-22-80 0z"/><path d="M100 100c-22 26-22 54 0 80c22-26 22-54 0-80z"/><path d="M100 100c-26-22-54-22-80 0c26 22 54 22 80 0z"/><path d="M100 20v160M20 100h160"/></g></svg>',
  line=None),
 'gothic':dict(label='Ravenloft',
  light=dict(bg='#E9E4E2',surface='#F5F1EF',raised='#FCFAF9',ink='#1C1519',muted='#5F4F58',line='#D4C8CC',rope='#8F7480',chart='#E2DBD9',
    sea='#5A3D7A',**{'sea-ink':'#FCFAF9','sea-soft':'#E5DCEE'},brass='#8E2236',**{'brass-soft':'#F1D9DE'},hp='#B0261E',good='#2F6B47',aye='#2D6342',warn='#9A5B00'),
  dark=dict(bg='#0C090E',surface='#161118',raised='#1F1822',ink='#ECE3E8',muted='#BCADB7',line='#2F2533',rope='#563C4C',chart='#110C13',
    sea='#B99BDD',**{'sea-ink':'#0C090E','sea-soft':'#2A1F38'},brass='#D9B26A',**{'brass-soft':'#3A2E18'},hp='#FF6B6B',good='#79CF98',aye='#2F7A4D',warn='#E8AE55'),
  fonts=dict(title='"Grenze Gotisch","Pirata One",Georgia,serif'),
  orn='<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200"><g fill="none" stroke="#C9A0B8" stroke-opacity=".11" stroke-width="1"><circle cx="100" cy="100" r="86"/><path d="M128 52a52 52 0 1 0 0 96a42 42 0 1 1 0-96z"/><path d="M40 60l8 4 6-6 6 6 8-4-6 10-8-3-8 3z"/><path d="M140 150l6 3 4-4 4 4 6-3-4 7-6-2-6 2z"/></g></svg>',
  line='<svg xmlns="http://www.w3.org/2000/svg" width="24" height="8" viewBox="0 0 24 8"><path d="M0 6h4V2h4v4h8V2h4v4h4" fill="none" stroke="#000" stroke-width="1.4"/></svg>'),
 'underdark':dict(label='Underdark',
  light=dict(bg='#E8E3EE',surface='#F4F1F8',raised='#FBFAFD',ink='#1E1828',muted='#5C5270',line='#D3CADF',rope='#8C7BA6',chart='#E0D9EA',
    sea='#5B3C99',**{'sea-ink':'#FBFAFD','sea-soft':'#E4DCF5'},brass='#13756D',**{'brass-soft':'#D3EEEA'},hp='#B3264B',good='#2C7A45',aye='#2A6E40',warn='#9A5B00'),
  dark=dict(bg='#0A0710',surface='#130E1C',raised='#1B1427',ink='#E8E1F2',muted='#B6A9CC',line='#2A2138',rope='#45345E',chart='#0E0A16',
    sea='#B59CFF',**{'sea-ink':'#0A0710','sea-soft':'#251B3D'},brass='#5EF0D2',**{'brass-soft':'#0F3632'},hp='#FF6F91',good='#7FD89C',aye='#2B7647',warn='#E8AE55'),
  fonts=dict(title='"Grenze Gotisch","Pirata One",Georgia,serif'),orn=None,line=None),
 'icewind':dict(label='Icewind',
  light=dict(bg='#E8EFF3',surface='#F4F8FA',raised='#FFFFFF',ink='#142231',muted='#4F6475',line='#C9D8E2',rope='#8FAABD',chart='#DEE8EE',
    sea='#4A5C8C',**{'sea-ink':'#FFFFFF','sea-soft':'#DDE3F2'},brass='#1F6E99',**{'brass-soft':'#D5E8F3'},hp='#B2303A',good='#2C7A45',aye='#2A6E40',warn='#9A5B00'),
  dark=dict(bg='#08111A',surface='#0F1B27',raised='#152433',ink='#E6F0F7',muted='#A9BDCC',line='#213345',rope='#3A5268',chart='#0B1520',
    sea='#C6CCFF',**{'sea-ink':'#08111A','sea-soft':'#1D2747'},brass='#9EDBFF',**{'brass-soft':'#13324A'},hp='#FF7A85',good='#7FD89C',aye='#2B7647',warn='#E8AE55'),
  fonts=dict(title='"Cinzel","Alegreya SC",Georgia,serif'),orn=None,
  line='<svg xmlns="http://www.w3.org/2000/svg" width="24" height="8" viewBox="0 0 24 8"><path d="M0 2h24M4 2l2 5 2-5M14 2l1.5 4 1.5-4" fill="none" stroke="#000" stroke-width="1.3"/></svg>'),
 'avernus':dict(label='Avernus',
  light=dict(bg='#F0E4DA',surface='#F8EFE8',raised='#FDF8F4',ink='#2A1410',muted='#6E4A40',line='#DEC6B8',rope='#B07A5E',chart='#E8D8CC',
    sea='#7A2E1E',**{'sea-ink':'#FDF8F4','sea-soft':'#F1DCD4'},brass='#B4410E',**{'brass-soft':'#F6DCCB'},hp='#A3201B',good='#2C7A45',aye='#2A6E40',warn='#9A5B00'),
  dark=dict(bg='#120806',surface='#1C0E0B',raised='#26130F',ink='#F3E3DA',muted='#CDAE9F',line='#3A1E17',rope='#5E2F22',chart='#170A08',
    sea='#FF9A6B',**{'sea-ink':'#120806','sea-soft':'#3A1810'},brass='#FFB347',**{'brass-soft':'#3D2710'},hp='#FF5E57',good='#7FD89C',aye='#2B7647',warn='#FFB347'),
  fonts=dict(title='"Grenze Gotisch","Pirata One",Georgia,serif'),orn=None,
  line='<svg xmlns="http://www.w3.org/2000/svg" width="24" height="8" viewBox="0 0 24 8"><path d="M0 7l4-5 4 5 4-5 4 5 4-5 4 5" fill="none" stroke="#000" stroke-width="1.3"/></svg>'),
}
# ── Tokens, fonts and backgrounds ───────────────────────────────────────────────────────────────────────────
# One mode's tokens as CSS declarations, plus the shared extras for that mode: the press tint and header glow, and in
# dark mode the shadow, the paper grain and color-scheme.
def toks(d,dark):
    out=';'.join('--%s:%s'%(k,v) for k,v in d.items())
    if dark: out+=';--press:rgba(255,240,210,.14);--shadow:0 1px 2px rgba(0,0,0,.35),0 8px 22px rgba(0,0,0,.3);--grain:repeating-linear-gradient(0deg,rgba(255,240,210,.016) 0 1px,transparent 1px 3px);--glow:radial-gradient(ellipse 120% 60% at 50% 0%,color-mix(in srgb,'+d['brass']+' 9%,transparent),transparent 70%);color-scheme:dark'
    else: out+=';--press:rgba(40,30,60,.1);--glow:radial-gradient(ellipse 120% 70% at 50% 0%,rgba(255,255,255,.55),transparent 70%)'
    return out
# The quiet 120 px grid every skin uses as the page background (over the glow, the grain and --bg).
GRID='repeating-linear-gradient(0deg,transparent 0 119px,color-mix(in srgb,var(--rope) 9%,transparent) 119px 120px) fixed,repeating-linear-gradient(90deg,transparent 0 119px,color-mix(in srgb,var(--rope) 6%,transparent) 119px 120px) fixed,var(--glow) fixed no-repeat,var(--grain) fixed,var(--bg)'
css=['/* ============================================================================\n   SKINS — the extra looks players pick in ☰ → Theme (web app only; web/sw-register.js sets <html data-skin="…">).\n   Each skin swaps the theme tokens (same names as src/theme.css) for light and dark, the title fonts, the faint\n   ornament behind the sheet and the line under the header. Pirate is src/theme.css itself (no data-skin).\n   Generated by tools/gen-skins.py: edit the palettes there.\n   ============================================================================ */']
# Per skin: light tokens + fonts, dark tokens (system dark mode unless the player chose light, or the player chose
# dark), the grid background on every page but the front page, and the header line.
for k,s in SK.items():
    sel=':root[data-skin="%s"]'%k
    f=s['fonts']; ft=';'.join(x for x in ['--f-pirate:'+f['title'], ('--f-display:'+f['display']) if 'display' in f else '', ('--f-body:'+f['body']) if 'body' in f else ''] if x)
    css.append('/* %s */'%s['label'])
    css.append('%s{%s;%s}'%(sel,toks(s['light'],False),ft))
    css.append('@media (prefers-color-scheme: dark){%s:not([data-theme="light"]){%s}}'%(sel,toks(s['dark'],True)))
    css.append('%s[data-theme="dark"]{%s}'%(sel,toks(s['dark'],True)))
    css.append('%s body:not(.front){background:'%sel+GRID+'}')
    if s['line']:
        m=svg(s['line'])
        css.append('%s .top::after{-webkit-mask:%s repeat-x center/24px 8px;mask:%s repeat-x center/24px 8px}'%(sel,m,m))
# pirate on the web: the same quiet grid instead of the big compass rose (the claude.ai sheets keep theirs)
css.append(':root:not([data-skin]) body:not(.front){background:'+GRID+'}')
# small theme symbols float with the background dice: only the current theme's set shows (src/bgdice.html)
ALL=['pirate']+list(SK)
css.append('.bdg{display:none}')
css.append(':root:not([data-skin]) .bdg-pirate,'+','.join(':root[data-skin="%s"] .bdg-%s'%(k,k) for k in ALL)+'{display:block}')
# ── Roll sheet and tooltips ─────────────────────────────────────────────────────────────────────────────────
# Roll sheet + tooltips: no parchment outside the pirate look. Light mode keeps the dark card (ink on paper, inverted);
# dark mode gets a dark card too (a lifted, accent-tinted panel with light text) instead of a bright sheet. Done by
# swapping --ink/--bg inside the card, so everything in it that reads "paper colour / text colour" follows.
# Blends two #RRGGBB colours: t=0 gives a, t=1 gives b.
def mix(a,b,t):
    a=[int(a[k:k+2],16) for k in (1,3,5)]; b=[int(b[k:k+2],16) for k in (1,3,5)]
    return '#%02X%02X%02X'%tuple(round(x*(1-t)+y*t) for x,y in zip(a,b))
# each theme's card gets a texture of its own (all faint white/black, so they work on the dark card in both modes)
# An SVG as a CSS url(), percent-encoded (safer than svg() for filters and attributes with %, #, etc.).
def uri(x): return 'url("data:image/svg+xml,'+quote(x,safe=" =:/'")+'")'
# A fractal-noise texture tile (feTurbulence) in one colour (col = "r g b", 0–1) at opacity a. fx/fy set the grain
# size per axis (low = big blotches, high = fine grain; unequal values give streaks), oct the detail.
def noise(fx,fy,oct,a,seed=3,col='1 1 1',w=300,h=300):
    return uri('<svg xmlns="http://www.w3.org/2000/svg" width="%d" height="%d"><filter id="n"><feTurbulence type="fractalNoise" baseFrequency="%s %s" numOctaves="%d" seed="%d" stitchTiles="stitch"/><feColorMatrix values="0 0 0 0 %s 0 0 0 0 %s 0 0 0 0 %s 0 0 0 %s 0"/></filter><rect width="100%%" height="100%%" filter="url(#n)"/></svg>'%(w,h,fx,fy,oct,seed,*col.split(),a))
TEX={
 'fantasy': [uri('<svg xmlns="http://www.w3.org/2000/svg" width="28" height="28"><path d="M0 14 14 0 28 14 14 28Z" fill="none" stroke="#fff" stroke-opacity=".045"/><circle cx="14" cy="14" r="1.2" fill="#fff" fill-opacity=".06"/></svg>'), noise(.8,.8,2,.05)],
 'space':   [uri('<svg xmlns="http://www.w3.org/2000/svg" width="10" height="10"><circle cx="1" cy="1" r=".8" fill="#fff" fill-opacity=".09"/></svg>'), 'repeating-linear-gradient(0deg,rgba(255,255,255,.025) 0 1px,transparent 1px 3px)'],
 'woodland':[noise(.012,.06,4,.10,7), noise(.9,.9,2,.05)],
 'gothic':  [noise(.006,.02,4,.12,11,'0 0 0'), noise(.9,.9,2,.06)],
 'underdark':[uri('<svg xmlns="http://www.w3.org/2000/svg" width="140" height="140"><g fill="#7DF7DF"><circle cx="18" cy="24" r="1.4" fill-opacity=".22"/><circle cx="96" cy="14" r="1" fill-opacity=".18"/><circle cx="60" cy="70" r="1.8" fill-opacity=".14"/><circle cx="122" cy="96" r="1.2" fill-opacity=".2"/><circle cx="30" cy="118" r="1" fill-opacity=".16"/><circle cx="84" cy="128" r="1.5" fill-opacity=".12"/></g></svg>'), noise(.9,.9,2,.05)],
 'icewind': [noise(.004,.18,3,.10,5), noise(.9,.9,2,.04)],
 'avernus': [noise(.02,.02,4,.16,9,'1 .45 .1'), noise(.9,.9,2,.05)],
}
# An inner vignette and a faint top highlight, shared by every card.
VIG='inset 0 0 60px rgba(0,0,0,.35),inset 0 1px 0 rgba(255,255,255,.06)'
# Per skin: the card texture and accent sheen in both modes, then the dark card (panel colour mixed from the dark
# palette's raised + brass) in dark mode, with chips readable on it.
for k,sk in SK.items():
    sel=':root[data-skin="%s"]'%k; dk=sk['dark']
    cards='%s #dock .roll,%s .bubble'
    sheen='background-image:%s,linear-gradient(160deg,color-mix(in srgb,var(--brass) 14%%,transparent),transparent 50%%)!important;background-size:auto!important;background-repeat:repeat!important;border:1px solid color-mix(in srgb,var(--brass) 45%%,transparent);box-shadow:0 18px 50px -12px rgba(0,0,0,.55),%s'%(','.join(TEX[k]),VIG)
    css.append((cards%(sel,sel))+'{'+sheen+'}')
    css.append('%s .bubble::after{border:0}'%sel)
    panel=mix(dk['raised'],dk['brass'],.10)
    inv='--ink:%s;--bg:%s;--good:#7FD89C;--roll-hit:#8CC4DC;--roll-on:#1B140C;--roll-accent:#F08F5E;--roll-accent-ink:#F4A07A;box-shadow:0 18px 50px -12px rgba(0,0,0,.7),inset 0 0 0 1px color-mix(in srgb,var(--brass) 30%%,transparent),%s'%(panel,dk['ink'],VIG)
    c1='%s:not([data-theme="light"]) #dock .roll,%s:not([data-theme="light"]) .bubble'%(sel,sel)
    css.append('@media (prefers-color-scheme: dark){%s{%s}}'%(c1,inv))
    css.append('%s[data-theme="dark"] #dock .roll,%s[data-theme="dark"] .bubble{%s}'%(sel,sel,inv))
    # chips inside the dark card: light text on their dark tint
    ch='%s:not([data-theme="light"]) .roll .chip,%s:not([data-theme="light"]) .bubble .chip'%(sel,sel)
    css.append('@media (prefers-color-scheme: dark){%s{color:var(--bg)}}'%ch)
    css.append('%s[data-theme="dark"] .roll .chip,%s[data-theme="dark"] .bubble .chip{color:var(--bg)}'%(sel,sel))
# Every skin: the close buttons fully visible; Starfarer: wider, bolder headings.
css.append(':root[data-skin] .roll .x,:root[data-skin] .bubble .bclose{opacity:1}')
css.append(':root[data-skin="space"] h1,:root[data-skin="space"] h2,:root[data-skin="space"] .roll .title,:root[data-skin="space"] .bubble .bt{letter-spacing:.06em;font-weight:700}')
# ── Write ───────────────────────────────────────────────────────────────────────────────────────────────────
open(R+'/src/skins.css','w').write('\n'.join(css)+'\n')
print('ok', len('\n'.join(css)))

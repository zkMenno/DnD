# usage: python3 tools/gen-skins.py <repo root>
# Generates src/skins.css: the four extra looks (☰ → Theme), each with light and dark tokens.
import sys
R=sys.argv[1]
def svg(s): return "url(\"data:image/svg+xml,"+s.replace('<','%3C').replace('>','%3E').replace('#','%23').replace('"',"'")+"\")"
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
  fonts=dict(title='"Orbitron","Exo 2",system-ui,sans-serif',display='"Exo 2",system-ui,sans-serif',body='"Exo 2",system-ui,-apple-system,"Segoe UI",sans-serif'),
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
}
def toks(d,dark):
    out=';'.join('--%s:%s'%(k,v) for k,v in d.items())
    if dark: out+=';--press:rgba(255,240,210,.14);--shadow:0 1px 2px rgba(0,0,0,.35),0 8px 22px rgba(0,0,0,.3);--grain:repeating-linear-gradient(0deg,rgba(255,240,210,.016) 0 1px,transparent 1px 3px);--glow:radial-gradient(ellipse 120% 60% at 50% 0%,color-mix(in srgb,'+d['brass']+' 9%,transparent),transparent 70%);color-scheme:dark'
    else: out+=';--press:rgba(40,30,60,.1);--glow:radial-gradient(ellipse 120% 70% at 50% 0%,rgba(255,255,255,.55),transparent 70%)'
    return out
css=['/* ============================================================================\n   SKINS — the extra looks players pick in ☰ → Theme (web app only; web/sw-register.js sets <html data-skin="…">).\n   Each skin swaps the theme tokens (same names as src/theme.css) for light and dark, the title fonts, the faint\n   ornament behind the sheet and the line under the header. Pirate is src/theme.css itself (no data-skin).\n   Generated by tools/gen-skins.py: edit the palettes there.\n   ============================================================================ */']
for k,s in SK.items():
    sel=':root[data-skin="%s"]'%k
    f=s['fonts']; ft=';'.join(x for x in ['--f-pirate:'+f['title'], ('--f-display:'+f['display']) if 'display' in f else '', ('--f-body:'+f['body']) if 'body' in f else ''] if x)
    css.append('/* %s */'%s['label'])
    css.append('%s{%s;%s}'%(sel,toks(s['light'],False),ft))
    css.append('@media (prefers-color-scheme: dark){%s:not([data-theme="light"]){%s}}'%(sel,toks(s['dark'],True)))
    css.append('%s[data-theme="dark"]{%s}'%(sel,toks(s['dark'],True)))
    bgimg=svg(s['orn'])
    css.append('%s body:not(.front){background:%s center 42vh/min(560px,90vw) no-repeat fixed,repeating-linear-gradient(0deg,transparent 0 119px,color-mix(in srgb,var(--rope) 9%%,transparent) 119px 120px) fixed,repeating-linear-gradient(90deg,transparent 0 119px,color-mix(in srgb,var(--rope) 6%%,transparent) 119px 120px) fixed,var(--glow),var(--grain),var(--bg)}'%(sel,bgimg))
    if s['line']:
        m=svg(s['line'])
        css.append('%s .top::after{-webkit-mask:%s repeat-x center/24px 8px;mask:%s repeat-x center/24px 8px}'%(sel,m,m))
# space: glass panels instead of parchment, no rivets
gl='background-image:linear-gradient(160deg,color-mix(in srgb,var(--brass) 10%,transparent),transparent 45%),linear-gradient(0deg,color-mix(in srgb,var(--sea) 8%,transparent),transparent 60%)!important;box-shadow:0 18px 50px -12px rgba(0,0,0,.6),inset 0 0 0 1px color-mix(in srgb,var(--brass) 45%,transparent)!important'
css.append(':root[data-skin="space"] .card::before{display:none}')
css.append('@media (prefers-color-scheme: dark){:root[data-skin="space"]:not([data-theme="light"]) #dock .roll,:root[data-skin="space"]:not([data-theme="light"]) .bubble{%s}}'%gl)
css.append(':root[data-skin="space"][data-theme="dark"] #dock .roll,:root[data-skin="space"][data-theme="dark"] .bubble{%s}'%gl)
css.append(':root[data-skin="space"] h1,:root[data-skin="space"] h2,:root[data-skin="space"] .roll .title,:root[data-skin="space"] .bubble .bt{letter-spacing:.06em;font-weight:700}')
open(R+'/src/skins.css','w').write('\n'.join(css)+'\n')
print('ok', len('\n'.join(css)))

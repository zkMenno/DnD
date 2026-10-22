# Build data/items.json: the SRD 5.2 item catalogue (2024 rules), compact, for ➕ Add item.
# Source: dnd5eapi.co /api/2024 (5e-bits), data from the System Reference Document 5.2 by Wizards of the Coast,
# licensed CC-BY-4.0. usage: python3 tools/items.py [equipment.json magic.json]  (downloads if not given)
import json, re, sys, urllib.request, concurrent.futures as cf
B = 'https://www.dnd5eapi.co'
def load():
    if len(sys.argv) > 2: return json.load(open(sys.argv[1])), json.load(open(sys.argv[2]))
    get = lambda u: json.load(urllib.request.urlopen(B+u, timeout=30))
    with cf.ThreadPoolExecutor(8) as ex:
        E = list(ex.map(lambda r: get(r['url']), get('/api/2024/equipment')['results']))
        M = list(ex.map(lambda r: get(r['url']), get('/api/2024/magic-items')['results']))
    return E, M
E, M = load()
def txt(parts, n=560):
    t = ' '.join(p.strip() for p in parts if p and p.strip()).replace('\n', ' ')
    t = re.sub(r'\s+', ' ', t)
    if len(t) > n: cut = t[:n]; e = cut.rfind('. '); t = (cut[:e+1] if e > n*.5 else cut) + ' …'
    return t
cost = lambda c: (str(c['quantity'])+' '+c['unit']) if c else ''
out = []
for x in E:
    cats = {c['index'] for c in x['equipment_categories']}
    it = {'n': x['name'], 'c': cost(x.get('cost')), 'w': x.get('weight')}
    if 'weapons' in cats:
        it['k'] = 'weapon'; it['cat'] = 2 if 'martial-weapons' in cats else 1; it['at'] = 2 if 'ranged-weapons' in cats else 1
        d = x.get('damage') or {}; it['dmg'] = d.get('damage_dice'); it['dt'] = (d.get('damage_type') or {}).get('name')
        props = []
        for p in x.get('properties', []):
            nm = p['name']
            if nm == 'Versatile' and x.get('two_handed_damage'): nm += ' (' + x['two_handed_damage']['damage_dice'] + ')'
            if nm == 'Ammunition' and it['at'] == 2: props.append('Range')
            props.append(nm)
        if x.get('mastery'): props.append(x['mastery']['name'])
        it['p'] = props
        rng = x.get('throw_range') if x.get('throw_range') else x.get('range') or {}
        it['r'] = rng.get('normal'); it['lr'] = rng.get('long') or rng.get('normal')
    elif 'armor' in cats:
        it['k'] = 'armor'; ac = x.get('armor_class') or {}
        it['ac'] = ac.get('base'); it['arm'] = 4 if 'shields' in cats else 1 if 'light-armor' in cats else 2 if 'medium-armor' in cats else 3
        if x.get('stealth_disadvantage'): it['sd'] = 1
        if x.get('str_minimum'): it['str'] = x['str_minimum']
    elif 'ammunition' in cats: it['k'] = 'ammo'; it['q'] = x.get('quantity') or 1
    elif 'tools' in cats or 'musical-instruments' in cats or 'gaming-sets' in cats: it['k'] = 'tool'
    elif 'equipment-packs' in cats or x.get('contents'): it['k'] = 'pack'; it['has'] = [(c['quantity'], c['item']['name']) for c in x.get('contents', [])]
    elif re.match(r'Potion|Antitoxin|Acid|Alchemist', x['name']): it['k'] = 'potion'
    else: it['k'] = 'gear'
    if x.get('quantity') and it['k'] != 'ammo' and x['quantity'] > 1: it['q'] = x['quantity']
    d = txt(x.get('description', []) + x.get('notes', []))
    if not d and x.get('utilize'): d = txt(['Utilize: ' + '; '.join(u['name'] + (' (DC '+str(u['dc']['dc_value'])+')' if u.get('dc') else '') for u in x['utilize']) + '.'])
    if d: it['d'] = d
    out.append({k: v for k, v in it.items() if v not in (None, '', [])})
have = {o['n'] for o in out}
MK = {'Wondrous Items':'Wondrous item','Weapons':'Weapon','Armor':'Armor','Rings':'Ring','Potions':'Potion','Wands':'Wand','Staffs':'Staff'}
for x in M:
    if x.get('variants'): continue                     # keep the variants (+1/+2/+3, horn colours), not the umbrella entry
    if x['name'] in have: continue                     # Potion of Healing is also regular gear
    desc = x.get('desc', []); first = desc[0] if desc else ''
    it = {'n': x['name'], 'k': 'magic', 'mk': MK.get(x['equipment_category']['name'], 'Wondrous item'), 'rar': x['rarity']['name']}
    if x.get('attunement') or 'requires attunement' in first.lower(): it['att'] = 1
    m = re.search(r'([+-]\d)\b', x['name']); 
    if m: it['b'] = int(m.group(1))
    if re.match(r'(Weapon|Armor|Ammunition)\s*\(any', first, re.I): it['gen'] = first.split(' ')[0].lower()   # needs a base item
    it['d'] = txt(desc[1:] if re.match(r'^(Wondrous|Weapon|Armor|Ring|Potion|Wand|Staff|Rod|Scroll)', first) else desc)
    if it['mk'] == 'Potion': it['k'] = 'potion'; it['magic'] = 1
    out.append(it)
# "Potions of Healing" is one SRD entry with a table: split it into the four potions people actually buy
out = [i for i in out if i['n'] != 'Potions of Healing']
for n, rar, dice in [('Potion of Greater Healing','Uncommon','4d4 + 4'),('Potion of Superior Healing','Rare','8d4 + 8'),('Potion of Supreme Healing','Very Rare','10d4 + 20')]:
    out.append({'n': n, 'k': 'potion', 'magic': 1, 'rar': rar, 'w': 0.5, 'd': 'As a Bonus Action, drink it or give it to a creature within 5 feet: it regains '+dice+' Hit Points.'})
out.sort(key=lambda i: i['n'].lower())
json.dump({'v': 1, 'source': 'System Reference Document 5.2, Wizards of the Coast LLC, CC-BY-4.0 (via 5e-bits dnd5eapi.co)', 'items': out},
          open('data/items.json', 'w'), separators=(',', ':'), ensure_ascii=False)
from collections import Counter
print(len(out), 'items', Counter(i['k'] for i in out), round(len(open('data/items.json').read())/1024), 'KB')

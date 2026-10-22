# End-to-end test of the server rules: per-account trackers, verification, privacy, party log.
# Uses real public D&D Beyond characters: Henry (170557047) and Wick (165157421) are both in The Bluff,
# AppTester-01 (172559988) is not. A superuser stands in for "the D&D Beyond code was found".
import json, urllib.request, urllib.error, urllib.parse, sys
B = sys.argv[1] if len(sys.argv) > 1 else 'http://127.0.0.1:8090'
def req(method, path, body=None, tok=None):
    r = urllib.request.Request(B+path, method=method, data=json.dumps(body).encode() if body is not None else None,
        headers={'content-type':'application/json', **({'Authorization':tok} if tok else {})})
    try:
        with urllib.request.urlopen(r) as f: return f.status, json.loads(f.read() or 'null')
    except urllib.error.HTTPError as e: return e.code, json.loads(e.read() or 'null')
def user(n):
    req('POST','/api/collections/users/records',{'email':n+'@example.test','password':'Passw0rd-'+n,'passwordConfirm':'Passw0rd-'+n})
    s,d = req('POST','/api/collections/users/auth-with-password',{'identity':n+'@example.test','password':'Passw0rd-'+n}); return d['token'], d['record']['id']
ok = True
def check(name, cond):
    global ok; ok &= bool(cond); print(('PASS ' if cond else 'FAIL ')+name)
SU = req('POST','/api/collections/_superusers/auth-with-password',{'identity':'admin@example.test','password':'TestPass-12345'})[1]['token']
verify = lambda rid: req('PATCH','/api/collections/characters/records/'+rid,{'verified':True},SU)

(ta,ia),(tb,ib),(tc,ic) = user('alice'), user('bob'), user('carol')
s,d = req('GET','/api/ddb/165157421',tok=ta); check('proxy fetches D&D Beyond for a signed-in user', s==200 and d['data']['name'])
s,_ = req('GET','/api/ddb/165157421'); check('proxy refuses anonymous', s==401)
mk = lambda tok, owner, ddb, vis, extra={}: req('POST','/api/collections/characters/records',dict({'ddb_id':ddb,'owner':owner,'pack':'bare','data':{'id':ddb},'visibility':vis,'campaign':'FAKE'},**extra),tok)

s,wa = mk(ta,ia,165157421,'private'); check('alice adds Wick', s==200)
C1 = wa.get('campaign'); check('server sets the campaign from D&D Beyond, not the browser', C1 and C1 != 'FAKE')
s,wb = mk(tb,ib,165157421,'private'); check('bob adds Wick too: his own, separate tracker', s==200 and wb['id'] != wa['id'])
s,_  = mk(ta,ia,165157421,'private'); check('alice can\'t add the same character twice', s>=400)
s,_  = mk(tb,ia,170557047,'private'); check('bob can\'t create a tracker for alice', s>=400)
s,_  = mk(ta,ia,170557047,'party',{'verified':True}); check('nobody can mark themselves verified', s>=400)
s,hb = mk(tb,ib,170557047,'party'); check('bob adds Henry, shared with the party', s==200 and hb.get('campaign')==C1)
s,tc_ = mk(tc,ic,172559988,'party'); check('carol adds AppTester-01 (not in The Bluff)', s==200 and tc_.get('campaign')!=C1)
s,ch = mk(tc,ic,165157421,'private'); check('carol adds Wick too (unverified)', s==200)

# trackers are per account
s,pa = req('POST','/api/collections/play/records',{'character':wa['id'],'state':{'hp':20}},ta); check('alice saves her Wick tracker', s==200)
s,pb = req('POST','/api/collections/play/records',{'character':wb['id'],'state':{'hp':5}},tb);  check('bob saves his own Wick tracker', s==200)
s,x  = req('GET','/api/collections/play/records/'+pa['id'],tok=ta); check('alice\'s Wick is untouched by bob', x['state']['hp']==20)
s,_  = req('GET','/api/collections/play/records/'+pa['id'],tok=tb); check('bob can\'t read alice\'s private tracker', s==404)

# claim flow: code issued, not found on D&D Beyond → not verified
s,c = req('POST','/api/claim/'+wa['id'],{},ta); check('alice gets a claim code', s==200 and c['code'].startswith('SHEET-'))
s,_ = req('POST','/api/claim/'+wa['id'],{},tb); check('bob can\'t ask a code for alice\'s tracker', s>=400)
s,r = req('POST','/api/claim/'+wa['id']+'/check',{},ta); check('without the code on D&D Beyond it stays unverified', s==200 and r['verified'] is False)
s,x = req('GET','/api/collections/characters/records/'+wa['id'],tok=ta); check('the claim code is never sent to the browser', 'claim_code' not in x)

# party features need verified characters on both sides
s,ph = req('POST','/api/collections/play/records',{'character':hb['id'],'state':{'hp':30}},tb)
s,_ = req('GET','/api/collections/play/records/'+ph['id'],tok=ta); check('unverified alice can\'t see bob\'s party tracker', s==404)
verify(wa['id']); verify(hb['id'])
s,_ = req('GET','/api/collections/play/records/'+ph['id'],tok=ta); check('verified alice (The Bluff) sees bob\'s verified party tracker', s==200)
s,_ = req('GET','/api/collections/play/records/'+ph['id'],tok=tc); check('carol (other campaign) can\'t', s==404)
s,_ = req('PATCH','/api/collections/play/records/'+ph['id'],{'state':{'hp':0}},ta); check('alice can\'t change bob\'s tracker', s>=400)
s,n2 = req('POST','/api/collections/notes/records',{'character':wa['id'],'author':ia,'scope':'party','campaign':C1,'text':'we found a map','at':2},ta); check('verified alice posts to The Bluff party log', s==200)
s,_ = req('GET','/api/collections/notes/records/'+n2['id'],tok=tb); check('verified bob reads it', s==200)
s,_ = req('GET','/api/collections/notes/records/'+n2['id'],tok=tc); check('carol, with only an unverified Wick, can\'t read it', s==404)
s,_ = req('POST','/api/collections/notes/records',{'character':ch['id'],'author':ic,'scope':'party','campaign':C1,'text':'spam','at':3},tc); check('carol can\'t post into The Bluff with an unverified copy', s>=400)
s,n1 = req('POST','/api/collections/notes/records',{'character':wa['id'],'author':ia,'scope':'own','text':'secret','at':1},ta)
s,_ = req('GET','/api/collections/notes/records/'+n1['id'],tok=tb); check('alice\'s private notes stay private', s==404)
s,_ = req('PATCH','/api/collections/notes/records/'+n2['id'],{'text':'edited'},tb); check('bob can\'t edit alice\'s party note', s>=400)
# hardening (schema migration, hooks): nothing moves, nothing chosen by the browser, no markup stored
s,_ = req('PATCH','/api/collections/notes/records/'+n1['id'],{'scope':'party','campaign':C1},ta); check('a private note can\'t be moved into a party log', s>=400)
s,_ = req('PATCH','/api/collections/notes/records/'+n1['id'],{'character':hb['id']},ta); check('a note can\'t be moved to someone else\'s character', s>=400)
s,_ = req('PATCH','/api/collections/play/records/'+pa['id'],{'character':ch['id']},ta); check('a tracker can\'t be moved to another character', s>=400)
s,x = req('GET','/api/collections/notes/records/'+n2['id'],tok=ta); check('party note campaign comes from the character', x['campaign']==C1)
s,_ = req('PATCH','/api/collections/characters/records/'+wa['id'],{'data':{'id':165157421,'hp':{'override':'<img src=x onerror=alert(1)>'}}},ta); check('character data with HTML is refused', s==400)
s,_ = req('PATCH','/api/collections/play/records/'+pa['id'],{'state':{'hp':'<svg onload=alert(1)>'}},ta); check('a tracker with HTML is refused', s==400)
s,_ = req('PATCH','/api/collections/play/records/'+pa['id'],{'state':{'hp':12,'note':'HP < 10 is bad'}},ta); check('a plain "<" in text is fine', s==200)
s,x = req('PATCH','/api/collections/characters/records/'+wa['id'],{'pack':'henry'},ta); check('the pack is the server\'s choice', s==200 and x['pack']=='bare')
s,x = mk(tc,ic,170557047,'private',{'pack':'evil'}); check('Henry gets his own pack, whatever the browser sends', s==200 and x['pack']=='henry')
s,x = req('PATCH','/api/collections/characters/records/'+wa['id'],{'visibility':'public'},ta); check('a sharing change still works', s==200 and x['visibility']=='public')
# verify reads only the player's own text (Notes, Backstory, traits), never the campaign block, where other
# people's character names and the DM's text appear. Real D&D Beyond data stands in for "the code was pasted":
# a superuser sets the claim code to a piece of text that is already there.
s,raw = req('GET','/api/ddb/165157421',tok=ta); own = ((raw['data'].get('notes') or {}).get('backstory') or '')
if len(own) >= 20:
    piece = own[5:25]
    req('PATCH','/api/collections/characters/records/'+wb['id'],{'claim_code':piece},SU)
    s,r = req('POST','/api/claim/'+wb['id']+'/check',{},tb); check('a code in the character\'s own Backstory verifies it', s==200 and r['verified'] is True)
    s,x = req('GET','/api/collections/characters/records/'+wa['id'],tok=ta); check('newest proof wins: alice\'s Wick is no longer verified', x['verified'] is False)
else: print('SKIP Wick has no backstory to stand in for a code')
roster = [c['characterName'] for c in (raw['data'].get('campaign') or {}).get('characters', []) if c.get('characterName') and c['characterName'] not in own]
if roster:
    req('PATCH','/api/collections/characters/records/'+hb['id'],{'claim_code':roster[0]},SU)
    s,r = req('POST','/api/claim/'+hb['id']+'/check',{},tb); check('text from the campaign roster (other players\' names) doesn\'t verify', s==200 and r['verified'] is False)
# usernames and sheet links (/<username>/<D&D Beyond id>)
s,me = req('GET','/api/collections/users/records/'+ia,tok=ta); check('every new account gets a player-xxxxx username', me['username'].startswith('player-'))
s,_ = req('PATCH','/api/collections/users/records/'+ia,{'username':'Alice-Plays'},ta); check('usernames are lowercased', s==200 and _['username']=='alice-plays')
s,_ = req('PATCH','/api/collections/users/records/'+ib,{'username':'alice-plays'},tb); check('a username can\'t be taken twice', s==400)
s,_ = req('PATCH','/api/collections/users/records/'+ib,{'username':'admin'},tb); check('reserved names are refused', s==400)
s,_ = req('PATCH','/api/collections/users/records/'+ib,{'username':'-x'},tb); check('bad usernames are refused', s==400)
s,x = req('GET','/api/collections/characters/records/'+wa['id'],tok=ta); check('characters follow their owner\'s new username', x['handle']=='alice-plays')
s,x = req('PATCH','/api/collections/characters/records/'+wa['id'],{'handle':'bob'},ta); check('the handle is the server\'s, not the browser\'s', s==200 and x['handle']=='alice-plays')
q = '/api/collections/characters/records?filter=' + urllib.parse.quote("handle='alice-plays' && ddb_id=165157421")
s,l = req('GET',q,tok=tc); check('a link finds the sheet for someone it\'s shared with (public)', s==200 and len(l['items'])==1)
req('PATCH','/api/collections/characters/records/'+wa['id'],{'visibility':'private'},ta)
s,l = req('GET',q,tok=tc); check('…and not once it\'s private again', s==200 and len(l['items'])==0)
print('ALL PASS' if ok else 'SOME FAILED')
sys.exit(0 if ok else 1)

/* ============================================================================
   §19 AMMO, COINS, TOUCH AND KEYBOARD — arrows
   ============================================================================ */
function paintAmmo(msg){
  const box = $('#ammobox'); if (!box) return;
  const quivers = DATA.inventory.filter(i => i.name === 'Quiver' && i.equipped).length || 1;
  const cap = quivers * 20, back = Math.floor((S.fired||0) / 2);
  const ddb = DATA.inventory.filter(i => /Arrow/.test(i.name)).map(i => i.qty).join(' + ');
  box.innerHTML = '<div class="cardhead"><h2><span class="emo" aria-hidden="true">🪶</span>Quiver</h2><span class="small muted">'+quivers+' quiver'+(quivers>1?'s':'')+' · room for '+cap+'</span></div>'
    + '<div class="ammo"><div class="coin c-arrows"><span class="cn">Arrows</span><span class="cv num">'+arrowsLeft()+'</span>'
    + '<div class="cstep"><button class="iconbtn" data-inv="'+esc(ARROW_N)+'" data-d="-1" aria-label="Spend 1 arrow">−</button><button class="iconbtn" data-inv="'+esc(ARROW_N)+'" data-d="1" aria-label="Add 1 arrow">+</button></div></div>'
    + '<div class="ammoinfo"><p style="margin:0">Fired since last pickup: <b class="num">'+(S.fired||0)+'</b></p>'
    + '<button class="btn small" data-act="recover"'+(back ? '' : ' disabled')+'>Recover '+(back ? back+' arrow'+(back>1?'s':'') : 'arrows')+'</button>'
    + '<p class="small muted" style="margin:0">After a fight, a minute of searching gets back half of what you fired.</p></div></div>'
    + (msg ? '<p class="small" style="margin:8px 0 0">'+esc(msg)+'</p>' : '')
    + (arrowsLeft() > cap ? '<p class="small muted" style="margin:8px 0 0">That’s more than your quivers hold; the rest rides in your pack.</p>' : '')
    + '<p class="small muted" style="margin:8px 0 0">D&amp;D Beyond lists '+esc(ddb)+' = '+D.ammo+' at the last sync. Rolling to hit with '+(SIG_W && SIG_W.ranged ? 'the '+esc(SIG_W.name.toLowerCase()) : 'a ranged weapon')+' spends an arrow.</p>';
}

/* ---- coins ---- */
let coinKind = 'gp', coinNeed = null;
// total value of a purse in copper
const coinValue = c => COINS.reduce((t,[k,,v]) => t + (c[k]||0)*v, 0);
// copper → "12.5 gp"
const fmtGp = cp => { const g = cp/100; return (Number.isInteger(g) ? g : g.toFixed(2).replace(/0$/,'')) + ' gp'; };
// struck coins with an anchor, one metal per denomination
const METAL = {pp:['#F4F6F8','#C9CED6','#6E7682'], gp:['#FFF1B8','#E2B04A','#7E5812'], ep:['#F6F0CC','#CFC48A','#6E6538'], sp:['#FFFFFF','#C3C9D1','#636B76'], cp:['#F8CDA8','#C2703D','#62300F']};
// little coin icon
function coinSvg(k, size){
  const m = METAL[k] || METAL.gp, id = 'cg-'+k+'-'+(size||22);
  return '<svg class="coinico" width="'+(size||22)+'" height="'+(size||22)+'" viewBox="0 0 24 24" aria-hidden="true" focusable="false">'
    + '<defs><radialGradient id="'+id+'" cx="35%" cy="30%" r="80%"><stop offset="0" stop-color="'+m[0]+'"/><stop offset=".55" stop-color="'+m[1]+'"/><stop offset="1" stop-color="'+m[2]+'"/></radialGradient></defs>'
    + '<circle cx="12" cy="12" r="11" fill="url(#'+id+')" stroke="'+m[2]+'" stroke-width="1"/>'
    + '<circle cx="12" cy="12" r="8.3" fill="none" stroke="'+m[2]+'" stroke-opacity=".6" stroke-width=".9" stroke-dasharray="1.1 1.3"/>'
    + '<g fill="none" stroke="'+m[2]+'" stroke-width="1.4" stroke-linecap="round" stroke-opacity=".85"><circle cx="12" cy="7.4" r="1.3"/><path d="M12 8.7V17.4M9.6 10.4h4.8M8 14.6q1 3 4 3t4-3"/></g></svg>';
}
// repaint the coin purse card
function paintCoins(msg){
  const box = $('#coinbox'); if (!box) return;
  const shown = COINS.filter(([k]) => ['gp','sp','cp'].includes(k) || S.coins[k]);
  if (!shown.some(([k]) => k === coinKind)) coinKind = 'gp';
  const kname = COINS.find(c=>c[0]===coinKind)[1];
  const step = (k, n, d) => '<button class="iconbtn" data-act="coinstep" data-c="'+k+'" data-d="'+d+'" aria-label="'+(d<0?'Spend ':'Gain ')+Math.abs(d)+' '+n.toLowerCase()+'">'+(d<0?'−':'+')+Math.abs(d)+'</button>';
  box.innerHTML = '<div class="cardhead"><h2><span class="emo" aria-hidden="true">💰</span>Purse &amp; plunder</h2><span class="small muted">worth '+fmtGp(coinValue(S.coins))+' in total</span></div>'
    + '<div class="purse">'+shown.map(([k,n]) => '<div class="coin c-'+k+(coinKind===k?' sel':'')+'" data-pick="'+k+'" role="radio" aria-checked="'+(coinKind===k)+'" tabindex="0" aria-label="'+n+', '+(S.coins[k]||0)+'. Tap to pick for the amount box">'
      + '<div class="chead">'+coinSvg(k, 22)+'<button type="button" class="cn term" data-term="'+n+'">'+n+'</button></div><span class="cv num">'+(S.coins[k]||0)+'</span>'
      + '<div class="cstep">'+step(k,n,-1)+step(k,n,1)+step(k,n,-5)+step(k,n,5)+'</div></div>').join('')+'</div>'
    + '<div class="coinform"><label for="coin-amt" class="amtlabel">'+coinSvg(coinKind, 18)+'<span>Amount of <b>'+esc(kname)+'</b></span></label>'
    + '<div class="amtrow"><input id="coin-amt" type="number" inputmode="numeric" enterkeyhint="done" min="1" placeholder="0">'
    + '<button class="btn" data-act="coinspend">💸 Spend</button><button class="btn" data-act="coingain">🪙 Gain</button></div></div>'
    + (coinNeed ? '<div class="coinwarn">You only have '+(S.coins[coinNeed.k]||0)+' '+coinNeed.k+'. <button class="btn small" data-act="coinchange">Pay '+coinNeed.n+' '+coinNeed.k+' using change</button></div>' : '')
    + '<p class="small muted" id="coinmsg" style="margin:8px 0 0">'+(msg ? esc(msg) : 'Tap a coin to pick it for the amount box. Tap its name for what it’s worth.')+'</p>'
    + (S.coinLog && S.coinLog.length ? '<ul class="coinlog">'+S.coinLog.slice(-5).reverse().map(x=>'<li>'+esc(x)+'</li>').join('')+'</ul>' : '');
}
// choose which coin the amount box spends/adds
function pickCoin(k){ if (coinKind === k) return; coinKind = k; coinNeed = null; const v = ($('#coin-amt')||{}).value; paintCoins(); const i = $('#coin-amt'); if (i && v) i.value = v; }
// pay an amount, making change from bigger coins when needed
function spendCoins(k, n){
  if ((S.coins[k]||0) < n) {
    const need = n * COINS.find(c=>c[0]===k)[2];
    if (coinValue(S.coins) < need) { coinNeed = null; return paintCoins('Not enough money: that costs '+fmtGp(need)+' and you have '+fmtGp(coinValue(S.coins))+'.'); }
    coinNeed = {k, n}; return paintCoins();
  }
  S.coins[k] -= n; coinLog('−'+n+' '+k); coinNeed = null; save(); paintRes(); return paintCoins('Spent '+n+' '+k+'.');
}
// add coins
function gainCoins(k, n){ S.coins[k] = (S.coins[k]||0) + n; coinLog('+'+n+' '+k); coinNeed = null; save(); paintRes(); return paintCoins('Added '+n+' '+k+'.'); }

// ± one coin
function quickCoin(k, d){
  if (!S.coins) S = normalizeState(S);
  const name = COINS.find(c=>c[0]===k)[1].toLowerCase();
  if (d > 0) { S.coins[k] = (S.coins[k]||0) + 1; coinLog('+1 '+k); save(); paintRes(); return paintCoins('Gained 1 '+name+'.'); }
  let note = '';
  if (!(S.coins[k] > 0) && k === 'ep') return paintCoins('No electrum left.');
  if (!(S.coins[k] > 0)) {
    // break the smallest bigger coin step by step: pp→10 gp, gp→10 sp, ep→5 sp, sp→10 cp
    const v = COINS.find(c=>c[0]===k)[2], down = {pp:['gp',10], gp:['sp',10], ep:['sp',5], sp:['cp',10]};
    const bigger = COINS.filter(c => c[2] > v && S.coins[c[0]] > 0).sort((x,y)=>x[2]-y[2])[0];
    if (!bigger) return paintCoins('No coins left to pay with.');
    let cur = bigger[0];
    while (cur !== k) { const [to, n] = down[cur]; S.coins[cur] -= 1; S.coins[to] = (S.coins[to]||0) + n; cur = to; if (COINS.find(c=>c[0]===cur)[2] < v) break; }
    note = ' (broke 1 '+bigger[0]+' into change)';
  }
  S.coins[k] -= 1; coinLog('−1 '+k+note); coinNeed = null; save(); paintRes(); paintCoins('Spent 1 '+name+note+'.');
}
// read the amount box (focus it when empty)
function coinAmt(){ const i = $('#coin-amt'); const n = parseInt(i && i.value, 10); if (!n || n < 1) { if (i) i.focus(); return 0; } blurField(); return n; }
// remember the last 20 coin moves
function coinLog(t){ S.coinLog = (S.coinLog || []).concat(t).slice(-20); }
// break a bigger coin into smaller ones
function makeChange(k, n){
  let total = coinValue(S.coins) - n * COINS.find(c=>c[0]===k)[2];
  if (total < 0) return false;
  // keep platinum where possible, then count the rest out as gold, silver and copper
  const pp = Math.min(S.coins.pp || 0, Math.floor(total/1000)); let rest = total - pp*1000;
  const gp = Math.floor(rest/100); rest -= gp*100; const sp = Math.floor(rest/10); rest -= sp*10;
  S.coins = {pp, gp, ep:0, sp, cp:rest}; return true;
}

/* ---- touch feedback: keep a pressed look visible for a moment even if the tap re-renders the button ---- */
(() => {
  // Press feedback that survives a repaint: many taps redraw their own button (coins, HP, pips),
  // so if the pressed element is gone we find its twin by its data-* attributes and flash that.
  let held = null, t0 = 0, sig = null;
  const MIN = 160;
  const signature = el => { const d = el.dataset || {}; const keys = Object.keys(d).filter(k => !/^(i|r)$/.test(k)); return keys.length ? keys.map(k => '[data-'+k.replace(/[A-Z]/g, m => '-'+m.toLowerCase())+'="'+CSS.escape(d[k])+'"]').join('') : (el.id ? '#'+CSS.escape(el.id) : null); };
  const flash = (el, ms) => { el.classList.add('pressing'); setTimeout(() => el.classList.remove('pressing'), ms); };
  const release = () => {
    if (!held) return; const el = held, s0 = sig, wait = Math.max(0, MIN - (Date.now() - t0)); held = null; sig = null;
    setTimeout(() => {
      if (el.isConnected) { el.classList.remove('pressing'); return; }
      const twin = s0 && document.querySelector(s0); if (twin) flash(twin, 120);
    }, wait);
    // the click handler may repaint right after pointerup: re-check on the next frame too
    requestAnimationFrame(() => { if (!el.isConnected && s0) { const twin = document.querySelector(s0); if (twin && !twin.classList.contains('pressing')) flash(twin, Math.max(120, wait)); } });
  };
  document.addEventListener('pointerdown', e => { const b = e.target.closest && e.target.closest('button,[data-pick]'); if (!b || b.disabled) return; held = b; t0 = Date.now(); try { sig = signature(b); } catch(_) { sig = null; } if (b.classList.contains('term') && !b.classList.contains('onebox') && b.getClientRects().length === 1) b.classList.add('onebox'); b.classList.add('pressing'); }, {passive:true});
  ['pointerup','pointercancel'].forEach(ev => document.addEventListener(ev, release, {passive:true}));
  document.addEventListener('pointerleave', e => { if (e.target === document.documentElement) release(); }, {passive:true});
  document.addEventListener('touchstart', () => {}, {passive:true});
})();

/* ---- on-screen keyboard hygiene ----
   On phones a focused field can leave the page stuck after the keyboard closes. So:
   the header stops being sticky while you type, a tap outside the field closes the keyboard,
   and when the keyboard goes away the field lets go of focus. */
const isField = el => !!(el && el.matches && el.matches('input:not([type=checkbox]):not([type=radio]),textarea,select'));
// dismiss the on-screen keyboard
function blurField(){ const a = document.activeElement; if (isField(a)) a.blur(); }
document.addEventListener('focusin', e => { if (isField(e.target) && matchMedia('(pointer:coarse)').matches) document.body.classList.add('typing'); });
document.addEventListener('focusout', e => { if (isField(e.target)) setTimeout(() => { if (!isField(document.activeElement)) document.body.classList.remove('typing'); }, 60); });
document.addEventListener('touchstart', e => {
  const a = document.activeElement;
  if (isField(a) && !isField(e.target) && !(e.target.closest && e.target.closest('label'))) {
    // keep the field focused when the tap is a button that reads it (Spend, Add note…); it blurs itself after
    if (e.target.closest && e.target.closest('button')) return;
    a.blur();
  }
}, {passive:true, capture:true});
if (window.visualViewport) {
  let vh = visualViewport.height;
  visualViewport.addEventListener('resize', () => {
    const h = visualViewport.height;
    if (h - vh > 120) blurField();          // keyboard closed: release the field
    vh = h;
  });
}
document.addEventListener('keydown', e => {
  if (e.key === 'Enter' && e.target && e.target.matches && e.target.matches('input[type=number]')) { e.preventDefault(); e.target.blur(); }
});
document.addEventListener('keydown', e => { const t = e.target; if ((e.key === 'Enter' || e.key === ' ') && t && t.dataset && t.dataset.pick) { e.preventDefault(); pickCoin(t.dataset.pick); const n = document.querySelector('[data-pick="'+t.dataset.pick+'"]'); if (n) n.focus(); } });

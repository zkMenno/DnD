/* ============================================================================
   §22 MOVE — take a claude.ai sheet's tracker and notes over to the web app
   claude.ai sheet: ☰ → Sync → 📦 Move to the web app gives a code (plain JSON with a marker in front).
   Web app, own sheet of the same character: ☰ → Sync → 📥 Bring over from claude.ai takes it. Nothing is sent
   anywhere in between: the player copies and pastes. The server checks what's saved like any other save.
   Defines: MOVE_TAG, MOVE_MAX, NOTE_FIELDS, noteOnly, moveCode, readMoveCode, moveOut, copyText, moveIn.
   Uses: S, save, normalizeState, VIEW, DB (§03), NOTES, noteScope, pendingIds, NCACHE, confirmBox (§17),
   setMsg (§15), addedChanged (§11), render (§13), ADDED, DATA, ls, esc (§02).
   Only called from taps (§20), so it can come after §21 has started the sheet.
   ============================================================================ */
const MOVE_TAG = 'SHEETMOVE1 ', MOVE_MAX = 2000000;   // marker + version; the biggest code accepted (characters)
const NOTE_FIELDS = ['text', 'kind', 'done', 'at', 'session'];   // the note fields that travel
// A copy of a note with only NOTE_FIELDS (no id, author or anything else).
const noteOnly = n => { const o = {}; NOTE_FIELDS.forEach(k => { if (n && k in n) o[k] = n[k]; }); return o; };

// ── claude.ai side: the code ───────────────────────────────────────────────────────────────────────────────
// The code: MOVE_TAG + JSON of the character's id, name and last sync, the tracker as it is now, and the character's
// own notes (not the party log). Notes still saving are left out; while the party log shows, the cached own notes go.
function moveCode(){
  const notes = noteScope === 'own' ? NOTES.filter(n => !pendingIds.has(n.id)).map(noteOnly) : (ls.get(NCACHE) || []).map(noteOnly);
  return MOVE_TAG + JSON.stringify({ ddb: DATA.id, name: DATA.name, syncedAt: DATA.syncedAt, at: Date.now(), state: S, notes });
}

// Check a pasted code: { ok: true, data } or { ok: false, why } with why in words for the player (HTML-safe).
// Refuses empty, oversized, untagged, cut-short or incomplete codes, and codes for another character.
function readMoveCode(text){
  const t = String(text || '').trim();
  if (!t) return { ok: false, why: 'Paste the code first.' };
  if (t.length > MOVE_MAX) return { ok: false, why: 'That code is too long.' };
  if (t.indexOf(MOVE_TAG) !== 0) return { ok: false, why: 'That isn’t a moving code. Copy it again from the claude.ai sheet (☰ → Sync → 📦 Move).' };
  let d; try { d = JSON.parse(t.slice(MOVE_TAG.length)); } catch (_) { return { ok: false, why: 'The code is cut short. Copy all of it and try again.' }; }
  if (!d || typeof d !== 'object' || !d.state || typeof d.state !== 'object' || !Array.isArray(d.notes)) return { ok: false, why: 'The code is incomplete. Copy it again.' };
  if (+d.ddb !== +DATA.id) return { ok: false, why: 'This code is for ' + esc(d.name || 'another character') + ', not ' + esc(DATA.name) + '.' };
  return { ok: true, data: d };
}

// claude.ai: 📦 Move. Show the code in a dialog; its button copies it (or press and hold the code to copy by hand).
async function moveOut(){
  const code = moveCode(), n = noteScope === 'own' ? NOTES.length : 0;
  const ok = await confirmBox('📦 Move to the web app',
    '<p>This code holds the tracker (HP, uses, slots, coins, added items) and ' + n + ' note' + (n === 1 ? '' : 's') + '. In the web app, open ' + esc(DATA.name)
      + ', then ☰ → Sync → <b>📥 Bring over from claude.ai</b> and paste it. This sheet stays as it is.</p>'
      + '<textarea class="movecode" readonly rows="4" aria-label="Moving code">' + esc(code) + '</textarea>', '📋 Copy code', false);
  if (!ok) return;
  const copied = await copyText(code);
  setMsg(copied ? '📋 Code copied. Paste it in the web app.' : 'Couldn’t copy by itself. Open 📦 Move again, press and hold the code, and copy it.');
}
// Copy text to the clipboard, with the old execCommand fallback (some embedded views block the clipboard API).
// Resolves true when it worked.
async function copyText(t){
  try { await navigator.clipboard.writeText(t); return true; } catch (_) {}
  try { const ta = document.createElement('textarea'); ta.value = t; ta.style.position = 'fixed'; ta.style.opacity = '0'; document.body.appendChild(ta); ta.select();
    const ok = document.execCommand('copy'); ta.remove(); return ok; } catch (_) { return false; }
}

// ── Web app side: bringing it in ───────────────────────────────────────────────────────────────────────────
// 📥 Bring over: paste, check, confirm, then the tracker is replaced and the notes are added (skipping ones already
// here, matched on time + text). The tracker takes this copy's sync stamp, so it isn't reset as out of date.
// Needs the stored tracker (DB) and your own sheet, not a shared view.
async function moveIn(){
  if (VIEW || !DB) return setMsg('Open your own copy of this sheet in the web app to bring a tracker over.');
  let pasted = '';
  const go = await confirmBox('📥 Bring over from claude.ai',
    '<p>On the claude.ai sheet: ☰ → Sync → <b>📦 Move to the web app</b> → Copy code. Paste it here.</p>'
      + '<textarea class="movecode" id="movepaste" rows="4" placeholder="SHEETMOVE1 {…}" aria-label="Paste the moving code"></textarea>',
    'Next', false, w => { pasted = w.querySelector('#movepaste').value; });
  if (!go) return;
  const r = readMoveCode(pasted);
  if (!r.ok) return setMsg(r.why);
  const d = r.data, have = new Set(NOTES.map(n => n.at + '|' + n.text)), add = d.notes.map(noteOnly).filter(n => typeof n.text === 'string' && !have.has(n.at + '|' + n.text));
  const drift = d.syncedAt !== DATA.syncedAt;
  if (!await confirmBox('Replace this tracker?', '<p>The tracker here becomes the one from claude.ai, and ' + add.length + ' note' + (add.length === 1 ? '' : 's') + ' go into My notes.</p>'
      + (drift ? '<p class="small">The two copies were synced from D&amp;D Beyond at different times: check HP and uses afterwards.</p>' : ''), 'Bring it over', true)) return;
  const st = JSON.parse(JSON.stringify(d.state)); st.stamp = DATA.syncedAt;   // this copy's sync is the reset point now
  S = normalizeState(st); save();
  for (const n of add) { try { await DB.collection('notes').doc().set(n); } catch (_) {} }
  if (JSON.stringify(S.added) !== JSON.stringify(ADDED)) addedChanged(); else render();
  setMsg('📥 Brought over: tracker' + (add.length ? ' and ' + add.length + ' note' + (add.length === 1 ? '' : 's') : '') + '.');
}

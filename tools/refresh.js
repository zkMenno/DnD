// Refreshes a claude.ai sheet's data from D&D Beyond without resetting its tracker. Fetches the raw JSON into
// data/<name>.json, builds, opens the built sheet in headless Chromium so the engine compacts it, and writes the
// compact DATA back with the old syncedAt (the play state is keyed to it). Builds again at the end.
// usage: node tools/refresh.js <data name> <out html> <ddb id>   e.g. node tools/refresh.js tester2 apptester2.html <ddb id>
// Needs curl, playwright and Chromium ($CHROMIUM, default /opt/pw-browsers/chromium). The character must be public on D&D Beyond.
// If the page throws or yields no character, the old data file is put back.
const {chromium}=require('playwright'); const fs=require('fs'), {execSync}=require('child_process');
const [dataName, html, id] = process.argv.slice(2), file = __dirname+'/../data/'+dataName+'.json';
const old = JSON.parse(fs.readFileSync(file,'utf8'));
execSync('curl -sf "https://character-service.dndbeyond.com/character/v5/character/'+id+'" -o '+file);
execSync('node '+__dirname+'/build.js');
// Items added in the app (added: true) are left out: they live in the tracker, not in D&D Beyond's data.
(async()=>{const b=await chromium.launch({executablePath:process.env.CHROMIUM||'/opt/pw-browsers/chromium'});const p=await b.newPage();const errs=[];p.on('pageerror',e=>errs.push(e.message));
await p.goto('file://'+__dirname+'/../dist/claude/'+html);await p.waitForTimeout(1200);
const d=await p.evaluate(()=>Object.assign({},DATA,{inventory:DATA.inventory.filter(i=>!i.added)}));
if (errs.length || !d || !d.id) { fs.writeFileSync(file, JSON.stringify(old)); console.log('FAILED, kept old', errs); }
else { d.syncedAt = old.syncedAt; delete d.vFrom; fs.writeFileSync(file, JSON.stringify(d)); console.log(dataName, 'v'+d.v, 'kept syncedAt', d.syncedAt); }
await b.close(); execSync('node '+__dirname+'/build.js');})();

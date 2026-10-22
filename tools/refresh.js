// Refresh a sheet's data from D&D Beyond without resetting its tracker: fetch the raw JSON, let the engine compact it,
// keep the old syncedAt (the play state is keyed to it). usage: node tools/refresh.js <data name> <out html> <ddb id>
const {chromium}=require('playwright'); const fs=require('fs'), {execSync}=require('child_process');
const [dataName, html, id] = process.argv.slice(2), file = __dirname+'/../data/'+dataName+'.json';
const old = JSON.parse(fs.readFileSync(file,'utf8'));
execSync('curl -sf "https://character-service.dndbeyond.com/character/v5/character/'+id+'" -o '+file);
execSync('node '+__dirname+'/build.js');
(async()=>{const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium'});const p=await b.newPage();const errs=[];p.on('pageerror',e=>errs.push(e.message));
await p.goto('file://'+__dirname+'/../dist/claude/'+html);await p.waitForTimeout(1200);
const d=await p.evaluate(()=>Object.assign({},DATA,{inventory:DATA.inventory.filter(i=>!i.added)}));
if (errs.length || !d || !d.id) { fs.writeFileSync(file, JSON.stringify(old)); console.log('FAILED, kept old', errs); }
else { d.syncedAt = old.syncedAt; delete d.vFrom; fs.writeFileSync(file, JSON.stringify(d)); console.log(dataName, 'v'+d.v, 'kept syncedAt', d.syncedAt); }
await b.close(); execSync('node '+__dirname+'/build.js');})();

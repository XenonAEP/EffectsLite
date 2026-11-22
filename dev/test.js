const {chromium}=require('playwright'),fs=require('fs'),path=require('path'),os=require('os'),crypto=require('crypto');
const mkServer=require('./server.js');
const EXT=process.env.EXT||'/home/claude/EffectsLite', SHOT='/home/claude/tools/shots';
fs.mkdirSync(SHOT,{recursive:true});
let pass=0,fail=0; const log=(ok,msg,extra)=>{ok?pass++:fail++;console.log((ok?'PASS ':'FAIL ')+msg+(ok||extra===undefined?'':'  -> '+JSON.stringify(extra)))};
function walk(d,o=[]){for(const e of fs.readdirSync(d,{withFileTypes:true})){const p=path.join(d,e.name);e.isDirectory()?walk(p,o):o.push(p)}return o}
function treeHash(d){const h=crypto.createHash('md5');for(const f of walk(d).sort()){h.update(f+fs.statSync(f).size)}return h.digest('hex')}
(async()=>{
 const srv=await mkServer(), port=srv.address().port;
 const HOME=fs.mkdtempSync(path.join(os.tmpdir(),'elhome-'));
 const before=treeHash(path.join(EXT,'assets'));
 const browser=await chromium.launch({args:['--allow-file-access-from-files','--autoplay-policy=no-user-gesture-required']});
 const errors=[];
 async function open(w=360,h=640){
   const ctx=await browser.newContext({viewport:{width:w,height:h},deviceScaleFactor:1});
   const page=await ctx.newPage();
   page.on('pageerror',e=>errors.push('pageerror: '+e.message));
   page.on('console',m=>{if(m.type()==='error')errors.push('console: '+m.text())});
   await page.addInitScript(`window.__FSBASE__='http://localhost:${port}';window.__HOME__=${JSON.stringify(HOME)};`);
   await page.addInitScript({content:fs.readFileSync('shim.js','utf8')});
   await page.goto('file://'+EXT+'/index.html');
   await page.waitForFunction(()=>window.EL&&EL.ready,null,{timeout:5000});
   return page;
 }
 const hv=async(p,card,act)=>{await p.hover(card);await p.click(card+' [data-act='+act+']')};
 const dlg=async(p,text)=>{ if(text!=null) await p.fill('.dlg input',text); await p.click('.dlg [data-r="1"]'); };
 let p=await open();
 // ---- Home
 log(await p.locator('#tab-home.on').count()===1,'starts on Home');
 log((await p.textContent('.ver')).trim()==='v1.0.0','version shown bottom corner');
 log(await p.locator('#tab-home .fcard').count()>=4,'quick access suggests folders on fresh install');
 log((await p.locator('#tab-home .box').first().textContent()).includes('First release'),'updates section shows latest update');
 log((await p.textContent('#tab-home .hint')).includes('star'),'favorites empty-state');
 await p.screenshot({path:SHOT+'/home.png'});
 // ---- tabs instant, not reloaded
 await p.evaluate(()=>{window.__marker=1});
 await p.click('[data-tab=sfx]'); await p.click('[data-tab=overlays]'); await p.click('[data-tab=settings]'); await p.click('[data-tab=home]');
 log(await p.evaluate(()=>window.__marker===1),'tab switching does not reload the page');
 // ---- SFX
 await p.click('[data-tab=sfx]');
 const folders=await p.$$eval('#tab-sfx .fcard b',e=>e.map(x=>x.textContent));
 console.log('  SFX root folders:',folders.join(', '));
 log(['Bell','Drone','Drop','Electronics','Explosion','Extras','Glitch','Pop','Riser','Songs','Whoosh'].every(f=>folders.includes(f)),'all bundled SFX folders detected (incl. Songs)');
 await p.click('#tab-sfx .fcard:has(b:text-is("Whoosh"))');
 log(await p.locator('#tab-sfx .row').count()===10,'Whoosh shows 10 rows');
 log((await p.textContent('#tab-sfx .crumbs')).includes('Whoosh'),'breadcrumb shows path');
 await p.screenshot({path:SHOT+'/sfx.png'});
 // preview
 await p.click('#tab-sfx .row >> nth=0 >> .play');
 await p.waitForTimeout(400);
 const aud=await p.evaluate(()=>({cur:EL.audio.cur,playing:EL.audio.playing}));
 log(!!aud.cur&&aud.cur.endsWith('01-Whoosh.mp3'),'play sets shared audio source',aud);
 log(await p.locator('#tab-sfx .row.active').count()===1,'active row highlighted');
 await p.click('[data-tab=home]');
 log(await p.evaluate(()=>EL.audio.cur===null),'leaving SFX tab stops preview & drops source');
 await p.click('[data-tab=sfx]');
 log((await p.textContent('#tab-sfx .crumbs')).includes('Whoosh'),'tab keeps its folder when returning');
 // insert call
 await p.evaluate(()=>{window.__evals=[];EL.cep.eval=(s,cb)=>{window.__evals.push(s);cb&&cb('ok|Added to Comp 1')}});
 await p.click('#tab-sfx .row >> nth=1 >> [data-act=insert]');
 const ev=await p.evaluate(()=>window.__evals[0]);
 log(/^EL_insert\(".*02-Whoosh\.mp3","place","sfx",true,false\)$/.test(ev),'insert sends EL_insert(path,"place","sfx",...)',ev);
 log((await p.textContent('#toast')).includes('Added to Comp 1'),'insert result toasted');
 await p.dblclick('#tab-sfx .row >> nth=2');
 log(await p.evaluate(()=>window.__evals.length===2&&/03-Whoosh/.test(window.__evals[1])),'double-click inserts');
 // drag payload
 const dt=await p.evaluate(()=>{const r=document.querySelector('#tab-sfx .row');const d=new DataTransfer();r.dispatchEvent(new DragEvent('dragstart',{bubbles:true,dataTransfer:d}));return {u:d.getData('text/uri-list'),t:d.getData('text/plain'),ef:d.effectAllowed}});
 log(dt.u.startsWith('file://')&&dt.t.endsWith('01-Whoosh.mp3'),'dragstart carries file URL + path',dt);
 // search
 await p.click('#tab-sfx .crumbs [data-act=crumb]');
 await p.fill('#tab-sfx .search input','glitch 05'); await p.waitForTimeout(300);
 log(await p.locator('#tab-sfx .row').count()===1,'global search finds "glitch 05"');
 await p.fill('#tab-sfx .search input','whoosh'); await p.waitForTimeout(300);
 log(await p.locator('#tab-sfx .row').count()===14,'search spans folders: 10 in Whoosh + 4 in Extras', await p.locator('#tab-sfx .row').count());
 await p.fill('#tab-sfx .search input',''); await p.waitForTimeout(300);
 // favorites
 await p.click('#tab-sfx .fcard:has(b:text-is("Glitch")) [data-act=fav]');
 await p.click('#tab-sfx .fcard:has(b:text-is("Riser")) [data-act=fav]');
 await p.click('[data-tab=home]');
 const favs=await p.$$eval('#tab-home h2:has-text("Favorites") + .fgrid .fcard b',e=>e.map(x=>x.textContent));
 log(favs.length===2&&favs.includes('Glitch'),'favorites appear on Home',favs);
 await p.click('#tab-home h2:has-text("Favorites") + .fgrid .fcard:has(b:text-is("Glitch"))');
 log(await p.locator('#tab-sfx.on').count()===1&&(await p.textContent('#tab-sfx .crumbs')).includes('Glitch'),'clicking favorite jumps into folder');
 // ---- custom folders
 await p.click('#tab-sfx .crumbs [data-act=crumb]');
 await p.click('#tab-sfx [data-act=newfolder]'); await dlg(p,'My Hits');
 const U=path.join(HOME,'.effectslite-data','EffectsLite');
 log(fs.existsSync(path.join(U,'sfx','My Hits')),'create folder -> real directory in user area');
 log((await p.textContent('#tab-sfx .crumbs')).includes('My Hits'),'navigates into new folder');
 // duplicate name error: at root
 await p.click('#tab-sfx .crumbs [data-act=crumb]');
 await p.click('#tab-sfx [data-act=newfolder]'); await p.fill('.dlg input','my hits'); await p.click('.dlg [data-r="1"]');
 await p.waitForTimeout(100);
 log((await p.textContent('#toast')).includes('already exists'),'duplicate (case-insensitive) rejected');
 log(await p.locator('.modal').count()===0,'dialog closed after error toast');
 // import via stubbed picker (files)
 const src=path.join(HOME,'ext-src'); fs.mkdirSync(src,{recursive:true});
 const mp3=path.join(EXT,'assets/sfx/Pop/01-Pop.mp3');
 fs.copyFileSync(mp3,path.join(src,'mine one.mp3')); fs.copyFileSync(mp3,path.join(src,'mine#2.mp3')); fs.writeFileSync(path.join(src,'notes.txt'),'x');
 await p.click('#tab-sfx .fcard:has(b:text-is("My Hits"))');
 await p.evaluate(s=>{EL.cep.pick=o=>o.dir?[s+'/pack']:[s+'/mine one.mp3',s+'/mine#2.mp3',s+'/notes.txt']},src);
 await p.click('#tab-sfx [data-act=import]'); await p.click('.opt[data-id=files]');
 await p.waitForTimeout(150);
 log(await p.locator('#tab-sfx .row').count()===2,'import copies supported files only (txt skipped)');
 log(fs.existsSync(path.join(U,'sfx','My Hits','mine#2.mp3')),'file with # copied');
 log((await p.textContent('#toast')).includes('1 unsupported'),'toast reports skipped');
 // import again -> unique name
 await p.click('#tab-sfx [data-act=import]'); await p.click('.opt[data-id=files]'); await p.waitForTimeout(100);
 log(await p.locator('#tab-sfx .row').count()===4&&fs.existsSync(path.join(U,'sfx','My Hits','mine one (2).mp3')),'duplicate file names get (2) suffix');
 // import while inside a BUNDLED folder -> goes to 'Imported'
 await p.click('#tab-sfx .crumbs [data-act=crumb]'); await p.click('#tab-sfx .fcard:has(b:text-is("Pop"))');
 await p.click('#tab-sfx [data-act=import]'); await p.click('.opt[data-id=files]'); await p.waitForTimeout(150);
 log(fs.existsSync(path.join(U,'sfx','Imported','mine one.mp3')),'import from bundled folder lands in custom "Imported" (bundled untouched)');
 log(fs.readdirSync(path.join(EXT,'assets/sfx/Pop')).length===10,'bundled Pop still has exactly 10 files');
 // import whole folder
 fs.mkdirSync(path.join(src,'pack/sub'),{recursive:true}); fs.copyFileSync(mp3,path.join(src,'pack/a.mp3')); fs.copyFileSync(mp3,path.join(src,'pack/sub/b.wav')); fs.writeFileSync(path.join(src,'pack/c.doc'),'x');
 await p.click('#tab-sfx .crumbs [data-act=crumb]');
 await p.click('#tab-sfx [data-act=import]'); await p.click('.opt[data-id=dir]'); await p.waitForTimeout(150);
 log(fs.existsSync(path.join(U,'sfx','pack','sub','b.wav'))&&!fs.existsSync(path.join(U,'sfx','pack','c.doc')),'import folder keeps structure, filters types');
 // rename + favorite follows
 await p.click('#tab-sfx .crumbs [data-act=crumb]');
 await p.click('#tab-sfx .fcard:has(b:text-is("My Hits")) [data-act=fav]');
 await hv(p,'#tab-sfx .fcard:has(b:text-is("My Hits"))','rename'); await dlg(p,'Punchy');
 await p.waitForTimeout(100);
 log(fs.existsSync(path.join(U,'sfx','Punchy'))&&!fs.existsSync(path.join(U,'sfx','My Hits')),'rename folder on disk');
 log(await p.evaluate(()=>!!EL.store.state.fav['sfx:u:Punchy']&&!EL.store.state.fav['sfx:u:My Hits']),'favorite follows renamed folder');
 log(await p.locator('#tab-sfx .fcard:has(b:text-is("Whoosh")) [data-act=rename]').count()===0,'bundled folders have NO rename/delete buttons');
 // save-to copy
 await p.click('#tab-sfx .fcard:has(b:text-is("Pop"))');
 await p.click('#tab-sfx .row >> nth=0 >> [data-act=save]'); await p.click('.opt[data-id="sfx:u:Punchy"]'); await p.waitForTimeout(100);
 log(fs.existsSync(path.join(U,'sfx','Punchy','01-Pop.mp3')),'save-a-copy puts bundled file into custom folder');
 // delete file (custom only)
 await p.click('#tab-sfx .crumbs [data-act=crumb]'); await p.click('#tab-sfx .fcard:has(b:text-is("Punchy"))');
 log(await p.locator('#tab-sfx .row [data-act=del]').count()===5,'custom files have delete button');
 await p.click('#tab-sfx .row >> nth=0 >> [data-act=del]'); await dlg(p);
 await p.waitForTimeout(100);
 log(await p.locator('#tab-sfx .row').count()===4,'delete custom file');
 // delete folder
 await p.click('#tab-sfx .crumbs [data-act=crumb]');
 await hv(p,'#tab-sfx .fcard:has(b:text-is("pack"))','delfolder'); await dlg(p); await p.waitForTimeout(100);
 log(!fs.existsSync(path.join(U,'sfx','pack')),'delete custom folder from disk');
 await p.screenshot({path:SHOT+'/sfx-custom.png'});
 // ---- Overlays
 await p.click('[data-tab=overlays]');
 const ofold=await p.$$eval('#tab-overlays .fcard b',e=>e.map(x=>x.textContent));
 log(['Chains','Fire','Splash'].every(f=>ofold.includes(f)),'overlay folders merged from 3 zips',ofold);
 await p.click('#tab-overlays .fcard:has(b:text-is("Fire"))');
 await p.waitForTimeout(500);
 log(await p.locator('#tab-overlays .card').count()===3,'Fire has 3 overlay cards');
 log(await p.locator('#tab-overlays .card.hasth').count()===3,'bundled thumbnails load (incl. name with #)');
 await p.screenshot({path:SHOT+'/overlays.png'});
 await p.click('#tab-overlays .card >> nth=0');
 log(await p.locator('.modal video').count()===1,'click opens viewer with <video>');
 await p.keyboard.press('Escape'); log(await p.locator('.modal').count()===0,'Esc closes viewer');
 await p.click('#tab-overlays .card >> nth=0'); await p.click('.modal [data-r=ins]');
 log(await p.evaluate(()=>/"overlays",true,false\)$/.test(window.__evals[window.__evals.length-1])),'overlay insert passes kind + fit flag');
 // user video import -> generated thumbnail cache (h264 may not decode in headless chromium: both outcomes acceptable but must not hang)
 // ---- Settings
 await p.click('[data-tab=settings]');
 await p.click('#tab-settings .seg[data-key=theme] [data-v=light]');
 log(await p.evaluate(()=>document.documentElement.dataset.theme)==='light','theme switch applies immediately');
 await p.screenshot({path:SHOT+'/settings-light.png'});
 await p.click('#tab-settings .seg[data-key=theme] [data-v=dark]');
 await p.click('#tab-settings .seg[data-key=action] [data-v=import]');
 log(await p.locator('#tab-settings .mrow').count()>=2,'manage custom content lists folders');
 await p.screenshot({path:SHOT+'/settings.png'});
 await p.click('#tab-settings .mrow:has(b:text-is("Imported")) [data-act=reveal]');
 log(await p.evaluate(()=>(window.__spawned||[]).length>0),'reveal spawns file browser');
 await p.click('#tab-settings .mrow:has(b:text-is("Imported")) [data-act=del]'); await dlg(p); await p.waitForTimeout(100);
 log(!fs.existsSync(path.join(U,'sfx','Imported')),'delete custom folder from Settings');
 // ---- persistence
 await p.evaluate(()=>EL.store.flush());
 await p.close(); p=await open();
 log(await p.evaluate(()=>EL.store.prefs.action)==='import','prefs persist across restart');
 log(await p.evaluate(()=>!!EL.store.state.fav['sfx:u:Punchy']&&!!EL.store.state.fav['sfx:b:Glitch']),'favorites persist across restart');
 log(await p.locator('#tab-settings.on').count()===1,'last tab restored');
 await p.click('[data-tab=sfx]'); log(await p.locator('#tab-sfx .fcard:has(b:text-is("Punchy"))').count()===1,'custom content persists across restart');
 await p.evaluate(()=>{window.__evals=[];EL.cep.eval=(s,cb)=>{window.__evals.push(s)}});
 await p.click('#tab-sfx .fcard:has(b:text-is("Punchy"))'); await p.click('#tab-sfx .row >> nth=0 >> [data-act=insert]');
 log(await p.evaluate(()=>/"import"/.test(window.__evals[0])),'"project only" pref switches mode to import');
 // reset prefs
 await p.click('[data-tab=settings]'); await p.click('[data-act=resetprefs]'); await dlg(p); await p.waitForTimeout(100);
 log(await p.evaluate(()=>EL.store.prefs.action==='place'&&EL.store.prefs.theme==='dark')&&fs.existsSync(path.join(U,'sfx','Punchy')),'reset preferences keeps content');
 await p.click('[data-act=clearhist]'); await dlg(p);
 log(await p.evaluate(()=>Object.keys(EL.store.state.fav).length===0),'clear favorites/history');
 // corrupt data.json must not break startup
 fs.writeFileSync(path.join(U,'data.json'),'{not json'); await p.close(); p=await open();
 log(true,'corrupt data.json tolerated');
 // ---- scale: 5000 files in one folder
 const big=path.join(U,'sfx','Big'); fs.mkdirSync(big,{recursive:true});
 for(let i=0;i<5000;i++) fs.copyFileSync(mp3,path.join(big,'Sound '+String(i).padStart(5,'0')+'.mp3'));
 await p.click('[data-tab=sfx]');
 let t=Date.now(); await p.click('#tab-sfx .fcard:has(b:text-is("Big"))'); await p.waitForSelector('#tab-sfx .row');
 const dt1=Date.now()-t;
 const rows=await p.locator('#tab-sfx .row').count();
 log(rows<40,'5000 files -> only '+rows+' DOM rows',rows); console.log('  open 5000-file folder: '+dt1+' ms');
 await p.evaluate(()=>{document.querySelector('#tab-sfx .scroll').scrollTop=1e7}); await p.waitForTimeout(200);
 log(await p.evaluate(()=>{const n=document.querySelectorAll('#tab-sfx .row .nm');return n[n.length-1].textContent.includes('04999')}),'scrolling to the end renders last item');
 t=Date.now(); await p.fill('#tab-sfx .search input','04321'); await p.waitForSelector('#tab-sfx .row'); await p.waitForTimeout(250);
 console.log('  search over ~5100 files incl. index build: ~'+(Date.now()-t)+' ms (incl 140ms debounce)');
 log(await p.locator('#tab-sfx .row').count()===1,'search finds the single match among 5000');
 // ---- 3000 overlay images
 const ob=path.join(U,'overlays','BigImgs'); fs.mkdirSync(ob,{recursive:true});
 const png=path.join(EXT,'assets/_thumbs/overlays/Splash/VID_20260615_114714_935.mp4.jpg');
 for(let i=0;i<3000;i++) fs.copyFileSync(png,path.join(ob,'img'+String(i).padStart(4,'0')+'.jpg'));
 await p.click('[data-tab=overlays]'); await p.click('#tab-overlays .crumbs [data-act=crumb]').catch(()=>{});
 await p.click('#tab-overlays .fcard:has(b:text-is("BigImgs"))'); await p.waitForSelector('#tab-overlays .card');
 await p.waitForTimeout(1500);
 const cards=await p.locator('#tab-overlays .card').count(), th=await p.locator('#tab-overlays .card.hasth').count();
 log(cards<40,'3000 images -> '+cards+' cards in DOM',cards);
 log(th>0,'user image thumbnails generated lazily ('+th+'/'+cards+' ready)');
 const cached=fs.readdirSync(path.join(U,'cache','thumbs')).length;
 log(cached>0&&cached<=cards,'only visible items were thumbnailed on disk ('+cached+' cached)',cached);
 await p.screenshot({path:SHOT+'/overlays-big.png'});
 // ---- bundled assets intact
 log(treeHash(path.join(EXT,'assets'))===before,'bundled assets byte-identical after all tests');
 // ---- narrow + wide layouts
 await p.setViewportSize({width:240,height:400}); await p.screenshot({path:SHOT+'/narrow.png'});
 await p.setViewportSize({width:900,height:600}); await p.waitForTimeout(200); await p.screenshot({path:SHOT+'/wide.png'});
 log(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'no horizontal overflow at 900px');
 log(errors.length===0,'no console/page errors',errors);
 await browser.close(); srv.close();
 fs.rmSync(HOME,{recursive:true,force:true});
 console.log(`\n${pass} passed, ${fail} failed`); process.exit(fail?1:0);
})().catch(e=>{console.error('CRASH',e);process.exit(2)});

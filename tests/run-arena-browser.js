'use strict';
const http=require('node:http'),fs=require('node:fs'),path=require('node:path'),os=require('node:os');
const {spawn}=require('node:child_process');
const root=path.resolve(__dirname,'..');
const executable=process.env.CHROME_BIN||(process.platform==='win32'?'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe':'chromium');
const tempRoot=path.resolve(os.tmpdir()),profile=fs.mkdtempSync(path.join(tempRoot,'diep-arena-test-'));
const files=new Set(['/tests/arena-browser.html','/tests/arena-browser.js','/memory-codec.js','/memory-store.js','/memory-idb.js','/memory-bridge.js']);
const hook=`window.__arenaTest={get world(){return world},get mode(){return mode},get pendingTransition(){return transitionPending},
  restart,setMode,recordOutcome,enterRoomWorld,pause(){paused=true},get bridge(){return indexedMemoryBridge},set bridge(value){indexedMemoryBridge=value},
  failingBridge(){return createIndexedMemoryBridge({indexedDB:{open(){throw Error('unavailable')}},codec:createMemoryCodec({classes:C,newMemory,ttl:MEMORY_TTL}),createStore:createTransactionalMemoryStore})},
  legacyBridge(name,getLegacyStorage){return createIndexedMemoryBridge({indexedDB,codec:createMemoryCodec({classes:C,newMemory,ttl:MEMORY_TTL}),createStore:createTransactionalMemoryStore,name,getLegacyStorage})},
  database(){return createTransactionalMemoryStore({indexedDB,codec:createMemoryCodec({classes:C,newMemory,ttl:MEMORY_TTL})}).open()}};`;
const server=http.createServer((req,res)=>{
  if(req.url==='/wait'){setTimeout(()=>res.end('ok'),30000);return;}
  const url=new URL(req.url,'http://localhost'),p=url.pathname;
  if(p==='/game'){
    let html=fs.readFileSync(path.join(root,'index.html'),'utf8');
    if(url.searchParams.get('enabled')==='1')html=html.replace('const REUSE_BOT_MEMORY=false;','const REUSE_BOT_MEMORY=true;');
    if(url.searchParams.get('bench')==='1'){
      html=html.replace('<option selected>24</option><option>36</option>','<option>24</option><option selected>36</option>');
      html=html.replace('el("botCount").value=initialBots;','el("botCount").value=36;');
      html=html.replace('createIndexedMemoryBridge({indexedDB,codec:',`createIndexedMemoryBridge({indexedDB,name:'diep-benchmark-${Date.now()}-${Math.random()}',codec:`);
      html=html.replace('src="memory-idb.js"','src="memory-idb.js?bench=1"').replace('src="memory-bridge.js"','src="memory-bridge.js?bench=1"');
      html=html.replace('  world=new Arena(config.seed,','  const __buildStart=performance.now();world=new Arena(config.seed,');
      html=html.replace('config.map,config.boss,config.ship,config.events,config.player,null,memoryStore);','config.map,config.boss,config.ship,config.events,config.player,null,memoryStore);window.__metrics.build.push(performance.now()-__buildStart);');
      html=html.replace('<script id="core">','<script>window.__metrics={scan:[],migrationWrite:[],migration:[],read:[],serialize:[],write:[],build:[]};</script><script id="core">');
    }
    html=html.replace('<script id="core">','<script>window.__idbCalls=0;window.__legacyReads=0;window.__initialBuild=null;window.__beforeBotBuild=t=>{if(t.slot===0&&window.__initialBuild===null)window.__initialBuild=t.learning?.samples};{const original=window.indexedDB;Object.defineProperty(window,"indexedDB",{configurable:true,get(){window.__idbCalls++;return original;}});const get=Storage.prototype.getItem;Storage.prototype.getItem=function(k){if(String(k).startsWith("diep-arena:bot-memory:v1:"))window.__legacyReads++;return get.call(this,k);};}</script><script id="core">');
    html=html.replace('if(!human) spendBot(t,this.time);','if(!human){window.__beforeBotBuild?.(t);spendBot(t,this.time);}');
    html=html.replace('el("seed").value=randomSeed();\nresize();',hook+'\nel("seed").value=randomSeed();\nresize();');
    res.setHeader('Content-Type','text/html; charset=utf-8');res.end(html);return;
  }
  if(!files.has(p)){res.writeHead(404).end();return;}
  res.setHeader('Content-Type',p.endsWith('.html')?'text/html; charset=utf-8':'text/javascript; charset=utf-8');
  if(url.searchParams.get('bench')==='1'&&(p==='/memory-idb.js'||p==='/memory-bridge.js')){
    let source=fs.readFileSync(path.join(root,p.slice(1)),'utf8');
    if(p==='/memory-idb.js'){
      source=source.replace('const storage=getStorage();','const __scanStart=performance.now();const storage=getStorage();');
      source=source.replace("const validated=checkRecords(records);\n      return transaction('readwrite'", "const validated=checkRecords(records);window.__metrics.scan.push(performance.now()-__scanStart);const __writeStart=performance.now();\n      return transaction('readwrite'");
      source=source.replace('stateRequest.onsuccess=()=>{gotState=true;begin();};\n      });\n    }','stateRequest.onsuccess=()=>{gotState=true;begin();};\n      }).finally(()=>window.__metrics.migrationWrite.push(performance.now()-__writeStart));\n    }');
    }else{
      source=source.replace('const migration=await db.migrateLegacy(getLegacyStorage);','const __migrationStart=performance.now();const migration=await db.migrateLegacy(getLegacyStorage);window.__metrics.migration.push(performance.now()-__migrationStart);');
      source=source.replace('const session=await db.session();','const __readStart=performance.now();const session=await db.session();window.__metrics.read.push(performance.now()-__readStart);');
      source=source.replace('JSON.parse(codec.serialize(t.learning,arena.time))','JSON.parse((()=>{const start=performance.now();try{return codec.serialize(t.learning,arena.time);}finally{window.__metrics.serialize.push(performance.now()-start);}})())');
      source=source.replace('await session.save(records);','const start=performance.now();try{await session.save(records);}finally{window.__metrics.write.push(performance.now()-start);}');
    }
    res.end(source);return;
  }
  fs.createReadStream(path.join(root,p.slice(1))).pipe(res);
});
server.listen(0,'127.0.0.1',()=>{
  const chrome=spawn(executable,['--headless=new','--disable-gpu','--no-first-run',`--user-data-dir=${profile}`,'--dump-dom',`http://127.0.0.1:${server.address().port}/tests/arena-browser.html`],{windowsHide:true});
  let out='',err='';chrome.stdout.on('data',s=>out+=s);chrome.stderr.on('data',s=>err+=s);
  const timer=setTimeout(()=>chrome.kill(),60000);
  chrome.on('error',e=>{console.error(e.message);process.exitCode=1;});
  chrome.on('close',code=>{clearTimeout(timer);server.close();const m=out.match(/<pre id="result">([\s\S]*?)<\/pre>/);
    if(m)console.log(m[1]);if(code!==0||!m||!m[1].includes('ALL PASSED')||m[1].includes('FAIL ')){console.error('Suíte não terminou ou falhou.',err);process.exitCode=1;}
    if(path.dirname(path.resolve(profile))===tempRoot&&path.basename(profile).startsWith('diep-arena-test-'))try{fs.rmSync(profile,{recursive:true,force:true});}catch(e){console.error(e.message);}
  });
});



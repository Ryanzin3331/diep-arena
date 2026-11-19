'use strict';
// Runs the browser suite against a real local IndexedDB; set CHROME_BIN if needed.
const http=require('node:http'),fs=require('node:fs'),path=require('node:path'),os=require('node:os');
const {spawn}=require('node:child_process');
const root=path.resolve(__dirname,'..');
const executable=process.env.CHROME_BIN||(process.platform==='win32'?'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe':'chromium');
const tempRoot=path.resolve(os.tmpdir()),profile=fs.mkdtempSync(path.join(tempRoot,'diep-idb-test-'));
const files=new Set(['/tests/idb-browser.html','/tests/idb-browser.js','/memory-codec.js','/memory-idb.js']);
const server=http.createServer((req,res)=>{
  if(req.url==='/wait'){setTimeout(()=>res.end('ok'),5000);return;}
  const p=req.url.split('?')[0];if(!files.has(p)){res.writeHead(404).end();return;}
  res.setHeader('Content-Type',p.endsWith('.html')?'text/html; charset=utf-8':'text/javascript; charset=utf-8');
  fs.createReadStream(path.join(root,p.slice(1))).pipe(res);
});
server.listen(0,'127.0.0.1',()=>{
  const url=`http://127.0.0.1:${server.address().port}/tests/idb-browser.html`;
  const chrome=spawn(executable,['--headless=new','--disable-gpu','--no-first-run',`--user-data-dir=${profile}`,'--dump-dom',url],{windowsHide:true});
  let out='',err='';chrome.stdout.on('data',s=>out+=s);chrome.stderr.on('data',s=>err+=s);
  const timer=setTimeout(()=>chrome.kill(),30000);
  chrome.on('error',error=>{console.error(error.message);process.exitCode=1;});
  chrome.on('close',code=>{
    clearTimeout(timer);server.close();
    const result=out.match(/<pre id="result">([\s\S]*?)<\/pre>/);
    if(result)console.log(result[1]);
    if(code!==0||!result||!result[1].includes('ALL PASSED')||result[1].includes('FAIL ')){
      console.error('Suíte do navegador falhou ou não terminou.',err);process.exitCode=1;
    }
    if(path.dirname(path.resolve(profile))===tempRoot&&path.basename(profile).startsWith('diep-idb-test-'))
      try{fs.rmSync(profile,{recursive:true,force:true});}catch(error){console.error('Perfil temporário não removido:',error.message);}
  });
});


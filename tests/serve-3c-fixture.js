'use strict';
const http=require('node:http'),fs=require('node:fs'),path=require('node:path');const root=path.resolve('.');
const port=Number(process.argv[2]??8766);
http.createServer((req,res)=>{const name=decodeURIComponent(new URL(req.url,'http://localhost').pathname);const target=path.resolve(root,'.'+name);if(!target.startsWith(root+path.sep)){res.writeHead(403);return res.end();}fs.readFile(target,(err,data)=>{if(err){res.writeHead(404);return res.end();}res.setHeader('Content-Type',target.endsWith('.js')?'text/javascript; charset=utf-8':'text/html; charset=utf-8');res.end(data);});}).listen(port,'127.0.0.1',()=>console.log(`http://127.0.0.1:${port}/${process.argv[2]?'':'3c-fixture.html'}`));

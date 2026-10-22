import http from 'node:http';
import {readFile,stat} from 'node:fs/promises';
import {resolve,extname} from 'node:path';
const root=resolve(new URL('..',import.meta.url).pathname);
const types={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.mjs':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.svg':'image/svg+xml','.png':'image/png','.jpg':'image/jpeg','.pdf':'application/pdf'};
http.createServer(async(req,res)=>{
  const url=new URL(req.url,'http://127.0.0.1');
  if(url.pathname.includes('/api/')) {res.writeHead(503,{'Content-Type':'application/json'});res.end(JSON.stringify({error:'Local preview: facilitator storage is unavailable. Use demo mode for presentation.'}));return;}
  if(req.method!=='GET'&&req.method!=='HEAD'){res.writeHead(405);res.end();return;}
  try{
    let path=decodeURIComponent(url.pathname);
    if(!['/OWR/','/dashboard/owr/','/assets/','/privacy/','/terms/'].some(prefix=>path.startsWith(prefix)))throw Error('not public');
    let file=resolve(root,'.'+path);
    if(!file.startsWith(root+'/'))throw Error('outside root');
    if((await stat(file)).isDirectory())file=resolve(file,'index.html');
    const content=await readFile(file);
    res.writeHead(200,{'Content-Type':types[extname(file)]||'application/octet-stream','Cache-Control':'no-store','X-Robots-Tag':'noindex,nofollow'});res.end(req.method==='HEAD'?undefined:content);
  }catch{res.writeHead(404);res.end('Not found');}
}).listen(Number(process.env.PORT||4207),'127.0.0.1',()=>console.log('OWR preview: http://127.0.0.1:4207/OWR/present/ (local only, no live data writes)'));

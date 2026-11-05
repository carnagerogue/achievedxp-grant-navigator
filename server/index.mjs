import http from 'node:http';
import {readFile,realpath} from 'node:fs/promises';
import {resolve,dirname,extname,sep} from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash,timingSafeEqual,randomBytes} from 'node:crypto';
import {AiError,prepareAnalysis,runAnalysis} from './ai.mjs';

export function aiConfig(env=process.env,{allowLocalSession=false}={}){
  const origin=env.GRANT_AI_ORIGIN || '';
  let validOrigin=false,localOrigin=false;
  try{const url=new URL(origin);localOrigin=url.protocol==='http:'&&['localhost','127.0.0.1'].includes(url.hostname);validOrigin=url.origin===origin&&(url.protocol==='https:'||localOrigin);}catch(_){}
  const authMode=(env.GRANT_AI_ACCESS_TOKEN||'').length>=32?'access_code':allowLocalSession&&localOrigin?'local_session':'disabled';
  return {apiKey:env.GRANT_AI_KEY||'',model:env.GRANT_AI_MODEL||'',accessToken:env.GRANT_AI_ACCESS_TOKEN||'',origin,
    authMode,enabled:!!env.GRANT_AI_KEY&&!!env.GRANT_AI_MODEL&&authMode!=='disabled'&&validOrigin};
}
const staticFiles=new Set(['index.html','legacy.html','privacy.html','navigator.css','intelligence.css','intelligence.js','navigator.js','navigator-state.js','styles.css','workspace.css','app.js','grant-core.js','matching.js','opportunity-tools.js','opportunity-workspace.js','workspace.js','ai-workspace.js','opportunities.json']);
const types={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.json':'application/json','.png':'image/png','.jpg':'image/jpeg','.jpeg':'image/jpeg','.svg':'image/svg+xml','.webp':'image/webp','.ico':'image/x-icon'};
const digest=v=>createHash('sha256').update(v).digest();
async function jsonBody(req){
  if(!/^application\/json(?:\s*;|$)/i.test(req.headers['content-type']||''))throw new AiError(415,'Use application/json.');
  if(req.headers['content-encoding'])throw new AiError(415,'Compressed requests are not supported.');
  const chunks=[];let size=0;
  for await(const chunk of req){size+=chunk.length;if(size>128000)throw new AiError(413,'The source context is too large. Shorten the notice excerpt.');chunks.push(chunk);}
  try{return JSON.parse(Buffer.concat(chunks).toString('utf8'));}catch(_){throw new AiError(400,'The request is not valid JSON.');}
}
export function createApp({config=aiConfig(),webRoot=resolve(dirname(fileURLToPath(import.meta.url)),'..'),serveStatic=true,loadFeed=()=>readFile(resolve(webRoot,'opportunities.json'),'utf8').then(JSON.parse),analyze=runAnalysis,now=Date.now,maxRequests=30,windowMs=3600000}={}){
  let inFlight=0,windowStart=now(),requestCount=0,failedAuth=0,authStart=now();
  let localSession=randomBytes(32).toString('hex'),sessionExpires=now()+8*3600000;
  const isLocalRequest=req=>serveStatic&&['127.0.0.1','::1','::ffff:127.0.0.1'].includes(req.socket?.remoteAddress)&&req.headers.host===new URL(config.origin).host&&!req.headers['x-forwarded-for'];
  const send=(res,status,value)=>{res.writeHead(status,{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'});res.end(JSON.stringify(value));};
  return http.createServer(async(req,res)=>{
    try{
      const url=new URL(req.url,'http://localhost');
      // GitHub Pages may call a separately hosted API. Only the configured website
      // origin receives CORS access; authentication and usage limits still apply.
      if(url.pathname.startsWith('/api/ai/')&&req.headers.origin===config.origin){
        res.setHeader?.('Access-Control-Allow-Origin',config.origin);
        res.setHeader?.('Vary','Origin');
        if(req.method==='OPTIONS'){
          res.writeHead(204,{'Access-Control-Allow-Origin':config.origin,'Vary':'Origin','Access-Control-Allow-Methods':'GET, POST, OPTIONS','Access-Control-Allow-Headers':'Content-Type, Authorization','Access-Control-Max-Age':'600'});
          return res.end();
        }
      }
      if(url.pathname==='/api/ai/status'&&req.method==='GET')return send(res,200,{enabled:config.enabled,provider:config.enabled?'OpenAI':null});
      if(url.pathname==='/api/ai/analyze'){
        if(req.method!=='POST')throw new AiError(405,'Use POST for analysis.');
        if(!config.enabled)throw new AiError(503,'In-app AI analysis is not configured. You can still export an evidence brief.');
        if(req.headers.origin!==config.origin)throw new AiError(403,'Request origin is not permitted.');
        if(now()-authStart>60000){authStart=now();failedAuth=0;}
        if(failedAuth>=20)throw new AiError(429,'Too many failed access attempts. Try again in a minute.');
        if(config.authMode==='local_session'){
          const cookie=/(?:^|;\s*)grant_ai_session=([a-f0-9]{64})(?:;|$)/.exec(req.headers.cookie||'')?.[1]||'';
          if(!isLocalRequest(req)||now()>sessionExpires||!timingSafeEqual(digest(cookie),digest(localSession)))throw new AiError(401,'Reload the local workspace to renew its analysis session.');
        }else{
          const token=(req.headers.authorization||'').replace(/^Bearer /,'');
          if(token.length>256||!req.headers.authorization?.startsWith('Bearer ')||!timingSafeEqual(digest(token),digest(config.accessToken))){failedAuth++;throw new AiError(401,'Enter a valid workspace access code.');}
        }
        if(now()-windowStart>=windowMs){windowStart=now();requestCount=0;}
        if(inFlight>=2||requestCount>=maxRequests)throw new AiError(429,'The workspace AI limit has been reached. Try again later.');
        // Reserve capacity before reading the request to bound concurrent work.
        inFlight++;
        try{
          const body=await jsonBody(req);
          const prepared=prepareAnalysis(body,await loadFeed());
          requestCount++;
          const result=await analyze(prepared,config);
          return send(res,200,result);
        }finally{inFlight--;}
      }
      if(!serveStatic||!['GET','HEAD'].includes(req.method))throw new AiError(404,'Not found.');
      let name=decodeURIComponent(url.pathname).replace(/^\//,'')||'index.html';
      if(name==='config.js'){
        const publicConfig={aiEnabled:config.enabled,aiAuthMode:config.authMode};
        if(process.env.LEAD_ENDPOINT!==undefined)publicConfig.leadEndpoint=process.env.LEAD_ENDPOINT;
        res.writeHead(200,{'Content-Type':'text/javascript; charset=utf-8','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'});
        return res.end(req.method==='HEAD'?'':'window.NAV_CONFIG = '+JSON.stringify(publicConfig)+';\n');
      }
      if(!staticFiles.has(name)&&!(name.startsWith('assets/')&&Object.hasOwn(types,extname(name))&&!['.html','.js','.json'].includes(extname(name))))throw new AiError(404,'Not found.');
      const root=await realpath(webRoot),path=await realpath(resolve(root,name));
      if(!path.startsWith(root+sep))throw new AiError(404,'Not found.');
      const data=await readFile(path);
      const headers={'Content-Type':types[extname(path)]||'application/octet-stream','Cache-Control':'no-cache','X-Content-Type-Options':'nosniff'};
      if(name==='index.html'&&req.method==='GET'&&config.enabled&&config.authMode==='local_session'&&isLocalRequest(req)){
        if(now()>sessionExpires){localSession=randomBytes(32).toString('hex');sessionExpires=now()+8*3600000;}
        headers['Set-Cookie']='grant_ai_session='+localSession+'; HttpOnly; SameSite=Strict; Path=/api/ai; Max-Age=28800';
      }
      res.writeHead(200,headers);
      res.end(req.method==='HEAD'?undefined:data);
    }catch(error){
      const status=error instanceof AiError?error.status:error.code==='ENOENT'?404:500;
      if(!res.headersSent)send(res,status,{error:error instanceof AiError?error.message:status===404?'Not found.':'The request could not be completed. Your saved plan is unchanged.'});
      else res.end();
    }
  });
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
  const serveStatic=process.env.GRANT_AI_STATIC!=='off';
  const config=aiConfig(process.env,{allowLocalSession:serveStatic}),app=createApp({config,webRoot:process.env.NAVIGATOR_WEB_ROOT,serveStatic});
  app.requestTimeout=15000;app.headersTimeout=10000;
  app.listen(Number(process.env.PORT||process.env.GRANT_AI_PORT||8766),process.env.GRANT_AI_HOST||'127.0.0.1',()=>console.log('Grant workspace server started. AI analysis '+(config.enabled?'enabled.':'disabled; configuration required.')));
}

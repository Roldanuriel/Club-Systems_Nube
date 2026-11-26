const {createServer}=require('node:http');
const {randomBytes,createHash}=require('node:crypto');
const fs=require('node:fs/promises');
const {join}=require('node:path');
const {discover}=require('../red/descubrimiento.cjs');
const {batch,apply,seal,open,documentNames}=require('./motor.cjs');
function startSync({pool,config,address,uploads,onStatus=()=>{},findPeers=()=>discover(config.key,1500)}){
 if(!/^[a-f0-9]{64}$/.test(config.syncKey||'')||![1,2].includes(config.node)||!config.seed)throw Error('Sincronización sin preparar');
 const nonces=new Map();let stopped=false,busy=false;
 const report=(state,message)=>onStatus({state,message,at:new Date().toISOString()});
 async function request(url,payload){
  const nonce=randomBytes(16).toString('hex');
  const res=await fetch(new URL('/exchange',url),{method:'POST',body:seal({...payload,nonce,time:Date.now(),node:config.node,seed:config.seed},config.syncKey),signal:AbortSignal.timeout(15000)});
  if(!res.ok)throw Error('El otro servidor rechazó la sincronización');
  const reader=res.body.getReader();let total=0,parts=[];while(true){const {done,value}=await reader.read();if(done)break;total+=value.length;if(total>16*1024*1024){await reader.cancel();throw Error('Respuesta excesiva');}parts.push(value);}
  const data=open(Buffer.concat(parts),config.syncKey);if(data.nonce!==nonce||data.node!==3-config.node||data.seed!==config.seed)throw Error('Identidad de servidor inválida');if(data.error)throw Error(data.error);return data;
 }
 async function readDocument(name){documentNames([{tab:'documentos',after_row:{nombre_archivo:name}}]);
  if(!(await pool.query('SELECT 1 FROM documentos WHERE nombre_archivo=$1',[name])).rowCount)throw Error('Documento no registrado');
  const file=join(uploads,'documents',name);const stat=await fs.stat(file);if(stat.size>6*1024*1024)throw Error('Documento demasiado grande');const bytes=await fs.readFile(file);return {name,hash:createHash('sha256').update(bytes).digest('hex'),data:bytes.toString('base64')};
 }
 async function saveDocument(file){documentNames([{tab:'documentos',after_row:{nombre_archivo:file.name}}]);const bytes=Buffer.from(file.data,'base64');if(bytes.length>6*1024*1024||createHash('sha256').update(bytes).digest('hex')!==file.hash)throw Error('Documento alterado');await fs.mkdir(join(uploads,'documents'),{recursive:true});const path=join(uploads,'documents',file.name);try{const existing=await fs.readFile(path);if(!existing.equals(bytes))throw Error('El archivo local y el remoto no coinciden: '+file.name);}catch(e){if(e.code!=='ENOENT')throw e;const temp=path+'.'+randomBytes(8).toString('hex')+'.partial';await fs.writeFile(temp,bytes,{flag:'wx'});await fs.rename(temp,path);}}
 const server=createServer(async(req,res)=>{
  try{
   if(req.method!=='POST'||req.url!=='/exchange'){res.writeHead(404).end();return;}
   let size=0,parts=[];for await(const part of req){size+=part.length;if(size>8192)throw Error('Solicitud excesiva');parts.push(part);}
   const data=open(Buffer.concat(parts),config.syncKey);
   for(const [n,time] of nonces)if(Date.now()-time>60000)nonces.delete(n);
   if(Math.abs(Date.now()-data.time)>30000||!(/^[a-f0-9]{32}$/.test(data.nonce||''))||nonces.has(data.nonce)||data.node!==3-config.node||data.seed!==config.seed)throw Error('Solicitud no autorizada');
   nonces.set(data.nonce,Date.now());if(nonces.size>2000)throw Error('Demasiadas solicitudes');
   let result;
   if(data.action==='pull')result={changes:await batch(pool,data.after)};
   else if(data.action==='file')result={file:await readDocument(data.name)};
   else throw Error('Operación desconocida');
   const encoded=seal({...result,nonce:data.nonce,node:config.node,seed:config.seed},config.syncKey);if(encoded.length>16*1024*1024)throw Error('Transacción demasiado grande; requiere revisión');
   res.writeHead(200,{'Content-Type':'application/octet-stream'}).end(encoded);
  }catch{if(!res.headersSent)res.writeHead(400);res.end();}
 });
 server.requestTimeout=15000;server.headersTimeout=10000;server.on('error',e=>report('error',e.message));server.listen(43422,address);
 async function tick(){if(busy||stopped)return;busy=true;try{
  if((await pool.query('SELECT 1 FROM club_sync.conflict LIMIT 1')).rowCount){report('conflict','Sincronización detenida: hay cambios incompatibles conservados para revisión.');return;}
  const servers=(await findPeers()).filter(s=>s.id!==config.id&&s.id===config.peerId);
  if(!servers.length){report('offline','El otro servidor no está disponible; los cambios locales permanecen en la cola.');return;}
  const url=new URL(servers[0].url);url.port='43422';
  // Solo se acepta la identidad vinculada, nunca un servidor alternativo por su IP.
  for(let i=0;i<20&&!stopped;i++){
   const last=Number((await pool.query('SELECT position FROM club_sync.cursor WHERE peer=$1',[3-config.node])).rows[0]?.position||0);
   const response=await request(url,{action:'pull',after:last});
   if(!response.changes.length){report('connected','Cambios recibidos; esperando nuevas transacciones.');break;}
   for(const name of documentNames(response.changes)){const file=(await request(url,{action:'file',name})).file;const expected=response.changes.find(c=>c.tab==='documentos'&&c.after_row?.nombre_archivo===name)?.after_row?.hash_sha256;if(file.name!==name||(expected&&file.hash!==expected))throw Error('El documento no coincide con su registro');await saveDocument(file);}
   await apply(pool,3-config.node,response.changes);
  }
 }catch(e){report('error',e.message);}finally{busy=false;}}
 const timer=setInterval(tick,5000);tick();
 return async()=>{stopped=true;clearInterval(timer);while(busy)await new Promise(r=>setTimeout(r,50));server.closeAllConnections();await new Promise(resolve=>server.close(resolve));};
}
module.exports={startSync};

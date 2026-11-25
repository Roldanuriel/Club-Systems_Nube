const {createRequire}=require('node:module');
const {join}=require('node:path');
const {randomBytes,randomUUID}=require('node:crypto');
const fs=require('node:fs/promises');
const {prepare,fingerprint}=require('./motor.cjs');
function poolFor(app){
 const {Pool}=app.isPackaged?createRequire(join(process.resourcesPath,'.output','server','index.mjs'))('pg'):require('pg');
 return new Pool({host:process.env.PG_HOST||'127.0.0.1',port:Number(process.env.PG_PORT||5432),user:process.env.PG_USER||'postgres',password:process.env.PG_PASSWORD||undefined,database:process.env.PG_DATABASE||'club_systems',options:'-c timezone=UTC',connectionTimeoutMillis:5000});
}
async function configure(app,dialog){
 const file=join(app.getPath('userData'),'red.json');
 try{await fs.access(file);throw Error('El equipo ya tiene red.json. No se cambiará su identidad ni su base.');}catch(e){if(e.code!=='ENOENT')throw e;}
 const pending=file+'.pending';
 try{const saved=JSON.parse(await fs.readFile(pending,'utf8'));const pool=poolFor(app);try{await prepare(pool,saved.node,saved.seed);}finally{await pool.end();}await fs.rename(pending,file);await dialog.showMessageBox({message:'Vinculación pendiente completada. Reinicia la aplicación.'});return;}catch(e){if(e.code!=='ENOENT')throw e;}
 const {response}=await dialog.showMessageBox({type:'question',title:'Vincular Club Systems',message:'Selecciona el papel de esta computadora.',detail:'Prepara primero el servidor 1. Los dos servidores deben partir del mismo respaldo y tener PostgreSQL activo. Cierra las otras instancias durante la preparación. No se restaurará ni borrará información automáticamente.',buttons:['Servidor 1: crear vinculación','Servidor 2: importar vinculación','Cliente monitor','Cancelar'],cancelId:3});
 if(response===3)return;
 let config;
 if(response===0){
  const chosen=await dialog.showOpenDialog({title:'Selecciona pg_dump.exe de PostgreSQL 17 para crear el respaldo inicial',properties:['openFile'],filters:[{name:'pg_dump.exe',extensions:['exe']}]});if(chosen.canceled)return;
  const dump=chosen.filePaths[0];if(!/[\\/]pg_dump\.exe$/i.test(dump))throw Error('Selecciona pg_dump.exe');
  const destination=await dialog.showSaveDialog({title:'Guardar paquete de vinculación para los otros equipos',defaultPath:join(app.getPath('desktop'),'ClubSystems-Vinculo.json'),filters:[{name:'Vinculación',extensions:['json']}]});if(destination.canceled)return;
  const backup=destination.filePath+'.backup';
  try{await fs.access(backup);throw Error('Ya existe un respaldo con ese nombre. Selecciona otro.');}catch(e){if(e.code!=='ENOENT')throw e;}
  const {execFile}=require('node:child_process');const {promisify}=require('node:util');
  await promisify(execFile)(dump,['-w','-h',process.env.PG_HOST||'127.0.0.1','-p',process.env.PG_PORT||'5432','-U',process.env.PG_USER||'postgres','-d',process.env.PG_DATABASE||'club_systems','-Fc','-f',backup],{windowsHide:true,env:{...process.env,PGPASSWORD:process.env.PG_PASSWORD||''},timeout:120000});
  const pool=poolFor(app);let seed;try{seed=await fingerprint(pool);}finally{await pool.end();}
  const id=randomUUID(),peerId=randomUUID(),key=randomBytes(32).toString('hex'),syncKey=randomBytes(32).toString('hex');
  config={role:'server',node:1,id,peerId,key,syncKey,seed};
  const peer={...config,node:2,id:peerId,peerId:id};
  await fs.writeFile(destination.filePath,JSON.stringify(peer,null,2),{flag:'wx'});
  await fs.writeFile(destination.filePath+'.cliente.json',JSON.stringify({role:'client',id:randomUUID(),key},null,2),{flag:'wx'});
  const source=app.isPackaged?join(process.resourcesPath,'.output','.data','uploads'):join(app.getAppPath(),'.data','uploads');
  try{await fs.cp(source,destination.filePath+'.uploads',{recursive:true,errorOnExist:true,force:false});}catch(e){if(e.code!=='ENOENT')throw e;}
 }else{
  const chosen=await dialog.showOpenDialog({title:response===1?'Archivo de vinculación del servidor 2':'Archivo .cliente.json (no contiene la clave de sincronización)',properties:['openFile'],filters:[{name:'Vinculación',extensions:['json']}]});if(chosen.canceled)return;
  config=JSON.parse((await fs.readFile(chosen.filePaths[0],'utf8')).replace(/^\uFEFF/,''));
  if(!/^[a-f0-9]{64}$/.test(config.key||'')||!config.id)throw Error('Archivo de vinculación inválido');
  if(response===1){
   if(config.role!=='server'||config.node!==2||!config.peerId||!/^[a-f0-9]{64}$/.test(config.syncKey||'')||!/^[a-f0-9]{64}$/.test(config.seed||''))throw Error('El archivo no corresponde al segundo servidor');

  }else{if(config.role!=='client'||config.syncKey)throw Error('Selecciona el archivo exclusivo para clientes');config.id=randomUUID();}
 }
 await fs.mkdir(app.getPath('userData'),{recursive:true});await fs.writeFile(pending,JSON.stringify(config,null,2),{flag:'wx'});
 if(config.role==='server'){const pool=poolFor(app);try{await prepare(pool,config.node,config.seed);}finally{await pool.end();}}
 await fs.rename(pending,file);
 await dialog.showMessageBox({type:'info',message:'Vinculación guardada.',detail:'Inicia Club Systems de nuevo. En los servidores permite la red privada con el script incluido. El segundo servidor debe restaurar el respaldo inicial y copiar los adjuntos antes de vincularse.'});
}
module.exports={poolFor,configure};

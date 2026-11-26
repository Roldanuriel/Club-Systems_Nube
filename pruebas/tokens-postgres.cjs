const fs=require('fs');const ts=require('typescript');const assert=require('node:assert/strict');const {Client}=require('pg');process.loadEnvFile('.env');
const client=new Client({host:process.env.PG_HOST||'127.0.0.1',port:Number(process.env.PG_PORT||5432),user:process.env.PG_USER||'postgres',password:process.env.PG_PASSWORD,database:process.env.PG_DATABASE||'club_systems',connectionTimeoutMillis:5000});
async function load(source){return import('data:text/javascript;base64,'+Buffer.from(ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022}}).outputText).toString('base64'));}
(async()=>{try{await client.connect();await client.query('CREATE TEMP TABLE tokens(id serial PRIMARY KEY,user_id integer,token text,selector text,tipo text,expires_at timestamp without time zone,activo smallint,ip text,user_agent text)');const {normalizeSql}=await load(fs.readFileSync('servidor/utilidades/compatibilidad-sql.ts','utf8'));
const connection={execute:async(sql,args=[])=>{const r=await client.query(normalizeSql(sql),args);return [r.command==='SELECT'?r.rows:{insertId:r.rows[0]?.id,affectedRows:r.rowCount},[]];}};connection.query=connection.execute;
globalThis.__tokenTest={db:()=>connection,transaction:async fn=>{await client.query('BEGIN');try{const r=await fn(connection);await client.query('COMMIT');return r;}catch(e){await client.query('ROLLBACK');throw e;}}};globalThis.useRuntimeConfig=()=>({tokenPepper:'solo-pruebas'});
const source=fs.readFileSync('servidor/utilidades/credenciales.ts','utf8').replace("import { db, transaction } from './conexion';","const {db,transaction}=globalThis.__tokenTest;");const {issueToken,validateToken,revokeToken}=await load(source);
for(const zone of ['UTC','America/Mexico_City','Asia/Tokyo']){
await client.query("SELECT set_config('TimeZone',$1,false)",[zone]);
// Reproduce el mecanismo anterior: fecha de una máquina 8 horas atrasada.
await client.query("INSERT INTO tokens(selector,tipo,expires_at,activo) VALUES('old','SESSION',CURRENT_TIMESTAMP-INTERVAL '6 hours',1)");assert.equal((await client.query("SELECT 1 FROM tokens WHERE selector='old' AND expires_at>NOW()")).rowCount,0);
const oldNow=Date.now;Date.now=()=>oldNow()-8*3600000;let access;try{access=await issueToken(1,'SESSION',7200);}finally{Date.now=oldNow;}
assert.ok(await validateToken(access.value,'SESSION'));assert.equal(await validateToken(access.value,'REFRESH'),null);
const ttl=Number((await client.query('SELECT EXTRACT(EPOCH FROM (expires_at-CURRENT_TIMESTAMP)) ttl FROM tokens WHERE id=$1',[access.id])).rows[0].ttl);assert.ok(ttl>7190&&ttl<=7200,zone+': '+ttl);
await revokeToken(access.value,'SESSION');assert.equal(await validateToken(access.value,'SESSION'),null);
const refresh=await issueToken(1,'REFRESH',604800);assert.ok(await validateToken(refresh.value,'REFRESH'));await client.query("UPDATE tokens SET expires_at=CURRENT_TIMESTAMP-INTERVAL '1 second' WHERE id=$1",[refresh.id]);assert.equal(await validateToken(refresh.value,'REFRESH'),null);
console.log(zone+': emisión, duración, tipo, revocación y caducidad OK');
}
}finally{await client.end();}})().catch(e=>{console.error(e.message);process.exitCode=1;});

const assert=require('node:assert/strict');const {Pool}=require('pg');const {prepare,batch,apply,seal,open}=require('../desktop/sync/motor.cjs');
process.loadEnvFile('.env');
const options={host:process.env.PG_HOST||'127.0.0.1',port:Number(process.env.PG_PORT||5432),user:process.env.PG_USER||'postgres',password:process.env.PG_PASSWORD,options:'-c timezone=UTC'};
const admin=new Pool({...options,database:'postgres'});const names=[1,2].map(n=>'club_sync_test_'+Date.now()+'_'+n);const pools=[];
(async()=>{try{
 for(const name of names){await admin.query('CREATE DATABASE "'+name+'"');const pool=new Pool({...options,database:name});pools.push(pool);await pool.query('CREATE TABLE alumnos(id serial PRIMARY KEY,nombre text NOT NULL); CREATE TABLE documentos(id serial PRIMARY KEY,nombre_archivo text); CREATE TABLE tokens(id serial PRIMARY KEY,token text); INSERT INTO alumnos(nombre) VALUES (\'Inicial\')');}
 const [a,b]=pools;const seed=await prepare(a,1);assert.equal(await prepare(b,2,seed),seed);
 const ra=(await a.query("INSERT INTO alumnos(nombre) VALUES('A') RETURNING id")).rows[0];const rb=(await b.query("INSERT INTO alumnos(nombre) VALUES('B') RETURNING id")).rows[0];assert.notEqual(ra.id,rb.id);
 let ab=await batch(a,0),ba=await batch(b,0);await apply(b,1,ab);await apply(a,2,ba);await apply(b,1,ab);assert.equal((await b.query('SELECT count(*)::int n FROM alumnos')).rows[0].n,3);assert.equal((await a.query('SELECT count(*)::int n FROM alumnos')).rows[0].n,3);
 await a.query("UPDATE alumnos SET nombre='Nueva A' WHERE id=1");await b.query("UPDATE alumnos SET nombre='Nueva B' WHERE id=1");const change=await batch(a,Number(ab.at(-1).id));await assert.rejects(apply(b,1,change),/simultáneos/);assert.equal((await b.query('SELECT nombre FROM alumnos WHERE id=1')).rows[0].nombre,'Nueva B');assert.equal((await b.query('SELECT count(*)::int n FROM club_sync.conflict')).rows[0].n,1);
 const key='a'.repeat(64);assert.deepEqual(open(seal({hello:'mundo'},key),key),{hello:'mundo'});assert.throws(()=>open(seal({hello:'mundo'},key),'b'.repeat(64)));
 console.log('OK: bases idénticas, IDs separados, cambios bidireccionales, reintentos sin duplicados, conflicto conservado y cifrado.');
 }finally{for(const pool of pools)await pool.end();for(const name of names){if(!/^club_sync_test_\d+_[12]$/.test(name))throw Error('Nombre de prueba inválido');await admin.query('DROP DATABASE IF EXISTS "'+name+'"');}await admin.end();}})().catch(e=>{console.error(e.message);process.exitCode=1;});

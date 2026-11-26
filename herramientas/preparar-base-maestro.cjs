const {Pool}=require('pg');const bcrypt=require('bcryptjs');const {execFileSync}=require('node:child_process');const fs=require('node:fs');const {randomUUID,createHash}=require('node:crypto');
process.loadEnvFile('.env');
if(!process.env.CLUB_INITIAL_PASSWORD)throw Error('Falta la contraseña inicial en el entorno');
const settings={host:process.env.PG_HOST||'127.0.0.1',port:Number(process.env.PG_PORT||5432),user:process.env.PG_USER||'postgres',password:process.env.PG_PASSWORD};
const source=new Pool({...settings,database:process.env.PG_DATABASE||'club_systems'});const admin=new Pool({...settings,database:'postgres'});const name='club_seed_build_'+Date.now();let target;
const run=(exe,args)=>execFileSync('.postgresql/pgsql/bin/'+exe+'.exe',['-w','-h',settings.host,'-p',String(settings.port),'-U',settings.user,...args],{env:{...process.env,PGPASSWORD:settings.password},stdio:'pipe'});
(async()=>{try{
const sourceTables=(await source.query("SELECT tablename FROM pg_tables WHERE schemaname='public'")).rows; if(sourceTables.length<20)throw Error('Esquema de origen incompleto');
run('pg_dump',['-d',process.env.PG_DATABASE||'club_systems','--schema-only','--no-owner','--no-privileges','-f','.data/maestro-schema-actual.sql']);
await admin.query('CREATE DATABASE "'+name+'"');target=new Pool({...settings,database:name});run('psql',['-d',name,'-v','ON_ERROR_STOP=1','-f','.data/maestro-schema-actual.sql']);
// El esquema de prueba nunca copia filas de alumnos, clubes, cuentas ni documentos.
const roleIds={};for(const role of ['SUPERADMIN','ADMIN','MONITOR'])roleIds[role]=(await target.query('INSERT INTO roles(nombre,descripcion,activo) VALUES($1,$2,1) RETURNING id',[role,role==='SUPERADMIN'?'Superadministrador':role==='ADMIN'?'Administrador':'Monitor'])).rows[0].id;
const password=await bcrypt.hash(process.env.CLUB_INITIAL_PASSWORD,12);
await target.query("INSERT INTO usuarios(rol_id,nombre,apellidop,apellidom,usuario,password,tipo,activo) VALUES($1,'Superadministrador','','','Super001',$2,'OFICINA',1)",[roleIds.SUPERADMIN,password]);
const permissions=(await source.query('SELECT clave,nombre,descripcion,modulo FROM permisos')).rows;
for(const p of permissions)await target.query('INSERT INTO permisos(clave,nombre,descripcion,modulo) VALUES($1,$2,$3,$4)',[p.clave,p.nombre,p.descripcion,p.modulo]);
const mappings=(await source.query('SELECT r.nombre rol,p.clave FROM rol_permiso rp JOIN roles r ON r.id=rp.rol_id JOIN permisos p ON p.id=rp.permiso_id')).rows;
for(const m of mappings)if(roleIds[m.rol])await target.query('INSERT INTO rol_permiso(rol_id,permiso_id) SELECT $1,id FROM permisos WHERE clave=$2 ON CONFLICT DO NOTHING',[roleIds[m.rol],m.clave]);
// Catálogos de referencia indispensables para registrar alumnos posteriormente.
for(const r of (await source.query('SELECT nombre,abreviatura FROM carreras')).rows)await target.query('INSERT INTO carreras(nombre,abreviatura) VALUES($1,$2)',[r.nombre,r.abreviatura]);
for(let n=1;n<=11;n++)await target.query('INSERT INTO semestres(numero) VALUES($1)',[n]);
const seedId=randomUUID();await target.query("INSERT INTO app_config(clave,valor) VALUES('instalacion_paquete',$1)",[seedId]);
const allowed=new Set(['usuarios','roles','permisos','rol_permiso','carreras','semestres','app_config']);const counts={};
for(const {tablename} of sourceTables){if(!/^[a-z_]+$/.test(tablename))throw Error('Nombre de tabla inesperado');const n=Number((await target.query('SELECT count(*) n FROM public."'+tablename+'"')).rows[0].n);counts[tablename]=n;if(!allowed.has(tablename)&&n!==0)throw Error('Datos operativos inesperados en '+tablename);}
const users=(await target.query('SELECT u.usuario,u.password,r.nombre rol FROM usuarios u JOIN roles r ON r.id=u.rol_id')).rows;
if(users.length!==1||users[0].usuario!=='Super001'||users[0].rol!=='SUPERADMIN'||!await bcrypt.compare(process.env.CLUB_INITIAL_PASSWORD,users[0].password))throw Error('Credencial inicial incorrecta');
fs.mkdirSync('desktop/seed',{recursive:true});run('pg_dump',['-d',name,'-Fc','--no-owner','--no-privileges','-f','desktop/seed/initial.backup']);
const sha256=createHash('sha256').update(fs.readFileSync('desktop/seed/initial.backup')).digest('hex');fs.writeFileSync('desktop/seed/manifest.json',JSON.stringify({seedId,sha256,postgresMajor:17,username:'Super001',counts},null,2));
console.log('Base inicial verificada: un Super001 SUPERADMIN; tablas operativas vacías; catálogos conservados.');
}finally{if(target)await target.end();if(/^club_seed_build_\d+$/.test(name))await admin.query('DROP DATABASE IF EXISTS "'+name+'"');await source.end();await admin.end();}})().catch(e=>{console.error(e.message);process.exitCode=1;});

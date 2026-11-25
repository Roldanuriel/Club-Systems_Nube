const {createHash,randomBytes,createCipheriv,createDecipheriv}=require('node:crypto');
const fs=require('node:fs/promises');
const {join,basename}=require('node:path');
const quote=value=>'"'+value.replaceAll('"','""')+'"';
const excluded=new Set(['tokens','login_attempts']);
async function tables(db){return (await db.query("SELECT tablename name FROM pg_tables WHERE schemaname='public' ORDER BY tablename")).rows.map(r=>r.name).filter(n=>!excluded.has(n));}
async function fingerprint(db){const hash=createHash('sha256');for(const table of await tables(db)){hash.update(table);const {rows}=await db.query(`SELECT to_jsonb(t)::text row FROM public.${quote(table)} t ORDER BY to_jsonb(t)::text`);for(const r of rows)hash.update(r.row+'\n');}return hash.digest('hex');}
async function prepare(pool,node,expectedSeed){
 if(![1,2].includes(node))throw Error('Nodo debe ser 1 o 2');
 const c=await pool.connect();try{await c.query('BEGIN');await c.query('SELECT pg_advisory_xact_lock(43422001)');
 const list=await tables(c);for(const table of list)await c.query(`LOCK TABLE public.${quote(table)} IN ACCESS EXCLUSIVE MODE`);
 const exists=await c.query("SELECT to_regclass('club_sync.settings') x");if(exists.rows[0].x){const existing=(await c.query('SELECT node,seed FROM club_sync.settings')).rows[0];if(existing?.node===node && expectedSeed && existing.seed===expectedSeed){await c.query('COMMIT');return existing.seed;}throw Error('Esta base ya tiene sincronización con otra identidad; no se reinicializa.');}
 const seed=await fingerprint(c);if(expectedSeed && seed!==expectedSeed)throw Error('Las bases iniciales no son idénticas. Restaura el mismo respaldo en ambas antes de vincular.');
 await c.query(await fs.readFile(join(__dirname,'schema.sql'),'utf8'));
 await c.query('INSERT INTO club_sync.settings(node,seed) VALUES($1,$2)',[node,seed]);
 for(const table of list){
  const pk=await c.query("SELECT count(*)::int n FROM pg_index WHERE indrelid=$1::regclass AND indisprimary",['public.'+quote(table)]);if(!pk.rows[0].n)throw Error('La tabla '+table+' no tiene clave primaria');
  await c.query(`CREATE TRIGGER club_sync_lock BEFORE INSERT OR UPDATE OR DELETE ON public.${quote(table)} FOR EACH STATEMENT EXECUTE FUNCTION club_sync.lock_write()`);
  await c.query(`CREATE TRIGGER club_sync_capture AFTER INSERT OR UPDATE OR DELETE ON public.${quote(table)} FOR EACH ROW EXECUTE FUNCTION club_sync.capture()`);
  await c.query(`CREATE TRIGGER club_sync_no_truncate BEFORE TRUNCATE ON public.${quote(table)} FOR EACH STATEMENT EXECUTE FUNCTION club_sync.reject_truncate()`);
  const seqs=await c.query("SELECT column_name,pg_get_serial_sequence($1,column_name) seq FROM information_schema.columns WHERE table_schema='public' AND table_name=$2",['public.'+quote(table),table]);
  for(const {column_name,seq} of seqs.rows.filter(r=>r.seq)){
   const max=Number((await c.query(`SELECT COALESCE(max(${quote(column_name)}),0) n FROM public.${quote(table)}`)).rows[0].n);
   const next=max+1+((node-(max+1)%2+2)%2); // node 1 odd, node 2 even
   const reg=seq.split('.').map(x=>quote(x.replaceAll('"',''))).join('.');
   await c.query(`ALTER SEQUENCE ${reg} INCREMENT BY 2`);await c.query('SELECT setval($1::regclass,$2,false)',[seq,next]);
  }
 }
 await c.query('COMMIT');return seed;
 }catch(e){await c.query('ROLLBACK');throw e;}finally{c.release();}
}
async function batch(pool,after){
 if(!Number.isSafeInteger(after)||after<0)throw Error('Cursor inválido');
 const {rows}=await pool.query('SELECT * FROM club_sync.journal WHERE tx=(SELECT tx FROM club_sync.journal WHERE id>$1 ORDER BY id LIMIT 1) ORDER BY id',[after]);
 return rows;
}
async function apply(pool,peer,changes){
 if(![1,2].includes(peer)||!Array.isArray(changes)||!changes.length)return;
 const c=await pool.connect();const snapshots=[];try{
  await c.query('BEGIN');await c.query('SELECT pg_advisory_xact_lock(43422001)');
  if((await c.query('SELECT 1 FROM club_sync.conflict WHERE peer=$1',[peer])).rowCount)throw Error('Hay un conflicto pendiente');
  const last=Number((await c.query('SELECT position FROM club_sync.cursor WHERE peer=$1',[peer])).rows[0]?.position||0);
  if(changes.every(x=>Number(x.id)<=last)){await c.query('COMMIT');return;}
  if(changes.some(x=>Number(x.id)<=last)||new Set(changes.map(x=>String(x.tx))).size!==1)throw Error('Transacción incompleta o inválida');
  const allowed=await tables(c);
  await c.query("SET LOCAL club_sync.applying='on'");
  for(const change of changes){
   if(!allowed.includes(change.tab)||!change.pk||!Object.keys(change.pk).length)throw Error('Tabla o clave desconocida');
   const columns=(await c.query("SELECT column_name FROM information_schema.columns WHERE table_schema='public' AND table_name=$1",[change.tab])).rows.map(x=>x.column_name);
   const keys=Object.keys(change.pk);if(keys.some(k=>!columns.includes(k)))throw Error('Clave inválida');
   const where=keys.map((k,i)=>`${quote(k)} IS NOT DISTINCT FROM $${i+1}`).join(' AND '),values=keys.map(k=>change.pk[k]);
   const table='public.'+quote(change.tab);
   const current=(await c.query(`SELECT to_jsonb(t) row FROM ${table} t WHERE ${where} FOR UPDATE`,values)).rows[0]?.row||null;
   snapshots.push({tab:change.tab,pk:change.pk,row:current});
   const equal=async(a,b)=>(await c.query('SELECT $1::jsonb IS NOT DISTINCT FROM $2::jsonb same',[a,b])).rows[0].same;
   if(await equal(current,change.after_row))continue;
   if(!await equal(current,change.before_row))throw Error('Cambios simultáneos en '+change.tab+'; se conservaron ambas versiones.');
   if(change.after_row===null)await c.query(`DELETE FROM ${table} WHERE ${where}`,values);
   else {
    const names=Object.keys(change.after_row);if(names.some(n=>!columns.includes(n)))throw Error('Esquema diferente');
    if(current===null)await c.query(`INSERT INTO ${table} SELECT * FROM jsonb_populate_record(NULL::${table},$1)`,[change.after_row]);
    else await c.query(`UPDATE ${table} t SET ${names.map(n=>quote(n)+'=v.'+quote(n)).join(',')} FROM jsonb_populate_record(NULL::${table},$1) v WHERE ${keys.map(k=>'t.'+quote(k)+' IS NOT DISTINCT FROM v.'+quote(k)).join(' AND ')}`,[change.after_row]);
   }
  }
  const end=Math.max(...changes.map(x=>Number(x.id)));if(!Number.isSafeInteger(end))throw Error('Cursor demasiado grande');
  await c.query('INSERT INTO club_sync.cursor(peer,position) VALUES($1,$2) ON CONFLICT(peer) DO UPDATE SET position=EXCLUDED.position',[peer,end]);
  await c.query('COMMIT');
 }catch(e){await c.query('ROLLBACK');await pool.query('INSERT INTO club_sync.conflict(peer,payload,local_snapshot,reason) VALUES($1,$2,$3,$4) ON CONFLICT(peer) DO NOTHING',[peer,JSON.stringify(changes),JSON.stringify(snapshots),String(e.message).slice(0,500)]);throw e;}finally{c.release();}
}
function seal(value,key){const iv=randomBytes(12),cipher=createCipheriv('aes-256-gcm',Buffer.from(key,'hex'),iv);const data=Buffer.concat([cipher.update(JSON.stringify(value),'utf8'),cipher.final()]);return Buffer.concat([iv,cipher.getAuthTag(),data]);}
function open(data,key){if(data.length<28||data.length>16*1024*1024)throw Error('Mensaje inválido');const cipher=createDecipheriv('aes-256-gcm',Buffer.from(key,'hex'),data.subarray(0,12));cipher.setAuthTag(data.subarray(12,28));return JSON.parse(Buffer.concat([cipher.update(data.subarray(28)),cipher.final()]).toString());}
function documentNames(changes){return [...new Set(changes.filter(c=>c.tab==='documentos'&&c.after_row).map(c=>c.after_row.nombre_archivo))].map(name=>{if(typeof name!=='string'||basename(name)!==name||!(/^[a-z0-9][a-z0-9._ -]{0,239}$/i.test(name)))throw Error('Nombre de documento inválido');return name;});}
module.exports={prepare,batch,apply,seal,open,documentNames,fingerprint};

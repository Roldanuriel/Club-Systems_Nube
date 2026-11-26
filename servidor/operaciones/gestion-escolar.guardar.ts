import { z } from 'zod';
import { requireUser } from '../utilidades/autenticacion';
import { db, transaction } from '../utilidades/conexion';
import { audit } from '../utilidades/auditoria';
import { obtenerAcreditacion } from '../utilidades/acreditacion';
const schema=z.discriminatedUnion('accion',[
 z.object({accion:z.literal('solicitar'),alumno_id:z.number().int().positive(),motivo:z.string().trim().min(3).max(2000)}),
 z.object({accion:z.literal('pago'),alumno_id:z.number().int().positive(),folio:z.string().trim().min(1).max(100),monto:z.number().nonnegative().max(9999999999),solicitud_id:z.number().int().positive().nullable(),verificado:z.literal(true)}),
 z.object({accion:z.literal('material'),alumno_id:z.number().int().positive(),descripcion:z.string().trim().min(3).max(2000)}),
 z.object({accion:z.literal('resolver'),id:z.number().int().positive()}),
 z.object({accion:z.literal('autorizar'),alumno_id:z.number().int().positive(),motivo:z.string().trim().min(3).max(2000)}),
 z.object({accion:z.literal('emitir'),id:z.number().int().positive()})
]);
export default defineEventHandler(async event=>{
 const user=await requireUser(event,['SUPERADMIN','ADMIN']);
 const parsed=schema.safeParse(await readBody(event));if(!parsed.success)throw createError({statusCode:422,statusMessage:'Verifica los datos y la identidad del alumno'});
 const v=parsed.data;
 if(v.accion==='pago') {
  await transaction(async c=>{
   const [alumnos]=await c.execute<any[]>('SELECT id FROM alumnos WHERE id=? FOR UPDATE',[v.alumno_id]);if(!alumnos.length)throw createError({statusCode:404,statusMessage:'Alumno no encontrado'});
   if(v.solicitud_id){const [sol]=await c.execute<any[]>('SELECT alumno_id FROM solicitudes_constancia WHERE id=? FOR UPDATE',[v.solicitud_id]);if(Number(sol[0]?.alumno_id)!==v.alumno_id)throw createError({statusCode:422,statusMessage:'La solicitud corresponde a otro alumno'});}
   await c.execute('INSERT INTO pagos_escolares (alumno_id,folio,monto,solicitud_id,verificado_por) VALUES (?,?,?,?,?)',[v.alumno_id,v.folio,v.monto,v.solicitud_id,user.id]);
  });
 } else if(v.accion==='solicitar') {
  const alumno=(await obtenerAcreditacion()).find(a=>Number(a.id)===v.alumno_id);
  if(!alumno?.apto)throw createError({statusCode:409,statusMessage:alumno?.motivo || 'Alumno no acreditado'});
  await db().execute('INSERT INTO solicitudes_constancia (alumno_id,motivo,creado_por) VALUES (?,?,?)',[v.alumno_id,v.motivo,user.id]);
 } else if(v.accion==='material') await db().execute('INSERT INTO adeudos_material (alumno_id,descripcion,creado_por) VALUES (?,?,?)',[v.alumno_id,v.descripcion,user.id]);
 else if(v.accion==='resolver') await db().execute('UPDATE adeudos_material SET resuelto=TRUE WHERE id=?',[v.id]);
 else if(v.accion==='autorizar') {
  const [p]=await db().execute<any[]>("SELECT id FROM periodos WHERE estado='ACTIVO' ORDER BY id DESC LIMIT 1");if(!p[0])throw createError({statusCode:409,statusMessage:'No hay periodo activo'});
  await db().execute('INSERT INTO autorizaciones_inscripcion (alumno_id,periodo_id,autorizado_por,motivo) VALUES (?,?,?,?) ON CONFLICT (alumno_id,periodo_id) DO UPDATE SET autorizado_por=EXCLUDED.autorizado_por,motivo=EXCLUDED.motivo',[v.alumno_id,p[0].id,user.id,v.motivo]);
 } else {
  const [sol]=await db().execute<any[]>('SELECT s.*,p.folio FROM solicitudes_constancia s JOIN pagos_escolares p ON p.solicitud_id=s.id AND p.alumno_id=s.alumno_id WHERE s.id=?',[v.id]);
  if(!sol[0])throw createError({statusCode:409,statusMessage:'Registra y verifica el folio de pago antes de emitir'});
  const alumno=(await obtenerAcreditacion()).find(a=>Number(a.id)===Number(sol[0].alumno_id));
  if(!alumno?.apto)throw createError({statusCode:409,statusMessage:alumno?.motivo || 'Alumno no acreditado'});
  const [periodos]=await db().execute<any[]>('SELECT * FROM periodos WHERE id=?',[alumno.periodo_id]);
  await audit(user.id,'REPOSICION_EMITIDA','Solicitud '+v.id+', folio '+sol[0].folio+', alumno '+alumno.numeroControl);
  return {status:'success',data:{alumno,periodo:periodos[0],club:{nombre:alumno.club}}};
 }
 await audit(user.id,'ESCOLAR_'+v.accion.toUpperCase(),JSON.stringify(v));return {status:'success'};
});

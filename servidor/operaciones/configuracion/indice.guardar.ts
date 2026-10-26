import { z } from 'zod';
import { requireUser } from '../../utilidades/autenticacion';
import { db, transaction } from '../../utilidades/conexion';
import { audit } from '../../utilidades/auditoria';
import { templateTypes } from '../../utilidades/documentos-institucionales';
const requestSchema = z.object({
  clave: z.string().trim().min(1).max(50),
  valor: z.coerce.string().max(10000)
});
export default defineEventHandler(async event => {
  const currentUser = await requireUser(event, ['SUPERADMIN']);
  const validatedBody = requestSchema.safeParse(await readBody(event));
  if (!validatedBody.success) throw createError({
    statusCode: 422,
    statusMessage: 'Configuración inválida'
  });
  if(validatedBody.data.clave.startsWith('evaluacion_config_')) {
    const periodoId=Number(validatedBody.data.clave.slice(18));
    let config:any;try{config=JSON.parse(validatedBody.data.valor);}catch{throw createError({statusCode:422,statusMessage:'Configuración de evaluación inválida'});}
    const checked=z.object({preguntas:z.array(z.string().trim().min(5).max(500)).length(7),pesos:z.array(z.number().positive().max(100)).length(7)}).safeParse(config);
    if(!Number.isInteger(periodoId)||periodoId<1||!checked.success||Math.abs(checked.data.pesos.reduce((a,b)=>a+b,0)-100)>.01)throw createError({statusCode:422,statusMessage:'Las siete preguntas requieren porcentajes positivos que sumen 100.'});
    await transaction(async connection=>{
      const [periodos]=await connection.execute<any[]>('SELECT id FROM periodos WHERE id=? FOR UPDATE',[periodoId]);if(!periodos.length)throw createError({statusCode:404,statusMessage:'Periodo no encontrado'});
      const [existentes]=await connection.execute<any[]>('SELECT id FROM evaluaciones WHERE periodo_id=? LIMIT 1',[periodoId]);if(existentes.length)throw createError({statusCode:409,statusMessage:'Este periodo ya tiene evaluaciones. Configura otro periodo para conservar las calificaciones existentes.'});
      await connection.execute('INSERT INTO app_config (clave, valor) VALUES (?, ?) ON DUPLICATE KEY UPDATE valor = VALUES(valor)',[validatedBody.data.clave,JSON.stringify(checked.data)]);
    });await audit(currentUser.id,'CONFIG_EVALUACION', 'Periodo '+periodoId);return {status:'success',ok:true};
  }
  const template = Object.entries(templateTypes).find(([, value]) => value.key === validatedBody.data.clave);
  if (currentUser.rol === 'ADMIN' && !template) {
    throw createError({
      statusCode: 403,
      statusMessage: 'No puedes modificar esta configuración'
    });
  }
  if (template) {
    const [code, { prefix: templatePrefix }] = template;
    const [documents] = await db().execute<any[]>("SELECT id FROM documentos WHERE CAST(id AS TEXT)=? AND estado='ACTIVO' AND tipo='OTRO' AND concepto LIKE ? AND formato_codigo=?", [validatedBody.data.valor, templatePrefix + '%', code]);
    if (!documents.length) throw createError({ statusCode: 422, statusMessage: 'El documento no corresponde a esta sección' });
  }
  await db().execute('INSERT INTO app_config (clave, valor) VALUES (?, ?) ON DUPLICATE KEY UPDATE valor = VALUES(valor)', [validatedBody.data.clave, validatedBody.data.valor]);
  await audit(currentUser.id, 'CONFIG_ACTUALIZADA', `Clave: ${validatedBody.data.clave}`);
  return {
    status: 'success',
    ok: true,
    ...validatedBody.data
  };
});

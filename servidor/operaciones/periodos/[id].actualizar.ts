import { z } from 'zod';
import { requireUser } from '../../utilidades/autenticacion';
import { db } from '../../utilidades/conexion';
import { audit } from '../../utilidades/auditoria';
import { positiveId } from '../../utilidades/validacion';
const requestSchema = z.object({
  nombre: z.string().trim().regex(/^(ENERO - JUNIO|AGOSTO - DICIEMBRE) \d{4}$/),
  fecha_inicio: z.iso.date(),
  fecha_fin: z.iso.date(),
  ya_editado: z.coerce.number().int().min(0).max(1).default(0)
}).refine(v => {
 const enero=v.nombre.startsWith('ENERO'); const year=v.nombre.slice(-4);
 return v.fecha_inicio.startsWith(year) && v.fecha_fin.startsWith(year) &&
 v.fecha_inicio >= year+(enero?'-01-01':'-08-01') && v.fecha_fin <= year+(enero?'-06-30':'-12-31');
}).refine(v => v.fecha_fin >= v.fecha_inicio);
export default defineEventHandler(async event => {
  const currentUser = await requireUser(event, ['SUPERADMIN', 'ADMIN']);
  const id = positiveId(getRouterParam(event, 'id'));
  const validatedBody = requestSchema.safeParse(await readBody(event));
  if (!validatedBody.success) throw createError({
    statusCode: 422,
    statusMessage: 'Datos del periodo inválidos'
  });
  const value = validatedBody.data;
  const [result] = await db().execute('UPDATE periodos SET nombre = ?, fecha_inicio = ?, fecha_fin = ?, ya_editado = ? WHERE id = ?', [value.nombre, value.fecha_inicio, value.fecha_fin, value.ya_editado, id]);
  if (!(result as {
    affectedRows: number;
  }).affectedRows) throw createError({
    statusCode: 404,
    statusMessage: 'Periodo no encontrado'
  });
  await audit(currentUser.id, 'PERIODO_ACTUALIZADO', `Periodo ${id}`);
  return {
    status: 'success',
    message: 'Periodo actualizado'
  };
});

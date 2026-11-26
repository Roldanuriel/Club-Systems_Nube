import { z } from 'zod';
import type { DatabaseRow } from '../../tipos/base-de-datos';
import { requireUser } from '../../utilidades/autenticacion';
import { transaction } from '../../utilidades/conexion';
import { obtenerAcreditacion } from '../../utilidades/acreditacion';
import { audit } from '../../utilidades/auditoria';
const requestSchema = z.object({
  nombre: z.string().trim().regex(/^(ENERO - JUNIO|AGOSTO - DICIEMBRE) \d{4}$/),
  fecha_inicio: z.iso.date(),
  fecha_fin: z.iso.date(),
  estado: z.enum(['ACTIVO','CERRADO']).default('CERRADO')
}).refine(v => {
 const enero=v.nombre.startsWith('ENERO'); const year=v.nombre.slice(-4);
 return v.fecha_inicio.startsWith(year) && v.fecha_fin.startsWith(year) &&
 v.fecha_inicio >= year+(enero?'-01-01':'-08-01') && v.fecha_fin <= year+(enero?'-06-30':'-12-31');
}).refine(v => v.fecha_fin >= v.fecha_inicio, {
  message: 'La fecha final debe ser posterior a la inicial'
});
export default defineEventHandler(async event => {
  const currentUser = await requireUser(event, ['SUPERADMIN', 'ADMIN']);
  if (getQuery(event).action === 'cerrar') {
    const result = await transaction(async connection => {
      const [periods] = await connection.query<DatabaseRow[]>("SELECT * FROM periodos WHERE estado = 'ACTIVO' ORDER BY id DESC LIMIT 1 FOR UPDATE");
      const current = periods[0];
      if (!current) throw createError({
        statusCode: 409,
        statusMessage: 'No hay periodo activo para cerrar'
      });
      const [clubs] = await connection.query<DatabaseRow[]>('SELECT id, nombre, tipo, descripcion, cupo_limite FROM clubs ORDER BY nombre');
      await connection.execute(`INSERT INTO historial_configuracion (periodo_id, clave, valor) VALUES (?, 'clubs_snapshot', ?)
         ON DUPLICATE KEY UPDATE valor = VALUES(valor)`, [current.id, JSON.stringify(clubs)]);
      const acreditaciones=await obtenerAcreditacion(connection, Number(current.id));
      if(acreditaciones.some(a=>!a.bloqueado && (a.pendientes || !a.evaluacion_id))) throw createError({statusCode:409,statusMessage:'Completa las asistencias y evaluaciones antes de cerrar el periodo'});
      for(const alumno of acreditaciones) await connection.execute('UPDATE alumnos SET estado_periodo=? WHERE id=?', [alumno.apto ? 'ACREDITADO' : 'REPROBADO', alumno.id]);
      await connection.execute(`INSERT INTO historial_configuracion (periodo_id, clave, valor)
         SELECT ?, clave, valor FROM app_config
         ON DUPLICATE KEY UPDATE valor = VALUES(valor)`, [current.id]);
      await connection.execute("UPDATE periodos SET estado = 'CERRADO' WHERE id = ?", [current.id]);
      return {closedId:Number(current.id)};
    });
    await audit(currentUser.id, 'PERIODO_CERRADO', `Periodo ${result.closedId}`);
    return {
      status: 'success',
      message: 'Periodo cerrado'
    };
  }
  const validatedBody = requestSchema.safeParse(await readBody(event));
  if (!validatedBody.success) throw createError({
    statusCode: 422,
    statusMessage: 'Datos del periodo inválidos'
  });
  let id = 0;
  await transaction(async connection => {
    if(validatedBody.data.estado==='ACTIVO') {
      const [activos]=await connection.execute<any[]>("SELECT id FROM periodos WHERE estado='ACTIVO' FOR UPDATE");
      if(activos.length) throw createError({statusCode:409,statusMessage:'Cierra el periodo activo antes de activar otro'});
    }
    const [result] = await connection.execute("INSERT INTO periodos (nombre, fecha_inicio, fecha_fin, estado) VALUES (?, ?, ?, ?)", [validatedBody.data.nombre, validatedBody.data.fecha_inicio, validatedBody.data.fecha_fin, validatedBody.data.estado]);
    id = Number((result as {
      insertId: number;
    }).insertId);
  });
  await audit(currentUser.id, 'PERIODO_CREADO', `Periodo ${id}: ${validatedBody.data.nombre}`);
  return {
    status: 'success',
    id
  };
});

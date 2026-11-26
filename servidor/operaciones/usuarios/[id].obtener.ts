import type { DatabaseRow } from '../../tipos/base-de-datos';
import { requireUser } from '../../utilidades/autenticacion';
import { db } from '../../utilidades/conexion';
import { positiveId } from '../../utilidades/validacion';
export default defineEventHandler(async event => {
  const currentUser = await requireUser(event);
  const id = positiveId(getRouterParam(event, 'id'));
  if (currentUser.rol !== 'SUPERADMIN' && currentUser.id !== id) throw createError({
    statusCode: 403,
    statusMessage: 'Solo puedes consultar tu propia cuenta'
  });
  const [databaseRows] = await db().execute<DatabaseRow[]>(`SELECT u.id, u.nombre, u.apellidoP, u.apellidoM, u.usuario, u.tipo,
            u.numeroControl, u.telefono, u.carrera_id, u.semestre_id,
            COALESCE(u.club_asignado, uc.club_id) AS club_asignado,
            c.nombre AS club_nombre, u.foto
       FROM usuarios u
       LEFT JOIN usuario_club uc ON uc.usuario_id = u.id AND uc.activo = 1
       LEFT JOIN clubs c ON c.id = COALESCE(u.club_asignado, uc.club_id)
      WHERE u.id = ?
      ORDER BY uc.fecha_asignacion DESC
      LIMIT 1`, [id]);
  if (!databaseRows[0]) throw createError({
    statusCode: 404,
    statusMessage: 'Usuario no encontrado'
  });
  return {
    status: 'success',
    data: databaseRows[0]
  };
});

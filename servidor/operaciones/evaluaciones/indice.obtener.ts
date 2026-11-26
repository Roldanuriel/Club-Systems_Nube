import type { DatabaseRow } from '../../tipos/base-de-datos';
import { requireUser } from '../../utilidades/autenticacion';
import { db } from '../../utilidades/conexion';
export default defineEventHandler(async event => {
  await requireUser(event);
  const query = getQuery(event);
  const student = String(query.nombre_estudiante || '').trim();
  const club = String(query.nombre_club || '').trim();
  if (!student || !club) throw createError({
    statusCode: 422,
    statusMessage: 'Nombre del estudiante y club son requeridos'
  });
  const [databaseRows] = await db().execute<DatabaseRow[]>(`SELECT e.* FROM evaluaciones e JOIN alumnos a ON a.id=e.alumno_id JOIN clubs c ON c.id=a.id_club
    WHERE UPPER(TRIM(CONCAT_WS(' ',a.nombre,a.apellidoP,a.apellidoM)))=UPPER(?) AND UPPER(TRIM(c.nombre))=UPPER(?) AND e.periodo_id=a.periodo_id AND e.escala_version=2
    ORDER BY a.id DESC,e.fecha_registro DESC,e.id DESC LIMIT 1`,[student,club]);
  return databaseRows[0] || {};
});

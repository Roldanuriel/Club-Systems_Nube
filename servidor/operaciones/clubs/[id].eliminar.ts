import { requireUser } from '../../utilidades/autenticacion';
import { db } from '../../utilidades/conexion';
import { audit } from '../../utilidades/auditoria';
import { positiveId } from '../../utilidades/validacion';
export default defineEventHandler(async event => {
  const currentUser = await requireUser(event, ['SUPERADMIN']);
  const id = positiveId(getRouterParam(event, 'id'));
  const [result] = await db().execute('DELETE FROM clubs WHERE id = ?', [id]);
  if (!(result as {
    affectedRows: number;
  }).affectedRows) throw createError({
    statusCode: 404,
    statusMessage: 'Club no encontrado'
  });
  await audit(currentUser.id, 'CLUB_ELIMINADO', `Club ${id}`);
  return {
    status: 'success',
    ok: true
  };
});

import type { RowDataPacket } from 'mysql2/promise'
import { requireUser } from '../../utils/auth'
import { db } from '../../utils/db'
import { positiveId } from '../../utils/validation'

export default defineEventHandler(async (event) => {
  const user = await requireUser(event)
  const id = positiveId(getRouterParam(event, 'id'))
  if (user.rol !== 'SUPERADMIN' && user.id !== id) throw createError({ statusCode: 403, statusMessage: 'Solo puedes consultar tu propia cuenta' })
  const [rows] = await db().execute<RowDataPacket[]>(
    `SELECT u.id, u.nombre, u.apellidoP, u.apellidoM, u.usuario, u.tipo,
            u.numeroControl, u.telefono, u.carrera_id, u.semestre_id,
            COALESCE(u.club_asignado, uc.club_id) AS club_asignado,
            c.nombre AS club_nombre, u.foto
       FROM usuarios u
       LEFT JOIN usuario_club uc ON uc.usuario_id = u.id AND uc.activo = 1
       LEFT JOIN clubs c ON c.id = COALESCE(u.club_asignado, uc.club_id)
      WHERE u.id = ?
      ORDER BY uc.fecha_asignacion DESC
      LIMIT 1`,
    [id]
  )
  if (!rows[0]) throw createError({ statusCode: 404, statusMessage: 'Usuario no encontrado' })
  return { status: 'success', data: rows[0] }
})

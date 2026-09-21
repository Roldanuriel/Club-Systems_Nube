import type { RowDataPacket } from 'mysql2/promise'
import { requireUser } from '../../utils/auth'
import { db } from '../../utils/db'
import { audit } from '../../utils/audit'
import { positiveId } from '../../utils/validation'

export default defineEventHandler(async (event) => {
  const user = await requireUser(event, ['SUPERADMIN'])
  const id = positiveId(getRouterParam(event, 'id'))
  const [rows] = await db().execute<RowDataPacket[]>(
    'SELECT numeroControl FROM alumnos WHERE id = ? LIMIT 1', [id]
  )
  const alumno = rows[0]
  if (!alumno) throw createError({ statusCode: 404, statusMessage: 'Alumno no encontrado' })
  const [result] = await db().execute('DELETE FROM alumnos WHERE id = ?', [id])
  if (!(result as { affectedRows: number }).affectedRows) throw createError({ statusCode: 404, statusMessage: 'Alumno no encontrado' })
  await audit(user.id, 'ALUMNO_ELIMINADO', `Alumno ${id}, control ${alumno.numeroControl || 'sin control'}`)
  return { status: 'success', ok: true }
})

import { z } from 'zod'
import type { RowDataPacket } from 'mysql2/promise'
import { requireUser } from '../utils/auth'
import { db } from '../utils/db'
import { audit } from '../utils/audit'

const schema = z.object({ alumno_id: z.coerce.number().int().positive(), fecha: z.iso.date(), presente: z.coerce.boolean() })

export default defineEventHandler(async (event) => {
  const user = await requireUser(event, ['SUPERADMIN', 'ADMIN', 'MONITOR'])
  const parsed = schema.safeParse(await readBody(event))
  if (!parsed.success) throw createError({ statusCode: 422, statusMessage: 'Datos de asistencia inválidos' })
  const [periods] = await db().query<RowDataPacket[]>("SELECT id FROM periodos WHERE estado = 'ACTIVO' LIMIT 1")
  if (!periods.length) throw createError({ statusCode: 403, statusMessage: 'El periodo está cerrado' })
  const period = periods[0]!
  const [target] = await db().execute<RowDataPacket[]>('SELECT id_club FROM alumnos WHERE id=? AND periodo_id=? LIMIT 1', [parsed.data.alumno_id, period.id])
  if (!target[0]) throw createError({ statusCode: 404, statusMessage: 'Alumno no encontrado en el periodo activo' })
  const student = target[0]!
  const [assignedDates] = await db().execute<RowDataPacket[]>('SELECT id FROM fechas_club WHERE periodo_id=? AND club_id=? AND fecha=? LIMIT 1', [period.id, student.id_club, parsed.data.fecha])
  if (!assignedDates.length) throw createError({ statusCode: 403, statusMessage: 'Esta fecha no fue asignada al club por un administrador' })
  if (user.rol === 'MONITOR') {
    if (Number(student.id_club) !== Number(user.club_asignado)) throw createError({ statusCode: 403, statusMessage: 'El alumno no pertenece al club asignado' })
  }
  await db().execute('INSERT INTO asistencias (id_alumno, fecha, presente) VALUES (?, ?, ?) ON DUPLICATE KEY UPDATE presente = VALUES(presente)', [parsed.data.alumno_id, parsed.data.fecha, parsed.data.presente ? 1 : 0])
  await audit(user.id, 'ASISTENCIA_ACTUALIZADA', `Alumno ${parsed.data.alumno_id}, fecha ${parsed.data.fecha}`)
  return { status: 'success' }
})

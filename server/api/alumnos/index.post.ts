import { z } from 'zod'
import type { RowDataPacket } from 'mysql2/promise'
import { requireUser } from '../../utils/auth'
import { db } from '../../utils/db'
import { audit } from '../../utils/audit'
import { textPattern, titleCase } from '../../utils/validation'

const schema = z.object({
  nombre: z.string().trim().min(1).max(50), apellidoP: z.string().trim().min(1).max(50), apellidoM: z.string().trim().max(50),
  numeroControl: z.coerce.string().transform(value => value.replace(/\D/g, '')).pipe(z.string().regex(/^\d{8}$/)),
  telefono: z.coerce.string().transform(value => value.replace(/\D/g, '')).pipe(z.string().regex(/^\d{7,15}$/)),
  carrera_id: z.coerce.number().int().positive(), semestre_id: z.coerce.number().int().positive(), id_club: z.coerce.number().int().positive(),
  opcion_1: z.string().trim().max(100).optional(), opcion_2: z.string().trim().max(100).optional(), opcion_3: z.string().trim().max(100).optional()
})

export default defineEventHandler(async (event) => {
  const user = await requireUser(event, ['SUPERADMIN', 'ADMIN', 'MONITOR'])
  const parsed = schema.safeParse(await readBody(event))
  if (!parsed.success) throw createError({ statusCode: 422, statusMessage: 'Datos del alumno inválidos' })
  if (user.rol === 'MONITOR' && Number(user.club_asignado) !== parsed.data.id_club) throw createError({ statusCode: 403, statusMessage: 'Este club no está asignado al monitor' })
  const names = [parsed.data.nombre, parsed.data.apellidoP, parsed.data.apellidoM].map(titleCase)
  const [nombre = '', apellidoP = '', apellidoM = ''] = names
  if (!textPattern.test(nombre) || !textPattern.test(apellidoP) || (apellidoM && !textPattern.test(apellidoM))) throw createError({ statusCode: 422, statusMessage: 'Los nombres solo deben contener letras' })
  const [periods] = await db().query<RowDataPacket[]>("SELECT id FROM periodos WHERE estado = 'ACTIVO' ORDER BY id DESC LIMIT 1")
  if (!periods[0]) throw createError({ statusCode: 403, statusMessage: 'No hay periodo activo' })
  try {
    const [result] = await db().execute(
      `INSERT INTO alumnos (nombre, apellidoP, apellidoM, numeroControl, telefono, carrera_id, semestre_id, id_club, periodo_id, estado_periodo, opcion_1, opcion_2, opcion_3)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'ACTIVO', ?, ?, ?)`, [nombre, apellidoP, apellidoM, parsed.data.numeroControl, parsed.data.telefono, parsed.data.carrera_id, parsed.data.semestre_id, parsed.data.id_club, periods[0].id, parsed.data.opcion_1 || null, parsed.data.opcion_2 || null, parsed.data.opcion_3 || null])
    const id = Number((result as { insertId: number }).insertId)
    await audit(user.id, 'ALUMNO_CREADO', `Alumno ${id}, control ${parsed.data.numeroControl}`)
    setResponseStatus(event, 201)
    return { status: 'success', data: { id, ...parsed.data, nombre, apellidoP, apellidoM } }
  } catch (error: any) {
    if (error?.code === 'ER_DUP_ENTRY') throw createError({ statusCode: 409, statusMessage: 'El número de control ya está registrado en el periodo activo' })
    throw error
  }
})

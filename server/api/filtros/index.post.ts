import { z } from 'zod'
import type { RowDataPacket } from 'mysql2/promise'
import { requireUser } from '../../utils/auth'
import { db } from '../../utils/db'
import { audit } from '../../utils/audit'

const schema = z.object({ tipo: z.enum(['futbol', 'basquetbol']) })

export default defineEventHandler(async (event) => {
  const user = await requireUser(event, ['SUPERADMIN', 'ADMIN'])
  const parsed = schema.safeParse(await readBody(event))
  if (!parsed.success) throw createError({ statusCode: 422, statusMessage: 'Filtro inválido' })
  const [periods] = await db().query<RowDataPacket[]>("SELECT id FROM periodos WHERE estado='ACTIVO' ORDER BY id DESC LIMIT 1")
  if (!periods[0]) throw createError({ statusCode: 409, statusMessage: 'No hay periodo activo' })
  await db().execute(
    `INSERT INTO filtros_cerrados (periodo_id, tipo, cerrado_por)
     VALUES (?, ?, ?) ON DUPLICATE KEY UPDATE cerrado_en=CURRENT_TIMESTAMP, cerrado_por=VALUES(cerrado_por)`,
    [periods[0].id, parsed.data.tipo, user.id]
  )
  await audit(user.id, 'FILTRO_CERRADO', `Filtro ${parsed.data.tipo}, periodo ${periods[0].id}`)
  return { status: 'success', data: { tipo: parsed.data.tipo } }
})

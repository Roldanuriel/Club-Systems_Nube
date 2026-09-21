import type { RowDataPacket } from 'mysql2/promise'
import { requireUser } from '../../utils/auth'
import { db } from '../../utils/db'

export default defineEventHandler(async (event) => {
  await requireUser(event)
  const [rows] = await db().query<RowDataPacket[]>(
    `SELECT fc.tipo, fc.cerrado_en
       FROM filtros_cerrados fc
       JOIN periodos p ON p.id = fc.periodo_id
      WHERE p.estado = 'ACTIVO'
      ORDER BY fc.tipo`
  )
  return { status: 'success', data: rows }
})

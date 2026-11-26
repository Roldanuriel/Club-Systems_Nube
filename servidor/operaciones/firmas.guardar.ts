import { z } from 'zod';
import type { DatabaseRow } from '../tipos/base-de-datos';
import { requireUser } from '../utilidades/autenticacion';
import { db } from '../utilidades/conexion';
import { audit } from '../utilidades/auditoria';
const requestSchema = z.object({
  cargo: z.enum(['jefe_actividades', 'jefe_promocion']),
  id_usuario: z.coerce.number().int().positive()
});
export default defineEventHandler(async event => {
  const actor = await requireUser(event, ['SUPERADMIN']);
  const validatedBody = requestSchema.safeParse(await readBody(event));
  if (!validatedBody.success) throw createError({
    statusCode: 422,
    statusMessage: 'Cargo o usuario inválido'
  });
  const [users] = await db().execute<DatabaseRow[]>('SELECT id FROM usuarios WHERE id = ? AND COALESCE(activo, 1) = 1 LIMIT 1', [validatedBody.data.id_usuario]);
  if (!users.length) throw createError({
    statusCode: 404,
    statusMessage: 'Usuario no encontrado'
  });
  const key = `firma_${validatedBody.data.cargo}`;
  await db().execute('INSERT INTO app_config (clave, valor) VALUES (?, ?) ON DUPLICATE KEY UPDATE valor = VALUES(valor)', [key, String(validatedBody.data.id_usuario)]);
  await audit(actor.id, 'FIRMA_ASIGNADA', `${validatedBody.data.cargo}: usuario ${validatedBody.data.id_usuario}`);
  return {
    status: 'success',
    ok: true,
    ...validatedBody.data
  };
});

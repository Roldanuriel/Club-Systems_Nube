import bcrypt from 'bcryptjs';
import { z } from 'zod';
import type { DatabaseRow } from '../../tipos/base-de-datos';
import { db } from '../../utilidades/conexion';
import { issueToken } from '../../utilidades/credenciales';
interface LoginUser extends DatabaseRow {
  id: number;
  usuario: string;
  password: string;
  nombre: string;
  apellidoP: string;
  apellidoM: string;
  tipo: string;
  rol: string | null;
  club_asignado: number | null;
}
const requestSchema = z.object({
  usuario: z.string().trim().min(1).max(80),
  password: z.string().min(1).max(200)
});
export default defineEventHandler(async event => {
  const validatedBody = requestSchema.safeParse(await readBody(event));
  if (!validatedBody.success) {
    throw createError({
      statusCode: 422,
      statusMessage: 'Usuario y contraseña son obligatorios'
    });
  }
  const [databaseRows] = await db().execute<LoginUser[]>(`SELECT u.id, u.usuario, u.password, u.nombre, u.apellidoP, u.apellidoM,
            u.tipo, r.nombre AS rol, u.club_asignado
       FROM usuarios u
       LEFT JOIN roles r ON r.id = u.rol_id
      WHERE u.usuario = ? AND COALESCE(u.activo, 1) = 1
      LIMIT 1`, [validatedBody.data.usuario]);
  const currentUser = databaseRows[0];
  const compatibleHash = currentUser?.password?.startsWith('$2y$') ? `$2b$${currentUser.password.slice(4)}` : currentUser?.password;
  if (!currentUser || !compatibleHash || !(await bcrypt.compare(validatedBody.data.password, compatibleHash))) {
    throw createError({
      statusCode: 401,
      statusMessage: 'Usuario o contraseña incorrectos'
    });
  }
  const access = await issueToken(currentUser.id, 'SESSION', 2 * 60 * 60, event);
  const refresh = await issueToken(currentUser.id, 'REFRESH', 7 * 24 * 60 * 60, event);
  const role = currentUser.rol || (currentUser.tipo === 'OFICINA' ? 'ADMIN' : currentUser.tipo);
  return {
    status: 'success',
    token: access.value,
    remember_token: refresh.value,
    token_expires_at: access.expiresAt.toISOString(),
    id: currentUser.id,
    usuario: currentUser.usuario,
    nombre: currentUser.nombre,
    apellidoP: currentUser.apellidoP,
    apellidoM: currentUser.apellidoM,
    tipo: role,
    rol: role,
    club_asignado: currentUser.club_asignado
  };
});

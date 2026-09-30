import type { DatabaseRow } from '../tipos/base-de-datos';
import { requireUser } from '../utilidades/autenticacion';
import { db } from '../utilidades/conexion';
export default defineEventHandler(async event => {
  await requireUser(event);
  const [databaseRows] = await db().query<DatabaseRow[]>('SELECT id, nombre, abreviatura FROM carreras ORDER BY id');
  return {
    status: 'success',
    data: databaseRows
  };
});

import { bearerToken } from '../../utilidades/autenticacion';
import { revokeToken } from '../../utilidades/credenciales';
export default defineEventHandler(async event => {
  const token = bearerToken(event);
  if (token) await revokeToken(token, 'SESSION');
  return {
    status: 'success',
    message: 'Sesión cerrada'
  };
});

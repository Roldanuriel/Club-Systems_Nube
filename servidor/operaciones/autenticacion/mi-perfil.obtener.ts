import { requireUser } from '../../utilidades/autenticacion';
export default defineEventHandler(async event => {
  const currentUser = await requireUser(event);
  return {
    status: 'success',
    data: currentUser
  };
});

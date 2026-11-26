import { requireUser } from '../utilidades/autenticacion';
import { obtenerAcreditacion } from '../utilidades/acreditacion';
export default defineEventHandler(async event => {
 await requireUser(event, ['SUPERADMIN','ADMIN']);
 const periodo=Number(getQuery(event).periodo_id) || undefined;
 return {status:'success',data:await obtenerAcreditacion(undefined, periodo)};
});

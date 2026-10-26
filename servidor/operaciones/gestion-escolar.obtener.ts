import { requireUser } from '../utilidades/autenticacion';
import { db } from '../utilidades/conexion';
import { obtenerAcreditacion } from '../utilidades/acreditacion';
export default defineEventHandler(async event=>{
 await requireUser(event,['SUPERADMIN','ADMIN']);
 const alumnos=await obtenerAcreditacion();
 const [pagos]=await db().execute<any[]>('SELECT * FROM pagos_escolares ORDER BY creado_en DESC');
 const [solicitudes]=await db().execute<any[]>('SELECT s.*, p.folio, p.monto FROM solicitudes_constancia s LEFT JOIN pagos_escolares p ON p.solicitud_id=s.id ORDER BY s.creado_en DESC');
 const [materiales]=await db().execute<any[]>('SELECT * FROM adeudos_material ORDER BY creado_en DESC');
 return {status:'success',data:{alumnos,pagos,solicitudes,materiales}};
});

import { db } from './conexion';
import { revisarAsistencia } from '~~/interfaz/servicios/acreditacion.js';
export async function obtenerAcreditacion(connection = db(), periodoId?: number) {
 const [alumnos] = await connection.execute<any[]>(`SELECT a.*, c.nombre club, ca.nombre carrera, p.nombre periodo, p.fecha_inicio, p.fecha_fin, p.estado periodo_estado,
 e.id evaluacion_id, e.valor_numerico, e.nivel_desempeno
 FROM alumnos a JOIN periodos p ON p.id=a.periodo_id LEFT JOIN clubs c ON c.id=a.id_club LEFT JOIN carreras ca ON ca.id=a.carrera_id
 LEFT JOIN LATERAL (SELECT ev.* FROM evaluaciones ev WHERE ev.alumno_id=a.id AND ev.periodo_id=a.periodo_id AND ev.escala_version=2 ORDER BY ev.fecha_registro DESC, ev.id DESC LIMIT 1) e ON TRUE
 WHERE (? = 0 OR a.periodo_id=?) ORDER BY c.nombre, a.apellidoP, a.nombre`, [periodoId || 0, periodoId || 0]);
 const [fechas] = await connection.execute<any[]>('SELECT club_id, periodo_id, CAST(fecha AS TEXT) fecha FROM fechas_club WHERE fecha <= CURRENT_DATE');
 const [asistencias] = await connection.execute<any[]>('SELECT id_alumno, CAST(fecha AS TEXT) fecha, presente FROM asistencias');
 const mapas = new Map<number, Record<string, boolean>>();
 for (const a of asistencias) { const mapa=mapas.get(Number(a.id_alumno)) || {}; mapa[String(a.fecha).slice(0,10)]=Boolean(a.presente); mapas.set(Number(a.id_alumno),mapa); }
 return alumnos.map(a => {
  const sesiones=fechas.filter(f => Number(f.club_id)===Number(a.id_club) && Number(f.periodo_id)===Number(a.periodo_id)).map(f=>String(f.fecha).slice(0,10));
  const asistencia=revisarAsistencia(sesiones,mapas.get(Number(a.id)) || {});
  const motivo=asistencia.bloqueado ? 'Tres faltas consecutivas' : !sesiones.length ? 'Sin sesiones registradas' : asistencia.pendientes ? 'Asistencias pendientes de capturar' : !a.evaluacion_id ? 'Evaluación pendiente' : Number(a.nivel_desempeno)<1 ? 'Evaluación no aprobada' : '';
  return {...a, ...asistencia, fechas:sesiones, asistencias:mapas.get(Number(a.id)) || {}, apto: !motivo, motivo};
 });
}

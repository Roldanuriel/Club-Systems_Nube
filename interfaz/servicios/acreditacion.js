// Las faltas consecutivas se cuentan sobre las sesiones programadas, no días naturales.
export function revisarAsistencia(fechas, asistencias) {
 let racha = 0, maxima = 0, pendientes = 0, faltas = 0;
 for (const fecha of [...new Set(fechas)].sort()) {
  const valor = asistencias[fecha];
  if (valor === false || valor === 0) { faltas++; racha++; maxima = Math.max(maxima, racha); }
  else { racha = 0; if (valor !== true && valor !== 1) pendientes++; }
 }
 return { faltas, consecutivas: maxima, pendientes, bloqueado: maxima >= 3 };
}

export const diasCalendario = ['Domingo','Lunes','Martes','Miércoles','Jueves','Viernes','Sábado'];
export function fechasListas(config, dias) {
  const parse = s => { if(!/^\d{4}-\d{2}-\d{2}$/.test(s||''))return null;const d=new Date(s+'T12:00:00Z');return !Number.isNaN(+d)&&d.toISOString().slice(0,10)===s?d:null; };
  const inicio=parse(config.inicio),fin=parse(config.fin);
  if(!inicio||!fin||inicio>fin)throw new Error('Indica un inicio y un fin válidos.');
  if((fin-inicio)/86400000>366)throw new Error('El intervalo no debe superar un año.');
  if(dias.length!==2||new Set(dias).size!==2||dias.some(d=>!diasCalendario.includes(d)))throw new Error('Configura los dos días semanales en Clubes.');
  const fechas=new Map();
  for(let d=new Date(inicio);d<=fin;d.setUTCDate(d.getUTCDate()+1)){if(dias.includes(diasCalendario[d.getUTCDay()]))fechas.set(d.toISOString().slice(0,10),{fecha:d.toISOString().slice(0,10),tipo:'Club',nombre:''});}
  for(const e of config.eventos||[]){const d=parse(e.fecha);if(!d||d<inicio||d>fin)throw new Error('Las fechas especiales deben estar dentro del intervalo.');if(!['Acto cívico','Desfile'].includes(e.tipo)||!String(e.nombre||'').trim())throw new Error('Completa el tipo y nombre de cada fecha especial.');const anterior=fechas.get(e.fecha);fechas.set(e.fecha,{fecha:e.fecha,tipo:anterior?.tipo==='Club'?'Club + '+e.tipo:e.tipo,nombre:[anterior?.nombre,e.nombre].filter(Boolean).join(' / ')});}
  return [...fechas.values()].sort((a,b)=>a.fecha.localeCompare(b.fecha));
}

import { jsPDF } from 'jspdf';

// Oficio mexicano: 216 × 340 mm. Cada club inicia en una hoja nueva.
export function crearListasPDF(grupos) {
  const doc = new jsPDF({ unit: 'mm', format: [216, 340], orientation: 'landscape' });
  let primera = true;
  const nombre = a => [a.apellidoP, a.apellidoM, a.nombre].filter(Boolean).join(' ');
  for (const categoria of grupos) {
    for (const club of categoria.clubes) {
      if (!club.alumnos.length) continue;
      let y;
      const encabezado = () => {
        if (!primera) doc.addPage([216, 340], 'landscape');
        primera = false;
        doc.setTextColor(24, 49, 89); doc.setFont('helvetica', 'bold'); doc.setFontSize(13);
        doc.text('Instituto Tecnológico de Tlaxiaco', 15, 18);
        doc.setFontSize(10); doc.text('Actividades extraescolares · Listas de alumnos', 15, 25);
        doc.setFontSize(11);
        const titulo = doc.splitTextToSize(categoria.titulo + ' / ' + club.nombre, 310);
        doc.text(titulo, 15, 34); y = 39 + titulo.length * 5;
        doc.setFillColor(227, 237, 252); doc.rect(15, y, 310, 10, 'F');
        doc.setFontSize(9); doc.text('N.º', 17, y + 6); doc.text('Apellidos y nombre', 28, y + 6);
        doc.text('N.º de control', 198, y + 6); doc.text('Periodo', 244, y + 6); y += 10;
      };
      encabezado();
      const alumnos = [...club.alumnos].sort((a,b)=>nombre(a).localeCompare(nombre(b),'es',{sensitivity:'base'}));
      alumnos.forEach((a, i) => {
        doc.setFont('helvetica', 'normal'); doc.setFontSize(9);
        const lineas = doc.splitTextToSize(nombre(a), 165);
        const periodo = doc.splitTextToSize(String(a.periodo || ''), 77);
        const alto = Math.max(10, Math.max(lineas.length, periodo.length) * 4.5 + 5);
        if (y + alto > 196) encabezado();
        doc.setFont('helvetica', 'normal'); doc.setFontSize(9); doc.setTextColor(36, 52, 74);
        if (i % 2 === 0) { doc.setFillColor(247, 250, 255); doc.rect(15, y, 310, alto, 'F'); }
        doc.text(String(i + 1), 17, y + 6); doc.text(lineas, 28, y + 6);
        doc.text(String(a.numeroControl || a.control || ''), 198, y + 6); doc.text(periodo, 244, y + 6);
        y += alto; doc.setDrawColor(220, 230, 244); doc.line(15, y, 325, y);
      });
    }
  }
  if (primera) throw new Error('No hay alumnos para descargar con estos filtros.');
  const total = doc.getNumberOfPages();
  for (let i=1;i<=total;i++) { doc.setPage(i); doc.setFont('helvetica','normal'); doc.setFontSize(8); doc.setTextColor(100); doc.text('Oficio horizontal · 340 × 216 mm',15,207); doc.text(`Página ${i} de ${total}`,325,207,{align:'right'}); }
  return doc;
}
export function crearListasCalendarioPDF(grupos, calendario) {
 const doc=new jsPDF({unit:'mm',format:[216,340],orientation:'landscape'});let primera=true;
 const meses=[...new Set(calendario.fechas.map(f=>f.fecha.slice(0,7)))];
 for(const categoria of grupos)for(const club of categoria.clubes){
 const alumnos=[...club.alumnos].sort((a,b)=>[a.apellidoP,a.apellidoM,a.nombre].join(' ').localeCompare([b.apellidoP,b.apellidoM,b.nombre].join(' '),'es'));
 for(const mes of meses){const fechasMes=calendario.fechas.filter(f=>f.fecha.startsWith(mes));for(let bloque=0;bloque<fechasMes.length;bloque+=12){const fechas=fechasMes.slice(bloque,bloque+12);for(let offset=0;offset<alumnos.length;offset+=12){if(!primera)doc.addPage([216,340],'landscape');primera=false;
 doc.setFont('helvetica','bold');doc.setFontSize(12);doc.setTextColor(25,55,95);doc.text('Instituto Tecnológico de Tlaxiaco · Lista de asistencia',15,16);doc.setFontSize(10);doc.text(doc.splitTextToSize(categoria.titulo+' / '+club.nombre+' · '+mes,310),15,23);
 const x=15,y=38,w=310,col=180/fechas.length;doc.setFillColor(226,237,252);doc.rect(x,y,w,12,'F');doc.setFontSize(8);doc.text('Apellidos y nombre',18,y+7);doc.text('Control',111,y+7);
 fechas.forEach((f,i)=>{const marca=f.tipo==='Club'?'': '*';doc.text(f.fecha.slice(8)+'/'+f.fecha.slice(5,7)+marca,147+i*col,y+7);});
 alumnos.slice(offset,offset+12).forEach((a,i)=>{const top=y+12+i*10;doc.setFont('helvetica','normal');doc.setFontSize(8);doc.setDrawColor(200,215,235);doc.rect(x,top,w,10);doc.text(doc.splitTextToSize([a.apellidoP,a.apellidoM,a.nombre].filter(Boolean).join(' '),90),18,top+4);doc.text(String(a.numeroControl||a.control||''),111,top+6);doc.line(145,top,145,top+10);fechas.forEach((f,j)=>doc.line(145+(j+1)*col,top,145+(j+1)*col,top+10));});
 const eventos=fechas.filter(f=>f.tipo!=='Club').map(f=>f.fecha.slice(8)+'/'+f.fecha.slice(5,7)+': '+f.tipo+' — '+f.nombre);doc.setFontSize(7);doc.text(doc.splitTextToSize(eventos.length?'* '+eventos.join(' · '):'Casillas para registrar la asistencia del club.',310),15,180);doc.setFontSize(8);doc.text('Periodo: '+(alumnos[0]?.periodo||''),15,202);
 }}}}
 if(primera)throw new Error('No hay fechas o alumnos para generar la lista.');for(let i=1;i<=doc.getNumberOfPages();i++){doc.setPage(i);doc.text('Página '+i+' de '+doc.getNumberOfPages(),325,207,{align:'right'});}return doc;
}

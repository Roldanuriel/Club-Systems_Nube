import test from 'node:test';
import assert from 'node:assert/strict';
import {revisarAsistencia} from '../interfaz/servicios/acreditacion.js';
const fechas=['2026-10-01','2026-10-03','2026-10-07','2026-10-09','2026-10-10'];
test('tres ausencias consecutivas bloquean aunque no sean días naturales consecutivos',()=>{assert.equal(revisarAsistencia(fechas,{[fechas[0]]:false,[fechas[1]]:false,[fechas[2]]:false,[fechas[3]]:true,[fechas[4]]:true}).bloqueado,true);});
test('tres ausencias separadas no bloquean por consecutividad',()=>{const r=revisarAsistencia(fechas,Object.fromEntries(fechas.map((f,i)=>[f,i%2===1])));assert.equal(r.faltas,3);assert.equal(r.bloqueado,false);});
test('una captura pendiente no se inventa como ausencia',()=>{const r=revisarAsistencia(fechas,{[fechas[0]]:false,[fechas[2]]:false});assert.equal(r.bloqueado,false);assert.equal(r.pendientes,3);});
test('ordena las sesiones y no duplica fechas',()=>{assert.equal(revisarAsistencia([...fechas].reverse().concat(fechas[0]),Object.fromEntries(fechas.map(f=>[f,false]))).consecutivas,5);});

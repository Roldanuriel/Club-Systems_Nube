import assert from 'node:assert/strict';
import test from 'node:test';
import { readFile } from 'node:fs/promises';
import ts from 'typescript';
import JSZip from 'jszip';
import { calculateEvaluation } from '../interfaz/servicios/reglas-evaluacion.js';
import { renderOfficialFormat, renderAllClubFormats, resultForStudent } from '../interfaz/servicios/formatos-oficiales.js';

async function loadTypescript(path, replacements = {}) {
  let source = await readFile(new URL(path, import.meta.url), 'utf8');
  for (const [from, to] of Object.entries(replacements)) source = source.replace(from, to);
  const js = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 } }).outputText;
  return 'data:text/javascript;base64,' + Buffer.from(js).toString('base64');
}
const base = await loadTypescript('../servidor/utilidades/formato-documentos.ts');
const moduleUrl = await loadTypescript('../servidor/utilidades/documentos-institucionales.ts', { "'jszip'": JSON.stringify(import.meta.resolve('jszip')), "'./formato-documentos'": JSON.stringify(base) });
const { inspectDocument, chooseTemplate } = await import(moduleUrl);
test('reconoce los cuatro códigos sin exigir renombrar el documento', async () => {
  for (const code of ['003-01','003-03','003-04','003-05']) {
    const result = await inspectDocument(`TecNM-VI-PO-${code}.docx`, '', await docx('Contenido de prueba'));
    assert.equal(result.code,code);
    assert.equal(chooseTemplate(result.code,'automatico').code,code);
  }
  assert.equal(chooseTemplate(null,'registro').code,'003-01');
  assert.equal(chooseTemplate(null,'constancia').code,'003-05');
  assert.equal(chooseTemplate(null,'no-existe'),null);
});
test('prepara todos los clubs sin mezclar alumnos y omite evaluaciones pendientes', () => {
  const make = (name, id, evaluated) => ({ club: {nombre: name}, periodo: {nombre:'Actual'}, promotor:name+' monitor', alumnos:[{id,nombre:'Alumno '+name,evaluacion_id:evaluated,valor_numerico:4,nivel_desempeno:4}] });
  const clubs = [make('Ajedrez',1,1),make('Danza',2,null)];
  const results = renderAllClubFormats('003-03',clubs,{instituto:'Prueba'});
  assert.equal((results.match(/<section class="club-document">/g)||[]).length,2);
  assert.ok(results.includes('Ajedrez monitor'));
  assert.ok(results.includes('Danza monitor'));
  const evaluations = renderAllClubFormats('003-04',clubs,{instituto:'Prueba'});
  assert.equal((evaluations.match(/<section class="club-document">/g)||[]).length,1);
  assert.ok(!evaluations.includes('Alumno Danza'));
  assert.throws(()=>renderAllClubFormats('003-04',[clubs[1]],{}), /No hay evaluaciones/);
});
async function docx(text, extras = {}) {
  const zip = new JSZip();
  zip.file('[Content_Types].xml', '<Types/>');
  zip.file('word/document.xml', `<w:document><w:t>${text}</w:t></w:document>`);
  for (const [name, content] of Object.entries(extras)) zip.file(name, content);
  return zip.generateAsync({ type: 'nodebuffer', compression: 'DEFLATE' });
}
test('reconoce DOCX y ubica 003-04 aunque el nombre no tenga código', async () => {
  const result = await inspectDocument('evaluacion.docx', '', await docx('TecNM-VI-PO-003-04'));
  assert.equal(result.code, '003-04');
  assert.equal(result.template.key, 'formato_evaluacion_activo');
});
test('rechaza DOCX falso, contenido excesivo y macros; no clasifica códigos contradictorios', async () => {
  assert.equal(await inspectDocument('falso.docx', '', Buffer.from('texto')), null);
  assert.equal(await inspectDocument('grande.docx', '', await docx('x'.repeat(2100000))), null);
  assert.equal(await inspectDocument('macro.docx', '', await docx('', { 'word/vbaProject.bin': 'macro' })), null);
  assert.equal((await inspectDocument('TecNM-VI-PO-003-03.docx', '', await docx('TecNM-VI-PO-003-04'))).code, null);
});
test('promedio oficial admite cero y decimales, sin completar criterios faltantes', () => {
  assert.deepEqual(calculateEvaluation([0,0,0,0,0,0,0]), { valor_numerico:0, nivel_desempeno:0, desempeno:'Insuficiente' });
  assert.equal(calculateEvaluation([4,4,4,3,3,3,3]).valor_numerico, 3.43);
  assert.equal(calculateEvaluation([4,4,4,4,3,3,3]).nivel_desempeno, 4);
  assert.equal(calculateEvaluation([null,1,1,1,1,1,1]), null);
  assert.equal(calculateEvaluation([5,1,1,1,1,1,1]), null);
});
test('003-03 deja firmas vacías y distingue evaluación pendiente de no acreditado', () => {
  const student = { id:1, nombre:'<script>alert(1)</script>', apellidoP:'Prueba', faltas:0 };
  const data = { club:{nombre:'Club de prueba'}, periodo:{nombre:'Periodo',fecha_inicio:'2026-01-01',fecha_fin:'2026-06-01'}, alumnos:[student] };
  const html = renderOfficialFormat('003-03', data, {}, null);
  assert.ok(html.includes('PENDIENTE DE EVALUACIÓN'));
  assert.ok(html.includes('<td class="signature"></td>'));
  assert.ok(!html.includes('<script>'));
  assert.equal(resultForStudent({...student,evaluacion_id:1,valor_numerico:0}), 'NO ACREDITADO');
  assert.equal(resultForStudent({...student,evaluacion_id:1,valor_numerico:4}), 'ACREDITADO');
  assert.throws(() => renderOfficialFormat('003-04', data, {}, 1), /guardar la evaluación/);
});

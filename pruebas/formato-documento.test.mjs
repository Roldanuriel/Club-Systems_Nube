import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import ts from 'typescript';

const source = await readFile(new URL('../servidor/utilidades/formato-documentos.ts', import.meta.url), 'utf8');
const javascript = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 }
}).outputText;
const { getDocumentFormat } = await import('data:text/javascript;base64,' + Buffer.from(javascript).toString('base64'));

// Muestra mínima para probar la identificación del contenedor; no representa contenido de un usuario.
function wordContainer() {
  const data = Buffer.alloc(1024);
  Buffer.from([0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1]).copy(data);
  Buffer.from('WordDocument\0', 'utf16le').copy(data, 512);
  return data;
}

test('admite Word .doc aunque el navegador no conozca su MIME', () => {
  for (const mime of ['application/msword', 'application/octet-stream', '']) {
    assert.deepEqual(getDocumentFormat('Evaluación.DOC', mime, wordContainer()), {
      extension: 'doc', mime: 'application/msword'
    });
  }
});

test('rechaza archivos renombrados a .doc que no tienen contenido Word', () => {
  assert.equal(getDocumentFormat('falso.doc', 'application/msword', Buffer.from('texto')), null);
  const otherOfficeFile = wordContainer();
  otherOfficeFile.fill(0, 512);
  assert.equal(getDocumentFormat('hoja.doc', 'application/msword', otherOfficeFile), null);
  assert.equal(getDocumentFormat('archivo.doc', 'application/msword', wordContainer().subarray(0, 100)), null);
});

test('mantiene los formatos PDF, JPG y PNG', () => {
  assert.equal(getDocumentFormat('documento.pdf', 'application/pdf', Buffer.from('%PDF-1.7')).extension, 'pdf');
  assert.equal(getDocumentFormat('foto.jpg', 'image/jpeg', Buffer.from([0xff, 0xd8, 0xff])).extension, 'jpg');
  assert.equal(getDocumentFormat('foto.png', 'image/png', Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])).extension, 'png');
});

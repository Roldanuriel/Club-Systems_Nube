import assert from 'node:assert/strict';
import test from 'node:test';
import { openDocumentFile } from '../interfaz/servicios/archivos-documentos.js';

test('descarga Word con el nombre original y sigue abriendo PDF en otra pestaña', () => {
  const originalDocument = globalThis.document;
  const originalWindow = globalThis.window;
  const originalTimeout = globalThis.setTimeout;
  const originalCreate = URL.createObjectURL;
  const originalRevoke = URL.revokeObjectURL;
  const links = [];
  const opened = [];
  const revoked = [];
  try {
    URL.createObjectURL = () => 'blob:document-test';
    URL.revokeObjectURL = url => revoked.push(url);
    globalThis.setTimeout = callback => callback();
    globalThis.window = { open: (...args) => opened.push(args) };
    globalThis.document = {
      createElement: () => ({ click() { this.clicked = true; }, remove() { this.removed = true; } }),
      body: { appendChild: link => links.push(link) }
    };
    openDocumentFile(new Blob(['test'], { type: 'application/msword' }), 'Evaluación.doc');
    assert.equal(links[0].download, 'Evaluación.doc');
    assert.equal(links[0].clicked, true);
    assert.equal(links[0].removed, true);
    assert.equal(opened.length, 0);
    openDocumentFile(new Blob(['%PDF'], { type: 'application/pdf' }), 'Evaluación.pdf');
    assert.deepEqual(opened, [['blob:document-test', '_blank', 'noopener']]);
    assert.equal(revoked.length, 2);
  } finally {
    globalThis.document = originalDocument;
    globalThis.window = originalWindow;
    globalThis.setTimeout = originalTimeout;
    URL.createObjectURL = originalCreate;
    URL.revokeObjectURL = originalRevoke;
  }
});

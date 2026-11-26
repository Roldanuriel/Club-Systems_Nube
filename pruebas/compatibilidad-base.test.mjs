import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import ts from 'typescript';

// Probar la conversión sin conectarse a la base real ni modificar registros.
const source = await readFile(new URL('../servidor/utilidades/compatibilidad-sql.ts', import.meta.url), 'utf8');
const javascript = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 }
}).outputText;
const { normalizeSql, normalizeRows, normalizeError } = await import(
  'data:text/javascript;base64,' + Buffer.from(javascript).toString('base64')
);

test('convierte parámetros sin cambiar su orden', () => {
  assert.equal(normalizeSql('SELECT * FROM alumnos WHERE id = ? AND periodo_id = ?'),
    'SELECT * FROM alumnos WHERE id = $1 AND periodo_id = $2');
});

test('las inserciones devuelven el identificador esperado por la API', () => {
  assert.equal(normalizeSql('INSERT INTO usuarios (nombre) VALUES (?);'),
    'INSERT INTO usuarios (nombre) VALUES ($1) RETURNING id');
  assert.equal(normalizeSql('INSERT INTO app_config (clave, valor) VALUES (?, ?)'),
    'INSERT INTO app_config (clave, valor) VALUES ($1, $2)');
});

test('convierte actualizaciones por clave repetida y rechaza tablas sin clave definida', () => {
  assert.equal(normalizeSql('INSERT INTO app_config (clave, valor) VALUES (?, ?) ON DUPLICATE KEY UPDATE valor = VALUES(valor)'),
    'INSERT INTO app_config (clave, valor) VALUES ($1, $2) ON CONFLICT (clave) DO UPDATE SET valor = EXCLUDED.valor');
  assert.throws(() => normalizeSql('INSERT INTO tabla_desconocida (id) VALUES (?) ON DUPLICATE KEY UPDATE id = VALUES(id)'), /llave de conflicto/);
});

test('conserva los nombres de campos que esperan las pantallas, sin mutar las filas', () => {
  const rows = [{ apellidop: 'Prueba', apellidom: 'Ejemplo', numerocontrol: '12345678', id: 5 }];
  assert.deepEqual(normalizeRows(rows), [{ apellidoP: 'Prueba', apellidoM: 'Ejemplo', numeroControl: '12345678', id: 5 }]);
  assert.equal(rows[0].apellidop, 'Prueba');
});

test('mantiene la clasificación de errores de duplicados', () => {
  assert.equal(normalizeError({ code: '23505' }).code, 'ER_DUP_ENTRY');
  assert.equal(normalizeError({ code: '23503' }).code, '23503');
});

import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url);
const {encode,decode,discover}=require('../desktop/red/descubrimiento.cjs');
const key='a'.repeat(64), body={service:'club-systems-v1',type:'discover',nonce:'b'.repeat(32)};
test('solo acepta anuncios de equipos vinculados',()=>{assert.deepEqual(decode(encode(body,key),key),body);assert.equal(decode(encode(body,key),'c'.repeat(64)),null);});
test('rechaza anuncios alterados o excesivos',()=>{const packet=JSON.parse(encode(body,key));packet.body.type='server';assert.equal(decode(Buffer.from(JSON.stringify(packet)),key),null);assert.equal(decode(Buffer.alloc(3000),key),null);assert.equal(decode(Buffer.from('no es JSON'),key),null);});
test('no inicia búsqueda con clave inválida',async()=>{await assert.rejects(discover('123'),/inválida/);});

-- Solo PostgreSQL. Corregir las comillas conservadas en el valor por defecto importado.
BEGIN;
ALTER TABLE documentos ALTER COLUMN estado SET DEFAULT 'ACTIVO';
UPDATE documentos SET estado = 'ACTIVO'
WHERE estado = chr(39) || 'ACTIVO' || chr(39);
COMMIT;

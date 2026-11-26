BEGIN;
ALTER TABLE documentos DROP CONSTRAINT IF EXISTS documentos_formato_codigo_check;
ALTER TABLE documentos ADD CONSTRAINT documentos_formato_codigo_check
  CHECK (formato_codigo IN ('003-01','003-03','003-04','003-05'));
COMMIT;

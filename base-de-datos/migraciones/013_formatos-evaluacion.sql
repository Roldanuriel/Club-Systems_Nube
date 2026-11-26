BEGIN;
ALTER TABLE documentos ADD COLUMN IF NOT EXISTS formato_codigo TEXT CHECK (formato_codigo IN ('003-03', '003-04'));
-- Conservar las evaluaciones históricas: la escala antigua no se convierte a ciegas.
ALTER TABLE evaluaciones ALTER COLUMN valor_numerico TYPE NUMERIC(4,2);
ALTER TABLE evaluaciones ADD COLUMN IF NOT EXISTS alumno_id INTEGER REFERENCES alumnos(id) ON DELETE SET NULL;
ALTER TABLE evaluaciones ADD COLUMN IF NOT EXISTS periodo_id INTEGER REFERENCES periodos(id);
ALTER TABLE evaluaciones ADD COLUMN IF NOT EXISTS escala_version INTEGER NOT NULL DEFAULT 1;
ALTER TABLE evaluaciones ADD COLUMN IF NOT EXISTS formato_documento_id INTEGER REFERENCES documentos(id);
CREATE INDEX IF NOT EXISTS idx_evaluacion_alumno_periodo ON evaluaciones(alumno_id, periodo_id);
COMMIT;

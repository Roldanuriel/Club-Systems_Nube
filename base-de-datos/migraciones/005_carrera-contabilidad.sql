-- Carrera incluida en el formulario oficial de inscripción.
INSERT INTO carreras (nombre, abreviatura)
SELECT 'Licenciatura en Contabilidad', 'L.C.'
WHERE NOT EXISTS (
  SELECT 1 FROM carreras
  WHERE LOWER(nombre) IN ('licenciatura en contabilidad', 'licenciatura en contaduría', 'licenciatura en contaduria')
);

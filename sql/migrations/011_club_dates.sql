CREATE TABLE IF NOT EXISTS fechas_club (
  id INT AUTO_INCREMENT PRIMARY KEY,
  periodo_id INT NOT NULL,
  club_id INT NOT NULL,
  fecha DATE NOT NULL,
  creado_por INT NULL,
  creado_en TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_fecha_club_periodo (periodo_id, club_id, fecha),
  CONSTRAINT fk_fecha_club_periodo FOREIGN KEY (periodo_id) REFERENCES periodos(id) ON DELETE CASCADE,
  CONSTRAINT fk_fecha_club_club FOREIGN KEY (club_id) REFERENCES clubs(id) ON DELETE CASCADE,
  CONSTRAINT fk_fecha_club_usuario FOREIGN KEY (creado_por) REFERENCES usuarios(id) ON DELETE SET NULL
);

INSERT IGNORE INTO fechas_club (periodo_id, club_id, fecha)
SELECT DISTINCT a.periodo_id, a.id_club, asi.fecha
FROM asistencias asi
JOIN alumnos a ON a.id = asi.id_alumno
WHERE a.id_club IS NOT NULL;

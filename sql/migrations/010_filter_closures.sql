CREATE TABLE IF NOT EXISTS filtros_cerrados (
  id INT AUTO_INCREMENT PRIMARY KEY,
  periodo_id INT NOT NULL,
  tipo ENUM('futbol', 'basquetbol') NOT NULL,
  cerrado_por INT NULL,
  cerrado_en TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_filtro_periodo_tipo (periodo_id, tipo),
  CONSTRAINT fk_filtro_periodo FOREIGN KEY (periodo_id) REFERENCES periodos(id) ON DELETE CASCADE,
  CONSTRAINT fk_filtro_usuario FOREIGN KEY (cerrado_por) REFERENCES usuarios(id) ON DELETE SET NULL
);

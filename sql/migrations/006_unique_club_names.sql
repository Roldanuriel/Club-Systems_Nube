-- Evita clubes repetidos. La intercalación utf8mb4_general_ci también
-- considera equivalentes las diferencias de mayúsculas y acentos.
ALTER TABLE clubs ADD UNIQUE KEY uniq_clubs_nombre (nombre);

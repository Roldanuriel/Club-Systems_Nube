# Club Systems

Aplicación de clubs estudiantiles con interfaz Vue/Nuxt, servidor Nuxt y base PostgreSQL.

## Abrir el programa

Usa `Iniciar-Club-Systems.cmd` o el acceso directo existente. Para instalar: `Instalar-Piloto.cmd`. Los respaldos y restauraciones conservan sus archivos `.cmd` en la raíz.

## Dónde trabajar

- `interfaz`: páginas, vistas, componentes, servicios e imágenes.
- `servidor`: operaciones de la API, utilidades y tipos.
- `configuracion`: relación entre las direcciones públicas y los archivos del servidor.
- `base-de-datos`: esquemas y migraciones SQL.
- `herramientas`: instalación, inicio, respaldo y restauración.
- `pruebas`: comprobaciones automáticas.
- `plantillas`: referencias para documentos.
- `documentacion`: explicación de la estructura y guías.

Consulta [la guía de estructura](documentacion/estructura-del-proyecto.md) para seguir una operación desde la pantalla hasta PostgreSQL.

## Datos existentes

`.postgresql` contiene el motor y la base en uso. `.data` contiene los archivos subidos. `.env` contiene configuración privada. No borres ni publiques estas carpetas o archivos. Los cambios de organización del código no requieren restaurar ni reiniciar la base.

## Comprobaciones

Ejecuta `npm test`, `npm run typecheck` y `npm run build`. El servicio sigue en `http://127.0.0.1:3001/` y su comprobación de conexión en `/api/health`.

Los directorios generados y los archivos exigidos por Nuxt, npm, PostgreSQL y Git conservan sus nombres técnicos. La guía explica cada excepción.

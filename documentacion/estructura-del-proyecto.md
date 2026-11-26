# Estructura del proyecto

El código de la interfaz y del servidor está separado. Nuxt reúne ambas partes al iniciar la aplicación; PostgreSQL conserva los datos.

```text
Club-Systems_Nube/
├── interfaz/                 Lo que ve y utiliza la persona
│   ├── paginas/              Direcciones del navegador y permisos de cada página
│   ├── vistas/               Pantallas principales: acceso, oficina y monitor
│   ├── componentes/          Formularios, tablas y vistas previas
│   ├── servicios/            Peticiones al servidor y manejo de la sesión
│   ├── intermediarios/       Revisión de la sesión antes de cambiar de página
│   ├── complementos/         Integración con las bibliotecas de la interfaz
│   ├── imagenes/             Imágenes utilizadas por las pantallas
│   ├── recursos/estilos/     Estilos generales
│   └── tipos/                Descripciones de datos para TypeScript
├── servidor/                 Parte que valida permisos y trabaja con los datos
│   ├── operaciones/          Acciones agrupadas por alumnos, clubs, documentos, etc.
│   ├── utilidades/           Conexión, validación, sesiones y auditoría
│   └── tipos/                Descripciones de usuarios y resultados de consultas
├── configuracion/            Registro de las direcciones públicas del servidor
├── base-de-datos/             Esquemas SQL y migraciones; no es la base en ejecución
│   └── migraciones/          Cambios de estructura de la base
├── herramientas/             Inicio, instalación, respaldos y restauración
├── pruebas/                  Comprobaciones automáticas
├── plantillas/constancia/     Referencia de la plantilla de constancia
├── documentacion/            Guías e informes
├── publico/                  Archivos accesibles directamente desde el navegador
└── compartido/               Espacio para código común cuando sea necesario
```

## Cómo seguir una operación

1. La página de `interfaz/paginas` abre una pantalla de `interfaz/vistas`.
2. Esa pantalla usa formularios de `interfaz/componentes`.
3. Los servicios de `interfaz/servicios` envían la petición a la API.
4. `configuracion/rutas-servidor.ts` indica qué archivo de `servidor/operaciones` responde a cada dirección.
5. La operación comprueba los permisos y usa `servidor/utilidades/conexion.ts` para consultar PostgreSQL.

Por ejemplo, `/api/alumnos` se atiende desde los archivos de `servidor/operaciones/alumnos`. `indice.obtener.ts` consulta; `indice.guardar.ts` registra; `[id].actualizar.ts` actualiza un alumno; `[id].eliminar.ts` atiende su eliminación.

Las direcciones de la API se conservaron para que el cambio de carpetas no altere las pantallas ni las sesiones. Las rutas antiguas de archivos ya no se usan.

## Nombres técnicos que deben conservarse

- `node_modules`, `.npm-cache`, `.nuxt` y `.output`: dependencias y archivos generados por las herramientas.
- `.postgresql` y `.data`: motor/base existente y archivos subidos. No se trasladaron ni se vaciaron.
- `.git`, `.github` y `.vscode`: configuración de herramientas externas.
- `.env`, `package.json`, `package-lock.json`, `nuxt.config.ts` y `tsconfig.json`: archivos reconocidos por las herramientas.
- `interfaz/app.vue`, `interfaz/paginas/index.vue`, el sufijo `.client.ts` y `.test.mjs`: convenciones técnicas conservadas. Los nombres de las carpetas de código propio están en español.

Las palabras reservadas de JavaScript, TypeScript, Vue, Nuxt y HTTP no se traducen. Tampoco se modificaron nombres de tablas o campos de la base de datos en esta reorganización.

## Ejecutar y comprobar

Los archivos `.cmd` de la raíz y los accesos directos existentes siguen siendo los puntos de entrada. Ahora llaman a `herramientas`:

- `Iniciar-Club-Systems.cmd`: comprueba PostgreSQL y abre el programa.
- `Instalar-Piloto.cmd`: instala dependencias y prepara accesos directos.
- `Respaldar-Club-Systems.cmd`: respalda la base sin borrar datos.
- `Restaurar-Club-Systems.cmd`: restaura únicamente cuando se solicita explícitamente.

Para revisar el código: `npm test`, `npm run typecheck` y `npm run build`. La restauración y las migraciones de bases antiguas no forman parte de estas pruebas.

## Limpieza del 25 de noviembre de 2026

- La página `interfaz/paginas/monitor.vue` carga directamente el panel del monitor; se retiró la vista intermedia redundante.
- Oficina reutiliza `ConfiguracionFormatos.vue` con una propiedad explícita para separar carga y configuración. No se duplican los formularios.
- Se retiraron las imágenes sin uso `Yakuin.png` y `Registro_Club.png`.
- Los cuatro SQL antiguos de MySQL de la raíz de `base-de-datos` se archivaron: no describen la base PostgreSQL actual. Se conservan las migraciones históricas y las herramientas de respaldo/restauración.
- La copia recuperable está en `C:\Users\Uriel\Documents\Codex\ClubSystems_archivo_limpieza_2026-11-25`.
- Las carpetas generadas y los datos locales se ocultan en el explorador de VS Code mediante `.vscode/settings.json`; siguen existiendo. No deben confundirse con código duplicado ni borrarse para limpiar el editor.
- La sincronización de dos servidores sigue en desarrollo. Un resultado correcto de las pruebas generales no sustituye sus pruebas de integración ni una validación en los tres equipos.

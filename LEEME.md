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

## Aplicación de escritorio para Windows

- `npm run electron` inicia Nuxt en modo desarrollo y abre la aplicación en Electron.
- `npm run build` genera el servidor Nuxt SSR de producción.
- `npm run installer` compila Nuxt y genera el instalador NSIS x64 en `dist/ClubSystems-Setup.exe`, y luego lo copia al Escritorio de Windows como `ClubSystems-Setup.exe`.

El instalador incluye la aplicación Nuxt/Nitro, no PostgreSQL, la base de datos ni archivos `.env`. Para usar la aplicación instalada, PostgreSQL debe estar disponible en el equipo o en un servidor accesible. La configuración privada se puede proporcionar en `%APPDATA%\Club Systems\.env`, fuera del directorio de instalación. Se leen las variables `PG_HOST`, `PG_PORT`, `PG_USER`, `PG_DATABASE`, `PG_PASSWORD`, `PG_SSL_CA` y `TOKEN_PEPPER`; no copies credenciales al proyecto ni las compartas con el instalador. Si no existe ese archivo, se usan las variables de entorno del proceso y los valores predeterminados de Nuxt.

Por defecto, Electron ejecuta el servidor SSR local en una dirección loopback; al configurarlo como cliente, carga la aplicación y la API `/api` del equipo maestro. No se cambia a SPA ni se abre Chrome o Edge. El acceso directo de escritorio, el menú Inicio y la desinstalación se crean mediante NSIS. La desinstalación no elimina PostgreSQL ni sus datos.

### Equipo maestro y equipos cliente

Para compartir una sola base de datos, no configures replicación maestro–maestro ni abras PostgreSQL a la red. El equipo maestro ejecuta Nuxt/Nitro y PostgreSQL; los clientes usan la misma aplicación y API central.

1. En el equipo maestro, abre PowerShell como administrador y ejecuta:

   ```powershell
   .\herramientas\configurar-servidor-maestro.ps1 -AccessFile "C:\ClubSystemsRed\ACCESO-CLUB-SYSTEMS.txt"
   ```

2. Comparte únicamente `C:\ClubSystemsRed` con permiso de lectura para los usuarios de los equipos cliente. No compartas la carpeta del proyecto ni su `.env`. El script configura el Firewall para permitir TCP 3001 solo desde la subred local y el perfil Privado. PostgreSQL (5432) permanece local al maestro.
3. Inicia Club Systems en el maestro con `Iniciar-Club-Systems.cmd`. El archivo de acceso compartido se actualiza con la IP actual del maestro al iniciar.
4. Instala `ClubSystems-Setup.exe` en cada cliente. Ejecuta el script instalado con la cuenta del usuario que abrirá la aplicación:

   ```powershell
   powershell -ExecutionPolicy Bypass -File "$env:LOCALAPPDATA\Programs\sirce-nuxt\resources\configurar-equipo-cliente.ps1" -AccessFile "\\NOMBRE-MAESTRO\ClubSystemsRed\ACCESO-CLUB-SYSTEMS.txt"
   ```

El script comprueba `/api/health` antes de guardar la configuración. Electron consulta el archivo compartido al abrirse, así que los cambios de IP se aplican sin editar la URL en cada equipo; cierra y vuelve a abrir la aplicación después de cambiar de red. También se puede fijar una dirección con `-ServerUrl "http://192.168.1.20:3001/"`, pero esa opción no se actualiza automáticamente.

Si `/api/health` devuelve HTTP 500, la conexión entre Electron y el servidor ya funciona, pero el backend no puede conectarse a PostgreSQL. Revisa `PG_HOST`, `PG_PORT`, `PG_USER`, `PG_DATABASE` y `PG_PASSWORD` en el `.env` privado del maestro y confirma que PostgreSQL y la base existente estén disponibles.

Los directorios generados y los archivos exigidos por Nuxt, npm, PostgreSQL y Git conservan sus nombres técnicos. La guía explica cada excepción.

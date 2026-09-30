# Club Systems: resultado de la revisión

Proyecto modificado: `C:\Users\Uriel\Club-Systems_Nube`.
Fecha: 28 de septiembre de 2026.

## Respaldos

- `Respaldo-original-Club-Systems_Nube`: copia completa inicial, incluidos archivos ocultos, código, datos, configuración, PostgreSQL y dependencias.
- `club_systems_antes_de_cambios.backup`: respaldo lógico de PostgreSQL realizado después de iniciar y recuperar normalmente la base existente.
- `verificacion-respaldo.json`: comparación por hash de 22,048 archivos importantes, sin diferencias. Incluye todo `.postgresql`, `.data`, configuración, código y scripts; no es una verificación por hash de todos los archivos generados o dependencias.
- Comparación posterior del volcado de datos con el respaldo inicial: contenido de registros y secuencias sin cambios.

Para recuperar la base, utiliza el archivo `.backup` con la herramienta de restauración y conserva `.data` para los archivos subidos. No reemplaces una carpeta de PostgreSQL mientras su servidor está encendido. El respaldo contiene configuración y datos privados; consérvalo localmente.

## Retirado del proyecto activo

Los originales siguen en el respaldo completo. Se retiraron:

1. `.firebase`, `.firebaserc`, `firebase.json`: alojamiento Firebase antiguo, sin uso en las rutas/importaciones actuales.
2. `app/plugins/bootstrap.client.js`: copia compilada CommonJS duplicada del complemento TypeScript; Nuxt advertía que no tenía exportación predeterminada.
3. `interfaz/componentes/HelloWorld.vue`, `src/assets/vue.svg`, `public/vite.svg`: ejemplos sin referencias activas.
4. `interfaz/servicios/logger.js`: módulo sin importaciones activas.
5. `interfaz/componentes/MonitorComponent.vue`: envoltorio sin lógica; la pantalla importa directamente el panel existente.
6. Paquete npm `html2pdf.js`: no se importaba. La función PDF existente sigue usando su script externo cdnjs; `jspdf` y `jszip` se conservaron porque sí se usan.
7. Después de la confirmación explícita del usuario, se trasladaron a `Legado-retirado`: `Backend`, `electron`, las entradas Vite, PHP/Composer, Docker/App Engine/Heroku/Netlify y el flujo de despliegue Azure. No se borraron de su respaldo. La referencia textual `Backend/` que queda en `imageUtils.js` transforma rutas antiguas de fotografías a la API actual; no importa ni ejecuta PHP.

No había un SDK Firebase declarado en package.json. No se borraron `.postgresql`, `.data`, `.env`, `scripts`, `server`, `src` ni `sql`.

## Simplificado y corregido

- Se prepararon 97 módulos de código en una copia de revisión. Se aplicaron los módulos de aplicación/servidor, manteniendo los scripts operativos modificados por separado.
- Se expandieron instrucciones comprimidas y se aclararon nombres internos de validaciones, usuarios y resultados en la API, conservando nombres externos de campos y rutas.
- Se separaron las peticiones HTTP de las operaciones del programa (`request.js` / `api.js`).
- Se separó la compatibilidad SQL de la conexión y las transacciones (`sqlCompatibility.ts` / `db.ts`).
- Se reemplazaron tipos importados de MySQL por tipos propios del servidor. `mysql2` y `@types/pg` quedaron como herramientas de desarrollo; las migraciones MySQL se conservaron.
- Ocho bloques largos de estilos quedaron en archivos CSS asociados, sin cambiar su contenido ni su alcance.
- Oficina y gestión de usuarios comparten ahora la misma función de rutas de fotografías.
- Se sustituyeron alias `Legacy...` por nombres descriptivos en las páginas de Nuxt.
- Se declaró `vue-router` como dependencia directa, corrigiendo la advertencia de resolución de tipos.
- La configuración de producción pasó de `http://localhost/Backend` a `/api`.
- El empaquetado de Nuxt comprueba si una ruta es un enlace antes de leerla como tal; esto resolvió el error de Windows durante el build.
- Se añadió una guía para aprender la estructura y seguir una operación de extremo a extremo.
- La renovación de sesión usa una sola promesa compartida en lugar de dos colas de espera. Si falla, todas las peticiones reciben el error, se limpia la sesión y se puede volver a intentar. Se corrigió la redirección de sesión vencida para las rutas actuales de Nuxt.

## Instalación, inicio y respaldo

- Los scripts comparten la configuración PG_ de `.env` y no muestran contraseñas.
- PostgreSQL se comprueba con una consulta real. El inicio no crea una base vacía si falta la existente.
- El arranque continúa después de PostgreSQL, comprueba página y API y evita abrir otra instancia cuando el servicio ya responde.
- Se conservan errores en archivos de registro.
- Los `.cmd` devuelven el código de salida aunque hagan una pausa.
- El instalador usa `npm ci` y una función separada que crea y verifica los accesos directos.
- Se crearon en el Escritorio **Club Systems Piloto** y **Respaldar Club Systems** y se verificaron sus destinos en una prueba previa.
- El respaldo usa archivo provisional, comprueba el formato y solo entonces lo publica como `.backup`.
- La restauración conserva confirmación explícita, hace respaldo previo y utiliza una transacción.

## Comprobaciones realizadas

| Comprobación | Resultado |
| --- | --- |
| Comparación estructural de código reformateado/renombrado | 85 módulos equivalentes en la copia de revisión |
| Plantillas y estilos | 18 plantillas y 16 bloques de estilos comparados sin cambios de contenido |
| Adaptador extraído frente al original | 7 comparaciones correctas |
| `npm test` | 8 pruebas correctas, ninguna fallida |
| `npm run typecheck` | Correcto |
| `npm run build` | Correcto en copia de revisión y proyecto real |
| Todos los scripts PowerShell | Sintaxis correcta |
| Inicio y respaldo en Windows PowerShell | Correctos; el llamador continúa después de iniciar PostgreSQL |
| Pantalla de acceso en navegador | Visible y comprobada |
| Versión compilada en puerto de prueba 3101 | Inició correctamente; servidor de prueba detenido al terminar |
| `/api/health` | PostgreSQL conectado |
| HTML `/`, `/oficina`, `/monitor`, `/crear-cuenta` | HTTP 200; esto no sustituye probar cada flujo con sesión |
| APIs privadas sin sesión | HTTP 401 en usuario actual, alumnos, usuarios y periodos |
| Inicio de sesión sin campos obligatorios | HTTP 422 |
| Datos y secuencias de la base existente | Sin cambios respecto del respaldo inicial |
| Restauración real del respaldo en una base aislada | Correcta; base temporal retirada después de las pruebas |
| Inicio y perfil SUPERADMIN, ADMIN y MONITOR | Correctos con usuarios creados solo en la copia de prueba |
| Permisos de administración de usuarios | SUPERADMIN autorizado; ADMIN y MONITOR rechazados |
| Once consultas autenticadas | Alumnos, clubs, carreras, monitores, periodos, auditoría, materiales, documentos, firmas, reinscripciones y sesiones correctas |
| Renovación y cierre de sesión | Token renovado válido; renovación reutilizada y sesión cerrada rechazadas |
| Interacción en navegador | Selector Oficina/Monitor y modal de recuperación correctos; sin errores JavaScript detectados |

## Pendientes y límites

- **Legado retirado y respaldado:** su ejecución independiente desde la ubicación original dejó de estar disponible, como se indicó antes de la confirmación. El proyecto activo usa Nuxt y PostgreSQL.
- El alcance aplicado mejora estructura, nombres y legibilidad en toda la aplicación actual; **no equivale a una reescritura exhaustiva de cada función**. Hay componentes grandes y reglas heredadas que requieren pruebas funcionales por rol antes de simplificarse más.
- No se ejecutaron operaciones destructivas, migraciones ni restauraciones sobre la base real. Se probaron sesiones, roles y consultas en una copia aislada. Quedan sin cobertura exhaustiva las altas, bajas, cierres de periodos, carga de documentos y generación visual de constancias.
- El instalador completo no se ejecutó contra el equipo en uso; se probaron sus partes de tipos, inicio, respaldo y accesos. No se modificó el firewall ni se verificó acceso desde otro dispositivo.
- Persisten advertencias de tamaño de paquetes JavaScript y avisos de bibliotecas de terceros. La compilación termina correctamente.
- La base estaba detenida y tenía un cierre anterior incompleto; PostgreSQL realizó su recuperación automática antes del respaldo lógico. No se borraron archivos de recuperación.

La estructura y el recorrido recomendado para aprender están en `Guia-del-programa.md`, también instalado como `LEEME.md` del proyecto.

## Actualización: evaluaciones en Word .doc

Se añadió soporte de Word `.doc` a la carga de evaluaciones y al selector compartido de documentos, conservando PDF/JPG/PNG y el límite de 5 MB. El servidor comprueba el contenedor Word, guarda la extensión y el MIME correctos aunque el navegador no identifique el tipo, y conserva los bytes originales. Word se descarga con su nombre original; los formatos que el navegador puede mostrar siguen abriéndose como antes.

Se añadieron cuatro pruebas de identificación y descarga, para un total de 12 pruebas correctas. La comprobación de tipos también pasó. No se contó con un documento real del usuario para comprobar su apertura en Microsoft Word.

Antes de cambiar los archivos se creó `Respaldo-antes-soporte-doc`. Se apartaron allí 63 copias JavaScript generadas que duplicaban archivos TypeScript y podían ocultar cambios en las rutas. La configuración raíz ahora declara `noEmit`; después de la revisión de tipos no reaparecieron esas copias.

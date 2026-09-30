# Sesiones de Club Systems

La aplicación actual usa Nuxt, una API local en `/api` y PostgreSQL. No requiere PHP ni Firebase.

## Recorrido del inicio de sesión

1. `interfaz/vistas/InicioSesion.vue` recoge usuario y contraseña.
2. `interfaz/servicios/autenticacion.js` envía la petición a `/api/auth/login`.
3. `servidor/operaciones/autenticacion/iniciar-sesion.guardar.ts` valida los datos, consulta al usuario y compara la contraseña con bcrypt.
4. `servidor/utilidades/credenciales.ts` crea un token de acceso y uno de renovación. La base almacena la huella del secreto, no el secreto completo.
5. El navegador conserva el token de acceso en `sessionStorage` y el de renovación en `localStorage`, manteniendo el comportamiento existente.
6. Cada petición protegida envía `Authorization: Bearer ...`. `servidor/utilidades/autenticacion.ts` comprueba sesión y rol antes de consultar o cambiar datos.

## Renovación

Cuando la API responde 401, el cliente puede renovar la sesión una vez y reintentar. Varias peticiones simultáneas comparten una única promesa de renovación: todas reciben el nuevo token o el mismo error. Esto evita dejar peticiones esperando si falla la renovación.

`/api/auth/refresh` invalida el token de renovación utilizado y emite otro. `/api/auth/logout` invalida el token de acceso enviado. El navegador limpia sus datos al cerrar la sesión.

## Dónde modificar cada responsabilidad

- `interfaz/servicios/autenticacion.js`: almacenamiento, inicio, cierre y renovación de sesión.
- `interfaz/servicios/peticiones.js`: peticiones fetch, reintento y mensajes de error.
- `interfaz/servicios/cliente-http.js`: las mismas comprobaciones para las pantallas que aún usan Axios.
- `interfaz/intermediarios/autenticacion.global.ts`: navegación según sesión y rol.
- `servidor/utilidades/autenticacion.ts`: autorización real de la API; la validación del navegador no la sustituye.
- `servidor/utilidades/credenciales.ts`: creación, validación y revocación de tokens.
- `servidor/operaciones/auth`: endpoints de autenticación.

No imprimas contraseñas ni tokens para depurar. No cambies nombres de campos de respuestas sin revisar sus consumidores.

## Pruebas

`npm test` incluye casos de renovación simultánea, fallo compartido y reintento posterior. También se verificaron inicio de sesión, perfiles, permisos y revocación en una base aislada restaurada desde el respaldo. No se usaron cuentas reales ni se modificaron sus contraseñas.

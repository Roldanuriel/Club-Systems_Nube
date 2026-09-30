import { rutasServidor } from './configuracion/rutas-servidor'
import { lstat, readlink } from 'node:fs/promises'

export default defineNuxtConfig({
  srcDir: 'interfaz/',
  serverDir: 'servidor/',
  dir: { pages: 'paginas', middleware: 'intermediarios', plugins: 'complementos', assets: 'recursos', public: 'publico', shared: 'compartido', layouts: 'disenos', modules: 'modulos' },
  components: [{ path: '~/componentes' }],
  compatibilityDate: '2026-08-28',
  devtools: { enabled: true },
  css: [
    'bootstrap/dist/css/bootstrap.min.css',
    'bootstrap-icons/font/bootstrap-icons.css',
    '~/recursos/estilos/principal.css'
  ],
  runtimeConfig: {
    databaseHost: process.env.PG_HOST || '127.0.0.1',
    databasePort: Number(process.env.PG_PORT || 5432),
    databaseUser: process.env.PG_USER || 'postgres',
    databasePassword: process.env.PG_PASSWORD || '',
    databaseName: process.env.PG_DATABASE || 'club_systems',
    databaseSslCa: process.env.PG_SSL_CA || '',
    tokenPepper: process.env.TOKEN_PEPPER || '',
    public: { appName: 'SIRCE' }
  },
  nitro: {
    preset: 'node-server',
    handlers: rutasServidor,
    externals: {
      inline: ['bcryptjs', 'zod', /reglas-evaluacion\.js$/],
      external: ['pg'],
      traceOptions: {
        // En Windows, readlink puede fallar sobre carpetas normales; consultar primero su tipo.
        async readlink(path) {
          try {
            return (await lstat(path)).isSymbolicLink() ? await readlink(path) : null
          } catch (error: any) {
            if (error.code === 'ENOENT') return null
            throw error
          }
        }
      }
    }
  },
  typescript: { strict: true, typeCheck: true }
})

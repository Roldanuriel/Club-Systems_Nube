export default defineNuxtConfig({
  compatibilityDate: '2026-08-28',
  devtools: { enabled: true },
  css: [
    'bootstrap/dist/css/bootstrap.min.css',
    'bootstrap-icons/font/bootstrap-icons.css',
    '~/assets/css/main.css'
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
    externals: {
      inline: ['bcryptjs', 'zod'],
      external: ['pg']
    }
  },
  typescript: { strict: true, typeCheck: true }
})

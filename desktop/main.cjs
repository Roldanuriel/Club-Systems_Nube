const { app, BrowserWindow, dialog, utilityProcess, Menu } = require('electron');
const { spawn } = require('node:child_process');
const { existsSync, readFileSync, writeFileSync } = require('node:fs');
const { discover, advertise } = require('./red/descubrimiento.cjs');
const { privateAddress } = require('./red/interfaz-privada.cjs');
const { hostname } = require('node:os');
let networkConfig;
let stopAdvertising;
let stopSync;
let syncPool;
let syncStatus={state:'disabled',message:'Sincronización no configurada'};
const {poolFor,configure}=require('./sync/configurar.cjs');
const {startSync}=require('./sync/servicio.cjs');
let bindAddress='127.0.0.1';
const { createServer } = require('node:net');
const { join } = require('node:path');

app.setName('Club Systems');
app.setAppUserModelId('com.clubsystems.desktop');

let backendProcess;
let mainWindow;
let stopping = false;

function loadDatabaseConfiguration() {
  const configPaths = app.isPackaged
    ? [join(app.getPath('userData'), '.env')]
    : [join(app.getAppPath(), '.env'), join(app.getPath('userData'), '.env')];
  for (const configPath of configPaths) {
    if (existsSync(configPath)) {
      process.loadEnvFile(configPath);
    }
  }

  const configuredUrl = process.env.CLUB_SYSTEMS_SERVER_URL;
  const accessFile = process.env.CLUB_SYSTEMS_SERVER_URL_FILE;
  if (configuredUrl && accessFile) {
    throw new Error('Configura CLUB_SYSTEMS_SERVER_URL o CLUB_SYSTEMS_SERVER_URL_FILE, no ambos.');
  }
  if (configuredUrl) {
    return validateServerUrl(configuredUrl);
  }
  if (accessFile) {
    const contents = readFileSync(accessFile, 'utf8');
    const match = contents.match(/^\s*Acceso desde celulares y otras computadoras:\s*(https?:\/\/\S+)/im);
    if (!match) {
      throw new Error(`No se encontró la dirección de Club Systems en ${accessFile}.`);
    }
    return validateServerUrl(match[1]);
  }
  return null;
}

function validateServerUrl(value) {
  const url = new URL(value.trim());
  if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password) {
    throw new Error('La dirección del servidor debe ser una URL HTTP o HTTPS válida.');
  }
  if (url.pathname !== '/' || url.search || url.hash) {
    throw new Error('La dirección del servidor debe apuntar a la raíz del sitio, sin ruta adicional.');
  }
  return url.toString();
}

function reservePort() {
  return new Promise((resolve, reject) => {
    const server = createServer();
    server.once('error', reject);
    server.listen(0, '127.0.0.1', () => {
      const { port } = server.address();
      server.close(error => error ? reject(error) : resolve(port));
    });
  });
}

function startDevelopmentServer(port) {
  const nodeExecutable = process.env.npm_node_execpath;
  const nuxtCli = join(app.getAppPath(), 'node_modules', 'nuxt', 'bin', 'nuxt.mjs');
  if (!nodeExecutable || !existsSync(nuxtCli)) {
    throw new Error('No se encontró Node.js o Nuxt. Ejecuta la aplicación con «npm run electron».');
  }

  const child = spawn(nodeExecutable, [
    nuxtCli,
    'dev',
    '--host',
    bindAddress,
    '--port',
    String(port)
  ], {
    cwd: app.getAppPath(),
    env: { ...process.env, HOST: bindAddress, PORT: String(port) },
    stdio: ['ignore', 'pipe', 'pipe'],
    windowsHide: true
  });
  child.stdout.on('data', chunk => process.stdout.write(chunk));
  child.stderr.on('data', chunk => process.stderr.write(chunk));

  const state = { process: child, exitCode: null, error: null };
  child.once('error', error => { state.error = error; });
  child.once('exit', code => { state.exitCode = code; });
  return state;
}

function startProductionServer(port) {
  const outputDirectory = join(process.resourcesPath, '.output');
  const serverEntry = join(outputDirectory, 'server', 'index.mjs');
  if (!existsSync(serverEntry)) {
    throw new Error(`No se encontró el servidor Nuxt compilado: ${serverEntry}`);
  }

  const child = utilityProcess.fork(serverEntry, [], {
    serviceName: 'Club Systems Nitro Server',
    cwd: outputDirectory,
    env: {
      ...process.env,
      ...Object.fromEntries(Object.entries({PG_HOST:'NUXT_DATABASE_HOST',PG_PORT:'NUXT_DATABASE_PORT',PG_USER:'NUXT_DATABASE_USER',PG_PASSWORD:'NUXT_DATABASE_PASSWORD',PG_DATABASE:'NUXT_DATABASE_NAME',TOKEN_PEPPER:'NUXT_TOKEN_PEPPER'}).filter(([source])=>process.env[source]!==undefined).map(([source,target])=>[target,process.env[source]])),
      HOST: bindAddress,
      NITRO_HOST: bindAddress,
      PORT: String(port),
      NITRO_PORT: String(port)
    },
    stdio: 'pipe'
  });
  child.stdout.on('data', chunk => process.stdout.write(chunk));
  child.stderr.on('data', chunk => process.stderr.write(chunk));

  const state = { process: child, exitCode: null, error: null };
  child.once('error', error => { state.error = error; });
  child.once('exit', code => { state.exitCode = code; });
  return state;
}

async function waitForServer(address, state) {
  const healthUrl = new URL('api/health', address);
  const deadline = Date.now() + (app.isPackaged ? 30000 : 120000);
  let lastError;

  while (Date.now() < deadline) {
    if (state?.error) {
      throw new Error('No se pudo iniciar el servidor Nuxt.', { cause: state.error });
    }
    if (state && state.exitCode !== null) {
      throw new Error(`El servidor Nuxt terminó antes de iniciar (código ${state.exitCode}).`);
    }

    let response;
    try {
      response = await fetch(healthUrl, { signal: AbortSignal.timeout(3000) });
    } catch (error) {
      lastError = error;
      await new Promise(resolve => setTimeout(resolve, 250));
      continue;
    }
    if (response.status >= 500) {
      throw new Error(
        `La API central respondió HTTP ${response.status} en /api/health. ` +
        'Comprueba que PostgreSQL esté activo y que PG_HOST, PG_PORT, PG_USER, ' +
        'PG_DATABASE y PG_PASSWORD sean correctos en el equipo servidor.'
      );
    }
    if (response.ok) {
      let health;
      try {
        health = await response.json();
      } catch (error) {
        throw new Error('La respuesta de /api/health no contiene JSON válido.', { cause: error });
      }
      if (health.service !== 'SIRCE Nitro' || health.database !== 'connected') {
        throw new Error('La API respondió, pero no confirmó la conexión de Club Systems con PostgreSQL.');
      }
      return address;
    }
    lastError = new Error(`La API respondió con HTTP ${response.status}.`);
    await new Promise(resolve => setTimeout(resolve, 250));
  }

  throw new Error(
    'No se pudo conectar con la API de Club Systems. Verifica la IP del servidor, ' +
    'el puerto 3001 y el Firewall de Windows.',
    { cause: lastError }
  );
}

function createMainWindow(address) {
  mainWindow = new BrowserWindow({
    width: 1440,
    height: 900,
    minWidth: 1024,
    minHeight: 700,
    show: false,
    icon: join(__dirname, 'assets', 'club-systems.ico'),
    webPreferences: {
      preload: join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true
    }
  });

  const trustedOrigin = new URL(address).origin;
  mainWindow.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));
  mainWindow.webContents.on('will-navigate', (event, url) => {
    if (new URL(url).origin !== trustedOrigin) {
      event.preventDefault();
    }
  });
  Menu.setApplicationMenu(Menu.buildFromTemplate([{label:'Red local',submenu:[{label:'Estado de sincronización',click:()=>dialog.showMessageBox(mainWindow,{type:syncStatus.state==='conflict'?'warning':'info',message:syncStatus.message,detail:syncStatus.at||'Este equipo no tiene sincronización activa.'})},{label:'Volver a buscar servidor',enabled:networkConfig?.role==='client',click:async()=>{const choice=await dialog.showMessageBox(mainWindow,{type:'question',message:'Se cerrará la sesión actual. Guarda los cambios antes de reconectar.',buttons:['Cancelar','Reconectar'],cancelId:0});if(choice.response===1){app.relaunch();app.exit(0);}}}]}]));
  mainWindow.once('ready-to-show', () => mainWindow.show());
  mainWindow.on('closed', () => { mainWindow = null; });
  return mainWindow.loadURL(address);
}

function readNetworkConfig() {
  const file=join(app.getPath('userData'),'red.json');
  if (!existsSync(file)) return null;
  const config=JSON.parse(readFileSync(file,'utf8').replace(/^\uFEFF/,''));
  if (!['server','client'].includes(config.role) || !/^[a-f0-9]{64}$/i.test(config.key) || !/^[a-f0-9-]{36}$/i.test(config.id)) throw Error('Configuración de red inválida. Vuelve a vincular este equipo.');
  return config;
}
async function selectDiscoveredServer() {
  while(true) {
    const servers=await discover(networkConfig.key);
    const healthy=(await Promise.all(servers.map(async server=>{
      try {const response=await fetch(new URL('api/health',server.url),{signal:AbortSignal.timeout(3000)});const body=await response.json();return response.ok && body.service==='SIRCE Nitro' && body.database==='connected' ? server : null;}catch{return null;}
    }))).filter(Boolean);
    const preferred=healthy.find(server=>server.id===networkConfig.preferred);
    if(preferred)return preferred.url;
    if(!healthy.length) {
      const answer=await dialog.showMessageBox({type:'warning',title:'Buscar servidores',message:'No se encontró un servidor vinculado disponible.',detail:'Comprueba que esté encendido, en la misma red local y que el firewall permita Club Systems. No se necesita Internet.',buttons:['Buscar de nuevo','Salir'],cancelId:1});
      if(answer.response===1)return null;
      continue;
    }
    const answer=await dialog.showMessageBox({type:'question',title:'Seleccionar servidor',message:'Selecciona el servidor con el que trabajarás.',detail:'Se recordará por su identidad, aunque cambie de IP. Cambiar de servidor no sincroniza las bases por sí solo.',buttons:[...healthy.map(x=>x.name),'Cancelar'],cancelId:healthy.length});
    const chosen=healthy[answer.response];if(!chosen)return null;
    networkConfig.preferred=chosen.id;
    writeFileSync(join(app.getPath('userData'),'red.json'),JSON.stringify(networkConfig,null,2));
    return chosen.url;
  }
}
async function startApplication() {
  networkConfig=readNetworkConfig();
  const configuredAddress=loadDatabaseConfiguration();
  if(process.argv.includes('--vincular-red')){await configure(app,dialog);app.quit();return;}
  let address=networkConfig ? null : configuredAddress;
  if(networkConfig?.role==='client') {
    address=await selectDiscoveredServer();
    if(!address){app.quit();return;}
  }
  const remote=Boolean(address);
  if(!address) {
    bindAddress=networkConfig?.role==='server' ? privateAddress() : '127.0.0.1';
    const port=networkConfig?.role==='server' ? 3001 : await reservePort();
    backendProcess=app.isPackaged ? startProductionServer(port) : startDevelopmentServer(port);
    address='http://'+bindAddress+':'+port;
    await waitForServer(address,backendProcess);
    if(networkConfig?.role==='server' && networkConfig.syncKey){
      syncPool=poolFor(app);
      const settings=(await syncPool.query('SELECT node,seed FROM club_sync.settings')).rows[0];
      if(settings.node!==networkConfig.node||settings.seed!==networkConfig.seed)throw Error('La base no corresponde a este servidor vinculado');
      stopSync=startSync({pool:syncPool,config:networkConfig,address:bindAddress,uploads:app.isPackaged?join(process.resourcesPath,'.output','.data','uploads'):join(app.getAppPath(),'.data','uploads'),onStatus:status=>{syncStatus=status;}});
    }
    if(networkConfig?.role==='server')stopAdvertising=advertise({key:networkConfig.key,id:networkConfig.id,name:hostname(),port,address:bindAddress},error=>console.error('Descubrimiento:',error.message));
  }
  await createMainWindow(await waitForServer(address,remote?null:backendProcess));
}

app.whenReady().then(startApplication).catch(error => {
  console.error(error);
  dialog.showErrorBox('No se pudo iniciar Club Systems', error.stack || String(error));
  app.quit();
});

app.on('before-quit', () => {
  stopping = true;
  stopAdvertising?.();
  stopSync?.().then(()=>syncPool?.end()).catch(console.error);
  if (backendProcess?.process && !backendProcess.process.killed) {
    backendProcess.process.kill();
  }
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0 && !stopping) {
    startApplication().catch(error => {
      console.error(error);
      dialog.showErrorBox('No se pudo iniciar Club Systems', error.stack || String(error));
      app.quit();
    });
  }
});

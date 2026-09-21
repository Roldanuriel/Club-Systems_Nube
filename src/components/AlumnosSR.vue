<template>
  <div class="alumnos-sr-container">
    <h3 class="title">Alumnos sin registrar</h3>

    <div class="toolbar">
      <div class="toolbar-left">
        <button class="btn-import" @click="triggerCSV" :disabled="loading">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
            <path d="M9 16h6v-6h4l-7-7-7 7h4zm-4 2h14v2H5z"/>
          </svg>
          Importar CSV
        </button>
        <input type="file" ref="csvInput" style="display: none" accept=".csv" @change="handleCSVUpload" />
      </div>
      <div class="toolbar-right">
        <span class="text-hint">Los registros muestran hasta 3 opciones de club propuestas</span>
      </div>
    </div>

    <div class="student-search">
      <input v-model="textoBusqueda" type="search" placeholder="Nombre o número de control" @keyup.enter="buscarAlumno" />
      <button class="btn-buscar" @click="buscarAlumno">Buscar</button>
      <button v-if="busquedaAplicada" class="btn-limpiar-busqueda" @click="limpiarBusqueda">Mostrar todos</button>
    </div>

    <!-- Mensajes de estado -->
    <div v-if="mensaje" :class="['alerta', mensajeTipo]">{{ mensaje }}</div>

    <div class="filter-tabs">
      <button :class="['filter-tab', { active: vistaActiva === 'pendientes' }]" @click="vistaActiva = 'pendientes'">Pendientes generales</button>
      <button v-if="!esFiltroCerrado('futbol')" :class="['filter-tab', { active: vistaActiva === 'futbol' }]" @click="vistaActiva = 'futbol'">Filtro Fútbol <span>{{ candidatosFutbol.length }}/40</span></button>
      <button v-if="!esFiltroCerrado('basquetbol')" :class="['filter-tab', { active: vistaActiva === 'basquetbol' }]" @click="vistaActiva = 'basquetbol'">Filtro Basquetbol <span>{{ candidatosBasquetbol.length }}/40</span></button>
      <button :class="['filter-tab', { active: vistaActiva === 'sinClub' }]" @click="vistaActiva = 'sinClub'">Alumnos sin club <span>{{ alumnosSinClub.length }}</span></button>
    </div>

    <div v-if="esVistaFiltro" class="filter-summary">
      <div><strong>{{ vistaActiva === 'futbol' ? 'Fútbol' : 'Basquetbol' }}</strong><small>{{ ocupadosFiltroActual }} de 40 lugares asignados</small></div>
      <div class="filter-progress"><span :style="{ width: Math.min(100, ocupadosFiltroActual / 40 * 100) + '%' }"></span></div>
      <button class="btn-finalizar" :disabled="loading" @click="finalizarFiltro">Finalizar filtro y reasignar restantes</button>
    </div>

    <!-- Estado vacío -->
    <div v-if="!listaVisible.length && !loading" class="empty-state">
      <svg width="48" height="48" viewBox="0 0 24 24" fill="#cbd5e1">
        <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/>
      </svg>
      <p>{{ mensajeVacio }}</p>
    </div>

    <!-- Spinner -->
    <div v-if="loading" class="loading-overlay">
      <div class="spinner"></div>
      <p>{{ loadingMsg }}</p>
    </div>

    <!-- Tabla temporal -->
    <div v-if="listaVisible.length" class="table-card">
      <div class="table-header-info">
        <span class="badge-count">{{ listaVisible.length }} alumno(s)</span>
        <button v-if="vistaActiva === 'pendientes'" class="btn-limpiar" @click="limpiarTabla">Limpiar pendientes</button>
      </div>
      <div class="table-scroll">
        <table class="table">
          <thead>
            <tr>
              <th>#</th>
              <th>Registro</th>
              <th>Nombre completo</th>
              <th>No. Control</th>
              <th>Teléfono</th>
              <th>Carrera</th>
              <th>Semestre</th>
              <th>Sexo</th>
              <th>Estado</th>
              <th>Opciones de club</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="(u, idx) in listaVisible" :key="u.numeroControl || idx" :class="{ 'row-asignado': u.estado === 'ASIGNADO', 'row-error': u.estado === 'ERROR' }">
              <td class="td-num">{{ idx + 1 }}</td>
              <td class="td-control">{{ u.marcaTemporal || '—' }}</td>
              <td class="td-nombre">{{ nombreCompleto(u) }}</td>
              <td class="td-control">{{ u.numeroControl || '—' }}</td>
              <td class="td-telefono">{{ u.telefono || '—' }}</td>
              <td class="td-carrera">
                <span v-if="u.carrera_id">{{ u.carreraNombre }}</span>
                <span v-else class="text-warn">⚠ Sin mapear</span>
              </td>
              <td class="td-semestre">{{ u.semestre_id || '—' }}</td>
              <td>{{ u.sexo || '—' }}</td>
              <td class="td-estado">
                <span :class="['badge-estado', getBadgeClass(u.estado)]">
                  {{ u.estado === 'ASIGNADO' && u.clubAsignado ? `ASIGNADO: ${u.clubAsignado}` : (u.estado || 'PENDIENTE') }}
                </span>
                <small v-if="u.estado === 'ERROR' && u.errorMsg" class="error-detail">{{ u.errorMsg }}</small>
              </td>
              <td class="td-opciones">
                <div class="opciones-list">
                  <span
                    v-for="(opt, oIdx) in u.opciones.slice(0,4)"
                    :key="oIdx"
                    class="badge-opcion"
                    :class="{ 'opcion-otro': oIdx === 3 }"
                  >
                    {{ oIdx + 1 }}. {{ opt }}
                  </span>
                  <span v-if="!u.opciones.length" class="text-muted">—</span>
                </div>
              </td>
              <td class="td-acciones">
                <div v-if="esVistaFiltro" class="acciones-botones">
                  <button class="btn-quedo" :disabled="u.guardando || ocupadosFiltroActual >= 40" @click="aprobarEnFiltro(u)">Quedó</button>
                </div>
                <div v-else-if="vistaActiva === 'sinClub'" class="acciones-botones mover-sin-club">
                  <button
                    v-if="alumnoMoviendo !== u.numeroControl"
                    class="btn-asignar"
                    :disabled="u.guardando || !clubsAlternativos(u).length"
                    @click="abrirMoverClub(u)"
                  >Mover a un club</button>
                  <template v-else>
                    <select v-model="clubDestino[u.numeroControl]" class="select-club">
                      <option value="">Selecciona un club</option>
                      <option v-for="club in clubsAlternativos(u)" :key="club.id" :value="club.id">
                        {{ club.nombre }} ({{ lugaresDisponibles(club) }} lugares)
                      </option>
                    </select>
                    <button class="btn-quedo" :disabled="!clubDestino[u.numeroControl] || u.guardando" @click="moverAlumnoSinClub(u)">Confirmar</button>
                    <button class="btn-cancelar" :disabled="u.guardando" @click="cerrarMoverClub">Cancelar</button>
                  </template>
                  <small v-if="!clubsAlternativos(u).length" class="text-warn">No hay clubes alternativos con cupo.</small>
                </div>
                <div v-else-if="vistaActiva === 'pendientes' && (u.estado === 'PENDIENTE' || u.estado === 'ERROR')" class="acciones-botones">
                  <button
                    v-for="(opt, oIdx) in u.opcionesClub.slice(0,3)"
                    :key="oIdx"
                    class="btn-asignar"
                    :disabled="u.guardando"
                    @click="asignarAlumno(u, indiceAlumno(u), opt)"
                    :title="opt.nombre"
                  >
                    {{ oIdx + 1 }}. {{ opt.nombre }}
                  </button>
                  <span v-if="!u.opcionesClub.length" class="text-warn">Sin clubs válidos</span>
                  <button class="btn-eliminar" @click="eliminarFila(indiceAlumno(u))" :disabled="u.guardando">Eliminar</button>
                </div>
                <div v-else-if="u.estado === 'ASIGNADO'" class="acciones-asignado">
                  <span class="check-ok">✓ Guardado en BD</span>
                  <button class="btn-eliminar-sm" @click="eliminarFila(idx)">✕</button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>
</template>

<script>
import { BACKEND } from '../services/backend';

export default {
  name: 'AlumnosSR',
  props: {
    clubs: { type: Array, default: () => [] },
    carreras: { type: Array, default: () => [] },
    alumnos: { type: Array, default: () => [] },
  },
  data() {
    return {
      unregistered: [],
      carrerasMap: [],   // [{ id, nombre }] cargado desde API
      loading: false,
      loadingMsg: '',
      mensaje: '',
      mensajeTipo: 'info',
      vistaActiva: 'pendientes',
      asignacionesSesion: {},
      textoBusqueda: '',
      busquedaAplicada: '',
      filtrosCerrados: [],
      alumnoMoviendo: '',
      clubDestino: {},
    };
  },
  async mounted() {
    if (typeof localStorage !== 'undefined') {
      try { this.unregistered = JSON.parse(localStorage.getItem('club_import_candidates') || '[]'); } catch (_) { this.unregistered = []; }
    }
    await Promise.all([this.cargarCarreras(), this.cargarFiltrosCerrados()]);
    this.remapearGuardados();
    const pendientesLocales = this.unregistered.filter(alumno =>
      ['PENDIENTE', 'ERROR', 'SIN_CLUB'].includes(alumno.estado) &&
      !this.esClubFiltro(this.opcionActual(alumno)?.nombre)
    );
    if (pendientesLocales.length) {
      this.loading = true;
      this.loadingMsg = 'Procesando asignaciones pendientes por orden de registro...';
      await this.asignarAutomaticamente(pendientesLocales);
      this.loading = false;
    }
  },
  watch: {
    unregistered: {
      deep: true,
      handler(value) {
        if (typeof localStorage !== 'undefined') localStorage.setItem('club_import_candidates', JSON.stringify(value));
      }
    }
  },
  computed: {
    candidatosFutbol() { return this.esFiltroCerrado('futbol') ? [] : this.ordenCronologico(this.unregistered.filter(u => this.esCandidatoActual(u, 'futbol'))); },
    candidatosBasquetbol() { return this.esFiltroCerrado('basquetbol') ? [] : this.ordenCronologico(this.unregistered.filter(u => this.esCandidatoActual(u, 'basquetbol'))); },
    alumnosSinClub() { return this.ordenCronologico(this.unregistered.filter(u => u.estado === 'SIN_CLUB')); },
    esVistaFiltro() { return this.vistaActiva === 'futbol' || this.vistaActiva === 'basquetbol'; },
    listaVisible() {
      if (this.busquedaAplicada) {
        const termino = this.normalizar(this.busquedaAplicada);
        return this.ordenCronologico(this.unregistered.filter(u => this.normalizar(`${this.nombreCompleto(u)} ${u.numeroControl || ''}`).includes(termino)));
      }
      if (this.vistaActiva === 'futbol') return this.candidatosFutbol;
      if (this.vistaActiva === 'basquetbol') return this.candidatosBasquetbol;
      if (this.vistaActiva === 'sinClub') return this.alumnosSinClub;
      return this.ordenCronologico(this.unregistered.filter(u => ['PENDIENTE', 'ERROR'].includes(u.estado) && !this.esClubFiltro(this.opcionActual(u)?.nombre)));
    },
    clubFiltroActual() {
      const tipo = this.vistaActiva;
      return this.clubs.find(c => this.tipoFiltro(c.nombre) === tipo) || null;
    },
    ocupadosFiltroActual() { return this.clubFiltroActual ? this.ocupacionClub(this.clubFiltroActual) : 0; },
    mensajeVacio() {
      if (this.vistaActiva === 'sinClub') return 'No hay alumnos sin club.';
      if (this.esVistaFiltro) return 'No hay jugadores pendientes en este filtro.';
      return 'No hay alumnos pendientes. Importa un CSV para comenzar.';
    }
  },
  methods: {
    clubesDescartados(alumno) {
      const ids = new Set((alumno.opcionesClub || []).map(opcion => Number(opcion.id)).filter(Boolean));
      const nombres = new Set((alumno.opciones || []).map(opcion => this.normalizar(opcion)));
      return { ids, nombres };
    },
    clubsAlternativos(alumno) {
      const descartados = this.clubesDescartados(alumno);
      return (this.clubs || []).filter(club => {
        if (descartados.ids.has(Number(club.id))) return false;
        const nombre = this.normalizar(club.nombre);
        if ([...descartados.nombres].some(opcion => opcion.includes(nombre) || nombre.includes(opcion.replace(/^club de /, '')))) return false;
        if (this.esClubFiltro(club.nombre) && this.esFiltroCerrado(this.tipoFiltro(club.nombre))) return false;
        const limite = this.esClubFiltro(club.nombre) ? 40 : Number(club.cupo || club.cupo_limite || 0);
        return limite <= 0 || this.ocupacionClub(club) < limite;
      }).sort((a, b) => String(a.nombre).localeCompare(String(b.nombre), 'es'));
    },
    lugaresDisponibles(club) {
      const limite = this.esClubFiltro(club.nombre) ? 40 : Number(club.cupo || club.cupo_limite || 0);
      return limite > 0 ? Math.max(0, limite - this.ocupacionClub(club)) : 'sin límite';
    },
    abrirMoverClub(alumno) {
      this.alumnoMoviendo = alumno.numeroControl;
      this.clubDestino[alumno.numeroControl] = '';
    },
    cerrarMoverClub() { this.alumnoMoviendo = ''; },
    async moverAlumnoSinClub(alumno) {
      const club = this.clubsAlternativos(alumno).find(item => Number(item.id) === Number(this.clubDestino[alumno.numeroControl]));
      if (!club) return this.mostrarMensaje('Selecciona un club disponible.', 'error');
      const asignado = await this.asignarAlumno(alumno, this.indiceAlumno(alumno), club);
      if (asignado) {
        this.alumnoMoviendo = '';
        delete this.clubDestino[alumno.numeroControl];
      }
    },
    esFiltroCerrado(tipo) { return this.filtrosCerrados.includes(tipo); },
    async cargarFiltrosCerrados() {
      try {
        const res = await fetch(`${BACKEND}/filtros`, { headers: { Authorization: `Bearer ${sessionStorage.getItem('auth_token') || ''}` } });
        const json = await res.json();
        if (res.ok) this.filtrosCerrados = Array.isArray(json.data) ? json.data.map(item => item.tipo) : [];
      } catch (_) { this.filtrosCerrados = []; }
    },
    async guardarFiltroCerrado(tipo) {
      const res = await fetch(`${BACKEND}/filtros`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${sessionStorage.getItem('auth_token') || ''}` },
        body: JSON.stringify({ tipo }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.statusMessage || json.message || 'No se pudo cerrar el filtro');
      if (!this.filtrosCerrados.includes(tipo)) this.filtrosCerrados.push(tipo);
    },
    buscarAlumno() { this.busquedaAplicada = this.textoBusqueda.trim(); },
    limpiarBusqueda() { this.textoBusqueda = ''; this.busquedaAplicada = ''; },
    corregirMojibake(valor) {
      const texto = String(valor || '');
      if (!/[ÃÂ]/.test(texto) || typeof TextDecoder === 'undefined') return texto;
      try { return new TextDecoder('utf-8').decode(Uint8Array.from([...texto].map(ch => ch.charCodeAt(0) & 255))); }
      catch (_) { return texto; }
    },
    normalizar(valor) { return this.corregirMojibake(valor).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, ' ').trim(); },
    nombreCompleto(alumno) { return `${alumno.apellidoP || ''} ${alumno.apellidoM || ''} ${alumno.nombre || ''}`.replace(/\s+/g, ' ').trim(); },
    ordenCronologico(lista) {
      return [...lista].sort((a, b) => {
        const fechaA = Number.isFinite(Number(a.registroOrden)) ? Number(a.registroOrden) : Number.MAX_SAFE_INTEGER;
        const fechaB = Number.isFinite(Number(b.registroOrden)) ? Number(b.registroOrden) : Number.MAX_SAFE_INTEGER;
        return fechaA - fechaB || Number(a.filaOrigen || 0) - Number(b.filaOrigen || 0);
      });
    },
    tipoFiltro(nombre) {
      const value = this.normalizar(nombre);
      if (value.includes('futbol')) return 'futbol';
      if (value.includes('basquet') || value.includes('basket')) return 'basquetbol';
      return '';
    },
    esClubFiltro(nombre) { return Boolean(this.tipoFiltro(nombre)); },
    opcionActual(alumno) { return alumno.opcionesClub?.[Number(alumno.opcionActualIndex || 0)] || null; },
    esCandidatoActual(alumno, tipo) { return ['PENDIENTE', 'ERROR'].includes(alumno.estado) && this.tipoFiltro(this.opcionActual(alumno)?.nombre) === tipo; },
    indiceAlumno(alumno) { return this.unregistered.indexOf(alumno); },
    ocupacionClub(club) {
      const registrados = (this.alumnos || []).filter(a => Number(a.clubId ?? a.club_id ?? a.id_club) === Number(club.id) || this.normalizar(a.club) === this.normalizar(club.nombre)).length;
      // La asignación optimista ya representa un total, no una cantidad que deba
      // sumarse otra vez cuando el padre recarga los alumnos desde el servidor.
      return Math.max(
        Number(club.ocupados ?? club.cupo_ocupado ?? 0),
        registrados,
        Number(this.asignacionesSesion[club.id] || 0),
      );
    },
    // ─── Carreras ──────────────────────────────────────────
    async cargarCarreras() {
      try {
        const res = await fetch(`${BACKEND}/carreras`, { headers: { Authorization: `Bearer ${sessionStorage.getItem('auth_token') || ''}` } });
        const json = await res.json();
        // Acepta { data: [...] } o arreglo directo
        this.carrerasMap = Array.isArray(json) ? json : (json.data || []);
       } catch (e) {
        // Silencioso
      }
    },

    resolverCarreraId(nombreCarreraCSV) {
      if (!nombreCarreraCSV) return null;
      const buscada = this.normalizar(nombreCarreraCSV);
      const match = this.carrerasMap.find(c => {
        const nombre = this.normalizar(c.nombre);
        const abreviatura = this.normalizar(c.abreviatura);
        return nombre === buscada || abreviatura === buscada ||
          (buscada.length > 8 && (nombre.includes(buscada) || buscada.includes(nombre)));
      });
      return match ? match.id : null;
    },

    resolverCarreraNombre(nombreCarreraCSV) {
      if (!nombreCarreraCSV) return nombreCarreraCSV;
      const id = this.resolverCarreraId(nombreCarreraCSV);
      const match = this.carrerasMap.find(c => Number(c.id) === Number(id));
      return match ? match.nombre : `⚠ ${nombreCarreraCSV}`;
    },

    // ─── Resolver opciones de club ──────────────────────────
    resolverOpcionesClub(opcionesTexto) {
      // Busca clubs por nombre usando el prop `clubs` del padre
      if (!this.clubs || !this.clubs.length) return [];
      const norm = (s) => {
        let value = this.normalizar(s).replace(/\b(club|de|del|los|las|el|la)\b/g, ' ').replace(/\s+/g, ' ').trim();
        if (/^(futbol|football)$/.test(value)) value = 'futbol';
        if (/^(basquetbol+l?|basketball|basketbol)$/.test(value)) value = 'basquetbol';
        if (/^(kick boxing|kickboxing|kit boxing|kitboxing)$/.test(value)) value = 'kickboxing';
        return value;
      };
      return opcionesTexto
        .map(txt => {
          const buscado = norm(txt);
          const candidatos = this.clubs
            .map(c => ({ club: c, nombre: norm(c.nombre) }))
            .filter(c => c.nombre === buscado || (buscado.length > 4 && (c.nombre.includes(buscado) || buscado.includes(c.nombre))))
            .sort((a, b) => {
              const exactoA = a.nombre === buscado ? 1 : 0;
              const exactoB = b.nombre === buscado ? 1 : 0;
              return exactoB - exactoA || b.nombre.length - a.nombre.length;
            });
          const found = candidatos[0]?.club;
          return found ? { id: found.id, nombre: found.nombre } : null;
        })
        .filter(Boolean);
    },

    // ─── CSV ────────────────────────────────────────────────
    triggerCSV() {
      this.$refs.csvInput.click();
    },

    handleCSVUpload(event) {
      const file = event.target.files[0];
      if (!file) return;
      event.target.value = '';

      this.loading = true;
      this.loadingMsg = 'Leyendo archivo CSV...';

      const reader = new FileReader();
      reader.onload = async (e) => {
        try {
          let text;
          try { text = new TextDecoder('utf-8', { fatal: true }).decode(e.target.result); }
          catch (_) { text = new TextDecoder('windows-1252').decode(e.target.result); }
          const parsed = this.parseCSV(text);
          // Los ya guardados en BD se omiten. Los pendientes locales se actualizan
          // con la lectura corregida para reparar acentos y mapeos antiguos.
          const controlesBD = new Set((this.alumnos || []).map(u => String(u.control || u.numeroControl || '').trim()).filter(Boolean));
          const temporales = new Map(this.unregistered.map((u, index) => [String(u.numeroControl || '').trim(), index]));
          const nuevosRegistros = [];
          const vistosArchivo = new Set();
          let nuevos = 0; let actualizados = 0; let duplicadosBD = 0; let duplicadosArchivo = 0;
          for (const row of this.ordenCronologico(parsed)) {
            if (vistosArchivo.has(row.numeroControl)) { duplicadosArchivo++; continue; }
            vistosArchivo.add(row.numeroControl);
            if (controlesBD.has(row.numeroControl)) {
              duplicadosBD++;
              const index = temporales.get(row.numeroControl);
              if (index !== undefined) {
                const registrado = (this.alumnos || []).find(item => String(item.control || item.numeroControl || '').trim() === row.numeroControl);
                this.unregistered[index] = { ...row, estado: 'ASIGNADO', clubAsignado: registrado?.club || registrado?.clubNombre || '', errorMsg: '' };
              }
            } else if (temporales.has(row.numeroControl)) {
              const index = temporales.get(row.numeroControl);
              this.unregistered[index] = row;
              nuevosRegistros.push(row);
              actualizados++;
            } else {
              this.unregistered.push(row);
              nuevosRegistros.push(row);
              temporales.set(row.numeroControl, this.unregistered.length - 1);
              nuevos++;
            }
          }
          this.unregistered = this.ordenCronologico(this.unregistered);
          this.loadingMsg = 'Asignando por orden de registro a los clubes sin filtro...';
          const resumen = await this.asignarAutomaticamente(nuevosRegistros);
          this.mostrarMensaje(
            `CSV procesado en orden de registro: ${nuevos} nuevo(s), ${actualizados} pendiente(s) actualizado(s), ${duplicadosBD} ya registrado(s), ${duplicadosArchivo} respuesta(s) posterior(es) omitida(s), ${resumen.asignados} asignado(s), ${resumen.filtros} enviado(s) a filtro, ${resumen.sinClub} sin club y ${resumen.errores} con datos por revisar.`,
            resumen.errores ? 'info' : 'success'
          );
        } catch (err) {
          this.mostrarMensaje('Error al parsear el CSV: ' + err.message, 'error');
        } finally {
          this.loading = false;
        }
      };
      reader.onerror = () => {
        this.mostrarMensaje('No se pudo leer el archivo.', 'error');
        this.loading = false;
      };
      reader.readAsArrayBuffer(file);
    },

    remapearGuardados() {
      this.unregistered = this.unregistered.filter(alumno => {
        const control = String(alumno.numeroControl || '').replace(/\D/g, '');
        const fechaValida = Number(this.parseMarcaTemporal(alumno.marcaTemporal)) < Number.MAX_SAFE_INTEGER;
        return /^\d{8}$/.test(control) && Boolean(alumno.nombre || alumno.apellidoP || alumno.apellidoM) && fechaValida;
      }).map(alumno => {
        const datos = alumno.datosFormulario || {};
        const entradaCarrera = Object.entries(datos).find(([clave]) => /carrera/.test(this.normalizar(clave)));
        const entradaNombre = Object.entries(datos).find(([clave]) => /nombre completo|nombre.*apellido|apellido.*nombre/.test(this.normalizar(clave)));
        const carreraTexto = entradaCarrera?.[1] || String(alumno.carreraNombre || '').replace(/^⚠\s*/, '');
        const opciones = (alumno.opciones || []).map(value => this.corregirMojibake(value));
        const registrado = (this.alumnos || []).find(item => String(item.control || item.numeroControl || '').trim() === String(alumno.numeroControl || '').trim());
        const nombreCrudo = String(entradaNombre?.[1] || '').replace(/([\p{Ll}\p{M}])([\p{Lu}])/gu, '$1 $2').trim();
        const partesNombre = nombreCrudo.split(/\s+/).filter(Boolean);
        const apellidosPrimero = /iniciando por apellidos|apellidos primero/.test(this.normalizar(entradaNombre?.[0] || ''));
        const nombreCorregido = apellidosPrimero && partesNombre.length >= 2
          ? {
              apellidoP: partesNombre[0],
              apellidoM: partesNombre.length >= 3 ? partesNombre[1] : '',
              nombre: partesNombre.length >= 3 ? partesNombre.slice(2).join(' ') : partesNombre[1],
            }
          : null;
        return {
          ...alumno,
          ...(nombreCorregido || {}),
          numeroControl: String(alumno.numeroControl || '').replace(/\D/g, ''),
          telefono: String(alumno.telefono || '').replace(/\D/g, ''),
          carrera_id: this.resolverCarreraId(carreraTexto),
          carreraNombre: this.resolverCarreraNombre(carreraTexto),
          opciones,
          opcionesClub: this.resolverOpcionesClub(opciones),
          marcaTemporal: this.corregirMojibake(alumno.marcaTemporal || ''),
          registroOrden: this.parseMarcaTemporal(alumno.marcaTemporal),
          estado: registrado ? 'ASIGNADO' : alumno.estado,
          clubAsignado: registrado ? (registrado.club || registrado.clubNombre || alumno.clubAsignado) : alumno.clubAsignado,
          errorMsg: registrado ? '' : alumno.errorMsg,
        };
      });
      this.unregistered = this.ordenCronologico(this.unregistered);
    },

    parseCSV(text) {
      const rows = this.splitCSV(text).filter(row => row.some(value => String(value).trim()));
      if (rows.length < 2) throw new Error('El CSV no tiene datos.');

      const headers = rows[0];
      const headerNormalizado = headers.map(h => this.normalizar(h));
      const find = (...pruebas) => headerNormalizado.findIndex(h => pruebas.every(p => p instanceof RegExp ? p.test(h) : h.includes(p)));

      const iFecha    = headerNormalizado.findIndex(h => /marca temporal|timestamp|fecha.*registro/.test(h));
      const iNombre   = headerNormalizado.findIndex(h => /nombre completo|nombre.*apellido|apellido.*nombre/.test(h));
      const iTel      = headerNormalizado.findIndex(h => /telef|celular/.test(h));
      const iControl  = headerNormalizado.findIndex(h => /numero.*control|control|matricula/.test(h));
      const iSemestre = headerNormalizado.findIndex(h => /semestre/.test(h));
      const iCarrera  = headerNormalizado.findIndex(h => /carrera/.test(h));
      const iSexo     = headerNormalizado.findIndex(h => /sexo|genero/.test(h));
      const iOp1      = find(/primera|1a|primer/, /opcion/, /club/);
      const iOp2      = find(/segunda|2a/, /opcion/, /club/);
      const iOp3      = find(/tercera|3a/, /opcion/, /club/);
      const iOtro     = headerNormalizado.findIndex(h => /otro club|nombre.*otro.*club/.test(h));

      const requeridos = [[iNombre, 'nombre completo'], [iControl, 'número de control'], [iTel, 'teléfono'], [iSemestre, 'semestre'], [iCarrera, 'carrera'], [iOp1, 'primera opción de club']];
      const faltantes = requeridos.filter(([idx]) => idx < 0).map(([, nombre]) => nombre);
      if (faltantes.length) throw new Error(`No se detectaron estas columnas: ${faltantes.join(', ')}.`);
      const apellidosPrimero = /iniciando por apellidos|apellidos primero/.test(headerNormalizado[iNombre] || '');

      const results = [];

      for (let i = 1; i < rows.length; i++) {
        const cols = rows[i];
        if (cols.every(c => !c.trim())) continue;

        const get = (idx) => (idx >= 0 && cols[idx] ? cols[idx].trim() : '');

        // Algunos formularios exportan el nombre sin espacios (ej. CruzPazCitlaliEvelyn).
        // Las mayúsculas permiten recuperar las palabras antes de validar y guardar.
        const nombreSeparado = get(iNombre).replace(/([\p{Ll}\p{M}])([\p{Lu}])/gu, '$1 $2');
        const partes = nombreSeparado.split(/\s+/).filter(Boolean);
        let nombre; let apellidoP; let apellidoM;
        if (apellidosPrimero && partes.length >= 2) {
          apellidoP = partes[0];
          apellidoM = partes.length >= 3 ? partes[1] : '';
          nombre = partes.length >= 3 ? partes.slice(2).join(' ') : partes[1];
        } else {
          nombre = partes[0] || ''; apellidoP = partes[1] || ''; apellidoM = partes.slice(2).join(' ') || '';
        }

        const carreraTexto = get(iCarrera);
        const carrera_id   = this.resolverCarreraId(carreraTexto);
        const carreraNombre = this.resolverCarreraNombre(carreraTexto);

        const opcionesTexto = [get(iOp1), get(iOp2), get(iOp3), get(iOtro)].filter(Boolean);
        const opcionesClub  = this.resolverOpcionesClub(opcionesTexto);
        const marcaTemporal = get(iFecha);
        const datosFormulario = {};
        headers.forEach((header, index) => {
          const etiqueta = String(header || '').trim();
          const valor = get(index);
          if (etiqueta && valor) datosFormulario[etiqueta] = valor;
        });

        if (!get(iControl)) continue;

        results.push({
          nombre,
          apellidoP,
          apellidoM,
          numeroControl : get(iControl).replace(/\D/g, ''),
          telefono      : get(iTel).replace(/\D/g, ''),
          carrera_id,
          carreraNombre,
          semestre_id   : get(iSemestre) ? parseInt(get(iSemestre)) : null,
          sexo          : get(iSexo),
          marcaTemporal,
          registroOrden : this.parseMarcaTemporal(marcaTemporal),
          filaOrigen    : i,
          datosFormulario,
          opciones      : opcionesTexto,   // texto original para mostrar
          opcionesClub,                    // [{ id, nombre }] mapeados
          estado        : 'PENDIENTE',
          guardando     : false,
          errorMsg      : '',
          opcionActualIndex: 0,
        });
      }

      return results;
    },

    splitCSV(text) {
      const rows = [];
      let row = [];
      let cur = '';
      let inQ = false;
      const source = String(text || '').replace(/^\uFEFF/, '');
      for (let i = 0; i < source.length; i++) {
        const ch = source[i];
        if (ch === '"') {
          if (inQ && source[i + 1] === '"') { cur += '"'; i++; }
          else { inQ = !inQ; }
        } else if (ch === ',' && !inQ) {
          row.push(cur); cur = '';
        } else if ((ch === '\n' || ch === '\r') && !inQ) {
          if (ch === '\r' && source[i + 1] === '\n') i++;
          row.push(cur); rows.push(row); row = []; cur = '';
        } else {
          cur += ch;
        }
      }
      if (cur.length || row.length) { row.push(cur); rows.push(row); }
      if (inQ) throw new Error('El archivo tiene una celda con comillas sin cerrar.');
      return rows;
    },

    parseMarcaTemporal(valor) {
      const match = String(valor || '').trim().match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})(?:\s+(\d{1,2}):(\d{2})(?::(\d{2}))?)?/);
      if (!match) return Number.MAX_SAFE_INTEGER;
      return new Date(Number(match[3]), Number(match[2]) - 1, Number(match[1]), Number(match[4] || 0), Number(match[5] || 0), Number(match[6] || 0)).getTime();
    },

    async asignarAutomaticamente(registros) {
      const resumen = { asignados: 0, filtros: 0, sinClub: 0, errores: 0 };
      for (const alumno of this.ordenCronologico(registros)) {
        let resuelto = false;
        for (let i = 0; i < (alumno.opcionesClub || []).length; i++) {
          const opcion = alumno.opcionesClub[i];
          const club = this.clubs.find(c => Number(c.id) === Number(opcion.id));
          if (!club) continue;
          alumno.opcionActualIndex = i;
          if (this.esClubFiltro(club.nombre)) {
            if (this.esFiltroCerrado(this.tipoFiltro(club.nombre))) continue;
            if (this.ocupacionClub(club) >= 40) continue;
            alumno.estado = 'PENDIENTE'; resumen.filtros++; resuelto = true; break;
          }
          const limite = Number(club.cupo || club.cupo_limite || 0);
          if (limite > 0 && this.ocupacionClub(club) >= limite) continue;
          if (await this.asignarAlumno(alumno, this.indiceAlumno(alumno), club, { silencioso: true, recargar: false })) {
            resumen.asignados++; resuelto = true; break;
          }
          resumen.errores++; resuelto = true; break;
        }
        if (!resuelto) { alumno.estado = 'SIN_CLUB'; resumen.sinClub++; }
      }
      if (resumen.asignados) this.$emit('request-reload-alumnos');
      return resumen;
    },

    // ─── Asignar alumno a club (POST a alumnos.php) ─────────
    async asignarAlumno(alumno, idx, club, opciones = {}) {
      if (idx < 0 || !club) return false;
      const limite = this.esClubFiltro(club.nombre) ? 40 : Number(club.cupo || club.cupo_limite || 0);
      if (limite > 0 && this.ocupacionClub(club) >= limite) {
        if (!opciones.silencioso) this.mostrarMensaje(`El club "${club.nombre}" ya no tiene cupo.`, 'error');
        return false;
      }
      alumno.guardando = true;
      alumno.errorMsg  = '';

      const payload = {
        nombre       : alumno.nombre,
        apellidoP    : alumno.apellidoP,
        apellidoM    : alumno.apellidoM,
        numeroControl: String(alumno.numeroControl || '').replace(/\D/g, ''),
        telefono     : String(alumno.telefono || '').replace(/\D/g, ''),
        carrera_id   : alumno.carrera_id,
        semestre_id  : alumno.semestre_id,
        id_club      : club.id,
        opcion_1     : alumno.opciones?.[0] || '',
        opcion_2     : alumno.opciones?.[1] || '',
        opcion_3     : alumno.opciones?.[2] || '',
      };

      try {
        const res = await fetch(`${BACKEND}/alumnos`, {
          method : 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${sessionStorage.getItem('auth_token') || ''}` },
          body   : JSON.stringify(payload),
        });

        const json = await res.json();

        if (res.ok) {
          // Marcar como asignado en la tabla temporal
          this.unregistered[idx] = {
            ...alumno,
            estado   : 'ASIGNADO',
            guardando: false,
            clubAsignado: club.nombre,
          };
          this.asignacionesSesion[club.id] = this.ocupacionClub(club) + 1;
          this.$emit('alumno-registrado', json.data); // notificar al padre
          if (opciones.recargar !== false) this.$emit('request-reload-alumnos');
          if (!opciones.silencioso) this.mostrarMensaje(`✓ ${this.nombreCompleto(alumno)} asignado a "${club.nombre}"`, 'success');
          return true;
        } else {
          alumno.estado    = 'ERROR';
          alumno.guardando = false;
          alumno.errorMsg  = json.statusMessage || json.message || json.error || 'Error desconocido';
          if (!opciones.silencioso) this.mostrarMensaje(`Error: ${alumno.errorMsg}`, 'error');
          return false;
        }
      } catch (e) {
        alumno.estado    = 'ERROR';
        alumno.guardando = false;
        alumno.errorMsg  = 'Sin conexión al servidor';
        if (!opciones.silencioso) this.mostrarMensaje('Sin conexión al servidor.', 'error');
        return false;
      }
    },

    async aprobarEnFiltro(alumno) {
      const club = this.clubFiltroActual;
      if (!club) return this.mostrarMensaje('No se encontró el club del filtro.', 'error');
      if (this.ocupacionClub(club) >= 40) return this.mostrarMensaje('El filtro ya alcanzó los 40 lugares.', 'error');
      await this.asignarAlumno(alumno, this.indiceAlumno(alumno), club);
    },

    async finalizarFiltro() {
      const tipo = this.vistaActiva;
      const clubFinalizado = this.clubFiltroActual;
      if (!clubFinalizado) return;
      if (!confirm(`¿Finalizar el filtro de ${clubFinalizado.nombre}? Los no seleccionados pasarán a su siguiente opción.`)) return;
      this.loading = true;
      this.loadingMsg = 'Reasignando alumnos a sus siguientes opciones...';
      const pendientes = [...this.listaVisible];
      let reasignados = 0; let sinClub = 0; let enviadosAOtroFiltro = 0;
      for (const alumno of pendientes) {
        let asignado = false;
        const inicio = Number(alumno.opcionActualIndex || 0) + 1;
        for (let i = inicio; i < (alumno.opcionesClub || []).length; i++) {
          const opcion = alumno.opcionesClub[i];
          if (Number(opcion.id) === Number(clubFinalizado.id)) continue;
          const club = this.clubs.find(c => Number(c.id) === Number(opcion.id));
          if (!club) continue;
          const siguienteFiltro = this.tipoFiltro(club.nombre);
          if (siguienteFiltro) {
            if (this.esFiltroCerrado(siguienteFiltro)) continue;
            if (this.ocupacionClub(club) >= 40) continue;
            alumno.opcionActualIndex = i;
            alumno.estado = 'PENDIENTE';
            enviadosAOtroFiltro++;
            asignado = true;
            break;
          }
          const limite = Number(club.cupo || club.cupo_limite || 0);
          if (limite > 0 && this.ocupacionClub(club) >= limite) continue;
          alumno.opcionActualIndex = i;
          if (await this.asignarAlumno(alumno, this.indiceAlumno(alumno), club)) {
            reasignados++;
            asignado = true;
            break;
          }
        }
        if (!asignado) { alumno.estado = 'SIN_CLUB'; alumno.guardando = false; sinClub++; }
      }
      try {
        await this.guardarFiltroCerrado(tipo);
      } catch (error) {
        this.loading = false;
        return this.mostrarMensaje(error.message, 'error');
      }
      this.loading = false;
      this.vistaActiva = enviadosAOtroFiltro ? (tipo === 'futbol' ? 'basquetbol' : 'pendientes') : (sinClub ? 'sinClub' : 'pendientes');
      this.mostrarMensaje(`Filtro finalizado: ${reasignados} reasignados, ${enviadosAOtroFiltro} enviados a otro filtro y ${sinClub} sin club.`, 'success');
    },

    // ─── Utilidades ─────────────────────────────────────────
    getBadgeClass(estado) {
      if (estado === 'ASIGNADO') return 'asignado';
      if (estado === 'ERROR')    return 'rechazado';
      return 'pendiente';
    },

    eliminarFila(idx) {
      this.unregistered.splice(idx, 1);
    },

    limpiarTabla() {
      if (confirm('¿Limpiar todos los registros pendientes?')) {
        this.unregistered = [];
      }
    },

    mostrarMensaje(texto, tipo = 'info') {
      this.mensaje     = texto;
      this.mensajeTipo = tipo;
      setTimeout(() => { this.mensaje = ''; }, 5000);
    },
  },
};
</script>

<style scoped>
.alumnos-sr-container { padding: 20px; }
.title { color: #2d3561; font-size: 1.5rem; font-weight: 600; margin-bottom: 20px; text-align: center; }

/* Toolbar */
.toolbar { display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; padding: 14px 16px; background: white; border-radius: 12px; box-shadow: 0 2px 8px rgba(0,0,0,0.06); }
.student-search { display: flex; gap: 8px; margin: 0 0 14px; }
.student-search input { flex: 1; min-width: 180px; padding: 10px 12px; border: 1px solid #cbd5e1; border-radius: 8px; outline: none; }
.student-search input:focus { border-color: #4c38ff; box-shadow: 0 0 0 3px rgba(76,56,255,.12); }
.btn-buscar, .btn-limpiar-busqueda { border: 0; border-radius: 8px; padding: 9px 16px; font-weight: 600; cursor: pointer; }
.btn-buscar { background: #4c38ff; color: #fff; }
.btn-limpiar-busqueda { background: #e2e8f0; color: #334155; }
.toolbar-left { display: flex; gap: 12px; }
.text-hint { font-size: 0.85rem; color: #6c757d; }
.btn-import { display: flex; align-items: center; gap: 8px; padding: 10px 18px; background: #17a2b8; border: none; color: white; border-radius: 8px; font-weight: 500; cursor: pointer; transition: background .2s; }
.btn-import:hover:not(:disabled) { background: #138496; }
.btn-import:disabled { opacity: .5; cursor: not-allowed; }

/* Alertas */
.alerta { padding: 12px 16px; border-radius: 8px; margin-bottom: 14px; font-size: .9rem; font-weight: 500; }
.alerta.success { background: #d4edda; color: #155724; }
.alerta.error   { background: #f8d7da; color: #721c24; }
.alerta.info    { background: #d1ecf1; color: #0c5460; }

/* Empty & loading */
.empty-state { display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 60px 20px; background: white; border-radius: 12px; box-shadow: 0 2px 8px rgba(0,0,0,0.06); }
.empty-state p { margin-top: 16px; color: #6c757d; }
.loading-overlay { display: flex; flex-direction: column; align-items: center; padding: 40px; gap: 12px; }
.spinner { width: 36px; height: 36px; border: 4px solid #e2e8f0; border-top-color: #17a2b8; border-radius: 50%; animation: spin .8s linear infinite; }
@keyframes spin { to { transform: rotate(360deg); } }

/* Tabla */
.table-card { background: white; border-radius: 12px; box-shadow: 0 2px 8px rgba(0,0,0,0.06); overflow: hidden; }
.table-header-info { display: flex; justify-content: space-between; align-items: center; padding: 12px 16px; border-bottom: 1px solid #f0f0f0; }
.badge-count { background: #e9ecef; color: #495057; padding: 4px 12px; border-radius: 20px; font-size: .8rem; font-weight: 600; }
.btn-limpiar { padding: 6px 14px; background: transparent; border: 1px solid #6c757d; color: #6c757d; border-radius: 6px; font-size: .8rem; cursor: pointer; }
.btn-limpiar:hover { background: #6c757d; color: white; }
.table-scroll { overflow-x: auto; }
.table { width: 100%; border-collapse: collapse; font-size: .88rem; }
.table thead { background: #f8f9fa; }
.table th { padding: 12px 10px; text-align: left; font-weight: 600; color: #495057; text-transform: uppercase; font-size: .7rem; letter-spacing: .5px; border-bottom: 2px solid #dee2e6; white-space: nowrap; }
.table td { padding: 12px 10px; border-bottom: 1px solid #f0f0f0; vertical-align: top; }
.table tbody tr:hover { background: #f8f9ff; }
.row-asignado { opacity: .65; }
.row-error td { background: #fff5f5; }
.td-num { color: #adb5bd; font-size: .8rem; width: 32px; }
.td-nombre { font-weight: 500; color: #333; min-width: 160px; }
.td-control, .td-telefono, .td-semestre { color: #555; white-space: nowrap; }

/* Badges estado */
.badge-estado { display: inline-block; padding: 4px 10px; border-radius: 20px; font-size: .72rem; font-weight: 600; white-space: nowrap; }
.asignado { background: #d4edda; color: #155724; }
.rechazado { background: #f8d7da; color: #721c24; }
.pendiente { background: #fff3cd; color: #856404; }
.error-detail { display: block; max-width: 190px; margin-top: 5px; color: #991b1b; line-height: 1.25; }

/* Opciones */
.opciones-list { display: flex; flex-direction: column; gap: 3px; min-width: 160px; }
.badge-opcion { display: inline-block; padding: 3px 8px; border-radius: 5px; font-size: .72rem; font-weight: 500; background: #6c757d; color: white; }
.opcion-otro { background: #868e96; font-style: italic; }
.text-muted { color: #adb5bd; font-size: .82rem; }
.text-warn  { color: #e67e22; font-size: .82rem; font-weight: 500; }

/* Acciones */
.acciones-botones { display: flex; flex-wrap: wrap; gap: 5px; min-width: 200px; }
.btn-asignar { padding: 5px 10px; background: #28a745; border: none; color: white; border-radius: 6px; font-size: .75rem; font-weight: 500; cursor: pointer; white-space: nowrap; max-width: 140px; overflow: hidden; text-overflow: ellipsis; transition: background .15s; }
.btn-asignar:hover:not(:disabled) { background: #218838; }
.btn-asignar:disabled { opacity: .5; cursor: not-allowed; }
.btn-eliminar { padding: 5px 10px; background: transparent; border: 1px solid #dc3545; color: #dc3545; border-radius: 6px; font-size: .75rem; font-weight: 500; cursor: pointer; transition: all .15s; }
.btn-eliminar:hover:not(:disabled) { background: #dc3545; color: white; }
.acciones-asignado { display: flex; align-items: center; gap: 8px; }
.check-ok { color: #28a745; font-weight: 600; font-size: .82rem; }
.btn-eliminar-sm { background: transparent; border: none; color: #adb5bd; cursor: pointer; font-size: 1rem; padding: 2px 6px; border-radius: 4px; }
.btn-eliminar-sm:hover { color: #dc3545; }
.filter-tabs { display: flex; gap: 8px; flex-wrap: wrap; margin-bottom: 14px; }
.filter-tab { border: 1px solid #cbd5e1; background: #fff; color: #475569; padding: 9px 14px; border-radius: 9px; font-weight: 600; cursor: pointer; }
.filter-tab span { margin-left: 5px; padding: 2px 7px; border-radius: 12px; background: #e2e8f0; font-size: .75rem; }
.filter-tab.active { background: #4c38ff; border-color: #4c38ff; color: #fff; }
.filter-tab.active span { background: rgba(255,255,255,.2); }
.filter-summary { display: grid; grid-template-columns: minmax(150px, auto) minmax(180px, 1fr) auto; gap: 16px; align-items: center; padding: 14px 16px; margin-bottom: 14px; background: #fff; border-radius: 12px; box-shadow: 0 2px 8px rgba(0,0,0,.06); }
.filter-summary small { display: block; margin-top: 3px; color: #64748b; }
.filter-progress { height: 10px; background: #e2e8f0; border-radius: 10px; overflow: hidden; }
.filter-progress span { display: block; height: 100%; background: #198754; transition: width .3s ease; }
.btn-finalizar { border: 0; border-radius: 8px; padding: 10px 14px; background: #0f172a; color: #fff; font-weight: 600; cursor: pointer; }
.btn-finalizar:disabled { opacity: .45; cursor: not-allowed; }
.btn-quedo { border: 0; border-radius: 7px; padding: 7px 16px; background: #198754; color: #fff; font-weight: 700; cursor: pointer; }
.btn-quedo:disabled { opacity: .45; cursor: not-allowed; }
.mover-sin-club { display: flex; min-width: 260px; flex-direction: column; gap: 7px; }
.mover-sin-club select { width: 100%; padding: 7px 9px; border: 1px solid #cbd5e1; border-radius: 7px; background: #fff; color: #334155; }
.btn-cancelar { padding: 6px 12px; border: 1px solid #94a3b8; border-radius: 7px; background: #fff; color: #475569; cursor: pointer; }
.btn-cancelar:hover:not(:disabled) { background: #f1f5f9; }
@media (max-width: 900px) {
  .alumnos-sr-container { padding: 0; }
  .toolbar { flex-wrap: wrap; gap: 10px; }
  .toolbar-left { flex-wrap: wrap; }
  .table-scroll { overflow-x: auto; -webkit-overflow-scrolling: touch; }
  .table { min-width: 1050px; }
  .filter-summary { grid-template-columns: 1fr; }
}
@media (max-width: 576px) {
  .student-search { flex-wrap: wrap; }
  .student-search input { flex-basis: 100%; }
  .title { font-size: 1.25rem; text-align: left; }
  .toolbar, .table-header-info { padding: 10px; }
  .btn-import { width: 100%; justify-content: center; }
  .text-hint { width: 100%; }
  .filter-tabs { display: grid; grid-template-columns: 1fr 1fr; }
  .filter-tab { padding: 9px 7px; font-size: .78rem; }
  .btn-finalizar { width: 100%; }
}
</style>

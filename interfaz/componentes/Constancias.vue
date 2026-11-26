<template>
  <div :class="{ 'constancias-generator': generatorOnly }">
    <h3 class="text-primary mb-4">Emisión de constancias</h3>
    <p>Se requiere evaluación aprobada y no tener tres faltas consecutivas. Las asistencias pendientes deben capturarse antes de emitir.</p>
    <p v-if="errorEmision" class="alert alert-danger" role="alert">{{ errorEmision }}</p>

    <label>Periodo escolar<select v-model="periodoSeleccionado" class="form-select mb-3"><option value="">Todos los periodos</option><option v-for="p in periodosDisponibles" :key="p.id" :value="p.id">{{p.nombre}}</option></select></label>
    <div class="d-flex gap-3 align-items-center mb-4"><button class="btn btn-primary" :disabled="exportando" @click="downloadAll">{{ exportando ? 'Generando archivos…' : 'Descargar todas las constancias (ZIP)' }}</button><span v-if="exportando" role="status">Espera a que termine la descarga.</span></div>
    <div class="row g-3"><div v-for="club in sortedClubs" :key="club.id" class="col-md-6 col-xl-4"><article class="card h-100 border-0 shadow-sm"><div class="card-body"><h5>{{ club.nombre }}</h5><p class="text-muted">{{ filteredAlumnos(club.nombre).filter(a=>isAcreditado(a)).length }} constancias disponibles</p><button class="btn btn-outline-primary" :disabled="exportando || !filteredAlumnos(club.nombre).some(a=>isAcreditado(a))" @click="descargarTodasConstanciasClub(club.nombre)">Descargar club (ZIP)</button><details class="mt-3"><summary>Descargar una constancia</summary><div v-for="a in filteredAlumnos(club.nombre).filter(a=>isAcreditado(a))" :key="a.id" class="d-flex justify-content-between align-items-center gap-2 py-2 border-bottom"><span>{{ a.nombre }} {{ a.apellidoP }} · {{ a.numeroControl || a.control }}</span><button class="btn btn-sm btn-outline-primary" :disabled="exportando" @click="descargarIndividual(a,club.nombre)">PDF</button></div></details></div></article></div></div>
    <p v-if="!sortedClubs.length" class="text-muted">No hay clubes disponibles.</p>
    <!-- Modal/Vista previa imprimible -->
    <div v-if="previewData" class="print-preview generator-only-preview">
      <div class="preview-documento">
        <div class="constancia A4" id="constancia">

          <!-- ENCABEZADO CORREGIDO según imagen oficial -->
          <table
            cellpadding="0"
            cellspacing="0"
            style="width: 100%; border-collapse: collapse; font-family: Arial, sans-serif; font-size: 9pt; border: 1px solid #000;"
          >
            <tbody>
              <!-- Fila 1: Logo | Título principal | Código -->
              <tr>
                <td
                  rowspan="3"
                  style="border: 1px solid #000; width: 90px; text-align: center; vertical-align: middle; padding: 6px;"
                >
                  <img src="../imagenes/Logo.jpg" alt="Logo" style="max-width: 75px; height: auto;" />
                </td>
                <td
                  rowspan="2"
                  style="border: 1px solid #000; vertical-align: middle; padding: 6px 10px; font-weight: bold; font-size: 10pt; line-height: 1.4;"
                >
                  Constancia de cumplimiento de actividad Cultural y/o Deportiva
                </td>
                <td
                  style="border: 1px solid #000; padding: 5px 8px; font-weight: bold; font-size: 9pt; white-space: nowrap; width: 220px;"
                >
                  Código:TecNM-VI-PO-003-05
                </td>
              </tr>
              <!-- Fila 2: Revisión -->
              <tr>
                <td style="border: 1px solid #000; padding: 5px 8px; font-weight: bold; font-size: 9pt;">
                  Revisión: 0
                </td>
              </tr>
              <!-- Fila 3: Referencia ISO | Página -->
              <tr>
                <td
                  style="border: 1px solid #000; vertical-align: middle; padding: 5px 10px; font-weight: bold; font-size: 9pt;"
                >
                  Referencia a la Norma ISO 9001:2015&nbsp;&nbsp;&nbsp;8.1
                </td>
                <td style="border: 1px solid #000; padding: 5px 8px; font-weight: bold; font-size: 9pt;">
                  Página 1 de 1
                </td>
              </tr>
            </tbody>
          </table>

          <h2
            class="titulo-constancia"
            style="font-size: 11pt; margin: 30px 0 15px 0; text-align: center;">
            CONSTANCIA DE CUMPLIMIENTO DE ACTIVIDAD CULTURAL Y/O DEPORTIVA
          </h2>
          <div class="espacios-mediano"></div>
          <div class="cuerpo">
            <p
              class="destinatario"
              style="font-size: 10pt; margin: 0 0 20px 0; line-height: 1.6"
            >
            <br>
              {{ getNombreJefe('jefa_servicios') || '__________________________' }}<br />
              {{ tituloServiciosEscolares() }} DEL DEPARTAMENTO DE SERVICIOS ESCOLARES<br />
              PRESENTE
            </p>
            <div class="espacios"></div>
            <p v-if="documentoConfig.constancia_texto" class="texto justificado" style="white-space:pre-wrap">{{ textoConfigurado() }}</p>
            <p v-else class="texto justificado">
              La que suscribe {{ getNombreJefe('jefe_actividades') || '__________________________' }}, {{ tituloFirma('jefe_actividades') }} del Departamento de Actividades Extraescolares, por este medio se permite hacer de su
              conocimiento que la estudiante
              <strong>{{ toUpper(previewData.estudianteNombre) }}</strong> con número de control <strong>{{ previewData.numeroControl }}</strong> de la
              carrera de <strong>{{ toUpper(previewData.carrera) }}</strong
              >, ha cumplido su actividad extraescolar en el club de
              <strong>{{ toUpper(previewData.club) }}</strong> con el nivel de
              desempeño <strong>{{ toUpper(previewData.desempeno) }}</strong> y
              un valor numérico de
              <strong>{{ previewData.valorNumerico || desempenoValor(previewData.desempeno) }}</strong>
              durante el periodo escolar
              <strong>{{ toUpper(previewData.mesInicio) }} - {{ toUpper(previewData.mesFin) }} {{ previewData.anioPeriodo }}</strong>, con un valor curricular de 1 crédito.
            </p>

            <div class="espacios"></div>

            <p class="lugar-fecha">
              Se extiende la presente en {{ documentoConfig.constancia_lugar || "la Heroica ciudad de Tlaxiaco" }} a los
              {{ fechaHoy.dia }} días del mes de {{ fechaHoy.mes }} de
              {{ fechaHoy.anio }}.
            </p>

            <div class="espacios-firma"></div>

            <table
              class="tabla-firmas"
              style="width: 100%; border-collapse: collapse; margin-top: 20px;">
              <tbody>
                <tr style="border: none !important;">
                  <td
                    style="
                      width: 50%;
                      text-align: center;
                      vertical-align: top;
                      padding: 0;
                      border: none !important;">
                    ATENTAMENTE
                  </td>
                  <td
                    style="
                      width: 50%;
                      text-align: center;
                      vertical-align: top;
                      padding: 0;
                      border: none !important;">
                    Vo. Bo.
                  </td>
                </tr>
                <tr style="border: none !important;">
                  <td colspan="2" class="espacios-firma-grandes" style="border: none !important;"></td>
                </tr>
                <tr style="border: none !important;">
                  <td
                    style="
                      width: 50%;
                      text-align: center;
                      vertical-align: top;
                      padding: 0;
                      border: none !important;">
                    <div class="linea-firma"></div>
                    <div class="nombre-firma">{{ getNombreJefe('jefe_promocion') || '__________________________' }}</div>
                    <div class="cargo-firma">
                      {{ tituloFirma('jefe_promocion') }} DE LA OFICINA DE PROMOCIÓN {{ toUpper(previewData.tipoActividad || 'CULTURAL') }}
                    </div>
                  </td>
                  <td
                    style="
                      width: 50%;
                      text-align: center;
                      vertical-align: top;
                      padding: 0;
                      border: none !important;">
                    <div class="linea-firma"></div>
                    <div class="nombre-firma">{{ getNombreJefe('jefe_actividades') || '__________________________' }}</div>
                    <div class="cargo-firma">
                      {{ tituloFirma('jefe_actividades') }} DEL DEPARTAMENTO DE ACTIVIDADES EXTRAESCOLARES
                    </div>
                  </td>
                </tr>
              </tbody>
            </table>

            <div class="pie-pagina">
              c.c.p. Jefe (a) de Departamento Correspondiente
            </div>

            <table class="tabla-pie">
              <tbody>
                <tr style="border: none !important;">
                  <td class="pie-izq" style="border: none !important;">TecNM-VI-PO-003-05</td>
                  <td class="pie-der" style="border: none !important;">Rev. 0</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>

    </div>
  </div>
</template>

<script>
import api from "../servicios/cliente-http";
import { getAsistenciasPorClub, getEvaluacion, getFirmas, saveConfig } from "../servicios/api";
import JSZip from 'jszip';
export default {
  name: "Constancias",
  props: {
    canManage: Boolean,
    clubs: {
      type: Array,
      default: () => []
    },
    alumnos: {
      type: Array,
      default: () => []
    },
    fechas: {
      type: Array,
      default: () => []
    },
    usuarios: {
      type: Array,
      default: () => []
    },
    carreras: {
      type: Array,
      default: () => []
    },
    generatorOnly: {
      type: Boolean,
      default: false
    }
  },
  data() {
    return {
      previewData: null,
      acreditacion: {},
      documentoConfig: {},
      periodoSeleccionado: "",
      periodosDisponibles: [],
      exportando: false,
      errorEmision: "",
      periodoActual: this.getPeriodoActual(),
      alumnosPorClub: {},
      // Objeto que almacena alumnos por club_id
      fechasData: [],
      // Fechas desde BD
      collapsedClubs: {},
      // Estado de colapso por club
      searchQuery: '',
      // Consulta de búsqueda
      searchSuggestions: [],
      // Sugerencias de búsqueda
      jefesSeleccionados: {
        jefe_promocion: "",
        jefe_promocion_nombre: "ARIADNA MONSERRAT LOPEZ",
        jefe_actividades: "",
        jefe_actividades_nombre: "URIEL ARCADIO AVILA",
        jefa_servicios: "",
        jefa_servicios_nombre: ""
      },
      selectedStudent: null,
      // Alumno seleccionado por búsqueda
      refreshInterval: null
    };
  },
  computed: {
    sortedClubs() {
      if (!Array.isArray(this.clubs)) return [];
      return [...this.clubs].sort((a, b) => {
        const tipoA = (a.tipo || '').toUpperCase();
        const tipoB = (b.tipo || '').toUpperCase();
        // Deportivos primero (DEPORTIVO < CULTURAL alfabéticamente)
        if (tipoA !== tipoB) {
          return tipoA.localeCompare(tipoB);
        }
        // Si mismo tipo, ordenar por nombre
        return (a.nombre || '').localeCompare(b.nombre || '');
      });
    },
    usuariosOficina() {
      if (!this.usuarios) return [];
      return this.usuarios.filter(u => u.tipo && u.tipo.toString().toUpperCase() === 'OFICINA');
    },
    fechaHoy() {
      const ahora = this.documentoConfig.constancia_fecha ? new Date(this.documentoConfig.constancia_fecha+"T12:00:00") : new Date();
      const meses = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"];
      return {
        dia: ahora.getDate(),
        mes: meses[ahora.getMonth()],
        anio: ahora.getFullYear()
      };
    }
  },
  methods: {
    textoConfigurado() {
      const d=this.previewData || {}; const valores={nombre:d.estudianteNombre,control:d.numeroControl,carrera:d.carrera,club:d.club,desempeno:d.desempeno,valor:d.valorNumerico,periodo:[d.mesInicio,'-',d.mesFin,d.anioPeriodo].join(' ')};
      return String(this.documentoConfig.constancia_texto || '').replace(/\{(\w+)\}/g,(m,k)=>valores[k] ?? m);
    },
    formatMonitorNombre(monitor) {
      // Acepta objeto o string y devuelve "PrimerNombre PrimerApellido"
      if (!monitor) return "";
      if (typeof monitor === "string") {
        const parts = monitor.trim().split(/\s+/).filter(Boolean);
        if (parts.length >= 2) return `${parts[0]} ${parts[1]}`;
        return parts[0] || "";
      }
      const nombre = (monitor.nombre || monitor.nombres || monitor.firstName || "").toString().trim().split(/\s+/)[0] || "";
      const apStr = (monitor.apellidoP || monitor.apellido || monitor.apellidos || monitor.lastName || "").toString().trim();
      const apellidoP = apStr ? apStr.split(/\s+/)[0] : "";
      return [nombre, apellidoP].filter(Boolean).join(" ");
    },
    getClubMonitores(club) {
      if (!club) return [];
      // Arrays de monitores en distintas keys
      if (Array.isArray(club.monitores)) return club.monitores.filter(Boolean);
      if (Array.isArray(club.monitors)) return club.monitors.filter(Boolean);
      if (Array.isArray(club.monitor)) return club.monitor.filter(Boolean);
      // Strings separados por coma o punto y coma
      const str = typeof club.monitores === "string" && club.monitores || typeof club.monitors === "string" && club.monitors || "";
      if (str.trim()) {
        return str.split(/[;,]/).map(s => s.trim()).filter(Boolean);
      }
      // Monitores individuales en distintas keys comunes
      const candidatos = [club.monitor, club.monitorNombre, club.monitor_name, club.monitorFullName, club.monitor1, club.monitor2].filter(Boolean);
      if (candidatos.length) return candidatos;

      // Derivar desde this.usuarios (monitores asignados)
      const usuarios = Array.isArray(this.usuarios) ? this.usuarios : [];
      const clubId = Number(club.id);
      const nombreClub = (club.nombre || "").toString().trim();
      // helper para extraer id numérico de cadenas como '80_NULL_' o similares
      const parseId = val => {
        if (val == null) return NaN;
        const num = Number(val);
        if (!Number.isNaN(num) && Number.isFinite(num)) return num;
        const m = String(val).match(/\d+/);
        return m ? Number(m[0]) : NaN;
      };
      const asignados = usuarios.filter(u => {
        if (!u) return false;
        const tipo = (u.tipo || "").toString().toUpperCase();
        if (tipo && tipo !== "MONITOR") return false;
        const asignId = parseId(u.club_asignado || u.id_club || u.club_id || u.clubId);
        const asignName = (u.club_nombre || u.clubName || u.club || "").toString().trim();
        if (clubId && !Number.isNaN(clubId) && asignId && !Number.isNaN(asignId) && asignId === clubId) return true;
        if (nombreClub && asignName && asignName === nombreClub) return true;
        // también considerar responsable del club
        const userId = parseId(u.id || u.user_id || u.usuario_id);
        const respId = parseId(club.id_responsable);
        if (respId && userId && respId === userId) return true;
        return false;
      });
      return asignados;
    },
    async loadAsistenciasPorClubs() {
      try {
        await this.actualizarAcreditacion();
        this.alumnosPorClub={};this.fechasData=[];
        for(const alumno of Object.values(this.acreditacion)) {
          (this.alumnosPorClub[alumno.id_club] ||= []).push(alumno);
          this.fechasData=[...new Set([...this.fechasData,...alumno.fechas])].sort();
        }
      } catch(e) { this.errorEmision=e.response?.data?.statusMessage || e.message; }
    },
    filteredAlumnos(clubName) {
      const club=this.clubs.find(c=>c.nombre===clubName);
      return (this.alumnosPorClub[club?.id] || []).filter(a=>!this.periodoSeleccionado || Number(a.periodo_id)===Number(this.periodoSeleccionado));
    },
    async descargarIndividual(alumno,club) {
      if(this.exportando)return;this.exportando=true;this.errorEmision='';
      try{await this.descargarConstancia(alumno,club,this.periodoActual);const blob=await this.generarPDFBlob();const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download='Constancia_'+alumno.id+'.pdf';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}catch(e){this.errorEmision=e.message;}finally{this.exportando=false;this.previewData=null;}
    },
    async downloadAll() {
      if (this.exportando) return;
      this.exportando=true; this.errorEmision='';
      try {
        await this.actualizarAcreditacion();
        const zip=new JSZip(); let cantidad=0;
        for(const club of this.clubs) {
          for(const alumno of this.filteredAlumnos(club.nombre).filter(a=>this.isAcreditado(a))) {
            await this.descargarConstancia(alumno,club.nombre,this.periodoActual);
            const pdf=await this.generarPDFBlob();
            const carpeta=String(club.nombre).replace(/[^\p{L}\p{N} _-]/gu,'_');
            zip.folder(carpeta).file('Constancia_'+alumno.id+'_'+(alumno.numeroControl || alumno.control)+'.pdf',pdf); cantidad++;
          }
        }
        if(!cantidad) throw new Error('No hay alumnos que cumplan los requisitos.');
        const url=URL.createObjectURL(await zip.generateAsync({type:'blob'}));
        const link=document.createElement('a'); link.href=url;link.download='Constancias_por_club.zip';link.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
      } catch(e) {this.errorEmision=e.message || 'No se pudo generar el archivo';}
      finally {this.exportando=false;this.previewData=null;}
    },
    desempenoValor(desempeno) {
      const mapa = {
        EXCELENTE: 4,
        NOTABLE: 3,
        BUENO: 2,
        REGULAR: 1,
        SUFICIENTE: 1,
        DEFICIENTE: 0,
        INSUFICIENTE: 0
      };
      return mapa[(desempeno || "").toUpperCase()] !== undefined ? mapa[(desempeno || "").toUpperCase()] : 0;
    },
    getPeriodoActual() {
      const f = new Date();
      const mes = f.getMonth();
      const anio = f.getFullYear();
      if (mes >= 0 && mes <= 5) {
        return {
          mesInicio: 'Enero',
          mesFin: 'Junio',
          anioPeriodo: anio
        };
      } else {
        return {
          mesInicio: 'Agosto',
          mesFin: 'Diciembre',
          anioPeriodo: anio
        };
      }
    },
    isCulturalName(nombre) {
      const n = (nombre || "").toString().trim().toLowerCase();
      const culturales = ["danza", "rondalla", "banda de musica", "banda de música"];
      return culturales.includes(n);
    },
    tipoActividad(club) {
      if (club && club.tipo) return club.tipo.toUpperCase();
      const nombre = typeof club === 'string' ? club : club?.nombre || "";
      return this.isCulturalName(nombre) ? "CULTURAL" : "DEPORTIVA";
    },
    async actualizarAcreditacion() {
      this.periodosDisponibles=(await api.get("/periodos")).data.data;
      this.acreditacion = {};
      const {data} = await api.get('/constancias');
      this.acreditacion = Object.fromEntries(data.data.map(a => [a.id,a]));
    },
    isAcreditado(alumno) { return this.acreditacion[alumno?.id]?.apto === true; },
    toggleClubCollapse(clubId) {
      this.collapsedClubs[clubId] = !this.collapsedClubs[clubId];
    },
    onSearchInput() {
      if (this.searchQuery.length < 3) {
        this.searchSuggestions = [];
        return;
      }
      const query = this.searchQuery.toLowerCase();
      const allAlumnos = [];
      Object.values(this.alumnosPorClub).forEach(alumnos => {
        allAlumnos.push(...alumnos);
      });
      this.searchSuggestions = allAlumnos.filter(alumno => `${alumno.nombre} ${alumno.apellidoP} ${alumno.apellidoM || ''}`.toLowerCase().includes(query)).slice(0, 10); // Limitar a 10 sugerencias
    },
    selectSuggestion(suggestion) {
      this.searchQuery = `${suggestion.nombre} ${suggestion.apellidoP} ${suggestion.apellidoM || ''}`;
      this.searchSuggestions = [];
      this.selectedStudent = suggestion; // Guardar el alumno seleccionado para mostrar detalles

      // Cerrar todos los clubs
      this.sortedClubs.forEach(c => {
        this.collapsedClubs[c.id] = true;
      });
      // Expandir el club del alumno
      const club = this.sortedClubs.find(c => c.nombre === suggestion.club);
      if (club) {
        this.collapsedClubs[club.id] = false;
      }
    },
    getMonitorNameForStudent(alumno) {
      if (!alumno || !alumno.club) return "Sin asignar";
      const club = (this.clubs || []).find(c => c.nombre === alumno.club);
      if (!club) return "Sin asignar";
      const monitores = this.getClubMonitores(club);
      if (monitores && monitores.length) {
        return monitores.map(m => this.formatMonitorNombre(m)).join(", ");
      }
      return "Sin asignar";
    },
    openConstanciaPreview(club) {
      if (!this.canManage) return;
      const periodo = this.getPeriodoActual();
      this.previewData = {
        estudianteNombre: "NOMBRE DEL ESTUDIANTE",
        numeroControl: "00000000",
        carrera: (this.carreras && this.carreras[0] ? this.carreras[0].nombre : "CARRERA").toUpperCase(),
        club: (club?.nombre || "club").toLowerCase(),
        desempeno: "EXCELENTE",
        mesInicio: periodo.mesInicio,
        mesFin: periodo.mesFin,
        anioPeriodo: periodo.anioPeriodo,
        tipoActividad: this.tipoActividad(club)
      };
    },
    printConstancia(data) {
      this.previewData = {
        tipoActividad: this.tipoActividad(data.club),
        ...data
      };
    },
    async descargarConstancia(alumno, clubNombre, periodoActual) {
      await this.loadCargos();
      await this.actualizarAcreditacion();
      if (!this.isAcreditado(alumno)) { this.errorEmision = this.acreditacion[alumno.id]?.motivo || "No se pudo verificar la acreditación"; throw new Error(this.errorEmision); }
      const validado=this.acreditacion[alumno.id];
      const inicio=String(validado.fecha_inicio).slice(0,10);
      const periodo={mesInicio:inicio.slice(5,7)<='06'?'Enero':'Agosto',mesFin:inicio.slice(5,7)<='06'?'Junio':'Diciembre',anioPeriodo:inicio.slice(0,4)};
      const desempeno=['INSUFICIENTE','SUFICIENTE','BUENO','NOTABLE','EXCELENTE'][Number(validado.nivel_desempeno)];
      const valorNumerico=Number(validado.valor_numerico);
      const data = {
        estudianteNombre: `${alumno.nombre} ${alumno.apellidoP} ${alumno.apellidoM || ''}`.trim(),
        numeroControl: alumno.numeroControl || alumno.control || 'SIN CONTROL',
        carrera: alumno.carrera || (this.carreras && this.carreras[0] ? this.carreras[0].nombre : 'SIN CARRERA'),
        club: (alumno.club || clubNombre || '').toLowerCase(),
        desempeno: desempeno,
        valorNumerico: valorNumerico,
        // Si es null, el template usará el calculado
        mesInicio: periodo.mesInicio,
        mesFin: periodo.mesFin,
        anioPeriodo: periodo.anioPeriodo
      };
      const clubActual = this.clubs.find(c => c.nombre === data.club || c.id === alumno.club_id);
      this.previewData = {
        tipoActividad: this.tipoActividad(clubActual || data.club),
        ...data
      };
    },
    async generarReposicionHistorica({
      alumno,
      club,
      periodo
    }) {
      await this.loadCargos();
      const meses = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
      const inicio = new Date(`${String(periodo?.fecha_inicio || '').slice(0, 10)}T00:00:00`);
      const fin = new Date(`${String(periodo?.fecha_fin || '').slice(0, 10)}T00:00:00`);
      const faltas = Number(alumno?.faltas ?? 0);
      const desempeno = ['INSUFICIENTE','SUFICIENTE','BUENO','NOTABLE','EXCELENTE'][Number(alumno.nivel_desempeno)];
      this.previewData = {
        estudianteNombre: `${alumno?.nombre || ''} ${alumno?.apellidoP || ''} ${alumno?.apellidoM || ''}`.replace(/\s+/g, ' ').trim(),
        numeroControl: alumno?.numeroControl || alumno?.control || 'SIN CONTROL',
        carrera: alumno?.carrera_nombre || alumno?.carrera || 'SIN CARRERA',
        club: String(club?.nombre || '').toLowerCase(),
        desempeno,
        valorNumerico: alumno?.valor_numerico ?? null,
        mesInicio: Number.isNaN(inicio.getTime()) ? '' : meses[inicio.getMonth()],
        mesFin: Number.isNaN(fin.getTime()) ? '' : meses[fin.getMonth()],
        anioPeriodo: Number.isNaN(fin.getTime()) ? new Date().getFullYear() : fin.getFullYear(),
        tipoActividad: this.tipoActividad(club)
      };
      await this.$nextTick();
      await new Promise(resolve => setTimeout(resolve, 350));
      const nodo = this.$el.querySelector('#constancia');
      if (!nodo) throw new Error('No se pudo preparar la constancia oficial');
      for (let intento = 0; typeof html2pdf === 'undefined' && intento < 20; intento += 1) {
        await new Promise(resolve => setTimeout(resolve, 150));
      }
      if (typeof html2pdf === 'undefined') throw new Error('No se pudo cargar el generador de la constancia');
      const nombre = `${this.previewData.estudianteNombre.replace(/\s+/g, '_')}_${this.previewData.numeroControl}`;
      await html2pdf().set({
        margin: [15, 15, 15, 15],
        filename: `Constancia_${nombre}.pdf`,
        image: {
          type: 'jpeg',
          quality: 0.98
        },
        html2canvas: {
          scale: 2,
          allowTaint: true,
          useCORS: true,
          logging: false,
          windowHeight: nodo.scrollHeight
        },
        jsPDF: {
          orientation: 'portrait',
          unit: 'mm',
          format: 'letter'
        }
      }).from(nodo).save();
      this.previewData = null;
    },
    generarPDF() {
      this.$nextTick(() => {
        setTimeout(() => {
          const nodo = document.getElementById("constancia");
          if (!nodo || !this.previewData) return;
          const nombre = `${this.previewData.estudianteNombre.replace(/\s+/g, "_")}_${this.previewData.numeroControl}`;
          const opt = {
            margin: [15, 15, 15, 15],
            filename: `Constancia_${nombre}.pdf`,
            image: {
              type: "jpeg",
              quality: 0.98
            },
            html2canvas: {
              scale: 2,
              allowTaint: true,
              useCORS: true,
              logging: false,
              windowHeight: nodo.scrollHeight
            },
            jsPDF: {
              orientation: "portrait",
              unit: "mm",
              format: "letter"
            }
          };

          // Usar html2pdf
          if (typeof html2pdf === "undefined") {
            setTimeout(() => {
              // Si aún no cargó, esperar
              if (typeof html2pdf !== "undefined") {
                html2pdf().set(opt).from(nodo).save();
              }
            }, 1000);
          } else {
            setTimeout(() => {
              html2pdf().set(opt).from(nodo).save();
            }, 200);
          }
        }, 300);
      });
    },
    async generarPDFBlob() {
      return new Promise((resolve, reject) => {
        this.$nextTick(() => {
          setTimeout(() => {
            const nodo = document.getElementById("constancia");
            if (!nodo || !this.previewData) {
              reject(new Error('No hay datos para generar PDF'));
              return;
            }
            const opt = {
              margin: [15, 15, 15, 15],
              image: {
                type: "jpeg",
                quality: 0.98
              },
              html2canvas: {
                scale: 2,
                allowTaint: true,
                useCORS: true,
                logging: false,
                windowHeight: nodo.scrollHeight
              },
              jsPDF: {
                orientation: "portrait",
                unit: "mm",
                format: "letter"
              }
            };
            if (typeof html2pdf === "undefined") {
              setTimeout(() => {
                if (typeof html2pdf !== "undefined") {
                  html2pdf().set(opt).from(nodo).outputPdf('blob').then(resolve).catch(reject);
                } else {
                  reject(new Error('html2pdf no está disponible'));
                }
              }, 1000);
            } else {
              setTimeout(() => {
                html2pdf().set(opt).from(nodo).outputPdf('blob').then(resolve).catch(reject);
              }, 200);
            }
          }, 300);
        });
      });
    },
    toUpper(v) {
      return (v == null ? "" : String(v)).toUpperCase();
    },
    async descargarTodasConstanciasClub(clubNombre) {
      if(this.exportando)return;this.exportando=true;this.errorEmision="";
      try {
      await this.actualizarAcreditacion();
      const alumnosAcreditados = this.filteredAlumnos(clubNombre).filter(alumno => this.isAcreditado(alumno));
      if (!alumnosAcreditados.length) {
        alert(`No hay alumnos acreditados en el club ${clubNombre}`);
        return;
      }
      const zip = new JSZip();
      const folder = zip.folder(`Constancias_${clubNombre.replace(/\s+/g, '_')}`);
      for (const alumno of alumnosAcreditados) {
        // Preparar datos para el alumno
        await this.descargarConstancia(alumno, clubNombre, this.periodoActual);
        // Esperar a que previewData se actualice
        await new Promise(resolve => setTimeout(resolve, 500));

        // Generar PDF como blob
        const pdfBlob = await this.generarPDFBlob();

        // Agregar al ZIP
        const nombreArchivo = `Constancia_${alumno.nombre}_${alumno.apellidoP}_${alumno.numeroControl || 'SIN_CONTROL'}.pdf`;
        folder.file(nombreArchivo, pdfBlob);
      }

      // Generar y descargar el ZIP
      const zipBlob = await zip.generateAsync({
        type: 'blob'
      });
      const url = URL.createObjectURL(zipBlob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Constancias_${clubNombre.replace(/\s+/g, '_')}.zip`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      } catch(e){this.errorEmision=e.message || "No se pudo descargar el club";} finally {this.exportando=false;this.previewData=null;}
    },
    printStyles() {
      return `
        @page { size: A4; margin: 20mm; }
        body { font-family: Arial, Helvetica, sans-serif; color: #000; }
        .A4 { width: 190mm; margin: 0 auto; }
        .header { text-align: center; }
        .logos { display: grid; grid-template-columns: 80px 1fr 80px; align-items: center; gap: 10px; }
        .logo.izq, .logo.der { width: 70px; height: 70px; background: #eee; border-radius: 6px; }
        .titulos .top-row { display: flex; justify-content: space-between; font-size: 12px; font-weight: bold; }
        .titulos .meta { display: flex; justify-content: space-between; font-size: 10px; margin-top: 4px; }
        .separador { height: 2px; background: #000; margin: 10px 0; }
        h2 { font-size: 16px; margin: 10px 0 20px; text-align: center; }
        .cuerpo { font-size: 12px; line-height: 1.6; }
        .destinatario { font-weight: bold; text-align: left; }
        .texto.justificado { text-align: justify; }
        .lugar-fecha { margin-top: 16px; }
        .firmas { display: grid; grid-template-columns: 1fr 1fr; gap: 24px; margin-top: 36px; text-align: center; }
        .firmas .linea { border-top: 1px solid #000; margin: 36px 40px 6px; }
        .firmas .nombre { font-weight: bold; }
        .firmas .cargo { font-size: 11px; }
      `;
    },
    formatNombre(u) {
      if (!u) return '';
      const np = u.nombre || '';
      const ap = u.apellidoP || '';
      const am = u.apellidoM || '';
      return `${np} ${ap} ${am}`.trim().toUpperCase();
    },
    sanitizeNombreInput(campo) {
      const raw = (this.jefesSeleccionados[campo] || '').toString();
      const base = raw.replace(/[^A-Za-zÁÉÍÓÚÜÑáéíóúüñ\s]/g, '').replace(/\s+/g, ' ').trimStart().toUpperCase();
      let letras = 0;
      let out = '';
      for (const ch of base) {
        if (/[A-ZÁÉÍÓÚÜÑ]/u.test(ch)) {
          if (letras >= 50) continue;
          letras += 1;
          out += ch;
        } else if (ch === ' ') {
          if (out && out[out.length - 1] !== ' ') out += ch;
        }
      }
      this.jefesSeleccionados[campo] = out;
    },
    inferGenero(nombre) {
      const first = (nombre || '').toString().trim().split(/\s+/)[0].normalize('NFD').replace(/[\u0300-\u036f]/g, '').toUpperCase();
      if (!first) return 'M';
      const femeninos = new Set(['BEATRIZ', 'LOURDES', 'GUADALUPE', 'CARMEN', 'ARIADNA', 'XIMENA', 'SOFIA', 'LUCIA']);
      const masculinos = new Set(['JESUS', 'JOSE', 'LUIS', 'CARLOS', 'JUAN', 'MIGUEL', 'URIEL']);
      if (femeninos.has(first)) return 'F';
      if (masculinos.has(first)) return 'M';
      if (/A$|RIZ$|TRIZ$|DES$/.test(first)) return 'F';
      if (/O$|OS$|EL$|ER$|AR$/.test(first)) return 'M';
      return 'M';
    },
    tituloFirma(cargo) {
      const nombre = this.getNombreJefe(cargo).replace(/^C\.\s*/i, '');
      if (!nombre) {
        return cargo === 'jefa_servicios' ? 'JEFA' : 'JEFE';
      }
      return this.inferGenero(nombre) === 'F' ? 'JEFA' : 'JEFE';
    },
    tituloServiciosEscolares() {
      const raw = (this.jefesSeleccionados.jefa_servicios_nombre || '').toUpperCase().trim();
      if (/^ENCARGAD[OA]\b/.test(raw)) return 'ENCARGADO';
      if (/^JEFA\b/.test(raw)) return 'JEFA';
      if (/^JEFE\b/.test(raw)) return 'JEFE';
      const nombre = this.getNombreJefe('jefa_servicios').replace(/^C\.\s*/i, '');
      return this.inferGenero(nombre) === 'F' ? 'JEFA' : 'JEFE';
    },
    async guardarPreferenciaManual(cargo) {
      if (!this.canManage) return;
      this.sanitizeNombreInput(cargo + '_nombre');
      const valor = String(this.jefesSeleccionados[cargo + '_nombre'] || '').replace(/\s+/g, ' ').trim();
      this.jefesSeleccionados[cargo + '_nombre'] = valor;
      try {
        await saveConfig('firma_' + cargo, valor);
      } catch (e) {
        // Silencioso en producción
      }
    },
    async loadCargos() {
      try {
        const config = (await api.get("/config")).data;
        this.documentoConfig = Object.fromEntries(config.data.map(v=>[v.clave,v.valor]));
        const firmas = await getFirmas();
        if (firmas.jefe_actividades) {
          this.jefesSeleccionados.jefe_actividades = firmas.jefe_actividades.id || '';
          if (firmas.jefe_actividades.nombre) {
            this.jefesSeleccionados.jefe_actividades_nombre = String(firmas.jefe_actividades.nombre).toUpperCase();
            this.sanitizeNombreInput('jefe_actividades_nombre');
          }
        }
        if (firmas.jefe_promocion) {
          this.jefesSeleccionados.jefe_promocion = firmas.jefe_promocion.id || '';
          if (firmas.jefe_promocion.nombre) {
            this.jefesSeleccionados.jefe_promocion_nombre = String(firmas.jefe_promocion.nombre).toUpperCase();
            this.sanitizeNombreInput('jefe_promocion_nombre');
          }
        }
        if (firmas.jefa_servicios) {
          this.jefesSeleccionados.jefa_servicios_nombre = firmas.jefa_servicios.nombre;
          this.sanitizeNombreInput('jefa_servicios_nombre');
        }
      } catch (e) {
        // Silencioso en producción
      }
    },
    getNombreJefe(cargo) {
      if (cargo === 'jefa_servicios') {
        const raw = String(this.jefesSeleccionados.jefa_servicios_nombre || '').toUpperCase();
        const limpio = raw.replace(/^(JEFA|JEFE|ENCARGAD[OA])\s+/i, '').trim();
        return limpio ? 'C. ' + limpio : '';
      }
      const manualKey = cargo + '_nombre';
      const manual = (this.jefesSeleccionados[manualKey] || '').toString().trim();
      if (manual) return manual.toUpperCase();
      const id = this.jefesSeleccionados[cargo];
      if (!id) {
        if (cargo === 'jefe_promocion') return 'ARIADNA MONSERRAT LOPEZ';
        if (cargo === 'jefe_actividades') return 'URIEL ARCADIO AVILA';
        return '';
      }
      const u = this.usuariosOficina.find(user => user.id == id);
      const fromUser = u ? this.formatNombre(u) : '';
      if (fromUser && fromUser !== 'ADMIN') return fromUser;
      if (cargo === 'jefe_promocion') return 'ARIADNA MONSERRAT LOPEZ';
      if (cargo === 'jefe_actividades') return 'URIEL ARCADIO AVILA';
      return fromUser;
    }
  },
  watch: {
    clubs: {
      handler(newClubs) {
        this.loadAsistenciasPorClubs();
        // Inicializar collapsed para nuevos clubs
        if (Array.isArray(newClubs)) {
          newClubs.forEach(club => {
            if (!(club.id in this.collapsedClubs)) {
              this.collapsedClubs[club.id] = true;
            }
          });
        }
      },
      deep: true
    }
  },
  async mounted() {
    await this.loadCargos();
    this.loadAsistenciasPorClubs();
    // Inicializar collapsedClubs con todos colapsados
    if (Array.isArray(this.clubs)) {
      this.clubs.forEach(club => {
        this.collapsedClubs[club.id] = true;
      });
    }
    // Cargar html2pdf si no está disponible
    if (typeof html2pdf === "undefined") {
      const script = document.createElement("script");
      script.src = "https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js";
      document.head.appendChild(script);
    }
    // Auto-refresco cada 30 segundos
    this.refreshInterval = setInterval(() => this.loadAsistenciasPorClubs(), 30000);
  },
  beforeUnmount() {
    if (this.refreshInterval) clearInterval(this.refreshInterval);
  }
};
</script>

<style scoped src="./Constancias.css"></style>

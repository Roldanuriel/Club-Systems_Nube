<template>
  <section class="document-studio" :data-format="sectionCode" lang="es" spellcheck="true">
    <div class="document-heading"><i :class="'bi bi-'+visual.icono"></i><div><strong>{{visual.titulo}}</strong><span>{{visual.descripcion}}</span></div><small>Word · máx. 5 MB</small></div>
    
    <div v-if="message" class="alert" :class="failed ? 'alert-danger' : 'alert-success'" role="status">{{ message }}</div>
    <form v-if="manage && !configurationOnly" class="upload-panel row g-3 align-items-end" @submit.prevent="upload">
      <div class="col-md-4"><label class="form-label">Etiqueta <span class="optional">opcional</span></label><input v-model="name" class="form-control" placeholder="Ej. Agosto–Diciembre 2026"></div>
      <div class="col-md-5"><label class="form-label">Seleccionar archivo</label><input ref="fileInput" type="file" class="form-control" accept=".doc,.docx" @change="file = $event.target.files[0] || null"></div>
      <div class="col-md-3"><button class="btn btn-primary w-100" :disabled="busy || !file">{{ busy ? 'Cargando…' : 'Guardar versión' }}</button></div>
      <div v-if="!sectionCode" class="col-12"><label for="format-destination" class="form-label">¿Dónde usar este archivo?</label><select id="format-destination" v-model="destination" class="form-select"><option value="automatico">Detectar automáticamente</option><option value="registro">003-01 · Registro de participantes</option><option value="constancia">003-05 · Constancia</option><option value="resultados">Resultados del club y firmas</option><option value="evaluacion">Evaluación del monitor</option></select></div>
      <div class="col-12"><details class="quiet-help"><summary>Acerca del archivo</summary><p>Se conserva el nombre y contenido del Word. La impresión utiliza el diseño del sistema; cargar un archivo no convierte su diseño.</p></details></div>
    </form>
    <div v-for="template in templates.filter(t=>!sectionCode || t.codigo===sectionCode)" :key="template.codigo" class="active-document">
      <i class="bi bi-file-earmark-word document-file-icon" aria-hidden="true"></i><div class="active-document-copy"><small>{{template.documento ? 'ARCHIVO VIGENTE' : 'SIN ARCHIVO'}} · {{template.codigo}}</small><strong>{{ template.documento?.nombre_original || 'Carga la primera versión' }}</strong></div>
      <button v-if="template.documento" class="btn btn-sm btn-outline-primary ms-2" @click="download(template.documento)">Descargar original</button><button v-if="manage && !configurationOnly && template.documento" class="btn btn-sm btn-outline-danger ms-2" :disabled="busy" @click="remove(template.documento)">Quitar formato</button>
    </div>
    <details v-if="manage && !configurationOnly && documents.some(d=>!sectionCode || d.formato_codigo===sectionCode)" class="document-history"><summary>Versiones anteriores <span>{{documents.filter(d=>!sectionCode || d.formato_codigo===sectionCode).length}}</span></summary>
      <ul class="list-group mt-2"><li v-for="document in documents.filter(d=>!sectionCode || d.formato_codigo===sectionCode)" :key="document.id" class="list-group-item">
        {{ document.nombre_original }} · {{ templates.find(item => item.codigo === document.formato_codigo)?.nombre || 'Referencia anterior' }}
        <button class="btn btn-sm btn-outline-primary ms-2" @click="download(document)">Descargar</button>
        <button v-if="document.formato_codigo" class="btn btn-sm btn-outline-success ms-2" @click="activate(document)">Usar este formato</button><button class="btn btn-sm btn-outline-danger ms-2" :disabled="busy" @click="remove(document)">Quitar</button>
      </li></ul>
    </details>
    <div v-if="!uploadOnly && (!sectionCode || ['003-03','003-04'].includes(sectionCode))" class="prepare-panel"><h6><i class="bi bi-sliders me-2"></i>Preparar {{sectionCode==='003-04' ? 'evaluaciones' : 'resultados'}}</h6>
    <p class="prepare-hint">Elige el club y completa los datos de emisión.</p><details class="quiet-help mb-3"><summary>Detalles de impresión</summary><p>Se utiliza el modelo institucional del sistema, con un club por hoja y espacios de firma en blanco. Las evaluaciones pendientes no se imprimen.</p></details>
    <div class="row g-2">
      <div class="col-md-6"><label class="form-label">Clubes</label><select v-model="selectedClub" class="form-select" @change="loadData"><option value="">Selecciona un club</option><option v-if="manage" value="all">Todos los clubs</option><option v-for="club in availableClubs" :key="club.id" :value="club.id">{{ club.nombre }}</option></select></div>
      <div class="col-md-6"><label class="form-label">Plantel</label><input v-model="details.instituto" class="form-control" placeholder="Instituto Tecnológico de Tlaxiaco"></div>
    </div>
    <p v-if="loadingData" role="status">Preparando los datos de los clubs…</p><template v-if="data">
      <div class="document-stats"><span><small>Periodo</small><strong>{{data.periodo.nombre}}</strong></span><span><small>Alumnos</small><strong>{{data.alumnos.length}}</strong></span><span><small>Pendientes</small><strong>{{pending}}</strong></span><button class="btn btn-sm btn-outline-secondary" @click="loadData" aria-label="Actualizar datos"><i class="bi bi-arrow-clockwise"></i></button></div>
      <div class="row g-2 mb-3">
        <div class="col-md-6"><label class="form-label">Lugar de emisión</label><input v-model="details.lugar" class="form-control"></div>
        <div class="col-md-6"><label class="form-label">Fecha de emisión</label><input v-model="details.fecha" type="date" class="form-control"></div>
        <div v-if="selectedClub !== 'all'" class="col-md-4"><label class="form-label">Promotor cultural o deportivo</label><input v-model="details.promotor" class="form-control"></div>
        <div class="col-md-4"><label class="form-label">Jefe de oficina de promoción</label><input v-model="details.jefePromocion" class="form-control"></div>
        <div class="col-md-4"><label class="form-label">Jefe de actividades extraescolares</label><input v-model="details.jefeActividades" class="form-control"></div>
      </div>
      <button v-if="!sectionCode || sectionCode==='003-03'" class="btn btn-outline-primary mb-3" :disabled="busy || !active('003-03') || !data.alumnos.length" @click="print('003-03')">Preparar resultados</button>
      <template v-if="!sectionCode || sectionCode==='003-04'"><button v-if="selectedClub === 'all'" class="btn btn-outline-primary d-block" :disabled="busy || !active('003-04') || !data.alumnos.some(student => student.evaluacion_id)" @click="print('003-04')">Preparar evaluaciones</button><div v-else class="row g-2"><div class="col-md-8"><label class="form-label">Estudiante para evaluación individual</label><select v-model="studentId" class="form-select"><option value="">Selecciona un estudiante</option><option v-for="student in data.alumnos" :key="student.id" :value="student.id">{{ student.apellidoP }} {{ student.apellidoM }} {{ student.nombre }} {{ student.evaluacion_id ? '' : '(evaluación pendiente)' }}</option></select></div>
      <div class="col-md-4 d-flex align-items-end"><button class="btn btn-outline-primary" :disabled="busy || !active('003-04') || !studentId" @click="print('003-04')">Preparar evaluación</button></div></div></template>
    </template>
    </div>
    <div v-if="previewHtml" class="format-preview" role="dialog" aria-modal="true" aria-label="Vista previa del documento">
      <div class="bg-white p-3 h-100 d-flex flex-column">
        <div class="d-flex justify-content-between mb-2"><h5>Vista previa · Revise los datos antes de imprimir</h5><div><button class="btn btn-primary me-2" @click="$refs.preview.contentWindow.print()">Imprimir / Guardar PDF</button><button class="btn btn-secondary" @click="previewHtml = ''">Cerrar vista previa</button></div></div>
        <iframe ref="preview" :srcdoc="previewHtml" title="Documento completado" sandbox="allow-same-origin allow-modals" class="flex-grow-1 w-100 border"></iframe>
      </div>
    </div>
  </section>
</template>

<script>
import { getClubs, getDocumentos, getFirmas, saveConfig, uploadDocumento } from '../servicios/api';
import { request } from '../servicios/peticiones';
import { authService } from '../servicios/autenticacion';
import { openDocumentFile } from '../servicios/archivos-documentos';
import { renderOfficialFormat, renderAllClubFormats } from '../servicios/formatos-oficiales';
export default {
  props: { sectionCode: String, uploadOnly: Boolean, configurationOnly: Boolean, manage: Boolean, clubId: [Number, String] },
  data: () => ({ name: '', destination: 'automatico', file: null, busy: false, loadingData: false, clubData: [], message: '', failed: false, templates: [], documents: [], clubs: [], selectedClub: '', studentId: '', data: null, previewHtml: '',
    details: { instituto: '', lugar: '', fecha: new Date().toLocaleDateString('en-CA'), promotor: '', jefePromocion: '', jefeActividades: '' } }),
  computed: {
    visual(){return {'003-01':{icono:'people',titulo:'Registro de participantes',descripcion:'El archivo base para las inscripciones.'},'003-03':{icono:'pen',titulo:'Resultados y firmas',descripcion:'Prepara el cierre de actividades por club.'},'003-04':{icono:'clipboard-check',titulo:'Evaluación de monitores',descripcion:'Organiza el formato de las evaluaciones.'},'003-05':{icono:'award',titulo:'Constancias',descripcion:'Administra el documento de acreditación.'}}[this.sectionCode] || {icono:'folder2-open',titulo:'Documentos institucionales',descripcion:'Archivos y preparación de documentos.'};},
    availableClubs() { return this.clubId ? this.clubs.filter(club => Number(club.id) === Number(this.clubId)) : this.clubs; },
    pending() { return this.data?.alumnos.filter(student => !student.evaluacion_id).length || 0; }
  },
  watch: { clubId(value) { this.selectedClub = value || ''; this.loadData(); } },
  methods: {
    active(code) { return this.templates.find(template => template.codigo === code)?.documento; },
    error(error) { this.failed = true; this.message = error.message || 'No se pudo completar la operación'; },
    async refresh() {
      this.templates = (await request('/api/formatos')).data;
      if (this.manage) this.documents = (await getDocumentos({ tipo: 'OTRO', limit: 200 })).filter(document => /^FORMATO_(REGISTRO|EVALUACION|RESULTADOS|CONSTANCIA):/.test(document.concepto || ''));
    },
    async upload() {
      if (!this.file) return;
      if (this.file.size > 5 * 1024 * 1024) return this.error(new Error('El documento no debe exceder 5 MB.'));
      this.busy = true;
      try {
        const form = new FormData();
        form.append('archivo', this.file); form.append('tipo', 'OTRO'); form.append('uso', 'formato'); form.append('nombre', this.name); form.append('destino', this.destination);
        const result = await uploadDocumento(form);
        this.failed = false; this.message = `${result.data.nombre_original} actualizado para todos los clubs en: ${result.data.destino}.`;
        this.file = null; this.name = ''; this.$refs.fileInput.value = '';
        await this.refresh();
      } catch (error) { this.error(error); } finally { this.busy = false; }
    },
    async activate(document) {
      try {
        const type = this.templates.find(item => item.codigo === document.formato_codigo);
        if (!type) throw new Error('Carga nuevamente el archivo para reconocer su sección.');
        await saveConfig(type.clave, String(document.id));
        await this.refresh(); this.failed = false; this.message = 'Formato vigente actualizado para todos los clubs.';
      } catch (error) { this.error(error); }
    },
    async remove(document) {
      this.busy = true;
      try {
        await request(`/api/formatos/${document.id}`, { method: 'DELETE' });
        await this.refresh(); this.previewHtml = '';
        this.failed = false; this.message = 'Formato retirado para todos los clubs. Puedes cargar una versión actualizada. El original se conserva para auditoría.';
      } catch (error) { this.error(error); } finally { this.busy = false; }
    },
    async download(document) {
      try {
        const response = await fetch(`/api/documentos/${document.id}`, { headers: { Authorization: `Bearer ${authService.getToken()}` } });
        if (!response.ok) throw new Error('No se pudo descargar el documento.');
        openDocumentFile(await response.blob(), document.nombre_original);
      } catch (error) { this.error(error); }
    },
    async loadData() {
      this.data = null; this.studentId = ''; this.clubData = []; this.previewHtml = '';
      const club = this.selectedClub;
      if (!club) { this.loadingData = false; return; }
      this.loadingData = true;
      try {
        const ids = club === 'all' && this.manage ? this.availableClubs.map(item => item.id) : [club];
        const results = [];
        // Limitar las consultas simultáneas cuando hay muchos clubs.
        for (let index = 0; index < ids.length; index += 4) {
          results.push(...await Promise.all(ids.slice(index, index + 4).map(id => request(`/api/formatos/datos?club_id=${encodeURIComponent(id)}`))));
        }
        if (String(club) !== String(this.selectedClub)) return;
        this.clubData = results.map(result => result.data);
        if (!results.length) return;
        this.data = club === 'all' ? { ...results[0].data, alumnos: this.clubData.flatMap(item => item.alumnos) } : results[0].data;
        this.details.promotor = club === 'all' ? '' : this.data.promotor;
      } catch (error) { this.error(error); } finally { if (String(club) === String(this.selectedClub)) this.loadingData = false; }
    },
    print(code) {
      try {
        if (!this.details.instituto.trim()) throw new Error('Completa el nombre del plantel antes de imprimir.');
        if (code === '003-03' && (!this.details.lugar.trim() || !this.details.fecha)) throw new Error('Completa el lugar y la fecha de emisión.');
        if (!this.active(code)) throw new Error('Primero carga un formato vigente.');
        this.previewHtml = this.selectedClub === 'all' ? renderAllClubFormats(code, this.clubData, this.details) : renderOfficialFormat(code, this.data, this.details, this.studentId);
      } catch (error) { this.error(error); }
    }
  },
  async mounted() {
    try {
      if(this.sectionCode)this.destination={"003-01":"registro","003-03":"resultados","003-04":"evaluacion","003-05":"constancia"}[this.sectionCode];
      await this.refresh();
      this.clubs = await getClubs();
      const names = await getFirmas();
      this.details.jefePromocion = names.jefe_promocion?.nombre || '';
      this.details.jefeActividades = names.jefe_actividades?.nombre || '';
      if (this.clubId || this.manage) { this.selectedClub = this.clubId || ''; if(this.selectedClub)await this.loadData(); }
    } catch (error) { this.error(error); }
  }
};
</script>
<style scoped>
.format-preview { position: fixed; inset: 0; z-index: 1080; padding: 20px; background: #0008; }
</style>

<style scoped>
.document-studio{--accent:#3266ba;--soft:#edf4ff;font-family:'Inter','Segoe UI',sans-serif}.document-studio[data-format="003-03"]{--accent:#396a92;--soft:#edf6fb}.document-studio[data-format="003-04"]{--accent:#6256aa;--soft:#f1effc}.document-studio[data-format="003-05"]{--accent:#a0782c;--soft:#fbf6e9}.document-studio[data-format="003-01"]{--accent:#297c86;--soft:#edf8f8}.document-heading{display:flex;align-items:center;gap:14px;margin-bottom:20px;padding:16px 18px;border-radius:18px;background:var(--soft)}.document-heading>i{font-size:1.7rem;color:var(--accent)}.document-heading>div{flex:1}.document-heading strong{display:block;font-family:'Manrope',sans-serif;font-size:1rem;color:var(--accent);font-weight:800}.document-heading span{display:block;font-size:.78rem;color:#64768f;margin-top:5px}.document-heading>small{font-size:.7rem;color:#64768f;white-space:nowrap}.upload-panel{margin:0 0 22px;padding:16px 10px 12px;border:1px dashed #cad9ee;border-radius:18px;background:#fafcff}.document-studio .form-label{font-size:.76rem;font-weight:650;color:#3b526f;margin-bottom:8px}.optional{font-size:.66rem;background:#eaf0f8;color:#75869d;border-radius:6px;padding:2px 5px;margin-left:4px;font-weight:400}.document-studio .form-control,.document-studio .form-select{border:1px solid #d6e2f2;border-radius:12px;background:#fff;color:#2e496c;font-size:.85rem;padding:11px 12px;box-shadow:none;transition:border-color .2s,box-shadow .2s}.document-studio .form-control:focus,.document-studio .form-select:focus{border-color:var(--accent);box-shadow:0 0 0 3px var(--soft)}.document-studio input::file-selector-button{background:var(--soft);color:var(--accent);font-weight:600;border:0;padding:12px}.document-studio .btn{font-size:.78rem;border-radius:11px;padding:10px 14px;font-weight:600;transition:transform .2s,box-shadow .2s}.document-studio .btn-primary{background:var(--accent);border-color:var(--accent)}.document-studio .btn-outline-primary{color:var(--accent);border-color:var(--accent)}.document-studio .btn-outline-primary:hover{background:var(--accent);color:white}.document-studio .btn:not(:disabled):hover{transform:translateY(-2px);box-shadow:0 5px 14px #2b45651a}.active-document{display:flex;align-items:center;gap:12px;flex-wrap:wrap;padding:18px;border:1px solid #dce6f2;border-radius:18px;background:#fff;margin-bottom:14px}.document-file-icon{font-size:1.8rem;color:var(--accent);background:var(--soft);padding:10px;border-radius:12px}.active-document-copy{flex:1;min-width:160px}.active-document-copy small{display:block;font-size:.6rem;letter-spacing:.1em;color:var(--accent);margin-bottom:5px}.active-document-copy strong{display:block;font-size:.8rem;color:#344e70;overflow-wrap:anywhere}.quiet-help{font-size:.73rem;color:#72839a}.quiet-help summary{cursor:pointer}.quiet-help p{margin:10px 0;line-height:1.7;max-width:720px}.document-history{margin:12px 0 24px;border:1px solid #e0e8f3;border-radius:12px;padding:12px 16px;font-size:.78rem;color:#64768f}.document-history summary{cursor:pointer}.document-history summary span{padding:2px 7px;background:var(--soft);border-radius:9px;color:var(--accent)}.document-history .list-group-item{font-size:.75rem;border-color:#edf1f7;overflow-wrap:anywhere}.prepare-panel{border-top:1px solid #e2eaf5;padding:24px 0 0;margin-top:20px}.prepare-panel h6{font-family:'Manrope',sans-serif;font-weight:800;color:var(--accent);font-size:1rem}.prepare-hint{font-size:.8rem;color:#71839c;margin-bottom:12px}.document-stats{display:flex;align-items:center;gap:24px;flex-wrap:wrap;padding:16px;background:var(--soft);border-radius:14px;margin:18px 0}.document-stats span:first-child{flex:1}.document-stats small,.document-stats strong{display:block}.document-stats small{font-size:.65rem;color:#78879c;margin-bottom:4px}.document-stats strong{font-size:.82rem;color:#35506f}@media(max-width:650px){.document-heading{flex-wrap:wrap}.document-heading>small{width:100%;padding-left:40px}.active-document{gap:8px}.active-document .btn{flex:1}.document-stats{gap:16px}.document-studio .btn{min-height:42px}}@media(prefers-reduced-motion:reduce){.document-studio .btn,.document-studio .form-control,.document-studio .form-select{transition:none}.document-studio .btn:hover{transform:none}}
</style>
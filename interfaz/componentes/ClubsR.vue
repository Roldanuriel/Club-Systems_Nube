<template>
  <div>
    <h3 v-if="!modalOnly">Clubs registrados</h3>
    <div v-if="!modalOnly" class="d-flex justify-content-between align-items-center my-3">
      <div>
        <button v-if="canManage" class="btn btn-success me-2" @click="openModal">Agregar club</button>
        <button class="btn btn-outline-secondary" @click="$emit('refresh')" title="Refrescar lista">
          <i class="bi bi-arrow-clockwise"></i> Refrescar
        </button>
      </div>
    </div>

    <div v-if="!modalOnly && clubs && clubs.length">
      <table class="table table-bordered table-striped align-middle">
        <thead class="table-primary">
          <tr>
            <th>Nombre</th>
            <th>Tipo</th>
            <th>Descripción</th>
            <th>Cupo</th>
            <th>Ocupados</th>
            <th>Acciones</th>
          </tr>
        </thead>
        <tbody>
          <!-- Usamos clubsConOcupados en lugar de clubs -->
          <tr v-for="(club, index) in clubsConOcupados" :key="(club.id || club.nombre) + '-' + index">
            <td>{{ club.nombre }}</td>
            <td>
              <span :class="['badge', club.tipo === 'DEPORTIVO' ? 'bg-primary' : 'bg-secondary']">
                {{ club.tipo || 'CULTURAL' }}
              </span>
            </td>
            <td>{{ club.descripcion }}</td>
            <td>{{ club.cupo }}</td>
            <td>{{ club.ocupados }}</td>
            <td>
              <button class="btn btn-outline-primary btn-sm me-2" @click="verAsistencias(club)">Ver lista y asistencias</button>
              <button v-if="canManage" class="btn btn-warning btn-sm me-2" @click="startEdit(club)">Editar</button>
              <button v-if="canManage" class="btn btn-danger btn-sm" @click="confirmDelete(club)">Eliminar</button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
    <p v-else-if="!modalOnly" class="text-muted">No hay clubs registrados.</p>

    <div v-if="!modalOnly && clubSeleccionado" class="card border-0 shadow-sm mt-4">
      <div class="card-header text-white d-flex justify-content-between align-items-center" style="background:var(--brand)">
        <strong>{{ clubSeleccionado.nombre }} — Lista y asistencias</strong>
        <button class="btn btn-sm btn-light" @click="clubSeleccionado = null">Cerrar</button>
      </div>
      <div class="card-body">
        <div v-if="cargandoDetalle" class="text-center py-3">Cargando asistencias...</div>
        <div v-else-if="errorDetalle" class="alert alert-danger mb-0">{{ errorDetalle }}</div>
        <div v-else class="table-responsive">
          <table class="table table-hover align-middle mb-0">
            <thead><tr><th>Alumno</th><th>Número de control</th><th v-for="fecha in detalleClub.fechas" :key="fecha" class="text-center">{{ fechaCorta(fecha) }}</th><th class="text-center">Faltas</th></tr></thead>
            <tbody>
              <tr v-for="alumno in detalleClub.alumnos" :key="alumno.id"><td>{{ nombreAlumno(alumno) }}</td><td>{{ alumno.numeroControl }}</td><td v-for="fecha in detalleClub.fechas" :key="fecha" class="text-center"><span :class="asistio(alumno.id, fecha) ? 'text-success' : 'text-danger'">{{ asistio(alumno.id, fecha) ? '✓' : '✕' }}</span></td><td class="text-center fw-bold">{{ faltasAlumno(alumno.id) }}</td></tr>
              <tr v-if="!detalleClub.alumnos.length"><td :colspan="detalleClub.fechas.length + 3" class="text-center text-muted py-4">No hay alumnos inscritos en este club.</td></tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>

    <!-- Modal agregar/editar -->
    <div class="modal fade" id="modalClubsR" tabindex="-1">
      <div class="modal-dialog modal-dialog-centered">
        <div class="modal-content club-editor">
          <div v-if="!confirmarEdicion" class="modal-header">
            <h5 class="modal-title">{{ editingIndex === null ? 'Agregar nuevo club' : 'Editar club' }}</h5>
            <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
          </div>
          <div v-if="!confirmarEdicion" class="modal-body">
            <p class="editor-intro">Define la actividad y su capacidad. Todos los campos son obligatorios.</p>
            <p v-if="formError" class="alert alert-danger" role="alert">{{ formError }}</p>
            <div class="mb-2">
              <label class="form-label mb-1 fw-semibold" for="club-nombre">Nombre del club <span class="text-danger" aria-hidden="true">*</span></label>
              <input v-model="localClub.nombre" id="club-nombre" required :aria-invalid="intentado && !!erroresCampo.nombre" :class="{'is-invalid':intentado && erroresCampo.nombre}" spellcheck="true" lang="es" autocorrect="on" autocomplete="on" list="nombres-clubes" class="form-control" placeholder="Ej: Danza Folclórica" @input="soloTextoClub" />
              <datalist id="nombres-clubes"><option v-for="n in ['Ajedrez','Atletismo','Basquetbol','Danza Folclórica','Fútbol','Música','Teatro','Voleibol']" :key="n" :value="n" /></datalist><div class="form-text">Solo letras y espacios. Cada palabra debe iniciar con mayúscula.</div>
            </div>
            <div class="mb-2">
              <label class="form-label mb-1 fw-semibold" for="club-tipo">Tipo de club <span class="text-danger" aria-hidden="true">*</span></label>
              <select v-model="localClub.tipo" id="club-tipo" required :aria-invalid="intentado && !!erroresCampo.tipo" :class="{'is-invalid':intentado && erroresCampo.tipo}" class="form-select">
                <option value="CULTURAL">Cultural (danza, teatro, música…)</option>
                <option value="DEPORTIVO">Deportivo (fútbol, voleibol, basquetbol…)</option>
              </select>
              <div class="form-text">Selecciona la categoría que corresponde a la actividad del club.</div>
            </div>
            <div class="mb-2">
              <label class="form-label mb-1 fw-semibold" for="club-descripcion">Descripción <span class="text-danger" aria-hidden="true">*</span></label>
              <input v-model="localClub.descripcion" id="club-descripcion" required :aria-invalid="intentado && !!erroresCampo.descripcion" :class="{'is-invalid':intentado && erroresCampo.descripcion}" spellcheck="true" lang="es" autocorrect="on" autocomplete="on" class="form-control" placeholder="Ej: Grupo De Baile Tradicional" @input="soloTextoDescripcion" />
              <div class="form-text">Descripción breve de la actividad que realiza el club.</div>
            </div>
            <div class="mb-2">
              <label class="form-label mb-1 fw-semibold" for="club-cupo">Cupo máximo <span class="text-danger" aria-hidden="true">*</span></label>
              <input v-model.number="localClub.cupo" id="club-cupo" required :aria-invalid="intentado && !!erroresCampo.cupo" :class="{'is-invalid':intentado && erroresCampo.cupo}" type="number" min="1" max="50" class="form-control" placeholder="Ej: 25" />
              <div class="form-text">Número máximo de alumnos permitidos (entre 1 y 50).</div>
            </div>
          </div>
          <div v-if="confirmarEdicion" class="edit-confirmation" role="alert"><i class="bi bi-exclamation-triangle-fill confirmation-symbol" aria-hidden="true"></i><strong>¿Estás seguro de guardar los cambios?</strong><p>Se actualizará la información de este club.</p><button class="btn btn-outline-secondary me-2" @click="confirmarEdicion=false">Seguir editando</button><button class="btn btn-warning" @click="saveClub(true)">Sí, guardar cambios</button></div>
          <div v-if="!confirmarEdicion" class="modal-footer">
            <button class="btn btn-secondary" data-bs-dismiss="modal">Cancelar</button>
            <button v-if="!confirmarEdicion" class="btn btn-primary" @click="saveClub()">{{ editingIndex === null ? 'Guardar' : 'Actualizar' }}</button>
          </div>
        </div>
      </div>
    </div>

    <!-- Confirm delete modal -->
    <div class="modal fade" id="confirmDeleteClub" tabindex="-1">
      <div class="modal-dialog modal-dialog-centered">
        <div class="modal-content club-editor">
          <div class="modal-header bg-danger text-white">
            <h5 class="modal-title">Confirmar eliminación</h5>
            <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
          </div>
          <div class="modal-body">
            <i class="bi bi-trash3-fill confirmation-symbol text-danger" aria-hidden="true"></i><p class="fw-semibold">¿Estás seguro de eliminar este club?</p><p>Una vez eliminado, no podrás recuperar la información del club desde el sistema.</p>
          </div>
          <div class="modal-footer">
            <button class="btn btn-secondary" data-bs-dismiss="modal">Cancelar</button>
            <button class="btn btn-danger" :disabled="deleteSeconds>0" @click="deleteConfirmed">{{ deleteSeconds>0 ? "Espera "+deleteSeconds+" segundos" : "Sí, eliminar definitivamente" }}</button>
          </div>
        </div>
      </div>
    </div>

  </div>
</template>

<script>
import { getAsistenciasPorClub } from '../servicios/api';
export default {
  name: 'ClubsR',
  // Ahora recibimos alumnos también
  props: {
    clubs: {
      type: Array,
      default: () => []
    },
    fechas: {
      type: Array,
      default: () => []
    },
    alumnos: {
      type: Array,
      default: () => []
    },
    canManage: {
      type: Boolean,
      default: false
    },
    modalOnly: {
      type: Boolean,
      default: false
    }
  },
  data() {
    return {
      localClub: {
        nombre: '',
        tipo: 'CULTURAL',
        descripcion: '',
        cupo: 0
      },
      deleteSeconds:5,deleteTimer:null,deleteReadyAt:0,intentado:false,formError:'',confirmarEdicion:false,
      editingIndex: null,
      pendingDeleteIndex: null,
      clubSeleccionado: null,
      detalleClub: {
        fechas: [],
        alumnos: [],
        asistencias: {}
      },
      cargandoDetalle: false,
      errorDetalle: ''
    };
  },
  computed: {
    erroresCampo(){const c=this.localClub;return {nombre:!String(c.nombre||'').trim(),tipo:!['CULTURAL','DEPORTIVO'].includes(c.tipo),descripcion:!String(c.descripcion||'').trim(),cupo:!Number.isInteger(Number(c.cupo))||Number(c.cupo)<1||Number(c.cupo)>50};},
    alumnosVersion() {
      return (this.alumnos || []).map(alumno => `${alumno.id}:${alumno.clubId ?? alumno.club_id ?? ''}`).join('|');
    },
    // Mapea campos que vienen de la BD a un formato uniforme y calcula ocupados.
    clubsConOcupados() {
      const rawClubs = Array.isArray(this.clubs) ? this.clubs : [];
      const alumnos = Array.isArray(this.alumnos) ? this.alumnos : [];
      const norm = s => {
        const str = s == null ? '' : String(s);
        return str.trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
      };
      return rawClubs.map(c => {
        // Normalización de campos desde la BD
        const id = c.id ?? c.ID ?? c.id_club ?? null;
        const nombre = c.nombre ?? c.Name ?? c.titulo ?? '';
        const tipo = c.tipo ?? c.Type ?? 'CULTURAL';
        const descripcion = c.descripcion ?? c.description ?? '';
        const cupo = c.cupo != null ? c.cupo : c.cupo_limite != null ? c.cupo_limite : 0;
        // Preferimos valor de BD si existe
        let ocupados = c.ocupados != null ? c.ocupados : c.cupo_ocupado != null ? c.cupo_ocupado : null;

        // Si no viene de BD o viene 0, intentamos contar alumnos inscritos
        if (ocupados == null || ocupados === 0) {
          // Primero intento por id si el club tiene id
          let ocupadosPorId = 0;
          if (id != null) {
            ocupadosPorId = alumnos.filter(a => {
              const alumnoClubId = a && a.clubId != null ? a.clubId : a && a.club_id != null ? a.club_id : a && a.club && a.club.id != null ? a.club.id : null;
              return alumnoClubId != null && String(alumnoClubId) === String(id);
            }).length;
          }

          // Luego intento por nombre (por si los alumnos no traen id del club)
          const ocupadosPorNombre = alumnos.filter(a => {
            const nombreAlumnoClub = a && a.clubNombre != null ? a.clubNombre : a && typeof a.club === 'string' ? a.club : a && a.club && a.club.nombre ? a.club.nombre : '';
            return norm(nombreAlumnoClub) === norm(nombre);
          }).length;
          ocupados = Math.max(ocupadosPorId, ocupadosPorNombre);
        }
        return {
          ...c,
          id,
          nombre,
          tipo,
          descripcion,
          cupo,
          ocupados
        };
      });
    }
  },
  watch: {
    // Si se asigna un alumno mientras está abierto el detalle, refrescar la lista
    // del club para que aparezca inmediatamente.
    alumnosVersion() {
      if (this.clubSeleccionado && !this.cargandoDetalle) this.verAsistencias(this.clubSeleccionado);
    }
  },
  methods: {
    async verAsistencias(club) {
      this.clubSeleccionado = club;
      this.cargandoDetalle = true;
      this.errorDetalle = '';
      try {
        this.detalleClub = await getAsistenciasPorClub(club.id);
      } catch (error) {
        this.errorDetalle = error.message || 'No se pudieron cargar las asistencias';
      } finally {
        this.cargandoDetalle = false;
      }
    },
    nombreAlumno(alumno) {
      return `${alumno.nombre || ''} ${alumno.apellidoP || ''} ${alumno.apellidoM || ''}`.replace(/\s+/g, ' ').trim();
    },
    asistio(id, fecha) {
      return Boolean(this.detalleClub.asistencias?.[id]?.[fecha]);
    },
    faltasAlumno(id) {
      return this.detalleClub.fechas.filter(fecha => !this.asistio(id, fecha)).length;
    },
    fechaCorta(fecha) {
      const parts = String(fecha).split('-');
      return parts.length === 3 ? `${parts[2]}/${parts[1]}` : fecha;
    },
    emitError(msg) {
      this.$emit('show-error', msg);
    },
    normalizarTexto(valor) {
      // No forzar trim/capitalización mientras el usuario escribe para no romper espacios.
      return (valor || '').replace(/[^A-Za-zÁÉÍÓÚáéíóúÑñÜü\s]/g, '');
    },
    formatearTitulo(valor) {
      const limpio = (valor || '').replace(/[^A-Za-zÁÉÍÓÚáéíóúÑñÜü\s]/g, '').replace(/\s+/g, ' ').trim();
      if (!limpio) return '';
      return limpio.split(' ').map(p => p ? p.charAt(0).toUpperCase() + p.slice(1).toLowerCase() : '').join(' ');
    },
    sugerirNombreClub(valor) {
      return String(valor || '').replace(/([aeiouáéíóúü])\1+/giu, '$1').replace(/(\p{L})\1{2,}/giu, '$1').replace(/\s+/g, ' ').trim();
    },
    soloTextoClub() {
      this.localClub.nombre = this.normalizarTexto(this.localClub.nombre);
    },
    soloTextoDescripcion() {
      this.localClub.descripcion = this.normalizarTexto(this.localClub.descripcion);
    },
    openModal() {
      this.intentado=false;this.formError="";this.confirmarEdicion=false;
      if (!this.canManage) return;
      this.editingIndex = null;
      this.localClub = {
        nombre: '',
        tipo: 'CULTURAL',
        descripcion: '',
        cupo: 0
      };
      new bootstrap.Modal(document.getElementById('modalClubsR')).show();
    },
    startEdit(club) {
      this.intentado=false;this.formError="";this.confirmarEdicion=false;
      if (!this.canManage) return;
      this.editingIndex = club?.id ?? null;
      const c = club || {};
      this.localClub = {
        nombre: c.nombre,
        tipo: c.tipo || 'CULTURAL',
        descripcion: c.descripcion,
        cupo: c.cupo
      };
      new bootstrap.Modal(document.getElementById('modalClubsR')).show();
    },
    validarClub() {
      const nombre = (this.localClub.nombre || '').trim();
      const descripcion = (this.localClub.descripcion || '').trim();
      const cupo = Number(this.localClub.cupo);
      if (!nombre) return 'El nombre del club es obligatorio.';
      if (nombre.length > 100) return 'El nombre debe tener máximo 100 caracteres.';
      if (/(\p{L})\1\1|([aeiouáéíóúü])\2/iu.test(nombre)) return `“${nombre}” parece estar escrito incorrectamente. ¿Quiso escribir “${this.sugerirNombreClub(nombre)}”?`;
      if (!/^[A-ZÁÉÍÓÚÑ][A-Za-zÁÉÍÓÚáéíóúÑñÜü\s]*$/.test(nombre)) {
        return 'El nombre solo permite letras y espacios, y debe iniciar con mayúscula.';
      }
      if (!descripcion) return 'La descripción del club es obligatoria.';
      if (!/^[A-ZÁÉÍÓÚÑ][A-Za-zÁÉÍÓÚáéíóúÑñÜü\s]*$/.test(descripcion)) {
        return 'La descripción solo permite texto y debe iniciar con mayúscula.';
      }
      if (!Number.isInteger(cupo) || cupo < 1 || cupo > 50) {
        return 'El cupo debe ser un número entero entre 1 y 50.';
      }
      return '';
    },
    saveClub(confirmado=false) {
      this.intentado=true;this.formError="";
      if (!this.canManage) return;
      // Formatear al guardar, sin interferir con la escritura del usuario.
      this.localClub.nombre = this.formatearTitulo(this.localClub.nombre);
      this.localClub.descripcion = this.formatearTitulo(this.localClub.descripcion);
      const error = this.validarClub() || (this.erroresCampo.tipo ? "Selecciona el tipo de club." : "");
      if (error) {
        this.$emit('log', {
          usuario: 'Usuario Oficina',
          accion: 'Error',
          tipo: 'club',
          descripcion: 'Campos obligatorios'
        });
        this.formError=error;
        this.$nextTick(()=>document.querySelector("#modalClubsR .is-invalid")?.focus());
        return;
      }
      if(this.editingIndex!==null && confirmado!==true){this.confirmarEdicion=true;return;}
      this.confirmarEdicion=false;
      if (this.editingIndex === null) {
        this.$emit('add-club', {
          ...this.localClub
        }, 'Usuario Oficina');
      } else {
        this.$emit('edit-club', {
          id: this.editingIndex,
          club: {
            ...this.localClub
          }
        }, 'Usuario Oficina');
      }
      // Mover foco antes de cerrar para evitar el warning de aria-hidden
      if (document.activeElement) document.activeElement.blur();
      bootstrap.Modal.getInstance(document.getElementById('modalClubsR')).hide();
    },
    confirmDelete(club) {
      if (!this.canManage) return;
      clearInterval(this.deleteTimer);this.deleteSeconds=5;this.deleteReadyAt=Date.now()+5000;
      this.deleteTimer=setInterval(()=>{this.deleteSeconds=Math.max(0,Math.ceil((this.deleteReadyAt-Date.now())/1000));if(!this.deleteSeconds)clearInterval(this.deleteTimer);},200);
      this.pendingDeleteIndex = club?.id ?? null;
      new bootstrap.Modal(document.getElementById('confirmDeleteClub')).show();
    },
    deleteConfirmed() {
      if (!this.canManage || this.deleteSeconds>0 || Date.now()<this.deleteReadyAt) return;
      clearInterval(this.deleteTimer);
      this.$emit('delete-club', this.pendingDeleteIndex, 'Usuario Oficina');
      // Mover foco antes de cerrar para evitar el warning de aria-hidden
      if (document.activeElement) document.activeElement.blur();
      bootstrap.Modal.getInstance(document.getElementById('confirmDeleteClub')).hide();
    }
  },
  beforeUnmount(){clearInterval(this.deleteTimer);},
  mounted() {
    // Solución global al warning de aria-hidden:
    // Cada vez que Bootstrap VAYA A ocultar cualquiera de los modales,
    // movemos el foco fuera antes de que se aplique aria-hidden="true".
    const blurOnHide = () => {
      if (document.activeElement && document.activeElement !== document.body) {
        document.activeElement.blur();
      }
    };
    ['modalClubsR', 'confirmDeleteClub'].forEach(id => {
      const el = document.getElementById(id);
      if (el) el.addEventListener('hide.bs.modal', blurOnHide);
    });
  }
};
</script>

<style scoped>
.club-editor{border:1px solid #fff;border-radius:26px;background:linear-gradient(145deg,#fff,#edf4ff);box-shadow:0 24px 70px #18315930;overflow:hidden}.club-editor .modal-header{padding:24px;border-bottom:1px solid #dce7fa;background:linear-gradient(120deg,#e8f2ff,#f8fbff)}.club-editor .modal-title{font-family:'Manrope',sans-serif;font-weight:800;color:#204b91}.club-editor .modal-body{padding:24px}.editor-intro{color:#637b9c;font-size:.85rem;margin-bottom:22px}.club-editor .mb-2{margin-bottom:20px!important}.club-editor .form-label{font-size:.85rem;color:#2b466e}.club-editor .form-control,.club-editor .form-select{border:1px solid #ccdff8;border-radius:13px;background:#ffffffb0;padding:12px 14px;transition:border-color .2s,box-shadow .2s}.club-editor .form-control:focus,.club-editor .form-select:focus{box-shadow:0 0 0 4px #3985e51b;border-color:#478ee8}.club-editor .is-invalid{border:2px solid #d64d67!important;background:#fff5f6;box-shadow:0 0 0 3px #d64d6716}.club-editor .form-text{font-size:.74rem;color:#6b819f;margin-top:7px}.club-editor .modal-footer{padding:18px 24px;border-top:1px solid #dce7fa}.club-editor .btn{border-radius:12px;padding:10px 16px;font-weight:600;transition:transform .2s,box-shadow .2s}.club-editor .btn:hover{transform:translateY(-2px);box-shadow:0 5px 14px #285ca624}.club-editor .btn-primary{background:linear-gradient(120deg,#168df0,#314bea);border:0}.edit-confirmation{border:1px solid #afc8ef;background:#e7f0ff;border-radius:16px;padding:18px;color:#234d8a}.edit-confirmation p{font-size:.85rem;margin:8px 0 14px}#confirmDeleteClub .modal-header{background:#fff0f3!important}.modal.fade .modal-dialog{transition:transform .28s ease-out}.modal.fade:not(.show) .modal-dialog{transform:translateY(20px) scale(.97)}@media(prefers-reduced-motion:reduce){.modal.fade .modal-dialog,.club-editor .btn{transition:none;transform:none}}
</style>
<style scoped>.edit-confirmation{margin:0!important;padding:36px 28px;text-align:center;background:linear-gradient(135deg,#fff9dd,#ffedaf);border:2px solid #efc654;border-radius:24px;color:#795711}.edit-confirmation strong{display:block;font-size:1.25rem}.confirmation-symbol{display:block;font-size:2.6rem;margin-bottom:16px}.edit-confirmation .btn-warning{background:#f2c441;color:#513c0b;border-color:#dfb334}#confirmDeleteClub .club-editor{border:2px solid #e05a6a;background:#fff5f6}#confirmDeleteClub .modal-header{background:#ffe0e5!important}#confirmDeleteClub .modal-title{color:#ac203c}#confirmDeleteClub .modal-body{text-align:center;color:#8c2840}#confirmDeleteClub .btn-danger{background:#d52949;border-color:#c0213e;font-weight:700}#confirmDeleteClub .btn-danger:disabled{background:#f5b0bd;color:#702136;border-color:#eda0b0;opacity:1}</style>
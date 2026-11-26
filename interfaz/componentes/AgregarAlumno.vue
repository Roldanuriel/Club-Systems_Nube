<template><div>
<button class="btn btn-primary" :disabled="disabled" @click="abrir">Agregar alumno</button>
    <!-- Modal agregar (sin Bootstrap) -->
    <div v-if="showAddModal" class="modal-backdrop" @click.self="showAddModal = false">
      <div class="modal-card">
        <div class="modal-header">
          <h5>Agregar alumno</h5>
          <button class="btn-close" @click="showAddModal = false">×</button>
        </div>
        <div class="modal-body">
          <div class="grid">
            <input v-model="form.nombre" class="input" placeholder="Nombre(s)" @input="soloTexto('nombre')" />
            <input v-model="form.apellidoP" class="input" placeholder="Apellido paterno" @input="soloTexto('apellidoP')" />
            <input v-model="form.apellidoM" class="input" placeholder="Apellido materno" @input="soloTexto('apellidoM')" />

            <select v-model="form.carrera" class="input">
              <option disabled value="">Selecciona carrera</option>
              <option v-for="c in carreras" :key="c.id">{{ c.nombre }}</option>
            </select>

            <select v-model="form.semestre" class="input">
              <option disabled value="">Selecciona semestre</option>
              <option v-for="n in 7" :key="n">{{ n }}</option>
            </select>

            <input v-model="form.control" maxlength="8" class="input" placeholder="Número de control (8 dígitos)" @input="soloNumeros('control')" />
            <input v-model="form.telefono" class="input" placeholder="Teléfono" @input="soloNumeros('telefono')" />

            <select v-model="form.clubId" class="input">
              <option disabled value="">Selecciona club</option>
              <option v-for="c in clubs" :key="c.id || c.nombre" :value="c.id">{{ c.nombre }}</option>
            </select>
          </div>
        </div>
        <div class="modal-footer modal-actions">
          <button class="btn btn-light" @click="showAddModal = false">Cancelar</button>
          <button class="btn btn-primary" @click="guardar" :disabled="loading">Guardar</button>
        </div>
      </div>
    </div>


<div v-if="error" class="toast-local error" role="alert">{{ error }}</div>
<div v-if="mensaje" class="toast-local success" role="status">{{ mensaje }}</div>
</div></template>
<script>
import { createAlumno } from '../servicios/api';
const nuevoFormulario = () => ({ nombre: '', apellidoP: '', apellidoM: '', carrera: '', semestre: '', control: '', telefono: '', clubId: '' });
export default {
 name: 'AgregarAlumno',
 props: { clubs: { type: Array, default: () => [] }, carreras: { type: Array, default: () => [] }, disabled: Boolean },
 emits: ['add-alumno', 'request-reload-alumnos'],
 data() { return { form: nuevoFormulario(), showAddModal: false, loading: false, error: '', mensaje: '' }; },
 methods: {
  abrir() { this.form = nuevoFormulario(); this.error = ''; this.mensaje = ''; this.showAddModal = true; },
  soloTexto(campo) { this.form[campo] = this.form[campo].replace(/[^A-Za-zÁÉÍÓÚáéíóúÑñÜü\s]/g, '').replace(/\s+/g, ' ').trimStart().split(' ').map(p => p ? p[0].toUpperCase() + p.slice(1).toLowerCase() : '').join(' ').trimEnd(); },
  soloNumeros(campo) { this.form[campo] = this.form[campo].replace(/\D/g, ''); },
  async guardar() {
   if (this.loading) return;
   this.error = ''; this.mensaje = '';
   if (!this.form.nombre || !/^\d{8}$/.test(this.form.control) || (this.form.telefono && !/^\d+$/.test(this.form.telefono)) || !this.form.clubId) {
    this.error = 'Verifique los campos (control 8 dígitos, teléfono numérico, club obligatorio)'; return;
   }
   this.loading = true;
   try {
    const id_club = Number(this.form.clubId);
    const saved = await createAlumno({ nombre: this.form.nombre, apellidoP: this.form.apellidoP, apellidoM: this.form.apellidoM, numeroControl: this.form.control, telefono: this.form.telefono || null, carrera_id: this.carreras.find(c => c.nombre === this.form.carrera)?.id || null, semestre_id: this.form.semestre ? Number(this.form.semestre) : null, id_club });
    this.$emit('add-alumno', { id: saved.id, nombre: saved.nombre, apellidoP: saved.apellidoP, apellidoM: saved.apellidoM, carrera: this.form.carrera, semestre: this.form.semestre, control: saved.numeroControl, telefono: saved.telefono, club: this.clubs.find(c => Number(c.id) === id_club)?.nombre || '' }, 'Usuario Oficina');
    this.$emit('request-reload-alumnos');
    this.showAddModal = false;
    this.mensaje = 'Alumno registrado. Puedes consultarlo en Alumnos registrados.';
   } catch (e) { this.error = e.message || 'Error al registrar alumno'; }
   finally { this.loading = false; }
  }
 }
};
</script>
<style scoped>
.btn { padding: 6px 12px; border-radius: 6px; border: 1px solid #999; background: #f5f5f5; cursor: pointer; }
.btn-primary { background: #1976d2; color: #fff; border-color: #1976d2; }
.btn-light { background: #fafafa; color: #333; border-color: #ddd; }
.btn-danger { background: #d32f2f; color: #fff; border-color: #d32f2f; }
.btn-warning { background: #f9a825; color: #fff; border-color: #f9a825; }
.btn-sm { padding: 4px 10px; font-size: 0.875rem; }
.btn:disabled { opacity: .6; cursor: not-allowed; }
.btn:hover { filter: brightness(0.95); }
.btn-close { border: none; background: transparent; font-size: 22px; line-height: 1; cursor: pointer; }

.input { padding: 8px; border: 1px solid #ccc; border-radius: 4px; min-width: 0; }
.grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 10px; }

.modal-backdrop { position: fixed; inset: 0; background: rgba(0,0,0,.5); display: flex; align-items: center; justify-content: center; z-index: 2000; }
.modal-card { width: min(800px, 95%); background: #fff; border-radius: 8px; box-shadow: 0 10px 30px rgba(0,0,0,.2); display: flex; flex-direction: column; }
.modal-header { display: flex; align-items: center; justify-content: space-between; padding: 10px 14px; border-bottom: 1px solid #eee; }
.modal-body { padding: 14px; }
.modal-footer { padding: 10px 14px; display: flex; justify-content: flex-end; border-top: 1px solid #eee; }
.modal-actions { gap: 10px; }

.toast-local { position: fixed; right: 12px; bottom: 12px; padding: 10px 14px; border-radius: 6px; color: #fff; z-index: 2100; }
.toast-local.success { background: #43a047; }
.toast-local.error { background: #e53935; }

.modal-card { max-height: calc(100dvh - 24px); overflow-y: auto; }
@media (max-width: 576px) { .grid { grid-template-columns: 1fr; } }
</style>
<template>
<section class="school-panel">
 <h3>{{ titulo }}</h3>
 <p v-if="mensaje" class="alert alert-info" role="status">{{ mensaje }}</p>
 <input v-if="modo==='adeudos'" v-model="busqueda" class="form-control mb-3" placeholder="Buscar alumno o número de control" aria-label="Buscar alumno">
 <form v-if="modo !== 'adeudos'" class="card card-body mb-4" @submit.prevent="guardar">
 <div class="student-picker" @focusout="cerrarSugerencias"><label for="buscar-estudiante">Alumno y periodo</label>
 <input id="buscar-estudiante" v-model="consulta" class="form-control" autocomplete="off" placeholder="Escribe un nombre o número de control" role="combobox" aria-autocomplete="list" aria-controls="sugerencias-alumnos" :aria-expanded="sugerenciasAbiertas" :aria-activedescendant="indiceSugerencia>=0 ? 'sugerencia-'+indiceSugerencia : undefined" @input="editarBusqueda" @focus="sugerenciasAbiertas=true" @keydown.down.prevent="moverSugerencia(1)" @keydown.up.prevent="moverSugerencia(-1)" @keydown.enter.prevent="elegirActiva" @keydown.esc="sugerenciasAbiertas=false">
 <ul v-if="sugerenciasAbiertas && consulta.trim()" id="sugerencias-alumnos" class="student-suggestions" role="listbox"><li v-for="(a,i) in sugerencias" :id="'sugerencia-'+i" :key="a.id" role="option" :aria-selected="indiceSugerencia===i" @mousedown.prevent="seleccionarAlumno(a)"><strong>{{ nombre(a) }}</strong><small>{{ a.numeroControl }} · {{ a.club || 'Sin club' }} · {{ a.periodo }}</small></li><li v-if="!sugerencias.length" role="presentation">No hay coincidencias.</li></ul>
 <p v-if="form.alumno_id" class="selected-student">✓ {{ alumno(form.alumno_id).numeroControl }} · {{ alumno(form.alumno_id).club || 'Sin club' }} · {{ alumno(form.alumno_id).periodo }}</p><small v-else class="text-muted">Selecciona una sugerencia para confirmar al estudiante.</small></div>
 <template v-if="modo==='pagos'">
 <label>Folio del comprobante<input v-model="form.folio" required maxlength="100" class="form-control mb-2"></label>
 <label>Monto pagado<input v-model.number="form.monto" required type="number" min="0" step="0.01" class="form-control mb-2"></label>
 <label>Solicitud de reposición<select v-model.number="form.solicitud_id" class="form-select mb-2"><option :value="null">Pago sin solicitud de reposición</option><option v-for="s in solicitudesAlumno" :key="s.id" :value="s.id">Solicitud {{ s.id }} · {{ s.motivo }}</option></select></label>
 <label class="mb-3"><input v-model="form.verificado" type="checkbox" required> Verifiqué el nombre o número de control y el folio del comprobante.</label>
 </template>
 <label v-else>Motivo de reposición<input v-model="form.motivo" required minlength="3" class="form-control mb-3"></label>
 <button :disabled="ocupado || !form.alumno_id" class="btn btn-primary">{{ modo==='pagos' ? 'Registrar pago verificado' : 'Solicitar reposición' }}</button>
 </form>
 <template v-if="modo==='adeudos'">
 <form class="card card-body mb-3" @submit.prevent="registrarMaterial"><h5>Registrar material pendiente</h5>
 <select v-model.number="form.alumno_id" required class="form-select mb-2"><option :value="0">Selecciona alumno</option><option v-for="a in filtrados" :key="a.id" :value="a.id">{{ nombre(a) }} · {{ a.numeroControl }} · {{ a.club }}</option></select>
 <input v-model="form.descripcion" required minlength="3" class="form-control mb-2" placeholder="Material que debe devolver"><button :disabled="ocupado" class="btn btn-primary">Registrar adeudo</button></form>
 <table class="table"><thead><tr><th>Alumno / control</th><th>Club</th><th>Motivo</th><th>Acciones</th></tr></thead><tbody>
 <tr v-for="a in reprobados" :key="'r'+a.id"><td>{{ nombre(a) }} · {{ a.numeroControl }}</td><td>{{ a.club }}</td><td>{{ a.motivo || 'Periodo reprobado' }}</td><td><button class="btn btn-outline-primary" :disabled="ocupado" @click="autorizar(a)">Autorizar inscripción</button></td></tr>
 <tr v-for="d in materialesVisibles" :key="'m'+d.id"><td>{{ nombre(alumno(d.alumno_id)) }} · {{ alumno(d.alumno_id).numeroControl }}</td><td>{{ alumno(d.alumno_id).club }}</td><td>{{ d.descripcion }}</td><td><button class="btn btn-outline-success" :disabled="ocupado" @click="accion({accion:'resolver',id:d.id})">Marcar devuelto</button> <button class="btn btn-outline-primary" :disabled="ocupado" @click="autorizar(alumno(d.alumno_id))">Autorizar inscripción</button></td></tr>
 </tbody></table>
 </template>
 <table v-else class="table"><thead><tr><th>Alumno</th><th>Control / club / periodo</th><th>{{ modo==='pagos' ? 'Folio / monto' : 'Solicitud' }}</th><th>Estado</th></tr></thead><tbody>
 <tr v-for="r in registros" :key="r.id"><td>{{ nombre(alumno(r.alumno_id)) }}</td><td>{{ alumno(r.alumno_id).numeroControl }} · {{ alumno(r.alumno_id).club }} · {{ alumno(r.alumno_id).periodo }}</td><td>{{ r.folio || r.motivo }} <span v-if="r.monto != null">· $ {{ r.monto }}</span></td><td><span v-if="modo==='pagos'">Verificado</span><button v-else-if="r.folio" :disabled="ocupado" class="btn btn-primary" @click="emitir(r)">Imprimir reposición</button><span v-else>Pendiente de folio de pago</span></td></tr>
 </tbody></table>
 <Constancias v-if="modo==='solicitudes'" ref="generador" generator-only />
</section></template>
<script>
import api from '../servicios/cliente-http';
import Constancias from './Constancias.vue';
export default {
 components:{Constancias},props:{modo:String},
 data:()=>({datos:{alumnos:[],pagos:[],solicitudes:[],materiales:[]},busqueda:'',consulta:'',sugerenciasAbiertas:false,indiceSugerencia:-1,mensaje:'',ocupado:false,form:{alumno_id:0,folio:'',monto:0,solicitud_id:null,verificado:false,motivo:'',descripcion:''}}),
 computed:{
 sugerencias(){const t=this.normalizar(this.consulta);return t ? this.datos.alumnos.filter(a=>this.normalizar(this.nombre(a)+' '+a.numeroControl).includes(t)).slice(0,12) : [];},
 titulo(){return {pagos:'Registro de pagos',adeudos:'Adeudos',solicitudes:'Solicitudes de constancias'}[this.modo];},
 filtrados(){const t=this.busqueda.toLowerCase();return this.datos.alumnos.filter(a=>(this.nombre(a)+' '+a.numeroControl).toLowerCase().includes(t));},
 solicitudesAlumno(){return this.datos.solicitudes.filter(s=>Number(s.alumno_id)===Number(this.form.alumno_id)&&!s.folio);},
 registros(){return this.datos[this.modo==='pagos'?'pagos':'solicitudes'].filter(r=>this.filtrados.some(a=>Number(a.id)===Number(r.alumno_id)));},
 reprobados(){return this.filtrados.filter(a=>a.bloqueado || (a.evaluacion_id && Number(a.nivel_desempeno)<1) || a.estado_periodo==='REPROBADO');},
 materialesVisibles(){return this.datos.materiales.filter(d=>!d.resuelto && this.filtrados.some(a=>Number(a.id)===Number(d.alumno_id)));}
 },
 mounted(){this.cargar();},methods:{
 normalizar(t){return String(t||'').normalize('NFD').replace(/[̀-ͯ]/g,'').toLowerCase().trim();},
 editarBusqueda(){this.form.alumno_id=0;this.form.solicitud_id=null;this.form.verificado=false;this.indiceSugerencia=-1;this.sugerenciasAbiertas=true;},
 seleccionarAlumno(a){this.form.alumno_id=Number(a.id);this.consulta=this.nombre(a);this.form.solicitud_id=null;this.form.verificado=false;this.sugerenciasAbiertas=false;this.indiceSugerencia=-1;},
 moverSugerencia(d){this.sugerenciasAbiertas=true;this.indiceSugerencia=Math.max(0,Math.min(this.sugerencias.length-1,this.indiceSugerencia+d));},
 elegirActiva(){const a=this.sugerencias[this.indiceSugerencia];if(a)this.seleccionarAlumno(a);},
 cerrarSugerencias(e){if(!e.currentTarget.contains(e.relatedTarget))this.sugerenciasAbiertas=false;},
 nombre(a){return [a?.nombre,a?.apellidoP,a?.apellidoM].filter(Boolean).join(' ');},alumno(id){return this.datos.alumnos.find(a=>Number(a.id)===Number(id))||{};},
 async cargar(){try{this.datos=(await api.get('/gestion-escolar')).data.data;}catch(e){this.mensaje=e.response?.data?.statusMessage || e.message;}},
 async accion(body){if(this.ocupado)return;this.ocupado=true;try{await api.post('/gestion-escolar',body);this.mensaje='Registro guardado.';await this.cargar();}catch(e){this.mensaje=e.response?.data?.statusMessage || e.message;}finally{this.ocupado=false;}},
 guardar(){return this.accion(this.modo==='pagos'?{accion:'pago',alumno_id:this.form.alumno_id,folio:this.form.folio,monto:this.form.monto,solicitud_id:this.form.solicitud_id,verificado:this.form.verificado}:{accion:'solicitar',alumno_id:this.form.alumno_id,motivo:this.form.motivo});},
 registrarMaterial(){return this.accion({accion:'material',alumno_id:this.form.alumno_id,descripcion:this.form.descripcion});},
 autorizar(a){const motivo=prompt('Motivo para autorizar la inscripción de '+this.nombre(a)+'. El adeudo seguirá registrado:');if(motivo)this.accion({accion:'autorizar',alumno_id:Number(a.id),motivo});},
 async emitir(r){this.ocupado=true;try{const {data}=await api.post('/gestion-escolar',{accion:'emitir',id:Number(r.id)});await this.$refs.generador.generarReposicionHistorica(data.data);}catch(e){this.mensaje=e.response?.data?.statusMessage || e.message;}finally{this.ocupado=false;}}
 }};
</script>
<style scoped>.school-panel{background:rgba(255,255,255,.8);border-radius:24px;padding:24px;overflow:auto}.card{border:1px solid #dbe6fb;border-radius:18px}label{display:block}.table{min-width:680px}</style>

<style scoped>.student-picker{position:relative;margin-bottom:22px}.student-picker label{font-weight:600;margin-bottom:8px}.student-suggestions{position:absolute;top:76px;left:0;right:0;z-index:20;max-height:280px;overflow:auto;list-style:none;padding:6px;background:#fff;border:1px solid #cbdcf7;border-radius:18px;box-shadow:0 16px 38px #203b7026}.student-suggestions li{padding:12px;border-radius:12px;cursor:pointer;color:#19345d}.student-suggestions li:hover,.student-suggestions li[aria-selected=true]{background:#e8f0ff}.student-suggestions small{display:block;color:#60789c;margin-top:4px}.selected-student{background:#eaf2ff;color:#2354aa;border-radius:12px;padding:10px;margin:8px 0 0}</style>
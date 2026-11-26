<template><section class="card card-body">
<h3>Periodos escolares</h3><p>Registra periodos anteriores o prepara el siguiente. El cierre requiere confirmación.</p><p v-if="mensaje" class="alert alert-info">{{ mensaje }}</p>
<form class="row g-3 mb-4" @submit.prevent="guardar">
<div class="col-md-4"><label>Periodo<select v-model="form.semestre" class="form-select"><option>ENERO - JUNIO</option><option>AGOSTO - DICIEMBRE</option></select></label></div>
<div class="col-md-2"><label>Año<input v-model.number="form.anio" type="number" min="2000" max="2200" required class="form-control"></label></div>
<div class="col-md-3"><label>Inicio<input v-model="form.fecha_inicio" type="date" required class="form-control"></label></div>
<div class="col-md-3"><label>Término<input v-model="form.fecha_fin" type="date" required class="form-control"></label></div>
<div v-if="!form.id"><label>Estado<select v-model="form.estado" class="form-select"><option value="CERRADO">Histórico (cerrado)</option><option value="ACTIVO">Activo</option></select></label></div>
<div><button class="btn btn-primary" :disabled="ocupado">{{form.id?'Guardar cambios':'Registrar periodo'}}</button> <button v-if="form.id" type="button" class="btn btn-light" @click="nuevo">Cancelar</button></div>
</form>
<table class="table"><thead><tr><th>Periodo</th><th>Inicio</th><th>Término</th><th>Estado</th><th>Acciones</th></tr></thead><tbody><tr v-for="p in periodos" :key="p.id"><td>{{p.nombre}}</td><td>{{fecha(p.fecha_inicio)}}</td><td>{{fecha(p.fecha_fin)}}</td><td>{{p.estado}}</td><td><button class="btn btn-outline-primary" @click="editar(p)">Modificar</button> <button v-if="p.estado==='ACTIVO'" :disabled="ocupado" class="btn btn-outline-danger" @click="confirmar=p">Cerrar periodo</button></td></tr></tbody></table>
<div v-if="confirmar" class="confirmar" role="dialog" aria-modal="true" aria-label="Confirmar cierre"><div class="card card-body"><h4>¿Deseas cerrar este periodo?</h4><p>{{confirmar.nombre}}. Se revisarán las evaluaciones y las faltas consecutivas de los alumnos.</p><button class="btn btn-danger mb-2" :disabled="ocupado" @click="cerrar">Sí, cerrar periodo</button><button class="btn btn-light" @click="confirmar=null">Cancelar</button></div></div>
</section></template>
<script>
import api from '../servicios/cliente-http';
const inicial=()=>({id:null,semestre:'ENERO - JUNIO',anio:new Date().getFullYear(),fecha_inicio:'',fecha_fin:'',estado:'CERRADO'});
export default{data:()=>({periodos:[],form:inicial(),confirmar:null,mensaje:'',ocupado:false}),mounted(){this.cargar();},methods:{
fecha(v){return String(v||'').slice(0,10);},nuevo(){this.form=inicial();},
async cargar(){try{this.periodos=(await api.get('/periodos')).data.data;}catch(e){this.mensaje=e.response?.data?.statusMessage||e.message;}},
editar(p){this.form={...p,semestre:String(p.nombre).toUpperCase().includes('ENERO')?'ENERO - JUNIO':'AGOSTO - DICIEMBRE',anio:Number(this.fecha(p.fecha_inicio).slice(0,4)),fecha_inicio:this.fecha(p.fecha_inicio),fecha_fin:this.fecha(p.fecha_fin)};},
async guardar(){this.ocupado=true;try{const body={nombre:this.form.semestre+' '+this.form.anio,fecha_inicio:this.form.fecha_inicio,fecha_fin:this.form.fecha_fin,estado:this.form.estado};if(this.form.id)await api.put('/periodos/'+this.form.id,body);else await api.post('/periodos',body);this.nuevo();await this.cargar();this.mensaje='Periodo guardado';}catch(e){this.mensaje=e.response?.data?.statusMessage||e.message;}finally{this.ocupado=false;}},
async cerrar(){this.ocupado=true;try{await api.post('/periodos?action=cerrar',{periodo_id:Number(this.confirmar.id)});this.confirmar=null;await this.cargar();this.$emit('request-reload-alumnos');this.mensaje='Periodo cerrado. Puedes registrar el siguiente cuando corresponda.';}catch(e){this.mensaje=e.response?.data?.statusMessage||e.message;}finally{this.ocupado=false;}}
}};
</script><style scoped>label{display:block}.confirmar{position:fixed;inset:0;background:#17325988;backdrop-filter:blur(5px);display:grid;place-items:center;z-index:2100}.confirmar .card{max-width:480px;border-radius:24px;padding:28px}</style>
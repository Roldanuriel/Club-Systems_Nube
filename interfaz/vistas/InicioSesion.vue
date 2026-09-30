<template>
  <div class="login-container">
    <div class="login-layout">
      <div class="brand-panel">
        <div class="brand-content">
          <div class="logo-mark">
            <svg viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
              <circle cx="16" cy="12" r="5" stroke="currentColor" stroke-width="2"/>
              <path d="M7 28C7 23.0294 11.0294 19 16 19C20.9706 19 25 23.0294 25 28" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
              <circle cx="24" cy="10" r="2" fill="currentColor" opacity="0.5"/>
              <circle cx="8" cy="10" r="2" fill="currentColor" opacity="0.5"/>
            </svg>
          </div>
          <h1 class="brand-title">Sistema de Gestión</h1>
          <p class="brand-subtitle">Clubs Estudiantiles</p>
          <div class="brand-divider"></div>
          <p class="brand-description">
            Plataforma institucional para la administración y control de actividades estudiantiles.
          </p>
        </div>
      </div>

      <div class="form-panel">
        <div class="form-card">
          <div class="form-header">
            <h2 class="form-title">Iniciar Sesión</h2>
            <p class="form-subtitle">Ingresa tus credenciales para continuar</p>
          </div>

          <transition name="fade">
            <div v-if="errorMessage" class="login-alert login-alert-error">
              <svg class="login-alert-icon" width="18" height="18" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
                <path d="M10 18C14.4183 18 18 14.4183 18 10C18 5.58172 14.4183 2 10 2C5.58172 2 2 5.58172 2 10C2 14.4183 5.58172 18 10 18Z" stroke="currentColor" stroke-width="1.5"/>
                <path d="M10 7V11" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
                <path d="M10 15H10.01" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
              </svg>
              <span>{{ errorMessage }}</span>
            </div>
          </transition>

          <form @submit.prevent="handleLogin" class="login-form">
            <div class="type-selector">
              <button
                type="button"
                class="type-btn"
                :class="{ active: selectedUserType === 'oficina' }"
                @click="selectUserType('oficina')"
              >
                <svg class="type-icon" viewBox="0 0 18 18" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <rect x="2" y="2" width="14" height="14" rx="2" stroke="currentColor" stroke-width="1.5"/>
                  <path d="M5 7H6M8 7H9M11 7H12M5 9H6M8 9H9M11 9H12M5 11H6M8 11H9M11 11H12" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
                </svg>
                <span class="type-label">Oficina</span>
                <div class="type-indicator" :class="{ active: selectedUserType === 'oficina' }"></div>
              </button>

              <button
                type="button"
                class="type-btn"
                :class="{ active: selectedUserType === 'monitor' }"
                @click="selectUserType('monitor')"
              >
                <svg class="type-icon" viewBox="0 0 18 18" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <circle cx="9" cy="6" r="3" stroke="currentColor" stroke-width="1.5"/>
                  <path d="M3 16C3 12.6863 5.68629 10 9 10C12.3137 10 15 12.6863 15 16" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
                </svg>
                <span class="type-label">Monitor</span>
                <div class="type-indicator" :class="{ active: selectedUserType === 'monitor' }"></div>
              </button>
            </div>

            <div class="form-group">
              <label class="form-label">Usuario</label>
              <div class="input-wrapper">
                <svg class="input-icon" viewBox="0 0 18 18" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <circle cx="9" cy="6" r="3" stroke="currentColor" stroke-width="1.5"/>
                  <path d="M3 16C3 12.6863 5.68629 10 9 10C12.3137 10 15 12.6863 15 16" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
                </svg>
                <input
                  v-model="usuario"
                  type="text"
                  class="form-input"
                  placeholder="Ingresa tu usuario"
                  maxlength="8"
                  @input="sanitizeUsuario"
                  required
                  autocomplete="username"
                />
              </div>
            </div>

            <div class="form-group">
              <label class="form-label">Contraseña</label>
              <div class="input-wrapper">
                <svg class="input-icon" viewBox="0 0 18 18" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <rect x="3" y="8" width="12" height="8" rx="1.5" stroke="currentColor" stroke-width="1.5"/>
                  <path d="M6 8V6C6 4.34315 7.34315 3 9 3C10.6569 3 12 4.34315 12 6V8" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
                </svg>
                <input
                  v-model="password"
                  :type="showPassword ? 'text' : 'password'"
                  class="form-input"
                  placeholder="Ingresa tu contraseña"
                  minlength="8"
                  required
                  autocomplete="current-password"
                />
                <button 
                  type="button"
                  class="input-toggle"
                  @click="showPassword = !showPassword"
                >
                  <svg v-if="!showPassword" class="toggle-icon" viewBox="0 0 18 18" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M1 9C1 9 4 3 9 3C14 3 17 9 17 9C17 9 14 15 9 15C4 15 1 9 1 9Z" stroke="currentColor" stroke-width="1.5"/>
                    <circle cx="9" cy="9" r="2.5" stroke="currentColor" stroke-width="1.5"/>
                  </svg>
                  <svg v-else class="toggle-icon" viewBox="0 0 18 18" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M2 2L16 16M2.5 9.5C2.5 9.5 4.5 5.5 9 5.5C10.5 5.5 11.75 6.16667 12.6667 7M15.5 9.5C15.5 9.5 13.5 13.5 9 13.5C8 13.5 7.08333 13.1667 6.33333 12.6667" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
                    <path d="M9 11.5C10.3807 11.5 11.5 10.3807 11.5 9C11.5 7.61929 10.3807 6.5 9 6.5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
                  </svg>
                </button>
              </div>
            </div>

            <button 
              type="submit" 
              class="btn-primary"
              :disabled="isLoading"
            >
              <span v-if="!isLoading" class="btn-content">
                Entrar
                <svg class="btn-arrow" viewBox="0 0 18 18" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M3.75 9H14.25M10.5 4.5L14.25 9L10.5 13.5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
                </svg>
              </span>
              <span v-else class="btn-loading">
                <span class="spinner"></span>
                Iniciando sesión...
              </span>
            </button>
          </form>

          <div class="form-divider">
            <span class="divider-text"></span>
          </div>

          <div class="form-actions">
            <button 
              type="button"
              class="link-btn"
              @click="showForgotPassword"
            >
              <svg class="link-icon" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                <rect x="3" y="7" width="10" height="6" rx="1" stroke="currentColor" stroke-width="1.25"/>
                <path d="M5 7V5C5 3.89543 5.89543 3 7 3C8.10457 3 9 3.89543 9 5V7" stroke="currentColor" stroke-width="1.25" stroke-linecap="round"/>
              </svg>
              ¿Olvidaste tu contraseña?
            </button>

            <router-link v-if="false" to="/crear-cuenta" class="link-btn link-primary">
              <svg class="link-icon" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                <circle cx="8" cy="5" r="2" stroke="currentColor" stroke-width="1.25"/>
                <path d="M3 13C3 10.7909 5.23858 9 8 9C10.7614 9 13 10.7909 13 13" stroke="currentColor" stroke-width="1.25" stroke-linecap="round"/>
                <path d="M8 3V7M6 5H10" stroke="currentColor" stroke-width="1.25" stroke-linecap="round"/>
              </svg>
              Crear cuenta nueva
            </router-link>
          </div>
         </div>
       </div>
     </div>

     <transition name="modal-fade">
       <div v-if="showForgotModal" class="modal-backdrop" @click.self="closeForgotModal"></div>
     </transition>

     <transition name="modal-slide">
       <div v-if="showForgotModal" class="modal-container">
         <div class="info-modal">
           <div class="modal-header">
             <div class="modal-icon">
               <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                 <circle cx="12" cy="12" r="10"/>
                 <path d="M12 16v-4"/>
                 <path d="M12 8h.01"/>
               </svg>
             </div>
             <h3 class="modal-title">Recuperar Contraseña</h3>
             <button class="modal-close" @click="closeForgotModal">
               <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                 <path d="M18 6L6 18M6 6l12 12"/>
               </svg>
             </button>
           </div>
           <div class="modal-body">
             <p class="modal-text">
               Para recuperar tu contraseña, por favor contacta al administrador del sistema.
             </p>
             <div class="info-card">
               <div class="info-item">
                 <svg class="info-item-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                   <path d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"/>
                 </svg>
                 <span class="info-item-label">Correo electrónico</span>
               </div>
               <div class="info-item">
                 <svg class="info-item-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                   <path d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"/>
                 </svg>
                 <span class="info-item-label">Extensión administrativa</span>
               </div>
             </div>
           </div>
           <div class="modal-footer">
             <button type="button" class="btn-primary" @click="closeForgotModal">
               Entendido
             </button>
           </div>
         </div>
       </div>
     </transition>
   </div>
 </template>

<script>
import axios from 'axios';
import { BACKEND } from '../servicios/direccion-servidor';
import { authService } from '../servicios/autenticacion';
export default {
  name: "Login",
  data() {
    return {
      selectedUserType: "oficina",
      usuario: "",
      password: "",
      showPassword: false,
      errorMessage: "",
      isLoading: false,
      showForgotModal: false
    };
  },
  methods: {
    selectUserType(type) {
      this.selectedUserType = type;
      this.errorMessage = "";
    },
    showForgotPassword() {
      this.showForgotModal = true;
    },
    closeForgotModal() {
      this.showForgotModal = false;
    },
    sanitizeUsuario() {
      this.usuario = String(this.usuario || '').replace(/[^A-Za-z0-9]/g, '').slice(0, 8);
    },
    async handleLogin() {
      this.errorMessage = "";
      this.sanitizeUsuario();
      if (!this.usuario || !this.password) {
        this.errorMessage = "Por favor, completa todos los campos";
        return;
      }
      if (this.usuario.length !== 8) {
        this.errorMessage = "El usuario debe tener exactamente 8 caracteres";
        return;
      }
      if (this.password.length < 8) {
        this.errorMessage = "La contraseña debe tener al menos 8 caracteres";
        return;
      }
      this.isLoading = true;
      try {
        const credentials = {
          usuario: this.usuario,
          password: this.password,
          userType: this.selectedUserType
        };
        const result = await authService.login(credentials);
        if (["SUPERADMIN", "ADMIN", "OFICINA"].includes(result.tipo)) {
          this.$router.push("/oficina");
        } else if (result.tipo === "MONITOR") {
          this.$router.push("/monitor");
        }
      } catch (error) {
        this.errorMessage = error.response?.data?.message || error.message || "Error al iniciar sesión";
      } finally {
        this.isLoading = false;
      }
    }
  }
};
</script>

<style scoped src="./InicioSesion.css"></style>

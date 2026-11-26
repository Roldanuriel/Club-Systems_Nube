import { authService } from '../servicios/autenticacion';
export default defineNuxtRouteMiddleware(async to => {
  if (import.meta.server) return;
  const requiresAuth = Boolean(to.meta.requiresAuth);
  const isPublic = Boolean(to.meta.public);
  if (isPublic && to.path === '/') {
    if (!authService.isAuthenticated()) return;
    try {
      const user = await authService.getCurrentUser();
      if (!user) {
        authService.clearAuth();
        return;
      }
      const role = user?.rol || user?.tipo;
      return navigateTo(role === 'MONITOR' ? '/monitor' : '/oficina');
    } catch {
      authService.clearAuth();
      return;
    }
  }
  if (requiresAuth && !authService.isAuthenticated()) {
    return navigateTo({
      path: '/',
      query: {
        redirect: to.fullPath
      }
    });
  }
  if (!authService.isAuthenticated()) return;
  let user = null;
  try {
    user = await authService.getCurrentUser();
  } catch {
    try {
      await authService.refreshToken();
      user = await authService.getCurrentUser();
    } catch {
      authService.clearAuth();
      return navigateTo('/');
    }
  }
  const role = user?.rol || user?.tipo;
  const allowedRoles = Array.isArray(to.meta.roles) ? to.meta.roles : [];
  if (allowedRoles.length && !allowedRoles.includes(role)) {
    return navigateTo(role === 'MONITOR' ? '/monitor' : '/oficina');
  }
  if (isPublic && to.path === '/') {
    return navigateTo(role === 'MONITOR' ? '/monitor' : '/oficina');
  }
});

// src/lib/apiAuth.js
import { API_ROOT, saveJwtTokens, clearJwtTokens } from "./apiClient";

// ⚠️ CONFIRMAR: ajusta esta ruta si tu backend usa otro endpoint de login JWT.
const LOGIN_ENDPOINT = "/conformidad/api/auth/token/";

export async function login({ username, password }) {
  const res = await fetch(`${API_ROOT}${LOGIN_ENDPOINT}`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify({ username, password }),
  });

  const data = await res.json().catch(() => null);

  if (!res.ok || !data?.access) {
    const message = data?.detail || data?.error || "Usuario o contraseña incorrectos.";
    throw new Error(message);
  }

  // El usuario puede venir embebido en la respuesta o no.
  // Si tu backend NO regresa el user en el login, dime el endpoint de "me"
  // (ej. /conformidad/api/auth/me/) y lo agrego para traer nombre/rol.
  const user = data.user || { username };

  saveJwtTokens({ access: data.access, refresh: data.refresh, user });

  return user;
}

export function logout() {
  clearJwtTokens();
}
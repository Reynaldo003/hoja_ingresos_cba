// src/lib/apiClient.js
// Cliente HTTP simple, sin autenticación: la Hoja de Ingresos es de solo
// visualización y pública, no requiere usuario ni token.

export const API_ROOT = (
  import.meta.env.VITE_API_URL || "https://crm.grupoautomotrizryr.com"
).replace(/\/+$/, "");

function isFormData(body) {
  return typeof FormData !== "undefined" && body instanceof FormData;
}

function isBlobLike(body) {
  return typeof Blob !== "undefined" && body instanceof Blob;
}

function buildUrl(path) {
  const value = String(path || "");
  if (/^https?:\/\//i.test(value)) return value;
  return `${API_ROOT}${value.startsWith("/") ? value : `/${value}`}`;
}

async function parseResponseData(res) {
  if (res.status === 204) return null;

  const contentType = res.headers.get("content-type") || "";

  try {
    if (contentType.includes("application/json")) {
      return await res.json();
    }
    const text = await res.text();
    return text || null;
  } catch {
    return null;
  }
}

function getFirstFieldError(data) {
  if (!data || typeof data !== "object") return "";

  const firstKey = Object.keys(data)[0];
  if (!firstKey) return "";

  const value = data[firstKey];

  if (Array.isArray(value)) return `${firstKey}: ${value.join(", ")}`;
  if (typeof value === "string") return `${firstKey}: ${value}`;
  if (value && typeof value === "object") return `${firstKey}: ${JSON.stringify(value)}`;

  return "";
}

function resolveErrorMessage(data, status) {
  if (!data) return `HTTP ${status}`;
  if (typeof data === "string" && data.trim()) return data;

  return (
    data?.detail ||
    data?.error ||
    data?.mensaje ||
    data?.message ||
    getFirstFieldError(data) ||
    `HTTP ${status}`
  );
}

function buildHeaders({ headers = {}, body } = {}) {
  const finalHeaders = { Accept: "application/json", ...(headers || {}) };

  if (isFormData(body)) {
    delete finalHeaders["Content-Type"];
    delete finalHeaders["content-type"];
    return finalHeaders;
  }

  const hasBody = body !== undefined && body !== null;

  if (hasBody && !isBlobLike(body) && !finalHeaders["Content-Type"]) {
    finalHeaders["Content-Type"] = "application/json";
  }

  return finalHeaders;
}

function buildBody({ body, data } = {}) {
  if (data !== undefined) return JSON.stringify(data);
  if (body === undefined || body === null) return body;
  if (typeof body === "string") return body;
  if (isFormData(body) || isBlobLike(body)) return body;
  return JSON.stringify(body);
}

export async function http(path, { method = "GET", body, data, headers = {}, signal } = {}) {
  const finalBody = buildBody({ body, data });
  const finalHeaders = buildHeaders({ headers, body: finalBody });

  const res = await fetch(buildUrl(path), {
    method,
    headers: finalHeaders,
    body: finalBody,
    signal,
  });

  const responseData = await parseResponseData(res);

  if (!res.ok) {
    const message = resolveErrorMessage(responseData, res.status);
    const error = new Error(message);
    error.status = res.status;
    error.data = responseData;
    throw error;
  }

  return responseData;
}

export function buildQuery(params = {}) {
  const query = new URLSearchParams();

  Object.entries(params).forEach(([key, value]) => {
    if (value === undefined || value === null || value === "") return;
    if (value === "Todos" || value === "Todas") return;
    query.append(key, value);
  });

  const text = query.toString();
  return text ? `?${text}` : "";
}
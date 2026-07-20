// src/lib/apiHojaIngresos.js
import { buildQuery, http } from "./apiClient";

const BASE_URL = "/hojaingresos/api/hoja-ingresos";

export const apiHojaIngresos = {
  list: (params = {}) => http(`${BASE_URL}/${buildQuery(params)}`),

  get: (id) => http(`${BASE_URL}/${id}/`),

  create: (payload) =>
    http(`${BASE_URL}/`, {
      method: "POST",
      body: payload,
    }),

  update: (id, payload) =>
    http(`${BASE_URL}/${id}/`, {
      method: "PUT",
      body: payload,
    }),

  patch: (id, payload) =>
    http(`${BASE_URL}/${id}/`, {
      method: "PATCH",
      body: payload,
    }),

  remove: (id) =>
    http(`${BASE_URL}/${id}/`, {
      method: "DELETE",
    }),
};

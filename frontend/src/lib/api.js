import axios from "axios";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
export const API = `${BACKEND_URL}/api`;

export const api = axios.create({ baseURL: API });

export const Months = {
  list: () => api.get("/months").then((r) => r.data),
  get: (id) => api.get(`/months/${id}`).then((r) => r.data),
  create: (payload) => api.post("/months", payload).then((r) => r.data),
  remove: (id) => api.delete(`/months/${id}`).then((r) => r.data),
};

export const Orders = {
  get: (id) => api.get(`/orders/${id}`).then((r) => r.data),
  create: (payload) => api.post("/orders", payload).then((r) => r.data),
  update: (id, payload) => api.patch(`/orders/${id}`, payload).then((r) => r.data),
  remove: (id) => api.delete(`/orders/${id}`).then((r) => r.data),
};

export const Notes = {
  get: (id) => api.get(`/notes/${id}`).then((r) => r.data),
  create: (payload) => api.post("/notes", payload).then((r) => r.data),
  update: (id, payload) => api.patch(`/notes/${id}`, payload).then((r) => r.data),
  remove: (id) => api.delete(`/notes/${id}`).then((r) => r.data),
  addAbono: (noteId, payload) =>
    api.post(`/notes/${noteId}/abonos`, payload).then((r) => r.data),
  removeAbono: (noteId, abonoId) =>
    api.delete(`/notes/${noteId}/abonos/${abonoId}`).then((r) => r.data),
};

export const Summary = {
  global: () => api.get("/summary").then((r) => r.data),
  seed: () => api.post("/seed").then((r) => r.data),
};

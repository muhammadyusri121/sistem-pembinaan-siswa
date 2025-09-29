// import axios from 'axios';

// const API_BASE = process.env.REACT_APP_API_URL || '/api';

// const apiClient = axios.create({
//   baseURL: API_BASE,
// });
import axios from "axios";

const fallback =
  process.env.NODE_ENV === "development" ? "http://localhost:8000/api" : "/api";

const API_BASE = process.env.REACT_APP_API_URL || fallback;

const apiClient = axios.create({
  baseURL: API_BASE,
  
});

apiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("token");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);



export const authService = {
  login: (nip, password) => {
    const formData = new URLSearchParams();
    formData.append("username", nip);
    formData.append("password", password);
    return apiClient.post("/auth/login", formData, {
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
    });
  },
  getCurrentUser: () => apiClient.get("/auth/me"),
};

export const dashboardService = {
  getStats: () => apiClient.get("/dashboard/stats"),
};

export const achievementService = {
  list: (params) => apiClient.get("/prestasi", { params }),
  create: (payload) => apiClient.post("/prestasi", payload),
  update: (id, payload) => apiClient.put(`/prestasi/${id}`, payload),
  updateStatus: (id, payload) =>
    apiClient.put(`/prestasi/${id}/status`, payload),
  remove: (id) => apiClient.delete(`/prestasi/${id}`),
  summary: () => apiClient.get("/prestasi/summary"),
};

export const profileService = {
  updateProfile: (payload) => apiClient.put("/auth/me/profile", payload),
  updatePassword: (payload) => apiClient.put("/auth/me/password", payload),
};

export const studentService = {
  list: () => apiClient.get("/siswa"),
};

export const masterDataService = {
  classes: () => apiClient.get("/master-data/kelas"),
};


export { apiClient };

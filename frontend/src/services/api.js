import axios from 'axios'

const API_BASE = '/api'

const api = axios.create({
  baseURL: API_BASE,
  headers: { 'Content-Type': 'application/json' },
})

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token')
      localStorage.removeItem('user')
      window.location.href = '/login'
    }
    return Promise.reject(error)
  }
)

export const authAPI = {
  register: (data) => api.post('/auth/register', data),
  login: (data) => api.post('/auth/login', data),
  getMe: () => api.get('/auth/me'),
}

export const predictionAPI = {
  predict: (data) => api.post('/predict', data),
}

export const dashboardAPI = {
  getStats: () => api.get('/dashboard/stats'),
  getModelMetrics: () => api.get('/dashboard/model-metrics'),
  getHeadToHead: (team1, team2) =>
    api.get('/dashboard/head-to-head', { params: { team1, team2 } }),
  getAllPredictions: () => api.get('/dashboard/predictions'),
}

export default api

import axios from 'axios'

const api = axios.create({ baseURL: '/api', timeout: 60_000 })

// Attach JWT to every request
api.interceptors.request.use((config) => {
    const token = localStorage.getItem('ekp_token')
    if (token) config.headers.Authorization = `Bearer ${token}`
    return config
})

// On 401 — clear token and redirect to login
api.interceptors.response.use(
    (res) => res,
    (err) => {
        if (err.response?.status === 401) {
            localStorage.removeItem('ekp_token')
            localStorage.removeItem('ekp_user')
            localStorage.removeItem('ekp_org')
            window.location.href = '/login'
        }
        return Promise.reject(err)
    }
)

export default api

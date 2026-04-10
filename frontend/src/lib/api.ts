import axios, { AxiosError } from 'axios';
import { toast } from 'sonner';

// Create Axios instance
const api = axios.create({
    baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api',
    headers: {
        'Content-Type': 'application/json',
    },
});

// Request interceptor to add access token
api.interceptors.request.use(
    (config) => {
        const token = localStorage.getItem('access_token');
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
    },
    (error) => Promise.reject(error)
);

// Response interceptor for error handling and token refresh
api.interceptors.response.use(
    (response) => response,
    async (error: AxiosError) => {
        const originalRequest = error.config as any;

        // Handle 401 Unauthorized (token inspired)
        if (error.response?.status === 401 && !originalRequest._retry) {
            originalRequest._retry = true;

            try {
                const refreshToken = localStorage.getItem('refresh_token');
                if (!refreshToken) {
                    throw new Error('No refresh token');
                }

                // Call refresh endpoint
                const response = await axios.post(
                    `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api'}/auth/refresh`,
                    { refresh_token: refreshToken }
                );

                const { access_token, refresh_token: newRefreshToken } = response.data;

                // Update tokens
                localStorage.setItem('access_token', access_token);
                localStorage.setItem('refresh_token', newRefreshToken);

                // Retry original request
                originalRequest.headers.Authorization = `Bearer ${access_token}`;
                return api(originalRequest);
            } catch (refreshError) {
                // Refresh failed - logout user
                localStorage.removeItem('access_token');
                localStorage.removeItem('refresh_token');
                window.location.href = '/login';
                toast.error('Session expired. Please login again.');
                return Promise.reject(refreshError);
            }
        }

        // Handle other errors
        const message = (error.response?.data as any)?.detail || error.message || 'An unexpected error occurred';

        // Don't show toast for 401s (handled above) or if specifically suppressed
        if (error.response?.status !== 401 && !originalRequest.suppressToast) {
            // toast.error(message); // Let components handle specific errors if needed
        }

        return Promise.reject(error);
    }
);

export default api;

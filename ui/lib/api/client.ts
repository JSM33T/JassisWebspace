import { ApiResponse, ApiError, ProblemDetails, RequestConfig } from './types';

const DEFAULT_CONFIG: RequestConfig = {
    baseUrl: process.env.NEXT_PUBLIC_API_URL,
    timeout: 30000,
    credentials: 'include',
    headers: {
        'Content-Type': 'application/json',
    },
};

// Track refresh state to prevent multiple simultaneous refresh attempts
let isRefreshing = false;
let refreshPromise: Promise<string | null> | null = null;

function generateCorrelationId(): string {
    return `${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;
}

function getToken(): string | null {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem('accessToken');
}

function getRefreshToken(): string | null {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem('refreshToken');
}

function createHeaders(config: RequestConfig): Headers {
    const headers = new Headers(config.headers);

    // Use token from config or get from localStorage
    const token = config.token || getToken();
    if (token) {
        headers.set('Authorization', `Bearer ${token}`);
    }

    const correlationId = config.correlationId || generateCorrelationId();
    headers.set('X-Correlation-Id', correlationId);

    if (!headers.has('Content-Type')) {
        headers.set('Content-Type', 'application/json');
    }

    return headers;
}

async function parseErrorResponse(response: Response): Promise<ProblemDetails> {
    const contentType = response.headers.get('content-type');
    if (contentType?.includes('application/json') || contentType?.includes('application/problem+json')) {
        try {
            const problemDetails = await response.json();
            return problemDetails as ProblemDetails;
        } catch {
            // Fallback
        }
    }
    return {
        status: response.status,
        title: response.statusText || 'An error occurred',
        detail: await response.text().catch(() => undefined),
        type: 'about:blank',
    };
}

async function fetchWithTimeout(url: string, config: RequestConfig): Promise<Response> {
    const timeout = config.timeout || DEFAULT_CONFIG.timeout!;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    try {
        const response = await fetch(url, {
            ...config,
            signal: controller.signal,
        });
        clearTimeout(timeoutId);
        return response;
    } catch (error) {
        clearTimeout(timeoutId);
        if (error instanceof Error && error.name === 'AbortError') {
            throw new ApiError(408, {
                status: 408,
                title: 'Request Timeout',
                detail: `Request timed out after ${timeout}ms`,
            });
        }
        throw error;
    }
}

// Refresh access token using refresh token
async function refreshAccessToken(): Promise<string | null> {
    // If already refreshing, return the existing promise
    if (isRefreshing && refreshPromise) {
        return refreshPromise;
    }

    isRefreshing = true;
    refreshPromise = performTokenRefresh();

    try {
        const newAccessToken = await refreshPromise;
        return newAccessToken;
    } finally {
        isRefreshing = false;
        refreshPromise = null;
    }
}

// Perform the actual token refresh API call
async function performTokenRefresh(): Promise<string | null> {
    const refreshToken = getRefreshToken();

    if (!refreshToken) {
        console.log('❌ No refresh token available');
        return null;
    }

    const baseUrl = (DEFAULT_CONFIG.baseUrl || '').replace(/\/$/, '');
    const url = `${baseUrl}/auth/refresh`;

    console.log('🔄 Attempting token refresh...');

    try {
        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            credentials: 'include',
            body: JSON.stringify({ refreshToken })
        });

        if (!response.ok) {
            console.log('❌ Token refresh failed with status:', response.status);
            // Clear tokens on refresh failure
            if (typeof window !== 'undefined') {
                localStorage.removeItem('accessToken');
                localStorage.removeItem('refreshToken');
                localStorage.removeItem('jassspace_user');
            }
            // Trigger logout event
            window.dispatchEvent(new CustomEvent('auth:logout'));
            return null;
        }

        const data = await response.json();
        const newAccessToken = data.data?.accessToken || data.accessToken;
        const newRefreshToken = data.data?.refreshToken || data.refreshToken;

        if (newAccessToken && typeof window !== 'undefined') {
            localStorage.setItem('accessToken', newAccessToken);
            if (newRefreshToken) {
                localStorage.setItem('refreshToken', newRefreshToken);
            }
            console.log('✅ Token refresh successful');

            // Trigger session restored event
            window.dispatchEvent(new CustomEvent('auth:refreshed'));

            return newAccessToken;
        }

        return null;
    } catch (error) {
        console.error('❌ Token refresh error:', error);
        // Clear tokens on error
        if (typeof window !== 'undefined') {
            localStorage.removeItem('accessToken');
            localStorage.removeItem('refreshToken');
            localStorage.removeItem('jassspace_user');
        }
        // Trigger logout event
        window.dispatchEvent(new CustomEvent('auth:logout'));
        return null;
    }
}

async function request<T>(endpoint: string, config: RequestConfig = {}, isRetry: boolean = false): Promise<T> {
    const mergedConfig: RequestConfig = {
        ...DEFAULT_CONFIG,
        ...config,
        headers: {
            ...DEFAULT_CONFIG.headers,
            ...config.headers,
        },
    };

    const baseUrl = mergedConfig.baseUrl!.replace(/\/$/, '');
    const path = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
    const url = `${baseUrl}${path}`;

    const headers = createHeaders(mergedConfig);

    // If body is FormData, ensure no Content-Type header exists (browser will set it with boundary)
    if (mergedConfig.body instanceof FormData && headers.has('Content-Type')) {
        headers.delete('Content-Type');
    }

    try {
        const response = await fetchWithTimeout(url, {
            ...mergedConfig,
            headers,
        });

        // Handle 401 Unauthorized with token refresh
        if (!response.ok && response.status === 401 && !isRetry && endpoint !== '/auth/refresh') {
            console.log('🔄 Got 401, attempting token refresh...');

            try {
                const newAccessToken = await refreshAccessToken();

                if (newAccessToken) {
                    // Retry the original request with new token
                    console.log('✅ Token refreshed, retrying original request');
                    return request<T>(endpoint, { ...config, token: newAccessToken }, true);
                } else {
                    // Refresh failed, throw the original 401 error
                    console.log('❌ Token refresh failed, throwing 401 error');
                    const problemDetails = await parseErrorResponse(response);
                    throw new ApiError(response.status, problemDetails, response);
                }
            } catch (refreshError) {
                console.error('❌ Token refresh threw error:', refreshError);
                // If refresh fails, throw the original 401 error
                const problemDetails = await parseErrorResponse(response);
                throw new ApiError(response.status, problemDetails, response);
            }
        }

        if (!response.ok) {
            const problemDetails = await parseErrorResponse(response);
            throw new ApiError(response.status, problemDetails, response);
        }

        if (response.status === 204) {
            return undefined as T;
        }

        const contentType = response.headers.get('content-type');
        if (contentType?.includes('application/json')) {
            const json = await response.json();
            if (json && typeof json === 'object' && 'data' in json) {
                const apiResponse = json as ApiResponse<T>;
                return apiResponse.data;
            }
            return json as T;
        }

        return (await response.text()) as T;
    } catch (error) {
        if (error instanceof ApiError) {
            throw error;
        }
        if (error instanceof Error) {
            throw new ApiError(0, {
                status: 0,
                title: 'Network Error',
                detail: error.message,
            });
        }
        throw new ApiError(0, {
            status: 0,
            title: 'Unknown Error',
            detail: 'An unknown error occurred',
        });
    }
}

export async function get<T>(endpoint: string, config: RequestConfig = {}): Promise<T> {
    return request<T>(endpoint, { ...config, method: 'GET' });
}

export async function post<T, D = any>(endpoint: string, data?: D, config: RequestConfig = {}): Promise<T> {
    const isFormData = data instanceof FormData;
    return request<T>(endpoint, {
        ...config,
        method: 'POST',
        body: isFormData ? (data as any) : (data ? JSON.stringify(data) : undefined),
        headers: {
            ...config.headers,
            ...(isFormData ? {} : { 'Content-Type': 'application/json' }),
        }
    });
}

export async function put<T, D = any>(endpoint: string, data?: D, config: RequestConfig = {}): Promise<T> {
    const isFormData = data instanceof FormData;
    return request<T>(endpoint, {
        ...config,
        method: 'PUT',
        body: isFormData ? (data as any) : (data ? JSON.stringify(data) : undefined),
        headers: {
            ...config.headers,
            ...(isFormData ? {} : { 'Content-Type': 'application/json' }),
        }
    });
}

export async function del<T>(endpoint: string, config: RequestConfig = {}): Promise<T> {
    return request<T>(endpoint, { ...config, method: 'DELETE' });
}

export const api = {
    get,
    post,
    put,
    delete: del,
    request,
};

export const apiClient = api;

export default api;

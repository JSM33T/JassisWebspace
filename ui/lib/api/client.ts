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

function clearStoredAuthState(): void {
    if (typeof window === 'undefined') {
        return;
    }

    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('jassspace_user');
}

function decodeBase64Url(value: string): string | null {
    try {
        const normalized = value.replace(/-/g, '+').replace(/_/g, '/');
        const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, '=');
        return atob(padded);
    } catch {
        return null;
    }
}

function getTokenExpiry(token: string): number | null {
    const parts = token.split('.');
    if (parts.length !== 3) {
        return null;
    }

    const payload = decodeBase64Url(parts[1]);
    if (!payload) {
        return null;
    }

    try {
        const parsed = JSON.parse(payload) as { exp?: number };
        return typeof parsed.exp === 'number' ? parsed.exp * 1000 : null;
    } catch {
        return null;
    }
}

function isTokenExpired(token: string, bufferMs: number = 30_000): boolean {
    const expiry = getTokenExpiry(token);
    if (!expiry) {
        return false;
    }

    return Date.now() >= expiry - bufferMs;
}

function isAuthEndpoint(endpoint: string): boolean {
    return (
        endpoint === '/auth/login' ||
        endpoint === '/auth/register' ||
        endpoint === '/auth/verify-email' ||
        endpoint === '/auth/resend-verification' ||
        endpoint === '/auth/forgot-password' ||
        endpoint === '/auth/reset-password' ||
        endpoint === '/auth/refresh'
    );
}

function createHeaders(config: RequestConfig, token?: string | null): Headers {
    const headers = new Headers(config.headers);

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
            const payload = await response.json();
            return normalizeProblemDetails(payload, response);
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

function normalizeProblemDetails(payload: unknown, response: Response): ProblemDetails {
    const fallbackTitle = response.statusText || 'An error occurred';
    const base: ProblemDetails = {
        status: response.status,
        title: fallbackTitle,
        type: 'about:blank',
    };

    if (!payload || typeof payload !== 'object') {
        return base;
    }

    const source = payload as Record<string, unknown>;
    const envelopeData = source.data && typeof source.data === 'object'
        ? source.data as Record<string, unknown>
        : undefined;

    const title =
        pickString(source.title) ??
        pickString(envelopeData?.title) ??
        fallbackTitle;

    const detail =
        pickString(source.detail) ??
        pickString(envelopeData?.detail) ??
        pickString(source.message) ??
        pickString(envelopeData?.message) ??
        pickString(source.error) ??
        pickString(envelopeData?.error) ??
        extractValidationError(source.errors) ??
        extractValidationError(envelopeData?.errors);

    const status =
        pickNumber(source.status) ??
        pickNumber(envelopeData?.status) ??
        response.status;

    const type =
        pickString(source.type) ??
        pickString(envelopeData?.type) ??
        'about:blank';

    const instance =
        pickString(source.instance) ??
        pickString(envelopeData?.instance);

    return {
        ...base,
        ...source,
        ...(envelopeData ?? {}),
        status,
        title,
        detail,
        type,
        instance,
    };
}

function pickString(value: unknown): string | undefined {
    return typeof value === 'string' && value.trim().length > 0 ? value : undefined;
}

function pickNumber(value: unknown): number | undefined {
    return typeof value === 'number' && Number.isFinite(value) ? value : undefined;
}

function extractValidationError(errors: unknown): string | undefined {
    if (!errors || typeof errors !== 'object') {
        return undefined;
    }

    const entries = Object.values(errors as Record<string, unknown>);
    for (const entry of entries) {
        if (Array.isArray(entry) && entry.length > 0 && typeof entry[0] === 'string') {
            return entry[0];
        }
    }

    return undefined;
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
            clearStoredAuthState();
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
        clearStoredAuthState();
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
    const isAuthEntryPoint = isAuthEndpoint(endpoint);

    let resolvedToken = mergedConfig.token ?? getToken();

    if (!isRetry && !isAuthEntryPoint && resolvedToken && isTokenExpired(resolvedToken)) {
        console.log('Stored access token is expired, attempting refresh before request');
        resolvedToken = await refreshAccessToken();

        if (!resolvedToken && typeof window !== 'undefined') {
            localStorage.removeItem('accessToken');
        }
    }

    if (resolvedToken && isTokenExpired(resolvedToken)) {
        resolvedToken = null;
    }

    const headers = createHeaders(mergedConfig, resolvedToken);

    // If body is FormData, ensure no Content-Type header exists (browser will set it with boundary)
    if (mergedConfig.body instanceof FormData && headers.has('Content-Type')) {
        headers.delete('Content-Type');
    }

    try {
        const response = await fetchWithTimeout(url, {
            ...mergedConfig,
            headers,
        });

        // Handle 401 Unauthorized with token refresh on protected endpoints only.
        if (!response.ok && response.status === 401 && !isRetry && !isAuthEntryPoint) {
            console.log('Attempting token refresh after 401 response...');

            try {
                const newAccessToken = await refreshAccessToken();

                if (newAccessToken) {
                    console.log('Token refreshed, retrying original request');
                    return request<T>(endpoint, { ...config, token: newAccessToken }, true);
                }
            } catch (refreshError) {
                console.error('Token refresh threw error:', refreshError);
            }

            console.log('Token refresh failed, throwing original 401 error');
            const problemDetails = await parseErrorResponse(response);
            throw new ApiError(response.status, problemDetails, response);
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

export async function post<T, D = unknown>(endpoint: string, data?: D, config: RequestConfig = {}): Promise<T> {
    const isFormData = data instanceof FormData;
    return request<T>(endpoint, {
        ...config,
        method: 'POST',
        body: isFormData ? (data as BodyInit) : (data ? JSON.stringify(data) : undefined),
        headers: {
            ...config.headers,
            ...(isFormData ? {} : { 'Content-Type': 'application/json' }),
        }
    });
}

export async function put<T, D = unknown>(endpoint: string, data?: D, config: RequestConfig = {}): Promise<T> {
    const isFormData = data instanceof FormData;
    return request<T>(endpoint, {
        ...config,
        method: 'PUT',
        body: isFormData ? (data as BodyInit) : (data ? JSON.stringify(data) : undefined),
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


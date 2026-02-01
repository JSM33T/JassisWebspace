import { ApiResponse, ApiError, ProblemDetails, RequestConfig } from './types';

const DEFAULT_CONFIG: RequestConfig = {
    baseUrl: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000',
    timeout: 30000,
    credentials: 'include',
    headers: {
        'Content-Type': 'application/json',
    },
};

function generateCorrelationId(): string {
    return `${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;
}

function createHeaders(config: RequestConfig): Headers {
    const headers = new Headers(config.headers);
    if (config.token) {
        headers.set('Authorization', `Bearer ${config.token}`);
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

async function request<T>(endpoint: string, config: RequestConfig = {}): Promise<T> {
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

    try {
        const response = await fetchWithTimeout(url, {
            ...mergedConfig,
            headers,
        });

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
    return request<T>(endpoint, {
        ...config,
        method: 'POST',
        body: data ? JSON.stringify(data) : undefined,
    });
}

export async function put<T, D = any>(endpoint: string, data?: D, config: RequestConfig = {}): Promise<T> {
    return request<T>(endpoint, {
        ...config,
        method: 'PUT',
        body: data ? JSON.stringify(data) : undefined,
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


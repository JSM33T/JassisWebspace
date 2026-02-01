/**
 * API Client for JassSpace API
 * Handles ApiResponse<T> wrapper and ProblemDetails error responses
 */

import { ApiResponse, ApiError, ProblemDetails, RequestConfig } from './types';

/**
 * Default API configuration
 */
const DEFAULT_CONFIG: RequestConfig = {
    baseUrl: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000',
    timeout: 30000, // 30 seconds
    credentials: 'include', // Include cookies for refresh tokens
    headers: {
        'Content-Type': 'application/json',
    },
};

/**
 * Generate a correlation ID for request tracing
 */
function generateCorrelationId(): string {
    return `${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;
}

/**
 * Create headers for the request
 */
function createHeaders(config: RequestConfig): Headers {
    const headers = new Headers(config.headers);

    // Add authorization header if token is provided
    if (config.token) {
        headers.set('Authorization', `Bearer ${config.token}`);
    }

    // Add correlation ID for tracing
    const correlationId = config.correlationId || generateCorrelationId();
    headers.set('X-Correlation-Id', correlationId);

    // Ensure Content-Type is set for JSON requests
    if (!headers.has('Content-Type')) {
        headers.set('Content-Type', 'application/json');
    }

    return headers;
}

/**
 * Parse error response into ProblemDetails
 */
async function parseErrorResponse(response: Response): Promise<ProblemDetails> {
    const contentType = response.headers.get('content-type');

    // Check if response is JSON (ProblemDetails)
    if (contentType?.includes('application/json') || contentType?.includes('application/problem+json')) {
        try {
            const problemDetails = await response.json();
            return problemDetails as ProblemDetails;
        } catch {
            // Failed to parse JSON, fall back to generic error
        }
    }

    // Fallback to generic ProblemDetails
    return {
        status: response.status,
        title: response.statusText || 'An error occurred',
        detail: await response.text().catch(() => undefined),
        type: 'about:blank',
    };
}

/**
 * Make an HTTP request with timeout support
 */
async function fetchWithTimeout(
    url: string,
    config: RequestConfig
): Promise<Response> {
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
            throw new ApiError(
                408,
                {
                    status: 408,
                    title: 'Request Timeout',
                    detail: `Request timed out after ${timeout}ms`,
                }
            );
        }
        throw error;
    }
}

/**
 * Core request function
 */
async function request<T>(
    endpoint: string,
    config: RequestConfig = {}
): Promise<T> {
    // Merge with default config
    const mergedConfig: RequestConfig = {
        ...DEFAULT_CONFIG,
        ...config,
        headers: {
            ...DEFAULT_CONFIG.headers,
            ...config.headers,
        },
    };

    // Build full URL
    const baseUrl = mergedConfig.baseUrl!.replace(/\/$/, '');
    const path = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
    const url = `${baseUrl}${path}`;

    // Create headers
    const headers = createHeaders(mergedConfig);

    try {
        // Make request with timeout
        const response = await fetchWithTimeout(url, {
            ...mergedConfig,
            headers,
        });

        // Handle error responses
        if (!response.ok) {
            const problemDetails = await parseErrorResponse(response);
            throw new ApiError(response.status, problemDetails, response);
        }

        // Handle 204 No Content
        if (response.status === 204) {
            return undefined as T;
        }

        // Parse JSON response
        const contentType = response.headers.get('content-type');
        if (contentType?.includes('application/json')) {
            const json = await response.json();

            // Check if response is wrapped in ApiResponse<T>
            if (json && typeof json === 'object' && 'data' in json) {
                const apiResponse = json as ApiResponse<T>;
                return apiResponse.data;
            }

            // Return raw JSON if not wrapped
            return json as T;
        }

        // Return text for non-JSON responses
        return (await response.text()) as T;
    } catch (error) {
        // Re-throw ApiError as-is
        if (error instanceof ApiError) {
            throw error;
        }

        // Wrap network errors
        if (error instanceof Error) {
            throw new ApiError(
                0,
                {
                    status: 0,
                    title: 'Network Error',
                    detail: error.message,
                }
            );
        }

        // Unknown error
        throw new ApiError(
            0,
            {
                status: 0,
                title: 'Unknown Error',
                detail: 'An unknown error occurred',
            }
        );
    }
}

/**
 * GET request
 */
export async function get<T>(
    endpoint: string,
    config: RequestConfig = {}
): Promise<T> {
    return request<T>(endpoint, {
        ...config,
        method: 'GET',
    });
}

/**
 * POST request
 */
export async function post<T, D = any>(
    endpoint: string,
    data?: D,
    config: RequestConfig = {}
): Promise<T> {
    return request<T>(endpoint, {
        ...config,
        method: 'POST',
        body: data ? JSON.stringify(data) : undefined,
    });
}

/**
 * PUT request
 */
export async function put<T, D = any>(
    endpoint: string,
    data?: D,
    config: RequestConfig = {}
): Promise<T> {
    return request<T>(endpoint, {
        ...config,
        method: 'PUT',
        body: data ? JSON.stringify(data) : undefined,
    });
}

/**
 * DELETE request
 */
export async function del<T>(
    endpoint: string,
    config: RequestConfig = {}
): Promise<T> {
    return request<T>(endpoint, {
        ...config,
        method: 'DELETE',
    });
}

/**
 * PATCH request
 */
export async function patch<T, D = any>(
    endpoint: string,
    data?: D,
    config: RequestConfig = {}
): Promise<T> {
    return request<T>(endpoint, {
        ...config,
        method: 'PATCH',
        body: data ? JSON.stringify(data) : undefined,
    });
}

/**
 * Upload file(s) using multipart/form-data
 */
export async function upload<T>(
    endpoint: string,
    formData: FormData,
    config: RequestConfig = {}
): Promise<T> {
    // Remove Content-Type header to let browser set it with boundary
    const { headers, ...restConfig } = config;
    const filteredHeaders = new Headers(headers);
    filteredHeaders.delete('Content-Type');

    return request<T>(endpoint, {
        ...restConfig,
        method: 'POST',
        headers: filteredHeaders,
        body: formData,
    });
}

/**
 * Default export with all methods
 */
export const api = {
    get,
    post,
    put,
    delete: del,
    patch,
    upload,
    request,
};

export default api;

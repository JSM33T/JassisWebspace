/**
 * API Response Types
 * Based on JassSpace.Contracts.ApiResponse and ASP.NET Core ProblemDetails
 */

/**
 * Standard success response wrapper from ApiResponse<T>
 */
export interface ApiResponse<T> {
    data: T;
    meta?: PagedMeta | Record<string, any> | null;
}

/**
 * Pagination metadata for paged responses
 */
export interface PagedMeta {
    page: number;
    pageSize: number;
    total: number;
}

/**
 * ASP.NET Core ProblemDetails (RFC 7807)
 * Returned for all error responses
 */
export interface ProblemDetails {
    type?: string;
    title: string;
    status: number;
    detail?: string;
    instance?: string;
    requestId?: string;
    correlationId?: string;
    traceId?: string;
    [key: string]: any; // Extensions
}

/**
 * API Error class for better error handling
 */
export class ApiError extends Error {
    constructor(
        public statusCode: number,
        public problemDetails: ProblemDetails,
        public response?: Response
    ) {
        super(problemDetails.detail || problemDetails.title);
        this.name = 'ApiError';
    }

    /**
     * Check if error is a specific status code
     */
    is(statusCode: number): boolean {
        return this.statusCode === statusCode;
    }

    /**
     * Check if error is unauthorized (401)
     */
    isUnauthorized(): boolean {
        return this.statusCode === 401;
    }

    /**
     * Check if error is forbidden (403)
     */
    isForbidden(): boolean {
        return this.statusCode === 403;
    }

    /**
     * Check if error is not found (404)
     */
    isNotFound(): boolean {
        return this.statusCode === 404;
    }

    /**
     * Check if error is bad request (400)
     */
    isBadRequest(): boolean {
        return this.statusCode === 400;
    }

    /**
     * Check if error is conflict (409)
     */
    isConflict(): boolean {
        return this.statusCode === 409;
    }

    /**
     * Check if error is rate limited (429)
     */
    isRateLimited(): boolean {
        return this.statusCode === 429;
    }

    /**
     * Check if error is server error (5xx)
     */
    isServerError(): boolean {
        return this.statusCode >= 500 && this.statusCode < 600;
    }
}

/**
 * Request configuration options
 */
export interface RequestConfig extends RequestInit {
    /**
     * Base URL for the API (defaults to env variable)
     */
    baseUrl?: string;

    /**
     * Additional headers to include
     */
    headers?: HeadersInit;

    /**
     * Bearer token for authentication
     */
    token?: string;

    /**
     * Request timeout in milliseconds
     */
    timeout?: number;

    /**
     * Custom correlation ID for request tracing
     */
    correlationId?: string;

    /**
     * Whether to include credentials (cookies)
     */
    credentials?: RequestCredentials;
}

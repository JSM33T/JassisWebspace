/**
 * API Response Types
 */
export interface ApiResponse<T> {
    data: T;
    meta?: PagedMeta | Record<string, unknown> | null;
}

export interface PagedMeta {
    page: number;
    pageSize: number;
    total: number;
}

export interface ProblemDetails {
    type?: string;
    title: string;
    status: number;
    detail?: string;
    instance?: string;
    requestId?: string;
    correlationId?: string;
    traceId?: string;
    [key: string]: unknown;
}

export class ApiError extends Error {
    constructor(
        public statusCode: number,
        public problemDetails: ProblemDetails,
        public response?: Response
    ) {
        super(problemDetails.detail || problemDetails.title);
        this.name = 'ApiError';
    }

    is(statusCode: number): boolean {
        return this.statusCode === statusCode;
    }

    isUnauthorized(): boolean {
        return this.statusCode === 401;
    }

    isForbidden(): boolean {
        return this.statusCode === 403;
    }

    isNotFound(): boolean {
        return this.statusCode === 404;
    }

    isBadRequest(): boolean {
        return this.statusCode === 400;
    }

    isConflict(): boolean {
        return this.statusCode === 409;
    }

    isRateLimited(): boolean {
        return this.statusCode === 429;
    }

    isServerError(): boolean {
        return this.statusCode >= 500 && this.statusCode < 600;
    }
}

export interface RequestConfig extends RequestInit {
    baseUrl?: string;
    headers?: HeadersInit;
    token?: string;
    timeout?: number;
    correlationId?: string;
    credentials?: RequestCredentials;
}

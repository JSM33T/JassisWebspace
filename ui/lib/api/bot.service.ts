import { post } from './client';
import { ApiError, ProblemDetails } from './types';

export type BotChatRole = 'system' | 'user' | 'assistant';

export interface BotChatMessageRequest {
    role: BotChatRole;
    content: string;
}

export interface CreateBotChatRequest {
    messages: BotChatMessageRequest[];
}

export interface BotChatResponse {
    message: string;
    model: string;
    createdAt: string;
}

export interface BotStreamStartResponse {
    model: string;
    startedAt: string;
}

export interface BotStreamDeltaResponse {
    delta: string;
}

export interface BotStreamCompleteResponse {
    message: string;
    model: string;
    completedAt: string;
}

export interface BotStreamErrorResponse {
    message: string;
}

interface StreamBotChatOptions {
    signal?: AbortSignal;
    onStart?: (payload: BotStreamStartResponse) => void;
    onDelta?: (payload: BotStreamDeltaResponse) => void;
    onComplete?: (payload: BotStreamCompleteResponse) => void;
}

function generateCorrelationId(): string {
    return `${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
}

function getToken(): string | null {
    if (typeof window === 'undefined') {
        return null;
    }

    return localStorage.getItem('accessToken');
}

function getBaseUrl(): string {
    const baseUrl = process.env.NEXT_PUBLIC_API_URL;
    if (!baseUrl) {
        throw new ApiError(0, {
            status: 0,
            title: 'Configuration Error',
            detail: 'NEXT_PUBLIC_API_URL is not configured.',
        });
    }

    return baseUrl.replace(/\/$/, '');
}

async function parseProblemDetails(response: Response): Promise<ProblemDetails> {
    const contentType = response.headers.get('content-type') ?? '';

    if (contentType.includes('application/json') || contentType.includes('application/problem+json')) {
        try {
            const payload = await response.json();
            if (payload && typeof payload === 'object') {
                const source = payload as Record<string, unknown>;
                const envelope = source.data && typeof source.data === 'object'
                    ? source.data as Record<string, unknown>
                    : undefined;

                return {
                    status: response.status,
                    title:
                        pickString(source.title) ??
                        pickString(envelope?.title) ??
                        response.statusText ??
                        'Request failed',
                    detail:
                        pickString(source.detail) ??
                        pickString(envelope?.detail) ??
                        pickString(source.message) ??
                        pickString(envelope?.message),
                    type:
                        pickString(source.type) ??
                        pickString(envelope?.type) ??
                        'about:blank',
                    ...(source ?? {}),
                    ...(envelope ?? {}),
                };
            }
        } catch {
            // fall through to text fallback
        }
    }

    return {
        status: response.status,
        title: response.statusText || 'Request failed',
        detail: await response.text().catch(() => undefined),
        type: 'about:blank',
    };
}

function pickString(value: unknown): string | undefined {
    return typeof value === 'string' && value.trim().length > 0 ? value : undefined;
}

function parseSseEventBlock(block: string): { eventName: string; payload: string | null } | null {
    const lines = block.split(/\r?\n/);
    let eventName = 'message';
    const dataParts: string[] = [];

    for (const rawLine of lines) {
        const line = rawLine.trimEnd();
        if (!line || line.startsWith(':')) {
            continue;
        }

        if (line.startsWith('event:')) {
            eventName = line.slice('event:'.length).trim();
            continue;
        }

        if (line.startsWith('data:')) {
            dataParts.push(line.slice('data:'.length).trimStart());
        }
    }

    if (dataParts.length === 0) {
        return null;
    }

    return {
        eventName,
        payload: dataParts.join('\n'),
    };
}

export const botService = {
    async createChatCompletion(request: CreateBotChatRequest): Promise<BotChatResponse> {
        return post<BotChatResponse, CreateBotChatRequest>('/bot/chat', request);
    },

    async streamChatCompletion(
        request: CreateBotChatRequest,
        options: StreamBotChatOptions = {}
    ): Promise<BotStreamCompleteResponse> {
        const headers = new Headers({
            'Content-Type': 'application/json',
            'Accept': 'text/event-stream',
            'X-Correlation-Id': generateCorrelationId(),
        });

        const token = getToken();
        if (token) {
            headers.set('Authorization', `Bearer ${token}`);
        }

        const response = await fetch(`${getBaseUrl()}/bot/chat/stream`, {
            method: 'POST',
            credentials: 'include',
            headers,
            body: JSON.stringify(request),
            signal: options.signal,
        });

        if (!response.ok) {
            const problem = await parseProblemDetails(response);
            throw new ApiError(response.status, problem, response);
        }

        if (!response.body) {
            throw new ApiError(0, {
                status: 0,
                title: 'Streaming Error',
                detail: 'The browser did not provide a readable response stream.',
            });
        }

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = '';
        let completedPayload: BotStreamCompleteResponse | null = null;

        while (true) {
            const { done, value } = await reader.read();
            buffer += decoder.decode(value ?? new Uint8Array(), { stream: !done });

            const blocks = buffer.split(/\r?\n\r?\n/);
            buffer = blocks.pop() ?? '';

            for (const block of blocks) {
                const parsedBlock = parseSseEventBlock(block);
                if (!parsedBlock || !parsedBlock.payload) {
                    continue;
                }

                const payload = JSON.parse(parsedBlock.payload) as
                    | BotStreamStartResponse
                    | BotStreamDeltaResponse
                    | BotStreamCompleteResponse
                    | BotStreamErrorResponse;

                switch (parsedBlock.eventName) {
                    case 'start':
                        options.onStart?.(payload as BotStreamStartResponse);
                        break;
                    case 'delta':
                        options.onDelta?.(payload as BotStreamDeltaResponse);
                        break;
                    case 'complete':
                        completedPayload = payload as BotStreamCompleteResponse;
                        options.onComplete?.(completedPayload);
                        break;
                    case 'error': {
                        const errorPayload = payload as BotStreamErrorResponse;
                        throw new ApiError(502, {
                            status: 502,
                            title: 'Bot Provider Error',
                            detail: errorPayload.message,
                        });
                    }
                    default:
                        break;
                }
            }

            if (done) {
                break;
            }
        }

        if (completedPayload) {
            return completedPayload;
        }

        throw new ApiError(0, {
            status: 0,
            title: 'Streaming Error',
            detail: 'The stream ended before a completion event was received.',
        });
    },
};

export default botService;

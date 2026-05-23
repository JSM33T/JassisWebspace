import "server-only";

export interface TaggedResult<T> {
    key: string;
    label: string;
    description: string;
    tag: string;
    ttlSeconds: number;
    generatedAt: string;
    total?: number;
    items: T[];
}

export function apiBaseUrl(): string {
    const value = (process.env.API_URL ?? process.env.NEXT_PUBLIC_API_URL)?.replace(/\/$/, "");
    if (!value) {
        throw new Error("NEXT_PUBLIC_API_URL is not configured");
    }
    return value;
}

export async function parseApiData<T>(response: Response): Promise<T> {
    const payload = await response.json().catch(() => null);
    if (payload && typeof payload === "object" && "data" in payload) {
        return (payload as { data: T }).data;
    }
    return payload as T;
}

export function parseTtl(value: string | undefined, fallback: number): number {
    const parsed = Number.parseInt(value || "", 10);
    if (!Number.isFinite(parsed) || parsed <= 0) return fallback;
    return parsed;
}

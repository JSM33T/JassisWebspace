import "server-only";

import { NextRequest } from "next/server";

interface AuthResult {
    ok: boolean;
    status: number;
    message?: string;
}

function getApiBaseUrl(): string {
    const value = process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, "");
    if (!value) {
        throw new Error("NEXT_PUBLIC_API_URL is not configured");
    }
    return value;
}

function extractBearerToken(request: NextRequest): string | null {
    const authorization = request.headers.get("authorization");
    if (!authorization) return null;
    const [scheme, token] = authorization.split(" ");
    if (scheme?.toLowerCase() !== "bearer" || !token) return null;
    return token;
}

export async function ensureAdminRequest(request: NextRequest): Promise<AuthResult> {
    const token = extractBearerToken(request);
    if (!token) {
        return { ok: false, status: 401, message: "Missing bearer token." };
    }

    const response = await fetch(`${getApiBaseUrl()}/auth/me`, {
        method: "GET",
        headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
        },
        cache: "no-store",
    });

    if (!response.ok) {
        return { ok: false, status: 401, message: "Unauthorized." };
    }

    const payload = await response.json().catch(() => null);
    const data = payload && typeof payload === "object" && "data" in payload
        ? (payload as { data: unknown }).data
        : payload;

    const roles = data && typeof data === "object" && "roles" in data
        ? (data as { roles?: unknown }).roles
        : undefined;

    const hasAdminRole = Array.isArray(roles) && roles.some((role) => role === "admin");
    if (!hasAdminRole) {
        return { ok: false, status: 403, message: "Forbidden." };
    }

    return { ok: true, status: 200 };
}


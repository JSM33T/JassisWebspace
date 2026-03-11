const DEFAULT_REDIRECT = '/';
const LOGIN_REDIRECT_STORAGE_KEY = 'jassspace_login_redirect';

const AUTH_PATHS = new Set(['/login', '/signup']);
const AUTH_REQUIRED_REASON = 'auth_required';

function extractPathname(url: string): string {
    return url.split(/[?#]/, 1)[0] || '/';
}

export function sanitizeRedirectTarget(target?: string | null): string {
    if (!target) {
        return DEFAULT_REDIRECT;
    }

    const candidate = target.trim();

    if (!candidate) {
        return DEFAULT_REDIRECT;
    }

    // Reject protocol-relative URLs and require app-relative paths.
    if (candidate.startsWith('//') || !candidate.startsWith('/')) {
        return DEFAULT_REDIRECT;
    }

    const pathname = extractPathname(candidate).toLowerCase();

    if (AUTH_PATHS.has(pathname)) {
        return DEFAULT_REDIRECT;
    }

    return candidate;
}

export function buildLoginHref(currentPath?: string | null): string {
    const redirectTarget = sanitizeRedirectTarget(currentPath);

    if (redirectTarget === DEFAULT_REDIRECT) {
        return '/login';
    }

    return `/login?redirect=${encodeURIComponent(redirectTarget)}`;
}

export function addLoginReason(loginHref: string, reason: string): string {
    const separator = loginHref.includes('?') ? '&' : '?';
    return `${loginHref}${separator}reason=${encodeURIComponent(reason)}`;
}

export function buildAuthRequiredLoginHref(currentPath?: string | null): string {
    return addLoginReason(buildLoginHref(currentPath), AUTH_REQUIRED_REASON);
}

export function persistLoginRedirectTarget(target?: string | null): void {
    if (typeof window === 'undefined') {
        return;
    }

    const sanitized = sanitizeRedirectTarget(target);

    if (sanitized === DEFAULT_REDIRECT) {
        window.sessionStorage.removeItem(LOGIN_REDIRECT_STORAGE_KEY);
        return;
    }

    window.sessionStorage.setItem(LOGIN_REDIRECT_STORAGE_KEY, sanitized);
}

export function readPersistedLoginRedirectTarget(): string {
    if (typeof window === 'undefined') {
        return DEFAULT_REDIRECT;
    }

    return sanitizeRedirectTarget(
        window.sessionStorage.getItem(LOGIN_REDIRECT_STORAGE_KEY)
    );
}

export function clearPersistedLoginRedirectTarget(): void {
    if (typeof window === 'undefined') {
        return;
    }

    window.sessionStorage.removeItem(LOGIN_REDIRECT_STORAGE_KEY);
}

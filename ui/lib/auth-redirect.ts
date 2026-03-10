const DEFAULT_REDIRECT = '/';

const AUTH_PATHS = new Set(['/login', '/signup']);

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

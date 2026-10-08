export function normalizeRoles(roles: unknown): string[] {
    if (!Array.isArray(roles)) return [];
    return [...new Set(roles.filter((role): role is string => typeof role === 'string')
        .map(role => role.trim().toLowerCase()).filter(Boolean))];
}

export function hasRole(user: { roles?: readonly string[] } | null | undefined, role: string): boolean {
    return normalizeRoles(user?.roles).includes(role.trim().toLowerCase());
}

export function getDisplayRole(user: { roles?: readonly string[] } | null | undefined): string | null {
    for (const role of ['admin', 'mod', 'user']) {
        if (hasRole(user, role)) return role;
    }
    return normalizeRoles(user?.roles)[0] ?? null;
}

export function getDisplayRoleLabel(user: { roles?: readonly string[] } | null | undefined): string | null {
    const role = getDisplayRole(user);
    return role ? role.charAt(0).toUpperCase() + role.slice(1) : null;
}

const adminOnlyPaths = [
    '/admin/gallery',
    '/admin/users',
    '/admin/messages',
    '/admin/properties',
    '/admin/email',
    '/admin/settings',
];

export function canAccessAdminPath(user: { roles?: readonly string[] } | null | undefined, path: string): boolean {
    if (hasRole(user, 'admin')) return true;
    if (!hasRole(user, 'mod')) return false;
    return !adminOnlyPaths.some(prefix => path === prefix || path.startsWith(`${prefix}/`));
}

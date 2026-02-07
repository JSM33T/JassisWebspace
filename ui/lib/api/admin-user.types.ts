export interface AdminUserListItem {
    id: string;
    username: string;
    email: string;
    firstName: string | null;
    lastName: string | null;
    avatarUrl: string | null;
    isActive: boolean;
    emailVerified: boolean;
    roles: string[];
    createdAt: string;
    lastSeenAt: string | null;
}

export interface ProfileDetails {
    id: string;
    email: string;
    emailVerified: boolean;
    username: string;
    firstName: string | null;
    lastName: string | null;
    displayName: string | null;
    bio: string | null;
    avatarUrl: string | null;
    coverUrl: string | null;
    timezone: string | null;
    locale: string | null;
    verifiedBadge: boolean;
    createdAt: string;
    updatedAt: string;
    roles: string[];
}

export interface AdminUserDetailsResponse {
    profile: ProfileDetails;
    isActive: boolean;
}

export interface AdminUserDetail extends ProfileDetails {
    isActive: boolean;
    // Computed/Extra fields not in profile but might be needed
    externalLoginProviders: string[];
    sessionCount: number;
    hasTwoFactorEnabled: boolean;
}

export interface UpdateAdminUserRequest {
    isActive?: boolean;
    emailVerified?: boolean;
    roles?: string[];
}

export interface AdminUserListParams {
    search?: string;
    page?: number;
    pageSize?: number;
}

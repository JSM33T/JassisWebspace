import { get, post, put } from './client';

// ============================================================================
// Request DTOs
// ============================================================================

export interface UpdateProfileRequest {
    username?: string;
    firstName?: string;
    lastName?: string;
    displayName?: string;
    bio?: string;
    timezone?: string;
    locale?: string;
}

// ============================================================================
// Response DTOs
// ============================================================================

export interface ProfileInfo {
    id: string;
    email: string;
    emailVerified: boolean;
    username?: string | null;
    firstName?: string | null;
    lastName?: string | null;
    displayName?: string | null;
    bio?: string | null;
    avatarUrl?: string | null;
    coverUrl?: string | null;
    timezone?: string | null;
    locale?: string | null;
    verifiedBadge: boolean;
    createdAt: string;
    updatedAt: string;
    roles: string[];
}

export interface GetProfileResponse {
    data: ProfileInfo;
}

export interface UpdateProfileResponse {
    data: {
        profile: ProfileInfo;
    };
}

// ============================================================================
// Profile Service
// ============================================================================

export const profileService = {
    /**
     * GET /profile
     * Get current user profile
     */
    async getProfile(token: string): Promise<GetProfileResponse> {
        return get<GetProfileResponse>('/profile', { token });
    },

    /**
     * PUT /profile
     * Update profile information
     */
    async updateProfile(data: UpdateProfileRequest, token: string): Promise<UpdateProfileResponse> {
        return put<UpdateProfileResponse, UpdateProfileRequest>('/profile', data, { token });
    },

    /**
     * POST /media/avatar
     * Upload avatar image
     */
    async uploadAvatar(formData: FormData, token: string): Promise<UpdateProfileResponse> {
        return post<UpdateProfileResponse, FormData>('/media/avatar', formData, { token });
    },

    /**
     * POST /media/cover
     * Upload cover image
     */
    async uploadCover(formData: FormData, token: string): Promise<UpdateProfileResponse> {
        return post<UpdateProfileResponse, FormData>('/media/cover', formData, { token });
    },
};

export default profileService;

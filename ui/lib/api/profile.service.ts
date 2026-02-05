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
    username?: string | null;
    firstName?: string | null;
    lastName?: string | null;
    displayName?: string | null;
    bio?: string | null;
    avatarUrl?: string | null;
    coverUrl?: string | null;
    verifiedBadge: boolean;
    createdAt: string;
    updatedAt: string;
}

export interface PrivateProfileInfo extends ProfileInfo {
    email: string;
    emailVerified: boolean;
    timezone?: string | null;
    locale?: string | null;
    roles: string[];
}

export interface GetProfileResponse {
    data: ProfileInfo;
}

export interface UpdateProfileResponse {
    data: {
        profile: PrivateProfileInfo;
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
    async getProfile(token: string): Promise<PrivateProfileInfo> {
        return get<PrivateProfileInfo>('/profile', { token });
    },

    /**
     * GET /profile/{username}
     * Get public profile by username
     */
    async getPublicProfile(username: string): Promise<ProfileInfo> {
        return get<ProfileInfo>(`/profile/${username}`);
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

/**
 * Authentication Service
 * Example service using the API client
 */

import { get, post } from './client';

/**
 * Auth Request/Response Types
 */
export interface LoginRequest {
    emailOrUsername: string;
    password: string;
    deviceName?: string;
    deviceType?: string;
    rememberMe?: boolean;
}

export interface RegisterRequest {
    email: string;
    password: string;
    username: string;
    firstName?: string;
    lastName?: string;
}

export interface RefreshTokenRequest {
    refreshToken: string;
}

export interface ForgotPasswordRequest {
    email: string;
}

export interface ResetPasswordRequest {
    email: string;
    token: string;
    newPassword: string;
}

export interface VerifyEmailRequest {
    email: string;
    token: string;
}

export interface UserInfo {
    id: string;
    email: string;
    emailVerified: boolean;
    username?: string;
    firstName?: string;
    lastName?: string;
    avatarUrl?: string;
    coverUrl?: string;
    createdAt: string;
    roles: string[];
    authMethod?: string;
    activeTier?: UserTierInfo;
}

export interface UserTierInfo {
    tierId: number;
    tierName: string;
    startDate: string;
    endDate: string;
    isActive: boolean;
}

export interface AuthResponse {
    accessToken: string;
    refreshToken?: string;
    expiresAt: string;
    user: UserInfo;
}

export interface RefreshTokenResponse {
    accessToken: string;
    refreshToken?: string;
    expiresAt: string;
}

export interface AvailabilityResponse {
    available: boolean;
    valid: boolean;
    message: string;
}

/**
 * Authentication Service
 */
export const authService = {
    /**
     * Login with email or username
     */
    async login(request: LoginRequest): Promise<AuthResponse> {
        return post<AuthResponse, LoginRequest>('/auth/login', request);
    },

    /**
     * Register new user
     */
    async register(request: RegisterRequest): Promise<AuthResponse> {
        return post<AuthResponse, RegisterRequest>('/auth/register', request);
    },

    /**
     * Refresh access token
     */
    async refreshToken(request: RefreshTokenRequest): Promise<RefreshTokenResponse> {
        return post<RefreshTokenResponse, RefreshTokenRequest>('/auth/refresh', request);
    },

    /**
     * Logout current user
     */
    async logout(refreshToken: string, token: string): Promise<void> {
        return post<void, RefreshTokenRequest>(
            '/auth/logout',
            { refreshToken },
            { token }
        );
    },

    /**
     * Get current user info
     */
    async getCurrentUser(token: string): Promise<UserInfo> {
        return get<UserInfo>('/auth/me', { token });
    },

    /**
     * Check username availability
     */
    async checkUsernameAvailability(username: string): Promise<AvailabilityResponse> {
        return get<AvailabilityResponse>(`/auth/username/available?username=${encodeURIComponent(username)}`);
    },

    /**
     * Check email availability
     */
    async checkEmailAvailability(email: string): Promise<AvailabilityResponse> {
        return get<AvailabilityResponse>(`/auth/email/available?email=${encodeURIComponent(email)}`);
    },

    /**
     * Send forgot password email
     */
    async forgotPassword(request: ForgotPasswordRequest): Promise<void> {
        return post<void, ForgotPasswordRequest>('/auth/forgot-password', request);
    },

    /**
     * Reset password with token
     */
    async resetPassword(request: ResetPasswordRequest): Promise<void> {
        return post<void, ResetPasswordRequest>('/auth/reset-password', request);
    },

    /**
     * Verify email with token
     */
    async verifyEmail(email: string, token: string): Promise<void> {
        return get<void>(`/auth/verify-email?email=${encodeURIComponent(email)}&token=${encodeURIComponent(token)}`);
    },

    /**
     * Resend verification email
     */
    async resendVerification(email: string): Promise<void> {
        return post<void, { email: string }>('/auth/resend-verification', { email });
    },

    /**
     * Initiate GitHub OAuth
     */
    getGitHubLoginUrl(baseUrl?: string): string {
        const base = baseUrl || process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';
        return `${base}/auth/github/login`;
    },

    /**
     * Initiate Google OAuth
     */
    getGoogleLoginUrl(baseUrl?: string): string {
        const base = baseUrl || process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';
        return `${base}/auth/google/login`;
    },
};

export default authService;

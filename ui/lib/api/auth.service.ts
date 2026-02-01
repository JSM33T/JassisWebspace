import { get, post, del } from './client';

// ============================================================================
// Request DTOs (matching .NET API)
// ============================================================================

export interface LoginRequest {
    emailOrUsername: string;
    password: string;
    deviceName?: string | null;
    deviceType?: string | null;
    rememberMe?: boolean;
}

export interface RegisterRequest {
    email: string;
    password: string;
    username: string;
    firstName?: string | null;
    lastName?: string | null;
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

export interface ResendVerificationRequest {
    email: string;
}

export interface SetPasswordRequest {
    email: string;
    currentPassword?: string | null;
    newPassword: string;
}

export interface UpdateProfileRequest {
    username?: string | null;
    firstName?: string | null;
    lastName?: string | null;
    displayName?: string | null;
    bio?: string | null;
    avatarUrl?: string | null;
    coverUrl?: string | null;
    timezone?: string | null;
    locale?: string | null;
}

// ============================================================================
// Response DTOs (matching .NET API)
// ============================================================================

export interface UserInfo {
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
    createdAt: string;
    roles: string[];
    authMethod?: string | null;
    preferences?: {
        timezone?: string | null;
        locale?: string | null;
    } | null;
}

export interface ProfileUpdateResponse {
    message: string;
    updatedAt: string;
    profile: UserInfo;
}

export interface AuthResponse {
    accessToken: string;
    refreshToken?: string | null;
    expiresAt: string;
    user: UserInfo;
}

export interface RefreshTokenResponse {
    accessToken: string;
    refreshToken?: string | null;
    expiresAt: string;
}

export interface LogoutResponse {
    message: string;
    loggedOutAt: string;
}

export interface VerificationSentResponse {
    message: string;
    sentAt: string;
}

export interface PasswordResetResponse {
    message: string;
    resetAt: string;
}

export interface AvailabilityResponse {
    available: boolean;
    valid: boolean;
    message: string;
}

export interface SessionInfo {
    id: string;
    authMethod: string;
    ipAddress: string;
    userAgent: string;
    createdAt: string;
    lastSeenAt: string;
    isCurrentSession: boolean;
}

export interface SessionsResponse {
    sessions: SessionInfo[];
}

// ============================================================================
// Auth Service (matching AuthController endpoints)
// ============================================================================

export const authService = {
    /**
     * POST /auth/login
     * Authenticate user with email/username and create session
     */
    async login(request: LoginRequest): Promise<AuthResponse> {
        return post<AuthResponse, LoginRequest>('/auth/login', request);
    },

    /**
     * POST /auth/register
     * Register new user account with mandatory username
     */
    async register(request: RegisterRequest): Promise<AuthResponse> {
        return post<AuthResponse, RegisterRequest>('/auth/register', request);
    },

    /**
     * POST /auth/refresh
     * Refresh access token using refresh token
     */
    async refreshToken(request: RefreshTokenRequest): Promise<RefreshTokenResponse> {
        return post<RefreshTokenResponse, RefreshTokenRequest>('/auth/refresh', request);
    },

    /**
     * POST /auth/logout
     * Logout user and revoke refresh token (requires auth)
     */
    async logout(refreshToken: string, token: string): Promise<LogoutResponse> {
        return post<LogoutResponse, RefreshTokenRequest>(
            '/auth/logout',
            { refreshToken },
            { token }
        );
    },

    /**
     * GET /auth/me
     * Get current authenticated user information (requires auth)
     */
    async getCurrentUser(token?: string): Promise<UserInfo> {
        return get<UserInfo>('/auth/me', { token });
    },

    /**
     * GET /auth/verify-email
     * Verify email with verification token
     */
    async verifyEmail(email: string, token: string): Promise<void> {
        return get<void>(
            `/auth/verify-email?email=${encodeURIComponent(email)}&token=${encodeURIComponent(token)}`
        );
    },

    /**
     * POST /auth/resend-verification
     * Resend email verification code
     */
    async resendVerification(request: ResendVerificationRequest): Promise<VerificationSentResponse> {
        return post<VerificationSentResponse, ResendVerificationRequest>(
            '/auth/resend-verification',
            request
        );
    },

    /**
     * POST /auth/forgot-password
     * Send password reset code to email
     */
    async forgotPassword(request: ForgotPasswordRequest): Promise<VerificationSentResponse> {
        return post<VerificationSentResponse, ForgotPasswordRequest>(
            '/auth/forgot-password',
            request
        );
    },

    /**
     * POST /auth/reset-password
     * Reset password using verification code
     */
    async resetPassword(request: ResetPasswordRequest): Promise<PasswordResetResponse> {
        return post<PasswordResetResponse, ResetPasswordRequest>(
            '/auth/reset-password',
            request
        );
    },

    /**
     * POST /auth/set-password
     * Set or change password (Google accounts can set without current) (requires auth)
     */
    async setPassword(request: SetPasswordRequest, token?: string): Promise<void> {
        return post<void, SetPasswordRequest>('/auth/set-password', request, { token });
    },

    /**
     * GET /auth/username/available
     * Check if username is available
     */
    async checkUsernameAvailability(username: string): Promise<AvailabilityResponse> {
        return get<AvailabilityResponse>(
            `/auth/username/available?username=${encodeURIComponent(username)}`
        );
    },

    /**
     * GET /auth/email/available
     * Check if email is available
     */
    async checkEmailAvailability(email: string): Promise<AvailabilityResponse> {
        return get<AvailabilityResponse>(
            `/auth/email/available?email=${encodeURIComponent(email)}`
        );
    },

    /**
     * GET /auth/google/login
     * Initiate Google OAuth flow
     */
    getGoogleLoginUrl(baseUrl?: string): string {
        const base = baseUrl || process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';
        return `${base}/auth/google/login`;
    },

    /**
     * GET /auth/github/login
     * Initiate GitHub OAuth flow
     */
    getGitHubLoginUrl(baseUrl?: string): string {
        const base = baseUrl || process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';
        return `${base}/auth/github/login`;
    },

    /**
     * GET /profile/sessions
     * Get active sessions for current user (requires auth)
     */
    async getActiveSessions(): Promise<SessionInfo[]> {
        const response = await get<SessionsResponse>('/profile/sessions');
        return response.sessions;
    },

    /**
     * POST /profile/sessions/{id}/logout
     * Revoke a specific session (requires auth)
     */
    async revokeSession(id: string): Promise<void> {
        return post<void>(`/profile/sessions/${id}/logout`);
    },

    /**
     * POST /profile/sessions/logout-all
     * Revoke all other sessions (except current)
     */
    async revokeAllOtherSessions(): Promise<void> {
        return post<void>('/profile/sessions/logout-all');
    },

    /**
     * POST /profile
     * Update user profile information
     */
    async updateProfile(request: UpdateProfileRequest): Promise<ProfileUpdateResponse> {
        return post<ProfileUpdateResponse, UpdateProfileRequest>('/profile', request);
    },

    /**
     * POST /media/avatar
     * Upload avatar image
     */
    async uploadAvatar(file: Blob): Promise<ProfileUpdateResponse> {
        const formData = new FormData();
        formData.append('file', file);
        return post<ProfileUpdateResponse, FormData>('/media/avatar', formData);
    },

    /**
     * POST /media/cover
     * Upload cover image
     */
    async uploadCover(file: Blob): Promise<ProfileUpdateResponse> {
        const formData = new FormData();
        formData.append('file', file);
        return post<ProfileUpdateResponse, FormData>('/media/cover', formData);
    },
};

export default authService;

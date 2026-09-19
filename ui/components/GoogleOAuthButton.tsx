"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { apiClient } from "@/lib/api/client";
import { persistLoginRedirectTarget, sanitizeRedirectTarget } from "@/lib/auth-redirect";

interface GoogleOAuthButtonProps {
    variant?: "default" | "outline" | "ghost" | "destructive" | "secondary" | "link";
    size?: "default" | "sm" | "lg" | "icon";
    className?: string;
    children?: React.ReactNode;
    disabled?: boolean;
    redirectTo?: string;
}

interface GoogleInitResponse {
    authUrl: string;
}

interface OAuthButtonError {
    problemDetails?: {
        title?: string;
    };
    message?: string;
}

export default function GoogleOAuthButton({
    variant = "outline",
    size = "default",
    className = "",
    children,
    disabled = false,
    redirectTo
}: GoogleOAuthButtonProps) {
    const [isLoading, setIsLoading] = useState(false);

    const handleGoogleLogin = async () => {
        if (disabled || isLoading) return;

        setIsLoading(true);

        try {
            // Call backend to get Google OAuth URL
            const response = await apiClient.get<GoogleInitResponse>("/auth/google");

            const authUrl = response.authUrl;

            if (authUrl) {
                // Store return URL for redirect after OAuth
                const queryParams = new URLSearchParams(window.location.search);
                const queryRedirect = queryParams.get("redirect") ?? queryParams.get("returnUrl");
                const currentUrl = `${window.location.pathname}${window.location.search}`;
                const isAuthPage = window.location.pathname === "/login" || window.location.pathname === "/signup";
                const redirectTarget = sanitizeRedirectTarget(
                    redirectTo ?? (isAuthPage ? queryRedirect : currentUrl)
                );
                localStorage.setItem("oauthRedirect", redirectTarget);
                persistLoginRedirectTarget(redirectTarget);

                // Show success message before redirect
                toast.success("Redirecting to Google...");

                // Small delay to show the success message and loading state
                setTimeout(() => {
                    window.location.href = authUrl;
                }, 500);

                // Don't set loading to false here since we're redirecting
            } else {
                console.log("Response data:", response);
                setIsLoading(false);
                throw new Error("Failed to get Google OAuth URL");
            }
        } catch (error: unknown) {
            const oauthError = error as OAuthButtonError;
            console.error("Google OAuth initiation failed:", error);
            setIsLoading(false);

            if (oauthError?.problemDetails?.title) {
                toast.error(oauthError.problemDetails.title);
            } else if (oauthError?.message) {
                toast.error(oauthError.message);
            } else {
                toast.error("Failed to initiate Google login. Please try again.");
            }
        }
    };

    return (
        <Button
            variant={variant}
            size={size}
            className={className}
            onClick={handleGoogleLogin}
            disabled={disabled || isLoading}
        >
            {isLoading ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
                <svg className="h-4 w-4 mr-2" viewBox="0 0 24 24" aria-hidden="true">
                    <path fill="#4285F4" d="M21.6 12.227c0-.709-.064-1.391-.182-2.045H12v3.868h5.382a4.6 4.6 0 0 1-1.996 3.018v2.509h3.232c1.891-1.741 2.982-4.305 2.982-7.35Z" />
                    <path fill="#34A853" d="M12 22c2.7 0 4.964-.895 6.618-2.423l-3.232-2.509c-.895.6-2.041.955-3.386.955-2.605 0-4.809-1.759-5.595-4.123H3.064v2.591A9.997 9.997 0 0 0 12 22Z" />
                    <path fill="#FBBC05" d="M6.405 13.9A6.01 6.01 0 0 1 6.091 12c0-.659.113-1.3.314-1.9V7.509H3.064A9.996 9.996 0 0 0 2 12c0 1.614.386 3.141 1.064 4.491L6.405 13.9Z" />
                    <path fill="#EA4335" d="M12 5.977c1.468 0 2.786.505 3.823 1.496l2.868-2.868C16.959 2.991 14.695 2 12 2a9.997 9.997 0 0 0-8.936 5.509L6.405 10.1C7.191 7.736 9.395 5.977 12 5.977Z" />
                </svg>
            )}
            {children || (isLoading ? "Connecting..." : "Google")}
        </Button>
    );
}

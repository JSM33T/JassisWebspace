"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Chrome, Loader2 } from "lucide-react";
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
                <Chrome className="h-4 w-4 mr-2" />
            )}
            {children || (isLoading ? "Connecting..." : "Google")}
        </Button>
    );
}

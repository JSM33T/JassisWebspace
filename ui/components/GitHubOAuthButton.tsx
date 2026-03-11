"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Github, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { apiClient } from "@/lib/api/client";
import { persistLoginRedirectTarget, sanitizeRedirectTarget } from "@/lib/auth-redirect";

interface GitHubOAuthButtonProps {
    variant?: "default" | "outline" | "ghost" | "destructive" | "secondary" | "link";
    size?: "default" | "sm" | "lg" | "icon";
    className?: string;
    children?: React.ReactNode;
    disabled?: boolean;
    redirectTo?: string;
}

interface GitHubInitResponse {
    authUrl: string;
}

interface OAuthButtonError {
    problemDetails?: {
        title?: string;
    };
    message?: string;
}

export default function GitHubOAuthButton({
    variant = "outline",
    size = "default",
    className = "",
    children,
    disabled = false,
    redirectTo
}: GitHubOAuthButtonProps) {
    const [isLoading, setIsLoading] = useState(false);

    const handleGitHubLogin = async () => {
        if (disabled || isLoading) return;

        setIsLoading(true);

        try {
            const response = await apiClient.get<GitHubInitResponse>("/auth/github");
            const authUrl = response.authUrl;

            if (authUrl) {
                const queryParams = new URLSearchParams(window.location.search);
                const queryRedirect = queryParams.get("redirect") ?? queryParams.get("returnUrl");
                const currentUrl = `${window.location.pathname}${window.location.search}`;
                const isAuthPage = window.location.pathname === "/login" || window.location.pathname === "/signup";
                const redirectTarget = sanitizeRedirectTarget(
                    redirectTo ?? (isAuthPage ? queryRedirect : currentUrl)
                );
                localStorage.setItem("oauthRedirect", redirectTarget);
                persistLoginRedirectTarget(redirectTarget);

                toast.success("Redirecting to GitHub...");

                setTimeout(() => {
                    window.location.href = authUrl;
                }, 500);
            } else {
                setIsLoading(false);
                throw new Error("Failed to get GitHub OAuth URL");
            }
        } catch (error: unknown) {
            const oauthError = error as OAuthButtonError;
            console.error("GitHub OAuth initiation failed:", error);
            setIsLoading(false);

            if (oauthError?.problemDetails?.title) {
                toast.error(oauthError.problemDetails.title);
            } else if (oauthError?.message) {
                toast.error(oauthError.message);
            } else {
                toast.error("Failed to initiate GitHub login. Please try again.");
            }
        }
    };

    return (
        <Button
            variant={variant}
            size={size}
            className={className}
            onClick={handleGitHubLogin}
            disabled={disabled || isLoading}
        >
            {isLoading ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
                <Github className="h-4 w-4 mr-2" />
            )}
            {children || (isLoading ? "Connecting..." : "GitHub")}
        </Button>
    );
}

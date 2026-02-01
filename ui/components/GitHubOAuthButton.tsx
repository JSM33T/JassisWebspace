"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Github, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { apiClient } from "@/lib/api/client";

interface GitHubOAuthButtonProps {
    variant?: "default" | "outline" | "ghost" | "destructive" | "secondary" | "link";
    size?: "default" | "sm" | "lg" | "icon";
    className?: string;
    children?: React.ReactNode;
    disabled?: boolean;
}

interface GitHubInitResponse {
    authUrl: string;
}

export default function GitHubOAuthButton({
    variant = "outline",
    size = "default",
    className = "",
    children,
    disabled = false,
}: GitHubOAuthButtonProps) {
    const [isLoading, setIsLoading] = useState(false);

    const handleGitHubLogin = async () => {
        if (disabled || isLoading) return;

        setIsLoading(true);

        try {
            const response = await apiClient.get<GitHubInitResponse>("/auth/github");
            const authUrl = response.authUrl;

            if (authUrl) {
                const currentUrl = window.location.pathname;
                const shouldResetToHome = currentUrl === "/login" || currentUrl === "/signup";
                localStorage.setItem("oauthRedirect", shouldResetToHome ? "/" : currentUrl);

                toast.success("Redirecting to GitHub...");

                setTimeout(() => {
                    window.location.href = authUrl;
                }, 500);
            } else {
                setIsLoading(false);
                throw new Error("Failed to get GitHub OAuth URL");
            }
        } catch (error: any) {
            console.error("GitHub OAuth initiation failed:", error);
            setIsLoading(false);

            if (error?.problemDetails?.title) {
                toast.error(error.problemDetails.title);
            } else if (error?.message) {
                toast.error(error.message);
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

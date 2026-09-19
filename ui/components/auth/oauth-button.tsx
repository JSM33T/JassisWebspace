"use client";

import { useRef, useState, type ComponentProps } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { apiClient } from "@/lib/api/client";
import { persistLoginRedirectTarget, sanitizeRedirectTarget } from "@/lib/auth-redirect";
import { oauthProviders, unavailableProviderMessage, type OAuthProviderId } from "@/lib/auth-providers";
import { cn } from "@/lib/utils";
import { ProviderIcon } from "./provider-icon";

export type OAuthButtonProps = Pick<ComponentProps<typeof Button>, 'variant' | 'size' | 'className' | 'children' | 'disabled'> & {
    redirectTo?: string;
};

export function OAuthButton({
    provider,
    variant = "outline",
    size = "lg",
    className,
    children,
    disabled = false,
    redirectTo,
}: OAuthButtonProps & { provider: OAuthProviderId }) {
    const configuration = oauthProviders[provider];
    const [isLoading, setIsLoading] = useState(false);
    const [unavailableTooltipOpen, setUnavailableTooltipOpen] = useState(false);
    const requestPending = useRef(false);

    const handleLogin = async () => {
        if (!configuration.available || disabled || requestPending.current) return;
        requestPending.current = true;
        setIsLoading(true);

        try {
            const response = await apiClient.get<{ authUrl: string }>(`/auth/${provider}`);
            if (!response.authUrl) throw new Error(`Failed to get ${configuration.label} OAuth URL`);

            const queryParams = new URLSearchParams(window.location.search);
            const queryRedirect = queryParams.get("redirect") ?? queryParams.get("returnUrl");
            const currentUrl = `${window.location.pathname}${window.location.search}`;
            const isAuthPage = window.location.pathname === "/login" || window.location.pathname === "/signup";
            const redirectTarget = sanitizeRedirectTarget(redirectTo ?? (isAuthPage ? queryRedirect : currentUrl));
            localStorage.setItem("oauthRedirect", redirectTarget);
            persistLoginRedirectTarget(redirectTarget);

            toast.success(`Redirecting to ${configuration.label}...`);
            setTimeout(() => { window.location.href = response.authUrl; }, 500);
        } catch (error: unknown) {
            const oauthError = error as { problemDetails?: { title?: string }; message?: string };
            requestPending.current = false;
            setIsLoading(false);
            toast.error(oauthError?.problemDetails?.title || oauthError?.message || `Failed to initiate ${configuration.label} login. Please try again.`);
        }
    };

    const button = (
        <Button
            type="button"
            variant={variant}
            size={size}
            className={cn("w-full", configuration.className, className)}
            onClick={handleLogin}
            disabled={!configuration.available || disabled || isLoading}
            aria-busy={isLoading || undefined}
        >
            {isLoading ? <Loader2 className="size-4 animate-spin" aria-hidden="true" /> : <ProviderIcon provider={provider} />}
            {isLoading ? "Connecting..." : children || configuration.label}
        </Button>
    );

    if (configuration.available) return button;

    return (
        <TooltipProvider>
            <Tooltip open={unavailableTooltipOpen} onOpenChange={setUnavailableTooltipOpen}>
                <TooltipTrigger asChild>
                    <span
                        tabIndex={0}
                        aria-label={`${configuration.label} sign-in`}
                        aria-disabled="true"
                        onPointerEnter={() => setUnavailableTooltipOpen(true)}
                        onPointerLeave={() => setUnavailableTooltipOpen(false)}
                        onFocus={() => setUnavailableTooltipOpen(true)}
                        onBlur={() => setUnavailableTooltipOpen(false)}
                        className="inline-flex w-full cursor-not-allowed rounded-md focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"
                    >
                        {button}
                    </span>
                </TooltipTrigger>
                <TooltipContent>{unavailableProviderMessage}</TooltipContent>
            </Tooltip>
        </TooltipProvider>
    );
}

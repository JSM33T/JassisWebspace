"use client";

import { oauthProviderOrder } from "@/lib/auth-providers";
import { OAuthButton } from "./oauth-button";

export function SocialAuthButtons({ redirectTo, disabled = false }: { redirectTo?: string; disabled?: boolean }) {
    return (
        <div className="grid grid-cols-2 gap-3" role="group" aria-label="Social sign-in options">
            {oauthProviderOrder.map((provider) => (
                <OAuthButton key={provider} provider={provider} redirectTo={redirectTo} disabled={disabled} />
            ))}
        </div>
    );
}

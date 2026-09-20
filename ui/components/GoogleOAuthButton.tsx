"use client";

import { OAuthButton, type OAuthButtonProps } from "@/components/auth/oauth-button";

export default function GoogleOAuthButton(props: OAuthButtonProps) {
    return <OAuthButton {...props} provider="google" />;
}

"use client";

import { OAuthButton, type OAuthButtonProps } from "@/components/auth/oauth-button";

export default function GitHubOAuthButton(props: OAuthButtonProps) {
    return <OAuthButton {...props} provider="github" />;
}

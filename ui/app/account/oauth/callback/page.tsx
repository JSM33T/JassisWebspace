"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Loader2, CheckCircle, XCircle, Chrome, Home } from "lucide-react";
import { toast } from "sonner";
import { apiClient } from "@/lib/api/client";
import authService from "@/lib/api/auth.service";
import Link from "next/link";
import { useUser } from "@/contexts/UserContext";

type CallbackState = "loading" | "success" | "error";

export default function OAuthCallbackPage() {
    const [state, setState] = useState<CallbackState>("loading");
    const [error, setError] = useState<string>("");
    const router = useRouter();
    const searchParams = useSearchParams();
    const { setUser } = useUser();

    useEffect(() => {
        const handleCallback = async () => {
            try {
                // Check if this is a redirect from our backend with auth results
                const success = searchParams.get("success");
                const token = searchParams.get("token");
                const expires = searchParams.get("expires");
                const errorParam = searchParams.get("error");

                // Legacy: Check for direct OAuth parameters (if Google redirects directly)
                const code = searchParams.get("code");
                const stateParam = searchParams.get("state");

                // Handle backend redirect with auth results (new approach)
                if (success === "true" && token) {
                    // Authentication successful - backend already processed everything
                    const expiresAt = expires ? new Date(expires) : new Date(Date.now() + 15 * 60 * 1000);

                    // Set access token in localStorage
                    localStorage.setItem('accessToken', token);

                    // Get user info from the /auth/me endpoint
                    try {
                        const userData = await authService.getCurrentUser(token);

                        // Set user in context
                        setUser({
                            id: userData.id,
                            firstName: userData.firstName || '',
                            lastName: userData.lastName || '',
                            username: userData.username || '',
                            email: userData.email,
                            avatarUrl: userData.avatarUrl || undefined,
                            login: true,
                            expiry: expiresAt,
                            role: userData.roles?.[0] || 'user',
                        });

                        setState("success");
                        toast.success("Successfully logged in!");

                        // Redirect after a short delay
                        setTimeout(() => {
                            const redirectUrl = localStorage.getItem("oauthRedirect") || "/";
                            localStorage.removeItem("oauthRedirect");
                            router.push(redirectUrl);
                        }, 2000);

                    } catch (error) {
                        console.error("Error getting user info:", error);

                        setState("success");
                        toast.success("Successfully logged in!");

                        setTimeout(() => {
                            const redirectUrl = localStorage.getItem("oauthRedirect") || "/";
                            localStorage.removeItem("oauthRedirect");
                            router.push(redirectUrl);
                        }, 2000);
                    }
                }
                // Handle backend redirect with error (new approach)
                else if (success === "false" || errorParam) {
                    throw new Error(errorParam || "Authentication failed");
                }
                // Handle direct OAuth callback (legacy approach - if Google redirects directly to frontend)
                else if (code && stateParam) {
                    // Check for OAuth errors
                    if (errorParam) {
                        throw new Error(`OAuth error: ${errorParam}`);
                    }

                    // Call backend callback endpoint
                    const response = await apiClient.get<any>(`/auth/google/callback?code=${encodeURIComponent(code)}&state=${encodeURIComponent(stateParam)}`);

                    if (response.accessToken && response.user) {
                        // Set access token in localStorage (refresh token is now in HTTP-only cookie)
                        localStorage.setItem('accessToken', response.accessToken);
                        if (response.refreshToken) {
                            localStorage.setItem('refreshToken', response.refreshToken);
                        }

                        // Store user data
                        localStorage.setItem('user', JSON.stringify(response.user));

                        setState("success");
                        toast.success("Successfully logged in!");

                        // Redirect after a short delay
                        setTimeout(() => {
                            const redirectUrl = localStorage.getItem("oauthRedirect") || "/";
                            localStorage.removeItem("oauthRedirect");
                            router.push(redirectUrl);
                        }, 2000);

                    } else {
                        throw new Error("Invalid response from server");
                    }
                }
                else {
                    throw new Error("Missing authentication parameters");
                }

            } catch (error: any) {
                console.error("OAuth callback error:", error);
                setState("error");

                let errorMessage = "Authentication failed";
                if (error?.problemDetails?.title) {
                    errorMessage = error.problemDetails.title;
                } else if (error?.message) {
                    errorMessage = error.message;
                }

                setError(errorMessage);
                toast.error(errorMessage);
            }
        };

        handleCallback();
    }, [searchParams, router]);

    const renderContent = () => {
        switch (state) {
            case "loading":
                return (
                    <div className="text-center space-y-4">
                        <div className="mx-auto">
                            <Badge variant="secondary" className="px-3 py-1">
                                <Chrome className="h-4 w-4 mr-2" />
                                OAuth
                            </Badge>
                        </div>
                        <div className="flex items-center justify-center space-x-2">
                            <Loader2 className="h-5 w-5 animate-spin text-primary" />
                            <span>Completing authentication...</span>
                        </div>
                        <p className="text-sm text-muted-foreground">
                            Please wait while we process your login
                        </p>
                    </div>
                );

            case "success":
                return (
                    <div className="text-center space-y-4">
                        <div className="mx-auto">
                            <Badge variant="default" className="px-3 py-1 bg-green-600">
                                <CheckCircle className="h-4 w-4 mr-2" />
                                Success
                            </Badge>
                        </div>
                        <div className="text-green-600">
                            <CheckCircle className="h-12 w-12 mx-auto mb-4" />
                            <h3 className="text-lg font-semibold">Authentication Successful!</h3>
                        </div>
                        <p className="text-sm text-muted-foreground">
                            You have been successfully logged in. Redirecting...
                        </p>
                    </div>
                );

            case "error":
                return (
                    <div className="text-center space-y-4">
                        <div className="mx-auto">
                            <Badge variant="destructive" className="px-3 py-1">
                                <XCircle className="h-4 w-4 mr-2" />
                                Error
                            </Badge>
                        </div>
                        <div className="text-destructive">
                            <XCircle className="h-12 w-12 mx-auto mb-4" />
                            <h3 className="text-lg font-semibold">Authentication Failed</h3>
                        </div>
                        <p className="text-sm text-muted-foreground mb-4">
                            {error || "An error occurred during authentication"}
                        </p>
                        <div className="flex justify-center space-x-3">
                            <Button
                                variant="outline"
                                onClick={() => router.push("/login")}
                            >
                                Try Again
                            </Button>
                            <Button asChild>
                                <Link href="/">
                                    <Home className="h-4 w-4 mr-2" />
                                    Go Home
                                </Link>
                            </Button>
                        </div>
                    </div>
                );

            default:
                return null;
        }
    };

    return (
        <div className="min-h-screen bg-background flex items-center justify-center px-4 py-8">
            <div className="w-full max-w-md">
                <Card className="shadow-lg">
                    <CardHeader className="text-center">
                        <CardTitle className="text-2xl font-bold">OAuth Authentication</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        {renderContent()}
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}

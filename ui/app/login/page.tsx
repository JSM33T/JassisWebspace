'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { AlertCircle, Loader2, Mail, Lock } from 'lucide-react';
import { toast } from 'sonner';
import authService, { ApiError } from '@/lib/api';
import GoogleOAuthButton from '@/components/GoogleOAuthButton';
import GitHubOAuthButton from '@/components/GitHubOAuthButton';

export default function LoginPage() {
    const router = useRouter();
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [formData, setFormData] = useState({
        emailOrUsername: '',
        password: '',
        rememberMe: true,
    });

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        try {
            const response = await authService.login({
                ...formData,
                deviceName: navigator.userAgent,
                deviceType: 'Browser',
            });

            localStorage.setItem('accessToken', response.accessToken);
            if (response.refreshToken) {
                localStorage.setItem('refreshToken', response.refreshToken);
            }

            toast.success('Login successful!');
            router.push('/');
        } catch (err) {
            if (err instanceof ApiError) {
                const errorMsg = err.problemDetails.detail || err.problemDetails.title;
                setError(errorMsg);
                toast.error(errorMsg);
            } else {
                const errorMsg = 'An unexpected error occurred. Please try again.';
                setError(errorMsg);
                toast.error(errorMsg);
            }
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-background to-muted/20 p-4">
            <Card className="w-full max-w-md">
                <CardHeader className="space-y-1">
                    <CardTitle className="text-2xl font-bold text-center">Welcome back</CardTitle>
                    <CardDescription className="text-center">
                        Sign in to your account to continue
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    {/* Social Login Buttons */}
                    <div className="grid grid-cols-2 gap-3">
                        <GoogleOAuthButton className="w-full" />
                        <GitHubOAuthButton className="w-full" />
                    </div>

                    <div className="relative">
                        <div className="absolute inset-0 flex items-center">
                            <Separator />
                        </div>
                        <div className="relative flex justify-center text-xs uppercase">
                            <span className="bg-background px-2 text-muted-foreground">Or continue with email</span>
                        </div>
                    </div>

                    {error && (
                        <div className="flex items-center gap-2 p-3 text-sm text-destructive bg-destructive/10 rounded-md border border-destructive/20">
                            <AlertCircle className="h-4 w-4 flex-shrink-0" />
                            <span>{error}</span>
                        </div>
                    )}

                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="emailOrUsername">Email or Username</Label>
                            <div className="relative">
                                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                <Input
                                    id="emailOrUsername"
                                    type="text"
                                    placeholder="Enter your email or username"
                                    className="pl-9"
                                    value={formData.emailOrUsername}
                                    onChange={(e) => setFormData({ ...formData, emailOrUsername: e.target.value })}
                                    required
                                    disabled={loading}
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <div className="flex items-center justify-between">
                                <Label htmlFor="password">Password</Label>
                                <Link href="/forgot-password" className="text-sm text-primary hover:underline" tabIndex={-1}>
                                    Forgot password?
                                </Link>
                            </div>
                            <div className="relative">
                                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                <Input
                                    id="password"
                                    type="password"
                                    placeholder="Enter your password"
                                    className="pl-9"
                                    value={formData.password}
                                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                                    required
                                    disabled={loading}
                                />
                            </div>
                        </div>

                        <div className="flex items-center space-x-2">
                            <input
                                id="rememberMe"
                                type="checkbox"
                                className="h-4 w-4 rounded border-input"
                                checked={formData.rememberMe}
                                onChange={(e) => setFormData({ ...formData, rememberMe: e.target.checked })}
                                disabled={loading}
                            />
                            <Label htmlFor="rememberMe" className="text-sm font-normal cursor-pointer">
                                Remember me for 30 days
                            </Label>
                        </div>

                        <Button type="submit" className="w-full" disabled={loading}>
                            {loading ? (
                                <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    Signing in...
                                </>
                            ) : (
                                'Sign in'
                            )}
                        </Button>
                    </form>
                </CardContent>
                <CardFooter className="flex justify-center">
                    <p className="text-sm text-muted-foreground">
                        Don't have an account?{' '}
                        <Link href="/signup" className="text-primary font-medium hover:underline">
                            Sign up
                        </Link>
                    </p>
                </CardFooter>
            </Card>
        </div>
    );
}

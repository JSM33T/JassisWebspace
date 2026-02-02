'use client';

import { useState, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertCircle, Loader2, Lock, CheckCircle, KeyRound, Mail, ArrowRight } from 'lucide-react';
import { toast } from 'sonner';
import authService, { ApiError } from '@/lib/api';

function RecoveryForm() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const initialEmail = searchParams.get('email') || '';

    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState(false);

    const [formData, setFormData] = useState({
        email: initialEmail,
        token: '',
        newPassword: '',
        confirmPassword: '',
    });

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        if (formData.newPassword !== formData.confirmPassword) {
            setError('Passwords do not match');
            toast.error('Passwords do not match');
            setLoading(false);
            return;
        }

        if (formData.newPassword.length < 8) {
            setError('Password must be at least 8 characters long');
            toast.error('Password must be at least 8 characters long');
            setLoading(false);
            return;
        }

        try {
            await authService.resetPassword({
                email: formData.email,
                token: formData.token,
                newPassword: formData.newPassword,
            });

            setSuccess(true);
            toast.success('Password reset successfully!');

            // Redirect to login after a delay
            setTimeout(() => {
                router.push('/login');
            }, 3000);

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

    if (success) {
        return (
            <div className="text-center space-y-4 py-8">
                <div className="flex justify-center">
                    <CheckCircle className="h-16 w-16 text-green-500" />
                </div>
                <h3 className="text-xl font-medium">Password Reset Complete</h3>
                <p className="text-muted-foreground">
                    Your password has been successfully updated. You can now log in with your new password.
                </p>
                <div className="pt-4">
                    <Button
                        className="w-full"
                        onClick={() => router.push('/login')}
                    >
                        Go to Login
                    </Button>
                </div>
            </div>
        );
    }

    return (
        <>
            {error && (
                <div className="flex items-center gap-2 p-3 text-sm text-destructive bg-destructive/10 rounded-md border border-destructive/20 mb-4">
                    <AlertCircle className="h-4 w-4 flex-shrink-0" />
                    <span>{error}</span>
                </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                    <Label htmlFor="email">Email Address</Label>
                    <div className="relative">
                        <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                            id="email"
                            type="email"
                            placeholder="you@example.com"
                            className="pl-9"
                            value={formData.email}
                            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                            required
                            disabled={loading}
                        />
                    </div>
                </div>

                <div className="space-y-2">
                    <Label htmlFor="token">Reset Code</Label>
                    <div className="relative">
                        <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                            id="token"
                            type="text"
                            placeholder="Enter the code from email"
                            className="pl-9 font-mono"
                            value={formData.token}
                            onChange={(e) => setFormData({ ...formData, token: e.target.value })}
                            required
                            disabled={loading}
                        />
                    </div>
                    <p className="text-xs text-muted-foreground">
                        Check your email inbox and spam folder for the code.
                    </p>
                </div>

                <div className="space-y-2">
                    <Label htmlFor="newPassword">New Password</Label>
                    <div className="relative">
                        <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                            id="newPassword"
                            type="password"
                            placeholder="••••••••"
                            className="pl-9"
                            value={formData.newPassword}
                            onChange={(e) => setFormData({ ...formData, newPassword: e.target.value })}
                            required
                            disabled={loading}
                            minLength={8}
                        />
                    </div>
                </div>

                <div className="space-y-2">
                    <Label htmlFor="confirmPassword">Confirm New Password</Label>
                    <div className="relative">
                        <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                            id="confirmPassword"
                            type="password"
                            placeholder="••••••••"
                            className="pl-9"
                            value={formData.confirmPassword}
                            onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                            required
                            disabled={loading}
                        />
                    </div>
                </div>

                <Button type="submit" className="w-full" disabled={loading}>
                    {loading ? (
                        <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Resetting password...
                        </>
                    ) : (
                        'Reset Password'
                    )}
                </Button>
            </form>
        </>
    );
}

export default function RecoveryPage() {
    return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-background to-muted/20 p-4">
            <Card className="w-full max-w-md">
                <CardHeader className="space-y-1">
                    <CardTitle className="text-2xl font-bold text-center">Reset Password</CardTitle>
                    <CardDescription className="text-center">
                        Enter the code you received and choose a new password
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <Suspense fallback={
                        <div className="flex justify-center py-8">
                            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                        </div>
                    }>
                        <RecoveryForm />
                    </Suspense>
                </CardContent>
                <CardFooter className="flex justify-center flex-col gap-2">
                    <Link href="/forgot-password" className="text-sm text-primary hover:underline">
                        Didn&apos;t receive a code? Try again
                    </Link>
                    <Link href="/login" className="flex items-center text-sm text-muted-foreground hover:text-primary transition-colors mt-2">
                        Back to Login <ArrowRight className="ml-2 h-4 w-4" />
                    </Link>
                </CardFooter>
            </Card>
        </div>
    );
}

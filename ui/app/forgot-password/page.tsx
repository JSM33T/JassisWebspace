'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertCircle, Loader2, Mail, ArrowLeft, CheckCircle } from 'lucide-react';
import { toast } from 'sonner';
import authService, { ApiError } from '@/lib/api';

export default function ForgotPasswordPage() {
    const router = useRouter();
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState(false);
    const [email, setEmail] = useState('');

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        try {
            await authService.forgotPassword({
                email,
            });

            setSuccess(true);
            toast.success('Reset code sent to your email!');

            // Optional: Redirect to recovery page after a delay or let user click a button
            // sticking to the plan: redirect to recovery page with email query param
            setTimeout(() => {
                router.push(`/recovery?email=${encodeURIComponent(email)}`);
            }, 2000);

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
                    <CardTitle className="text-2xl font-bold text-center">Forgot Password</CardTitle>
                    <CardDescription className="text-center">
                        Enter your email address and we&apos;ll send you a code to reset your password
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    {success ? (
                        <div className="text-center space-y-4 py-4">
                            <div className="flex justify-center">
                                <CheckCircle className="h-16 w-16 text-green-500" />
                            </div>
                            <h3 className="text-xl font-medium">Check your email</h3>
                            <p className="text-muted-foreground">
                                We&apos;ve sent a password reset code to <strong>{email}</strong>.
                            </p>
                            <p className="text-sm text-muted-foreground">
                                Redirecting to recovery page...
                            </p>
                            <Button
                                className="w-full"
                                onClick={() => router.push(`/recovery?email=${encodeURIComponent(email)}`)}
                            >
                                Enter Code
                            </Button>
                        </div>
                    ) : (
                        <>
                            {error && (
                                <div className="flex items-center gap-2 p-3 text-sm text-destructive bg-destructive/10 rounded-md border border-destructive/20">
                                    <AlertCircle className="h-4 w-4 flex-shrink-0" />
                                    <span>{error}</span>
                                </div>
                            )}

                            <form onSubmit={handleSubmit} className="space-y-4">
                                <div className="space-y-2">
                                    <Label htmlFor="email">Email</Label>
                                    <div className="relative">
                                        <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                        <Input
                                            id="email"
                                            type="email"
                                            placeholder="you@example.com"
                                            className="pl-9"
                                            value={email}
                                            onChange={(e) => setEmail(e.target.value)}
                                            required
                                            disabled={loading}
                                        />
                                    </div>
                                </div>

                                <Button type="submit" className="w-full" disabled={loading}>
                                    {loading ? (
                                        <>
                                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                            Sending code...
                                        </>
                                    ) : (
                                        'Send Reset Code'
                                    )}
                                </Button>
                            </form>
                        </>
                    )}
                </CardContent>
                <CardFooter className="flex justify-center">
                    <Link href="/login" className="flex items-center text-sm text-muted-foreground hover:text-primary transition-colors">
                        <ArrowLeft className="mr-2 h-4 w-4" />
                        Back to Login
                    </Link>
                </CardFooter>
            </Card>
        </div>
    );
}

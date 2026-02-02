'use client';

import { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { AlertCircle, Loader2, Mail, CheckCircle, ArrowRight, RefreshCw, KeyRound } from 'lucide-react';
import { toast } from 'sonner';
import authService, { ApiError } from '@/lib/api';

function VerifyEmailContent() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const emailParam = searchParams.get('email');
    const tokenParam = searchParams.get('token');

    // We might get email from params or it might be null for manual entry
    const [email, setEmail] = useState(emailParam || '');

    const [verifying, setVerifying] = useState(false);
    const [verified, setVerified] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [resending, setResending] = useState(false);

    // Manual entry state
    const [manualToken, setManualToken] = useState('');

    useEffect(() => {
        const verifyEmail = async (email: string, token: string) => {
            setVerifying(true);
            setError(null);
            try {
                await authService.verifyEmail(email, token);
                setVerified(true);
                toast.success('Email verified successfully!');

                // Redirect to login after delay
                setTimeout(() => {
                    router.push('/login?verified=true');
                }, 3000);
            } catch (err) {
                console.error('Verification error:', err);
                if (err instanceof ApiError) {
                    setError(err.problemDetails.detail || err.problemDetails.title);
                } else {
                    setError('Failed to verify email. The link may be invalid or expired.');
                }
            } finally {
                setVerifying(false);
            }
        };

        if (tokenParam && emailParam && !verified && !verifying) {
            verifyEmail(emailParam, tokenParam);
        }
    }, [tokenParam, emailParam, verified, verifying, router]);

    const handleManualVerify = async () => {
        if (!manualToken) {
            toast.error('Please enter the verification code');
            return;
        }

        // If we don't have an email (e.g. user came to page without params), we can't verify properly solely with token usually
        // But the API might require email. 
        // If email is missing, we should probably ask for it or assume the user knows what they are doing if the previous page passed it?
        // Actually the previous page (Signup) passes email.
        // If user just lands on /verify-email without params, they are stuck unless we allow email input too?
        // For now let's assume email is present or user enters it? 
        // Let's add email input if missing.

        if (!email) {
            toast.error('Email is missing. please go back to login');
            return;
        }

        setVerifying(true);
        setError(null);
        try {
            await authService.verifyEmail(email, manualToken);
            setVerified(true);
            toast.success('Email verified successfully!');
            setTimeout(() => {
                router.push('/login?verified=true');
            }, 3000);
        } catch (err) {
            if (err instanceof ApiError) {
                const msg = err.problemDetails.detail || err.problemDetails.title;
                setError(msg);
                toast.error(msg);
            } else {
                setError('Failed to verify email. Code may be invalid.');
                toast.error('Failed to verify email');
            }
        } finally {
            setVerifying(false);
        }
    };

    const handleResend = async () => {
        if (!email) return;

        setResending(true);
        try {
            await authService.resendVerification({ email });
            toast.success('Verification email sent!');
        } catch (err) {
            if (err instanceof ApiError) {
                toast.error(err.problemDetails.detail || 'Failed to resend verification email');
            } else {
                toast.error('Failed to resend verification email');
            }
        } finally {
            setResending(false);
        }
    };

    // State: Verifying (Auto or Manual)
    if (verifying) {
        return (
            <Card className="w-full max-w-md">
                <CardHeader className="space-y-1">
                    <CardTitle className="text-2xl font-bold text-center">Verifying Email</CardTitle>
                    <CardDescription className="text-center">
                        Please wait while we verify your email address...
                    </CardDescription>
                </CardHeader>
                <CardContent className="flex justify-center py-8">
                    <Loader2 className="h-12 w-12 animate-spin text-primary" />
                </CardContent>
            </Card>
        );
    }

    // State: Verified Success
    if (verified) {
        return (
            <Card className="w-full max-w-md border-green-200 bg-green-50 dark:bg-green-900/10 dark:border-green-800">
                <CardHeader className="space-y-1">
                    <div className="mx-auto bg-green-100 dark:bg-green-900/30 p-3 rounded-full mb-2">
                        <CheckCircle className="h-8 w-8 text-green-600 dark:text-green-400" />
                    </div>
                    <CardTitle className="text-2xl font-bold text-center text-green-700 dark:text-green-300">Email Verified!</CardTitle>
                    <CardDescription className="text-center text-green-600/80 dark:text-green-400/80">
                        Your email has been successfully verified.
                    </CardDescription>
                </CardHeader>
                <CardContent className="text-center space-y-4">
                    <p>You can now sign in to your account.</p>
                </CardContent>
                <CardFooter>
                    <Button className="w-full" asChild>
                        <Link href="/login">
                            Go to Login <ArrowRight className="ml-2 h-4 w-4" />
                        </Link>
                    </Button>
                </CardFooter>
            </Card>
        );
    }

    // State: Verification Failed (with option to retry manually)
    if (error) {
        return (
            <Card className="w-full max-w-md border-destructive/50">
                <CardHeader className="space-y-1">
                    <div className="mx-auto bg-destructive/10 p-3 rounded-full mb-2">
                        <AlertCircle className="h-8 w-8 text-destructive" />
                    </div>
                    <CardTitle className="text-2xl font-bold text-center text-destructive">Verification Failed</CardTitle>
                    <CardDescription className="text-center text-destructive/80">
                        {error}
                    </CardDescription>
                </CardHeader>
                <CardContent className="text-center space-y-4">
                    <p className="text-sm text-muted-foreground">
                        The link or code may have expired or is invalid. You can request a new verification email or try entering the code again.
                    </p>

                    {/* Manual Retry */}
                    <div className="space-y-2 text-left">
                        <div className="relative">
                            <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input
                                placeholder="Enter verification code"
                                value={manualToken}
                                onChange={(e) => setManualToken(e.target.value)}
                                className="pl-9"
                            />
                        </div>
                        <Button onClick={handleManualVerify} className="w-full" disabled={!manualToken}>
                            Verify Code
                        </Button>
                    </div>

                </CardContent>
                <CardFooter className="flex flex-col gap-3">
                    {email && (
                        <Button variant="outline" className="w-full" onClick={handleResend} disabled={resending}>
                            {resending ? (
                                <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    Sending...
                                </>
                            ) : (
                                <>
                                    <RefreshCw className="mr-2 h-4 w-4" />
                                    Resend Verification Email
                                </>
                            )}
                        </Button>
                    )}
                    <Button variant="ghost" className="w-full" asChild>
                        <Link href="/login">Back to Login</Link>
                    </Button>
                </CardFooter>
            </Card>
        );
    }

    // State: Check your email (Post-Signup) + Manual Input
    return (
        <Card className="w-full max-w-md">
            <CardHeader className="space-y-1">
                <div className="mx-auto bg-primary/10 p-3 rounded-full mb-2">
                    <Mail className="h-8 w-8 text-primary" />
                </div>
                <CardTitle className="text-2xl font-bold text-center">Check your inbox</CardTitle>
                <CardDescription className="text-center">
                    We&apos;ve sent a verification link to your email address.
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
                <div className="text-center space-y-4">
                    {email ? (
                        <div className="bg-muted p-3 rounded-md border text-sm font-medium break-all">
                            {email}
                        </div>
                    ) : (
                        <Input
                            type="email"
                            placeholder="Enter your email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                        />
                    )}
                    <p className="text-sm text-muted-foreground">
                        Click the link in the email or enter the code below to verify your account.
                    </p>
                </div>

                <div className="relative">
                    <div className="absolute inset-0 flex items-center">
                        <Separator />
                    </div>
                    <div className="relative flex justify-center text-xs uppercase">
                        <span className="bg-background px-2 text-muted-foreground">Or enter code manually</span>
                    </div>
                </div>

                <div className="flex gap-2">
                    <Input
                        placeholder="Verification Code"
                        value={manualToken}
                        onChange={(e) => setManualToken(e.target.value)}
                        className="font-mono"
                    />
                    <Button onClick={handleManualVerify} disabled={verifying || !manualToken}>
                        Verify
                    </Button>
                </div>

            </CardContent>
            <CardFooter className="flex flex-col gap-3">
                {email && (
                    <Button variant="outline" className="w-full" onClick={handleResend} disabled={resending}>
                        {resending ? (
                            <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                Sending...
                            </>
                        ) : (
                            'Resend Verification Email'
                        )}
                    </Button>
                )}
                <Button variant="ghost" className="w-full" asChild>
                    <Link href="/login">Back to Login</Link>
                </Button>
            </CardFooter>
        </Card>
    );
}

export default function VerifyEmailPage() {
    return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-background to-muted/20 p-4">
            <Suspense fallback={
                <div className="flex justify-center">
                    <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                </div>
            }>
                <VerifyEmailContent />
            </Suspense>
        </div>
    );
}

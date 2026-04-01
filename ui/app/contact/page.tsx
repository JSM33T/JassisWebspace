'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import Script from 'next/script';
import { useSearchParams } from 'next/navigation';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Mail, ArrowLeft, Send, CheckCircle2, MoveUpRight } from 'lucide-react';

type TurnstileSiteKeyApiResponse = {
    data?: {
        enabled?: boolean;
        siteKey?: string;
    };
};

declare global {
    interface Window {
        onContactTurnstileSuccess?: (token: string) => void;
        onContactTurnstileExpired?: () => void;
        onContactTurnstileError?: () => void;
        turnstile?: {
            render: (
                container: string | HTMLElement,
                options: {
                    sitekey: string;
                    theme?: 'light' | 'dark' | 'auto';
                    callback?: string;
                    'expired-callback'?: string;
                    'error-callback'?: string;
                    action?: string;
                }
            ) => string;
            reset: (widgetId?: string) => void;
            remove?: (widgetId: string) => void;
        };
    }
}

export default function ContactPage() {
    const searchParams = useSearchParams();
    const ref = searchParams.get('ref') || '';
    const formRef = useRef<HTMLFormElement>(null);
    const inferredPurpose = useMemo(() => {
        if (!ref) {
            return '';
        }

        try {
            const sourceUrl = new URL(ref);
            if (sourceUrl.pathname.startsWith('/projects')) {
                return 'Project';
            }
            if (sourceUrl.pathname.startsWith('/services')) {
                return 'Service';
            }
        } catch {
            if (ref.includes('/projects')) {
                return 'Project';
            }
            if (ref.includes('/services')) {
                return 'Service';
            }
        }

        return '';
    }, [ref]);
    const [submitted, setSubmitted] = useState(false);
    const [submissionMode, setSubmissionMode] = useState<'email' | 'saved' | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [submitError, setSubmitError] = useState<string | null>(null);
    const [turnstileEnabled, setTurnstileEnabled] = useState(false);
    const [turnstileSiteKey, setTurnstileSiteKey] = useState('');
    const [turnstileScriptReady, setTurnstileScriptReady] = useState(false);
    const [turnstileToken, setTurnstileToken] = useState<string | null>(null);
    const [turnstileError, setTurnstileError] = useState<string | null>(null);
    const turnstileContainerRef = useRef<HTMLDivElement>(null);
    const turnstileWidgetIdRef = useRef<string | null>(null);
    const [formData, setFormData] = useState({
        name: '',
        email: '',
        purpose: inferredPurpose,
        message: ''
    });

    useEffect(() => {
        window.onContactTurnstileSuccess = (token: string) => {
            setTurnstileToken(token);
            setTurnstileError(null);
        };

        window.onContactTurnstileExpired = () => {
            setTurnstileToken(null);
        };

        window.onContactTurnstileError = () => {
            setTurnstileToken(null);
            setTurnstileError('Verification failed. Please retry.');
        };

        return () => {
            delete window.onContactTurnstileSuccess;
            delete window.onContactTurnstileExpired;
            delete window.onContactTurnstileError;
        };
    }, []);

    useEffect(() => {
        if (window.turnstile) {
            setTurnstileScriptReady(true);
        }
    }, []);

    useEffect(() => {
        let isMounted = true;

        const loadTurnstileConfig = async () => {
            const apiUrl = process.env.NEXT_PUBLIC_API_URL;
            if (!apiUrl) {
                return;
            }

            try {
                const endpoint = `${apiUrl.replace(/\/$/, '')}/contact/turnstile/site-key`;
                const response = await fetch(endpoint, { method: 'GET', cache: 'no-store' });
                if (!response.ok) {
                    throw new Error('Failed to load Turnstile settings.');
                }

                const payload = (await response.json()) as TurnstileSiteKeyApiResponse;
                const enabled = Boolean(payload?.data?.enabled);
                const siteKey = payload?.data?.siteKey?.trim() ?? '';

                if (!isMounted) {
                    return;
                }

                setTurnstileEnabled(enabled);
                setTurnstileSiteKey(siteKey);

                if (enabled && !siteKey) {
                    setTurnstileError('Verification is currently unavailable. Please try again later.');
                } else {
                    setTurnstileError(null);
                }
            } catch {
                if (!isMounted) {
                    return;
                }

                setTurnstileEnabled(true);
                setTurnstileSiteKey('');
                setTurnstileError('Verification is currently unavailable. Please try again later.');
            }
        };

        loadTurnstileConfig();

        return () => {
            isMounted = false;
        };
    }, []);

    useEffect(() => {
        if (!turnstileEnabled || !turnstileSiteKey || !turnstileScriptReady) {
            return;
        }

        if (!turnstileContainerRef.current || !window.turnstile) {
            return;
        }

        setTurnstileToken(null);
        turnstileContainerRef.current.innerHTML = '';

        const widgetId = window.turnstile.render(turnstileContainerRef.current, {
            sitekey: turnstileSiteKey,
            theme: 'auto',
            callback: 'onContactTurnstileSuccess',
            'expired-callback': 'onContactTurnstileExpired',
            'error-callback': 'onContactTurnstileError',
            action: 'contact_form',
        });

        turnstileWidgetIdRef.current = widgetId;

        return () => {
            if (turnstileWidgetIdRef.current && window.turnstile?.remove) {
                window.turnstile.remove(turnstileWidgetIdRef.current);
            }
            turnstileWidgetIdRef.current = null;
        };
    }, [turnstileEnabled, turnstileSiteKey, turnstileScriptReady]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const { id, value } = e.target;
        setFormData(prev => ({ ...prev, [id]: value }));
    };

    const handlePurposeChange = (value: string) => {
        setFormData(prev => ({ ...prev, purpose: value }));
    };

    const persistContactSubmission = async (messageToSave: string) => {
        const apiUrl = process.env.NEXT_PUBLIC_API_URL;
        if (!apiUrl) {
            throw new Error('API URL is not configured.');
        }

        if (turnstileEnabled && !turnstileToken) {
            throw new Error('Please complete verification before sending.');
        }

        setSubmitError(null);

        const endpoint = `${apiUrl.replace(/\/$/, '')}/contact`;
        const response = await fetch(endpoint, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                name: formData.name,
                email: formData.email,
                purpose: formData.purpose,
                message: messageToSave,
                refUrl: ref || null,
                turnstileToken,
            }),
        });

        if (!response.ok) {
            let errorMessage = 'Failed to send your message. Please try again.';
            try {
                const payload = await response.json() as { detail?: string; title?: string; data?: { detail?: string; title?: string } };
                errorMessage =
                    payload?.data?.detail ??
                    payload?.data?.title ??
                    payload?.detail ??
                    payload?.title ??
                    errorMessage;
            } catch {
                // ignore parse failures and keep generic message
            }

            if (turnstileEnabled) {
                setTurnstileToken(null);
                window.turnstile?.reset(turnstileWidgetIdRef.current ?? undefined);
            }

            throw new Error(errorMessage);
        }
    };

    const requireFormValidity = (enforceTurnstile: boolean) => {
        const formEl = formRef.current;
        if (formEl && !formEl.reportValidity()) {
            return false;
        }

        if (enforceTurnstile && turnstileEnabled && !turnstileSiteKey) {
            setTurnstileError('Verification is currently unavailable. Please try again later.');
            return false;
        }

        if (enforceTurnstile && turnstileEnabled && !turnstileToken) {
            setTurnstileError('Please complete the verification challenge.');
            return false;
        }

        return true;
    };

    const composeEmail = () => {
        if (!requireFormValidity(false)) {
            return;
        }

        const recipient = 'mail@jsm33t.com';
        const subject = encodeURIComponent(`Contact Form: ${formData.purpose} from ${formData.name}`);
        const body = encodeURIComponent(
            `Name: ${formData.name}\n` +
            `Email: ${formData.email}\n` +
            `Purpose: ${formData.purpose}\n\n` +
            `Message:\n${formData.message}\n\n` +
            `Ref: ${ref || 'N/A'}`
        );

        const mailtoUrl = `mailto:${recipient}?subject=${subject}&body=${body}`;

        window.location.href = mailtoUrl;
        setSubmissionMode('email');
        setSubmitted(true);
    };

    const saveProMessage = async () => {
        if (!requireFormValidity(true)) {
            return;
        }

        const professionalMessage =
            `Hello JassSpace Team,\n\nI am reaching out regarding "${formData.purpose}".\n\nProject context:\n${formData.message}\n\nExpected outcome:\n- High-quality, production-ready implementation\n- Strong communication and delivery clarity\n\nPlease share next steps, estimated timeline, and engagement model.\n\nThanks,\n${formData.name}`;

        try {
            setIsSubmitting(true);
            setSubmitError(null);
            await persistContactSubmission(professionalMessage);
            setSubmissionMode('saved');
            setSubmitted(true);
        } catch (error) {
            console.error('Failed to persist contact submission', error);
            setSubmitError(error instanceof Error ? error.message : 'Failed to send your message. Please try again.');
        } finally {
            setIsSubmitting(false);
        }
    };

    if (submitted) {
        return (
            <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="flex flex-col min-h-screen bg-background/50 items-center justify-center px-4"
            >
                {/* Ambient Background Glow */}
                <div className="fixed inset-0 z-[-1] pointer-events-none">
                    <div className="absolute top-[-10%] left-1/2 -translate-x-1/2 w-[600px] h-[600px] rounded-full bg-primary/5 blur-[120px]" />
                    <div className="absolute bottom-[-10%] left-[-10%] w-[500px] h-[500px] rounded-full bg-blue-500/5 blur-[120px]" />
                </div>

                <Card className="max-w-md w-full rounded-3xl border bg-card/50 backdrop-blur-sm shadow-xl text-center p-8">
                    <CardHeader>
                        <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-2xl bg-green-100 dark:bg-green-900/20 mb-6 scale-110 transition-transform">
                            <CheckCircle2 className="h-10 w-10 text-green-600 dark:text-green-400" />
                        </div>
                        <CardTitle className="text-3xl font-bold tracking-tight text-balance">
                            {submissionMode === 'saved' ? 'Message Saved!' : 'Message Composed!'}
                        </CardTitle>
                        <CardDescription className="text-lg pt-4 leading-relaxed">
                            {submissionMode === 'saved'
                                ? 'Your professional message has been saved to our system.'
                                : <>We&apos;ve opened your email client to send the message to <strong className="text-foreground">mail@jsm33t.com</strong>.</>}
                        </CardDescription>
                    </CardHeader>
                    <CardFooter className="flex justify-center pt-8">
                        <Button variant="outline" className="rounded-full px-8 bg-background/50" asChild>
                            <Link href="/">Back to Home</Link>
                        </Button>
                    </CardFooter>
                </Card>
            </motion.div>
        );
    }

    return (
        <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: "easeOut" }}
            className="flex flex-col min-h-screen bg-background/50"
        >
            {/* Ambient Background Glow */}
            <div className="fixed inset-0 z-[-1] pointer-events-none">
                <div className="absolute top-[-10%] left-1/2 -translate-x-1/2 w-[600px] h-[600px] rounded-full bg-primary/5 blur-[120px]" />
                <div className="absolute bottom-[-10%] left-[-10%] w-[500px] h-[500px] rounded-full bg-blue-500/5 blur-[120px]" />
            </div>

            <section className="flex-1 px-4 py-6 md:py-8">
                <div className="container mx-auto max-w-7xl min-h-[calc(100vh-6rem)] pt-16 flex items-center">
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 w-full items-center">
                        <div className="hidden lg:block space-y-6">
                            <Badge variant="secondary" className="px-4 py-1.5 rounded-full text-sm font-normal backdrop-blur-sm bg-background/50 border-border/50 gap-2 w-fit">
                                <Mail className="h-3.5 w-3.5 text-primary" />
                                <span>Get in Touch</span>
                            </Badge>
                            <h1 className="text-4xl xl:text-5xl font-bold tracking-tight max-w-xl">
                                Let&apos;s build something impactful.
                            </h1>
                            <p className="text-base text-muted-foreground max-w-xl">
                                Share your idea, project scope, or service request and we&apos;ll reply with clear next steps.
                            </p>
                            <div className="flex flex-wrap gap-3">
                                <Button variant="ghost" asChild className="rounded-full px-6 w-fit">
                                    <Link href="/">
                                        <ArrowLeft className="mr-2 h-4 w-4" />
                                        Back
                                    </Link>
                                </Button>
                            </div>
                        </div>

                        <Card className="w-full lg:ml-auto lg:max-w-xl rounded-3xl border bg-card/50 backdrop-blur-sm shadow-xl p-6 md:p-8 relative overflow-hidden group">
                        <div className="absolute top-6 right-6 p-2 rounded-full border bg-background/50 group-hover:scale-110 transition-transform">
                            <MoveUpRight className="h-4 w-4 opacity-50" />
                        </div>

                        <CardHeader className="px-0 pt-0 pb-6">
                            <CardTitle className="text-2xl font-semibold tracking-tight">Send a Message</CardTitle>
                            <CardDescription className="text-base pt-2">
                                Fill out the form below and we&apos;ll respond via email.
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="px-0">
                            <form ref={formRef} className="space-y-5">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="space-y-2.5">
                                        <label htmlFor="name" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Name</label>
                                        <Input
                                            id="name"
                                            placeholder="John Doe"
                                            required
                                            value={formData.name}
                                            onChange={handleChange}
                                            className="h-12 rounded-2xl border-border/60 bg-background/70 px-4 shadow-sm transition-all focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:border-primary/40"
                                        />
                                    </div>
                                    <div className="space-y-2.5">
                                        <label htmlFor="email" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Email</label>
                                        <Input
                                            id="email"
                                            type="email"
                                            placeholder="john@example.com"
                                            required
                                            value={formData.email}
                                            onChange={handleChange}
                                            className="h-12 rounded-2xl border-border/60 bg-background/70 px-4 shadow-sm transition-all focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:border-primary/40"
                                        />
                                    </div>
                                </div>

                                <div className="space-y-2.5">
                                    <label htmlFor="purpose" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Purpose</label>
                                    <Select required onValueChange={handlePurposeChange} value={formData.purpose}>
                                        <SelectTrigger
                                            id="purpose"
                                            className="w-full h-12 rounded-2xl border-border/60 bg-background/70 px-4 shadow-sm transition-all focus:ring-2 focus:ring-primary/40 focus:border-primary/40"
                                        >
                                            <SelectValue placeholder="Select a purpose" />
                                        </SelectTrigger>
                                        <SelectContent className="rounded-2xl border-border/60 backdrop-blur-xl">
                                            <SelectItem value="Project">Project</SelectItem>
                                            <SelectItem value="Service">Service</SelectItem>
                                            <SelectItem value="General Inquiry">General Inquiry</SelectItem>
                                            <SelectItem value="New Project">New Project</SelectItem>
                                            <SelectItem value="Service Request">Service Request</SelectItem>
                                            <SelectItem value="Technical Support">Technical Support</SelectItem>
                                            <SelectItem value="Other">Other</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>

                                <div className="space-y-2.5">
                                    <label htmlFor="ref" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Reference URL</label>
                                    <Input
                                        id="ref"
                                        value={ref || 'N/A'}
                                        readOnly
                                        className="h-12 rounded-2xl border-dashed border-border/60 bg-muted/40 px-4 text-muted-foreground shadow-sm"
                                    />
                                </div>

                                <div className="space-y-2.5">
                                    <label htmlFor="message" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Message</label>
                                    <Textarea
                                        id="message"
                                        placeholder="Tell us more about what's on your mind..."
                                        className="min-h-[130px] resize-none rounded-2xl border-border/60 bg-background/70 p-4 shadow-sm transition-all focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:border-primary/40"
                                        required
                                        value={formData.message}
                                        onChange={handleChange}
                                    />
                                </div>

                                {turnstileEnabled && turnstileSiteKey && (
                                    <div className="space-y-2.5">
                                        <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Verification</label>
                                        <div className="flex justify-center rounded-2xl border border-border/60 bg-background/70 p-3 shadow-sm">
                                            <div ref={turnstileContainerRef} />
                                        </div>
                                    </div>
                                )}

                                {turnstileEnabled && turnstileError && (
                                    <p className="text-sm text-red-600">{turnstileError}</p>
                                )}

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                    <Button
                                        type="button"
                                        size="lg"
                                        className="w-full rounded-full h-12 text-base font-medium transition-all group-hover:shadow-lg"
                                        onClick={composeEmail}
                                        disabled={isSubmitting}
                                    >
                                        <Send className="mr-2 h-4 w-4" />
                                        Compose Email
                                    </Button>
                                    <Button
                                        type="button"
                                        size="lg"
                                        variant="outline"
                                        className="w-full rounded-full h-12 text-base font-medium bg-background/70"
                                        onClick={saveProMessage}
                                        disabled={isSubmitting}
                                    >
                                        <Send className="mr-2 h-4 w-4" />
                                        {isSubmitting ? 'Sending...' : 'Send Message'}
                                    </Button>
                                </div>
                                {submitError && (
                                    <p className="text-sm text-red-600">{submitError}</p>
                                )}
                            </form>
                        </CardContent>
                        </Card>
                    </div>
                </div>
            </section>
            {turnstileEnabled && turnstileSiteKey && (
                <Script
                    src="https://challenges.cloudflare.com/turnstile/v0/api.js"
                    async
                    defer
                    onLoad={() => setTurnstileScriptReady(true)}
                />
            )}
        </motion.div>
    );
}

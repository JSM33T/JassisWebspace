import Link from "next/link";
import { ShieldCheck, ArrowLeft } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function PrivacyPolicyPage() {
    return (
        <main className="min-h-screen bg-background/50 px-4 py-8">
            <div className="container mx-auto max-w-7xl min-h-[calc(100vh-6rem)] pt-16 flex items-center">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 w-full items-start">
                    <div className="hidden lg:block space-y-6 sticky top-24">
                        <Badge variant="secondary" className="px-4 py-1.5 rounded-full text-sm font-normal backdrop-blur-sm bg-background/50 border-border/50 gap-2 w-fit">
                            <ShieldCheck className="h-3.5 w-3.5 text-primary" />
                            <span>Privacy Policy</span>
                        </Badge>
                        <h1 className="text-4xl xl:text-5xl font-bold tracking-tight max-w-xl">
                            Your privacy matters to us.
                        </h1>
                        <p className="text-base text-muted-foreground max-w-xl">
                            We keep this policy simple. This page explains what information we collect, why we collect it, and how you can control it.
                        </p>
                        <p className="text-sm text-muted-foreground">Last updated: February 14, 2026</p>
                        <Button variant="ghost" asChild className="rounded-full px-6 w-fit">
                            <Link href="/">
                                <ArrowLeft className="mr-2 h-4 w-4" />
                                Back
                            </Link>
                        </Button>
                    </div>

                    <Card className="w-full lg:ml-auto lg:max-w-2xl rounded-3xl border bg-card/50 backdrop-blur-sm shadow-xl p-6 md:p-8">
                        <CardHeader className="px-0 pt-0 pb-6 lg:hidden">
                            <CardTitle className="text-3xl font-bold tracking-tight">Privacy Policy</CardTitle>
                            <p className="text-sm text-muted-foreground">Last updated: February 14, 2026</p>
                        </CardHeader>
                        <CardContent className="px-0 space-y-8">
                            <section className="space-y-3">
                                <h2 className="text-xl font-semibold">1. What We Collect</h2>
                                <p className="text-muted-foreground">
                                    We collect basic account and usage information needed to run JassSpace, such as profile details, sign-in status, and messages you submit through forms.
                                </p>
                            </section>

                            <section className="space-y-3">
                                <h2 className="text-xl font-semibold">2. How We Use It</h2>
                                <p className="text-muted-foreground">
                                    We use your information to keep you signed in, protect your account, improve your experience, and respond to your requests.
                                </p>
                            </section>

                            <section className="space-y-3">
                                <h2 className="text-xl font-semibold">3. Cookies and Browser Storage</h2>
                                <p className="text-muted-foreground">
                                    We use essential browser storage to support login and session security. This helps us remember your session and keep the app working properly.
                                </p>
                                <p className="text-muted-foreground">
                                    We do not use this storage to sell your personal information.
                                </p>
                            </section>

                            <section className="space-y-3">
                                <h2 className="text-xl font-semibold">4. Third-Party Sign-In</h2>
                                <p className="text-muted-foreground">
                                    If you sign in with Google or GitHub, those providers may collect information under their own privacy policies.
                                </p>
                            </section>

                            <section className="space-y-3">
                                <h2 className="text-xl font-semibold">5. Your Choices</h2>
                                <p className="text-muted-foreground">
                                    You can log out at any time, update your profile details, or clear browser site data from your browser settings.
                                </p>
                            </section>

                            <section className="space-y-3">
                                <h2 className="text-xl font-semibold">6. Contact Us</h2>
                                <p className="text-muted-foreground">
                                    If you have privacy questions, please <Link href="/contact" className="text-primary underline-offset-4 hover:underline">contact us</Link>.
                                </p>
                            </section>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </main>
    );
}

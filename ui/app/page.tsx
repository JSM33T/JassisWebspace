import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { ArrowRight, Zap, Shield, Sparkles } from 'lucide-react';

export default function HomePage() {
    return (
        <div className="flex flex-col min-h-screen">
            {/* Hero Section */}
            <section className="flex-1 flex items-center justify-center px-4 py-20 md:py-32">
                <div className="container mx-auto text-center space-y-8">
                    <div className="inline-flex items-center rounded-full border px-4 py-1.5 text-sm font-medium mb-4">
                        <Sparkles className="mr-2 h-4 w-4" />
                        Now with OAuth support
                    </div>

                    <h1 className="text-4xl md:text-6xl lg:text-7xl font-bold tracking-tight">
                        Build something
                        <span className="block bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
                            amazing today
                        </span>
                    </h1>

                    <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
                        The modern platform for building scalable applications.
                        Fast, secure, and built for developers.
                    </p>

                    <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
                        <Button size="lg" asChild>
                            <Link href="/signup">
                                Get started for free
                                <ArrowRight className="ml-2 h-4 w-4" />
                            </Link>
                        </Button>
                        <Button size="lg" variant="outline" asChild>
                            <Link href="/docs">
                                View documentation
                            </Link>
                        </Button>
                    </div>
                </div>
            </section>

            {/* Features Section */}
            <section className="py-20 bg-muted/50">
                <div className="container mx-auto px-4">
                    <div className="text-center mb-16">
                        <h2 className="text-3xl md:text-4xl font-bold mb-4">
                            Everything you need
                        </h2>
                        <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
                            Powerful features to help you build and scale your applications
                        </p>
                    </div>

                    <div className="grid md:grid-cols-3 gap-8">
                        {/* Feature 1 */}
                        <div className="bg-background rounded-lg p-6 border">
                            <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                                <Zap className="h-6 w-6 text-primary" />
                            </div>
                            <h3 className="text-xl font-semibold mb-2">Lightning Fast</h3>
                            <p className="text-muted-foreground">
                                Built with performance in mind. Experience blazing fast load times and smooth interactions.
                            </p>
                        </div>

                        {/* Feature 2 */}
                        <div className="bg-background rounded-lg p-6 border">
                            <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                                <Shield className="h-6 w-6 text-primary" />
                            </div>
                            <h3 className="text-xl font-semibold mb-2">Secure by Default</h3>
                            <p className="text-muted-foreground">
                                Enterprise-grade security with OAuth, JWT tokens, and httpOnly cookies.
                            </p>
                        </div>

                        {/* Feature 3 */}
                        <div className="bg-background rounded-lg p-6 border">
                            <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                                <Sparkles className="h-6 w-6 text-primary" />
                            </div>
                            <h3 className="text-xl font-semibold mb-2">Developer Experience</h3>
                            <p className="text-muted-foreground">
                                Beautiful UI components, comprehensive docs, and powerful APIs.
                            </p>
                        </div>
                    </div>
                </div>
            </section>

            {/* CTA Section */}
            <section className="py-20">
                <div className="container mx-auto px-4">
                    <div className="bg-primary rounded-2xl p-8 md:p-12 text-center text-primary-foreground">
                        <h2 className="text-3xl md:text-4xl font-bold mb-4">
                            Ready to get started?
                        </h2>
                        <p className="text-lg mb-8 opacity-90 max-w-2xl mx-auto">
                            Join thousands of developers building amazing applications
                        </p>
                        <Button size="lg" variant="secondary" asChild>
                            <Link href="/signup">
                                Create your account
                                <ArrowRight className="ml-2 h-4 w-4" />
                            </Link>
                        </Button>
                    </div>
                </div>
            </section>
        </div>
    );
}
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
                        badge text
                    </div>

                    <h1 className="text-4xl md:text-6xl lg:text-7xl font-bold tracking-tight">
                        Build something

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
        </div>
    );
}
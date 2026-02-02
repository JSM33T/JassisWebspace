import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Users, Target, Heart, Rocket } from 'lucide-react';

export default function AboutPage() {
    return (
        <div className="flex flex-col min-h-screen">
            {/* Hero Section */}
            <section className="flex-1 flex items-center justify-center px-4 py-20 md:py-32">
                <div className="container mx-auto text-center space-y-8">
                    <div className="inline-flex items-center rounded-full border px-4 py-1.5 text-sm font-medium mb-4">
                        <Heart className="mr-2 h-4 w-4" />
                        Our Story
                    </div>

                    <h1 className="text-4xl md:text-6xl lg:text-7xl font-bold tracking-tight">
                        About Us
                    </h1>

                    <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
                        We're building the future of modern web applications.
                        Passionate about technology, driven by innovation.
                    </p>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mt-16 max-w-4xl mx-auto">
                        {/* Mission Card */}
                        <div className="p-6 rounded-lg border bg-card text-card-foreground">
                            <Target className="h-8 w-8 mb-4 mx-auto text-primary" />
                            <h3 className="text-lg font-semibold mb-2">Our Mission</h3>
                            <p className="text-sm text-muted-foreground">
                                To empower developers with cutting-edge tools and platforms
                                that make building applications faster and more enjoyable.
                            </p>
                        </div>

                        {/* Team Card */}
                        <div className="p-6 rounded-lg border bg-card text-card-foreground">
                            <Users className="h-8 w-8 mb-4 mx-auto text-primary" />
                            <h3 className="text-lg font-semibold mb-2">Our Team</h3>
                            <p className="text-sm text-muted-foreground">
                                A diverse group of talented individuals working together
                                to create exceptional experiences for our users.
                            </p>
                        </div>

                        {/* Vision Card */}
                        <div className="p-6 rounded-lg border bg-card text-card-foreground">
                            <Rocket className="h-8 w-8 mb-4 mx-auto text-primary" />
                            <h3 className="text-lg font-semibold mb-2">Our Vision</h3>
                            <p className="text-sm text-muted-foreground">
                                To become the leading platform for developers worldwide,
                                setting new standards in innovation and user experience.
                            </p>
                        </div>
                    </div>

                    <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mt-12">
                        <Button size="lg" asChild>
                            <Link href="/signup">
                                Join Our Team
                            </Link>
                        </Button>
                        <Button size="lg" variant="outline" asChild>
                            <Link href="/">
                                Back to Home
                            </Link>
                        </Button>
                    </div>
                </div>
            </section>
        </div>
    );
}

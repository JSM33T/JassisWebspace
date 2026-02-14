import Link from 'next/link';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { Heart } from 'lucide-react';

export default function AboutPage() {
    return (
        <div className="min-h-screen bg-background/50 px-4 py-8">
            <section className="container mx-auto max-w-7xl min-h-[calc(100vh-6rem)] pt-16 flex items-center">
                <div className="grid grid-cols-1 gap-12 lg:grid-cols-2 w-full items-center">
                    <div className="space-y-7">
                        <div className="inline-flex items-center rounded-full border bg-background/60 px-4 py-1.5 text-sm font-medium">
                            <Heart className="mr-2 h-4 w-4 text-primary" />
                            About Me
                        </div>

                        <h1 className="text-4xl font-bold tracking-tight md:text-6xl">
                            Building thoughtful digital experiences.
                        </h1>

                        <div className="space-y-4 text-muted-foreground">
                            <p className="text-lg">
                                I&apos;m focused on creating products that feel clean, useful, and human. My work sits at the intersection of design, engineering, and storytelling.
                            </p>
                            <p>
                                From early ideas to production-ready features, I care about details that make software enjoyable to use and easy to scale.
                            </p>
                        </div>

                        <div className="flex flex-wrap gap-3 pt-2">
                            <Button size="lg" asChild>
                                <Link href="/contact">Let&apos;s Talk</Link>
                            </Button>
                            <Button size="lg" variant="outline" asChild>
                                <Link href="/projects">View Work</Link>
                            </Button>
                        </div>
                    </div>

                    <div className="relative mx-auto w-full max-w-xl h-[420px] lg:h-[500px]">
                        <div className="absolute inset-0 rounded-[3rem] bg-gradient-to-br from-primary/10 via-transparent to-blue-500/10 blur-2xl" />

                        <div className="absolute left-8 top-10 h-60 w-60 overflow-hidden rounded-full border border-border/60 bg-card shadow-xl">
                            <Image
                                src="/file.svg"
                                alt="Placeholder profile visual"
                                fill
                                className="object-cover p-10"
                                sizes="(max-width: 1024px) 240px, 260px"
                            />
                        </div>

                        <div className="absolute right-8 top-24 h-44 w-44 overflow-hidden rounded-full border border-border/60 bg-card shadow-xl">
                            <Image
                                src="/next.svg"
                                alt="Placeholder design visual"
                                fill
                                className="object-cover p-8"
                                sizes="(max-width: 1024px) 170px, 180px"
                            />
                        </div>

                        <div className="absolute bottom-8 right-20 h-40 w-40 overflow-hidden rounded-full border border-border/60 bg-card shadow-xl">
                            <Image
                                src="/globe.svg"
                                alt="Placeholder creativity visual"
                                fill
                                className="object-cover p-8"
                                sizes="(max-width: 1024px) 150px, 160px"
                            />
                        </div>
                    </div>
                </div>
            </section>
        </div>
    );
}

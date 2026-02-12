'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Music, ArrowLeft, Headphones, MoveUpRight } from 'lucide-react';

export default function MusicPage() {
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

            {/* Header */}
            <section className="px-4 py-8 md:py-12 border-b bg-muted/30 backdrop-blur-sm">
                <div className="container mx-auto max-w-7xl pt-16">
                    <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                        <div className="space-y-3">
                            <Badge variant="secondary" className="px-4 py-1.5 rounded-full text-sm font-normal backdrop-blur-sm bg-background/50 border-border/50 gap-2 w-fit">
                                <Music className="h-3.5 w-3.5 text-primary" />
                                <span>Audio Library</span>
                            </Badge>
                            <h1 className="text-4xl md:text-5xl font-bold tracking-tight">
                                Music
                            </h1>
                            <p className="text-lg text-muted-foreground max-w-2xl">
                                Explore our collection of original tracks and curated playlists.
                            </p>
                        </div>
                        <Button variant="ghost" asChild className="rounded-full px-6">
                            <Link href="/">
                                <ArrowLeft className="mr-2 h-4 w-4" />
                                Back
                            </Link>
                        </Button>
                    </div>
                </div>
            </section>

            {/* Coming Soon Card */}
            <section className="flex-1 flex items-center justify-center px-4 py-12">
                <div className="container mx-auto max-w-7xl w-full">
                    <Card className="max-w-2xl mx-auto rounded-3xl border bg-gradient-to-br from-neutral-100/50 to-white/50 dark:from-neutral-900/50 dark:to-neutral-950/50 hover:shadow-xl transition-all duration-500 backdrop-blur-md p-8 md:p-12 text-center group relative overflow-hidden">
                        <div className="absolute top-6 right-6 p-2 rounded-full border bg-background/50 group-hover:scale-110 transition-transform">
                            <MoveUpRight className="h-4 w-4 opacity-50" />
                        </div>

                        <CardHeader className="pb-4">
                            <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-2xl bg-pink-500/10 mb-6 group-hover:scale-110 transition-transform duration-500">
                                <Headphones className="h-10 w-10 text-pink-500" />
                            </div>
                            <CardTitle className="text-3xl md:text-4xl font-bold tracking-tight">Tune In Soon</CardTitle>
                            <CardDescription className="text-xl pt-4 max-w-md mx-auto leading-relaxed">
                                We're preparing an immersive audio experience for you.
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="pt-4">
                            <p className="text-muted-foreground text-lg">
                                From ambient soundscapes to high-energy tracks, our music library is getting a major upgrade.
                            </p>
                        </CardContent>
                        <CardFooter className="flex flex-wrap items-center justify-center gap-4 pt-10">
                            <Button size="lg" className="rounded-full px-8 bg-primary" asChild>
                                <Link href="/gallery">
                                    Explore Gallery
                                </Link>
                            </Button>
                            <Button size="lg" variant="outline" className="rounded-full px-8 bg-background/50" asChild>
                                <Link href="/blog">
                                    Read Blog
                                </Link>
                            </Button>
                        </CardFooter>
                    </Card>
                </div>
            </section>
        </motion.div>
    );
}

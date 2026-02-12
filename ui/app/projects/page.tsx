'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { FolderCode, ArrowLeft, Rocket, MoveUpRight } from 'lucide-react';

export default function ProjectsPage() {
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
                                <FolderCode className="h-3.5 w-3.5 text-primary" />
                                <span>Portfolio</span>
                            </Badge>
                            <h1 className="text-4xl md:text-5xl font-bold tracking-tight">
                                Projects
                            </h1>
                            <p className="text-lg text-muted-foreground max-w-2xl">
                                A showcase of our innovative projects and technical solutions.
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
                    <Card className="max-w-2xl mx-auto rounded-3xl border bg-card/50 hover:bg-card/80 transition-all duration-500 hover:shadow-xl backdrop-blur-sm p-8 md:p-12 text-center group relative overflow-hidden">
                        <div className="absolute top-6 right-6 p-2 rounded-full border bg-background/50 group-hover:scale-110 transition-transform">
                            <MoveUpRight className="h-4 w-4 opacity-50" />
                        </div>

                        <CardHeader className="pb-4">
                            <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-2xl bg-primary/10 mb-6 group-hover:rotate-12 transition-transform duration-500">
                                <Rocket className="h-10 w-10 text-primary" />
                            </div>
                            <CardTitle className="text-3xl md:text-4xl font-bold tracking-tight">Coming Soon</CardTitle>
                            <CardDescription className="text-xl pt-4 max-w-md mx-auto leading-relaxed">
                                We're currently curating our portfolio and building out comprehensive case studies.
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="pt-4">
                            <p className="text-muted-foreground text-lg italic">
                                "Great things are done by a series of small things brought together."
                            </p>
                        </CardContent>
                        <CardFooter className="flex flex-wrap items-center justify-center gap-4 pt-10">
                            <Button size="lg" className="rounded-full px-8" asChild>
                                <Link href="/blog">
                                    Read our Blog
                                </Link>
                            </Button>
                            <Button size="lg" variant="outline" className="rounded-full px-8 bg-background/50" asChild>
                                <Link href="/about">
                                    About Us
                                </Link>
                            </Button>
                        </CardFooter>
                    </Card>
                </div>
            </section>
        </motion.div>
    );
}

"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowRight, Github, Mail, Sparkles } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";

const heroVariants = {
    hidden: { opacity: 0, y: 24 },
    visible: {
        opacity: 1,
        y: 0,
        transition: {
            duration: 0.6,
            ease: "easeOut" as const,
        },
    },
};

const sectionVariants = {
    hidden: { opacity: 0, y: 16 },
    visible: (index: number) => ({
        opacity: 1,
        y: 0,
        transition: {
            duration: 0.5,
            delay: 0.08 * index,
            ease: "easeOut" as const,
        },
    }),
};

const highlightCards = [
    {
        title: "What I do",
        body: "Short overview of your work, craft, or the kinds of problems you enjoy solving.",
    },
    {
        title: "Currently focused on",
        body: "A concise note about what you are learning, building, or experimenting with right now.",
    },
    {
        title: "How I like to work",
        body: "Describe your preferred ways of collaborating, thinking, or approaching new ideas.",
    },
];

export default function HomePage() {
    return (
        <div className="flex min-h-screen flex-col bg-gradient-to-b from-background via-background/80 to-muted">
            <main className="flex-1 px-4 py-12 md:px-8 md:py-20">
                <div className="mx-auto w-full max-w-5xl pt-16">
                    {/* Hero */}
                    <motion.section
                        className="space-y-10 text-center"
                        variants={heroVariants}
                        initial="hidden"
                        animate="visible"
                    >
                        <div className="inline-flex items-center gap-2 rounded-full border bg-background/60 px-4 py-1.5 text-xs font-medium text-muted-foreground shadow-sm backdrop-blur">
                            <Sparkles className="h-3.5 w-3.5 text-yellow-500" />
                            <span>Personal space on the internet</span>
                        </div>

                        <div className="space-y-4">
                            <h1 className="text-balance text-4xl font-semibold tracking-tight md:text-5xl lg:text-6xl">
                                A calm home for my work, ideas, and experiments.
                            </h1>
                            <p className="text-balance text-base text-muted-foreground md:text-lg">
                                Use this page as your digital front door. Introduce yourself,
                                highlight a few important things you&apos;re working on, and
                                point people toward where they should go next.
                            </p>
                        </div>

                        <div className="flex flex-wrap items-center justify-center gap-3">
                            <Button size="lg" asChild>
                                <Link href="#projects">
                                    View my work
                                    <ArrowRight className="ml-2 h-4 w-4" />
                                </Link>
                            </Button>

                            <Button size="lg" variant="outline" asChild>
                                <Link href="#contact">Get in touch</Link>
                            </Button>
                        </div>

                        <div className="grid gap-4 text-left md:grid-cols-3">
                            {highlightCards.map((card, index) => (
                                <motion.div
                                    key={card.title}
                                    custom={index}
                                    variants={sectionVariants}
                                    initial="hidden"
                                    whileInView="visible"
                                    viewport={{ once: true, amount: 0.3 }}
                                >
                                    <Card className="h-full border-border/60 bg-background/70 backdrop-blur">
                                        <CardHeader className="pb-2">
                                            <CardTitle className="text-sm font-semibold tracking-tight">
                                                {card.title}
                                            </CardTitle>
                                        </CardHeader>
                                        <CardContent className="text-sm text-muted-foreground">
                                            {card.body}
                                        </CardContent>
                                    </Card>
                                </motion.div>
                            ))}
                        </div>
                    </motion.section>

                   

                    <Separator className="mt-10 opacity-70" />

                </div>
            </main>
        </div>
    );
}

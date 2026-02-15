"use client";

import Link from "next/link";
import Image from "next/image";
import { motion } from "framer-motion";
import {
    ArrowRight,
    BookOpenText,
    Briefcase,
    Heart,
    Images,
    Music2,
    Wrench,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

const sections = [
    {
        title: "Gallery",
        label: "Visual Showcase",
        description:
            "Curated albums and visual stories. A place for selected moments, concepts, and design-first composition.",
        href: "/gallery",
        cta: "Open Gallery",
        stat: "Albums and visual drops",
        icon: Images,
    },
    {
        title: "Tools",
        label: "Build Utility",
        description:
            "Custom utilities, workflow helpers, and internal systems focused on speed, reliability, and clean execution.",
        href: "/projects",
        cta: "View Tools",
        stat: "Automation and product tools",
        icon: Wrench,
    },
    {
        title: "Services",
        label: "Execution Layer",
        description:
            "End-to-end implementation support from architecture to polished delivery, designed for real production use.",
        href: "/services",
        cta: "Explore Services",
        stat: "Engineering and consulting",
        icon: Briefcase,
    },
    {
        title: "Blogs",
        label: "Knowledge Stream",
        description:
            "Practical notes, product learnings, and engineering writeups from real builds and iteration cycles.",
        href: "/blog",
        cta: "Read Blogs",
        stat: "Notes from shipping in public",
        icon: BookOpenText,
    },
    {
        title: "Music",
        label: "Audio Space",
        description:
            "Tracks, ideas, and sound experiments where composition and engineering workflows meet in one platform.",
        href: "/music",
        cta: "Listen to Music",
        stat: "Streamed tracks and releases",
        icon: Music2,
    },
] as const;

export default function AboutPage() {
    return (
        <div className="relative min-h-screen overflow-hidden bg-background/50 px-4 py-8">
            <div className="pointer-events-none fixed inset-0 z-[-1]">
                <div className="absolute left-1/2 top-[-12%] h-[30rem] w-[30rem] -translate-x-1/2 rounded-full bg-primary/10 blur-[120px]" />
                <div className="absolute bottom-[-8%] left-[-6%] h-80 w-80 rounded-full bg-accent/18 blur-[110px]" />
                <div className="absolute inset-0 bg-[linear-gradient(to_right,hsl(var(--border)/0.1)_1px,transparent_1px),linear-gradient(to_bottom,hsl(var(--border)/0.1)_1px,transparent_1px)] bg-[size:56px_56px] [mask-image:radial-gradient(ellipse_at_center,white,transparent_75%)]" />
            </div>

            <section className="container mx-auto flex min-h-[calc(100vh-6rem)] max-w-7xl items-center pt-16">
                <div className="grid w-full grid-cols-1 items-center gap-12 lg:grid-cols-2">
                    <motion.div
                        className="space-y-7"
                        initial={{ opacity: 0, y: 16 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.45 }}
                    >
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
                    </motion.div>

                    <motion.div
                        className="relative mx-auto h-[420px] w-full max-w-xl lg:h-[500px]"
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ duration: 0.5 }}
                    >
                        <div className="absolute inset-0 rounded-[3rem] bg-gradient-to-br from-primary/10 via-transparent to-secondary/20 blur-2xl" />

                        <motion.div
                            className="absolute left-8 top-10 h-60 w-60 overflow-hidden rounded-full border border-border/60 bg-card shadow-xl"
                            animate={{ y: [0, -8, 0] }}
                            transition={{ duration: 5, repeat: Number.POSITIVE_INFINITY }}
                        >
                            <Image
                                src="/file.svg"
                                alt="Placeholder profile visual"
                                fill
                                className="object-cover p-10"
                                sizes="(max-width: 1024px) 240px, 260px"
                            />
                        </motion.div>

                        <motion.div
                            className="absolute right-8 top-24 h-44 w-44 overflow-hidden rounded-full border border-border/60 bg-card shadow-xl"
                            animate={{ y: [0, 10, 0] }}
                            transition={{ duration: 6, repeat: Number.POSITIVE_INFINITY }}
                        >
                            <Image
                                src="/next.svg"
                                alt="Placeholder design visual"
                                fill
                                className="object-cover p-8"
                                sizes="(max-width: 1024px) 170px, 180px"
                            />
                        </motion.div>

                        <motion.div
                            className="absolute bottom-8 right-20 h-40 w-40 overflow-hidden rounded-full border border-border/60 bg-card shadow-xl"
                            animate={{ y: [0, -6, 0] }}
                            transition={{ duration: 4.8, repeat: Number.POSITIVE_INFINITY }}
                        >
                            <Image
                                src="/globe.svg"
                                alt="Placeholder creativity visual"
                                fill
                                className="object-cover p-8"
                                sizes="(max-width: 1024px) 150px, 160px"
                            />
                        </motion.div>
                    </motion.div>
                </div>
            </section>

            <section className="container mx-auto max-w-7xl pb-16 md:pb-24">
                <motion.div
                    className="mb-10 space-y-3"
                    initial={{ opacity: 0, y: 14 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true, amount: 0.35 }}
                    transition={{ duration: 0.45 }}
                >
                    <Badge variant="secondary" className="rounded-full px-4 py-1.5">
                        What Lives Here
                    </Badge>
                    <h2 className="text-3xl font-semibold tracking-tight md:text-4xl">
                        A connected space across content and craft.
                    </h2>
                    <p className="max-w-2xl text-muted-foreground">
                        Each section is built as part of one system, so creation, publishing,
                        and discovery stay smooth and consistent.
                    </p>
                </motion.div>

                <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
                    {sections.map((section, index) => {
                        const Icon = section.icon;
                        return (
                            <motion.article
                                key={section.title}
                                className="h-full"
                                initial={{ opacity: 0, y: 22 }}
                                whileInView={{ opacity: 1, y: 0 }}
                                viewport={{ once: true, amount: 0.25 }}
                                transition={{ duration: 0.42, delay: index * 0.04 }}
                            >
                                <Card className="h-full overflow-hidden rounded-3xl border bg-card/50 backdrop-blur-sm">
                                    <CardContent className="p-5 md:p-6">
                                        <div className="grid gap-4">
                                            <div className="space-y-3">
                                                <Badge variant="outline" className="rounded-full px-3 py-1">
                                                    {section.label}
                                                </Badge>
                                                <h3 className="text-xl font-semibold tracking-tight md:text-2xl">
                                                    {section.title}
                                                </h3>
                                                <p className="leading-relaxed text-muted-foreground md:text-sm">
                                                    {section.description}
                                                </p>
                                                <div className="pt-1">
                                                    <Button asChild size="sm" className="rounded-full px-5">
                                                        <Link href={section.href}>
                                                            {section.cta}
                                                            <ArrowRight className="ml-2 h-4 w-4" />
                                                        </Link>
                                                    </Button>
                                                </div>
                                            </div>

                                            <motion.div
                                                className="relative"
                                                initial={{ opacity: 0, scale: 0.96 }}
                                                whileInView={{ opacity: 1, scale: 1 }}
                                                viewport={{ once: true, amount: 0.35 }}
                                                transition={{ duration: 0.38 }}
                                            >
                                                <div className="relative mx-auto aspect-[15/9] w-full overflow-hidden rounded-3xl border bg-gradient-to-br from-background via-background/90 to-primary/10 p-4">
                                                    <motion.div
                                                        className="absolute -right-12 -top-12 h-40 w-40 rounded-full bg-primary/14 blur-3xl"
                                                        animate={{ opacity: [0.35, 0.65, 0.35] }}
                                                        transition={{ duration: 5.5, repeat: Number.POSITIVE_INFINITY }}
                                                    />
                                                    <motion.div
                                                        className="absolute -bottom-14 -left-10 h-40 w-40 rounded-full bg-secondary/20 blur-3xl"
                                                        animate={{ opacity: [0.3, 0.55, 0.3] }}
                                                        transition={{ duration: 5.8, repeat: Number.POSITIVE_INFINITY }}
                                                    />
                                                    <div className="relative z-10 flex h-full flex-col justify-between rounded-2xl border bg-card/65 p-4">
                                                        <div className="flex items-center justify-between">
                                                            <div className="rounded-2xl border bg-background/70 p-2.5">
                                                                <Icon className="h-5 w-5 text-primary" />
                                                            </div>
                                                            <Badge variant="secondary" className="rounded-full px-3">
                                                                JassSpace
                                                            </Badge>
                                                        </div>
                                                        <div>
                                                            <p className="text-sm uppercase tracking-wider text-muted-foreground">
                                                                {section.title}
                                                            </p>
                                                            <p className="mt-1 text-sm font-medium text-foreground/90">
                                                                {section.stat}
                                                            </p>
                                                        </div>
                                                    </div>
                                                </div>
                                            </motion.div>
                                        </div>
                                    </CardContent>
                                </Card>
                            </motion.article>
                        );
                    })}
                </div>
            </section>
        </div>
    );
}

"use client";

import Link from "next/link";
import { motion, type Variants } from "framer-motion";
import { ArrowUpRight, BookOpen, Image, Info, Mail, Music2, Plus } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

const containerVariants: Variants = {
    hidden: { opacity: 0 },
    visible: {
        opacity: 1,
        transition: { duration: 0.35, staggerChildren: 0.08 },
    },
};

const itemVariants: Variants = {
    hidden: { opacity: 0, y: 16 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.45, ease: [0.22, 1, 0.36, 1] } },
};

const links = [
    { href: "/about", label: "About", icon: Info },
    { href: "/music", label: "Music", icon: Music2 },
    { href: "/blog", label: "Blog", icon: BookOpen },
    { href: "/gallery", label: "Gallery", icon: Image },
];

export default function HomePage() {
    return (
        <div className="relative min-h-screen overflow-hidden bg-background text-foreground">
            <div className="pointer-events-none absolute inset-0">
                <div className="absolute -top-28 left-1/2 h-[34rem] w-[34rem] -translate-x-1/2 rounded-full bg-primary/12 blur-3xl" />
                <div className="absolute top-[24%] -left-32 h-80 w-80 rounded-full bg-accent/14 blur-3xl" />
                <div className="absolute top-[34%] -right-28 h-72 w-72 rounded-full bg-secondary/18 blur-3xl" />
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_28%,hsl(var(--primary)/0.1),transparent_62%)]" />
                <div className="absolute inset-0 bg-[linear-gradient(to_bottom,hsl(var(--background)/0.08),hsl(var(--background))_82%)]" />
                <div className="absolute inset-0 bg-[linear-gradient(to_right,hsl(var(--border)/0.1)_1px,transparent_1px),linear-gradient(to_bottom,hsl(var(--border)/0.1)_1px,transparent_1px)] bg-[size:60px_60px] [mask-image:radial-gradient(ellipse_at_center,white,transparent_76%)]" />
                <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_54%,hsl(var(--background)/0.88)_97%)]" />
            </div>

            <main className="relative mx-auto max-w-6xl px-6">
                <motion.div variants={containerVariants} initial="hidden" animate="visible">
                    <motion.section
                        className="mx-auto flex min-h-[100svh] w-full max-w-4xl flex-col items-center justify-center pb-8 pt-24 text-center md:pb-10 md:pt-28"
                        variants={itemVariants}
                    >
                        <motion.div variants={itemVariants} className="mb-10 flex items-center justify-center gap-3 sm:gap-5">
                            {links.slice(0, 2).map((item) => {
                                const Icon = item.icon;
                                return (
                                    <Link
                                        key={`icon-left-${item.href}`}
                                        href={item.href}
                                        className="flex h-12 w-12 items-center justify-center rounded-full border bg-card/70 text-muted-foreground transition-all hover:-translate-y-0.5 hover:text-foreground sm:h-14 sm:w-14"
                                        aria-label={item.label}
                                    >
                                        <Icon className="h-5 w-5" />
                                    </Link>
                                );
                            })}

                            <div className="flex h-24 w-24 items-center justify-center rounded-full border bg-primary text-primary-foreground shadow-lg shadow-primary/20 sm:h-28 sm:w-28">
                                <Plus className="h-10 w-10 sm:h-12 sm:w-12" />
                            </div>

                            {links.slice(2).map((item) => {
                                const Icon = item.icon;
                                return (
                                    <Link
                                        key={`icon-right-${item.href}`}
                                        href={item.href}
                                        className="flex h-12 w-12 items-center justify-center rounded-full border bg-card/70 text-muted-foreground transition-all hover:-translate-y-0.5 hover:text-foreground sm:h-14 sm:w-14"
                                        aria-label={item.label}
                                    >
                                        <Icon className="h-5 w-5" />
                                    </Link>
                                );
                            })}
                        </motion.div>

                        <motion.div variants={itemVariants}>
                            <Badge variant="secondary" className="rounded-full px-4 py-1.5">
                                Explore
                            </Badge>
                        </motion.div>

                        <motion.h1
                            variants={itemVariants}
                            className="mt-6 text-balance text-4xl font-semibold tracking-tight sm:text-5xl md:text-6xl"
                        >
                            <span className="block text-primary">Jassi&apos;s Webspace</span>
                        </motion.h1>

                        <motion.p
                            variants={itemVariants}
                            className="mx-auto mt-6 max-w-2xl text-balance text-base leading-relaxed text-muted-foreground sm:text-lg md:text-xl"
                        >
                            Jump directly into the sections that matter most. Music, writing,
                            visuals, and background details all sit in one simple flow.
                        </motion.p>

                        <motion.div variants={itemVariants} className="mt-10 grid grid-cols-2 gap-3 sm:mx-auto sm:flex sm:w-fit sm:flex-wrap sm:justify-center">
                            {links.map((item) => {
                                const Icon = item.icon;
                                return (
                                    <Button
                                        key={`hero-button-${item.href}`}
                                        asChild
                                        size="lg"
                                        variant="secondary"
                                        className="rounded-full px-6"
                                    >
                                        <Link href={item.href}>
                                            <Icon className="mr-2 h-4 w-4" />
                                            {item.label}
                                        </Link>
                                    </Button>
                                );
                            })}
                        </motion.div>
                    </motion.section>

                    <motion.section variants={itemVariants} className="pb-16 md:pb-24">
                        <div className="relative overflow-hidden rounded-3xl border bg-card/65 p-6 backdrop-blur-sm md:p-8">
                            <div className="pointer-events-none absolute inset-0">
                                <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_22%,hsl(var(--primary)/0.18),transparent_44%),radial-gradient(circle_at_85%_70%,hsl(var(--secondary)/0.16),transparent_54%)]" />
                                <div className="absolute inset-0 bg-[linear-gradient(to_right,hsl(var(--border)/0.18)_1px,transparent_1px),linear-gradient(to_bottom,hsl(var(--border)/0.18)_1px,transparent_1px)] bg-[size:20px_20px] opacity-35" />
                                <div className="absolute inset-0 bg-[linear-gradient(145deg,hsl(var(--background)/0.14),transparent_60%)]" />
                            </div>

                            <div className="relative grid gap-7 md:grid-cols-[1.08fr_0.92fr] md:items-center">
                                <div className="space-y-4">
                                    <Badge variant="secondary" className="w-fit rounded-full px-4 py-1.5">
                                        Contact
                                    </Badge>
                                    <h2 className="max-w-xl text-balance text-3xl font-semibold tracking-tight md:text-4xl">
                                        Ready to build something meaningful together?
                                    </h2>
                                    <p className="max-w-xl text-base leading-relaxed text-muted-foreground md:text-lg">
                                        If you have a project, collaboration idea, or want to discuss
                                        production-grade execution, let&apos;s connect and shape it end-to-end.
                                    </p>
                                    <Button asChild size="lg" className="rounded-full px-7">
                                        <Link href="/contact">
                                            <Mail className="mr-2 h-4 w-4" />
                                            Start Conversation
                                            <ArrowUpRight className="ml-2 h-4 w-4" />
                                        </Link>
                                    </Button>
                                </div>

                                <div className="relative h-44 rounded-2xl border bg-background/50 p-5 md:h-56">
                                    <div className="absolute -left-8 top-6 h-24 w-24 rounded-full border bg-primary/15 blur-[2px]" />
                                    <div className="absolute right-6 top-6 h-14 w-14 rounded-full border bg-secondary/20" />
                                    <div className="absolute left-1/2 top-1/2 h-28 w-28 -translate-x-1/2 -translate-y-1/2 rounded-full border border-primary/40 bg-background/65" />
                                    <div className="absolute bottom-6 left-8 right-8 h-12 rounded-xl border bg-card/70" />
                                    <div className="absolute bottom-10 left-1/2 h-2 w-24 -translate-x-1/2 rounded-full bg-primary/35" />
                                </div>
                            </div>
                        </div>
                    </motion.section>
                </motion.div>
            </main>
        </div>
    );
}

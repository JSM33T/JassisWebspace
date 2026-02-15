"use client";

import Link from "next/link";
import { motion, type Variants } from "framer-motion";
import { BookOpen, Image, Info, Music2, Plus } from "lucide-react";

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

            <main className="relative mx-auto flex min-h-screen max-w-6xl items-center px-6 py-20 md:py-28">
                <motion.section
                    className="mx-auto w-full max-w-4xl text-center"
                    variants={containerVariants}
                    initial="hidden"
                    animate="visible"
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
                        <span className="block text-primary">Jassi's Webspace</span>
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
            </main>
        </div>
    );
}

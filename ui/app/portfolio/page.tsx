'use client';

import Link from 'next/link';
import { motion, type Variants } from 'framer-motion';
import {
    ArrowRight,
    Briefcase,
    Clock3,
    Code2,
    Layers,
    Sparkles,
    TrendingUp,
} from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

const skillGroups = [
    {
        label: 'Frontend',
        items: ['Next.js', 'React', 'TypeScript', 'Tailwind CSS', 'shadcn/ui', 'Framer Motion'],
    },
    {
        label: 'Backend',
        items: ['ASP.NET Core', 'C#', 'REST APIs', 'PostgreSQL', 'Entity Framework', 'Redis'],
    },
    {
        label: 'Product & Delivery',
        items: ['System Design', 'UI/UX Thinking', 'Automation', 'Performance', 'SEO', 'CI/CD'],
    },
];

const offerings = [
    {
        title: 'Product Engineering',
        description:
            'From idea to production: architecture, implementation, and maintenance with a focus on quality and speed.',
        icon: Code2,
    },
    {
        title: 'Creative Web Experiences',
        description:
            'Interactive websites and portfolio experiences that feel intentional, clean, and memorable.',
        icon: Sparkles,
    },
    {
        title: 'Automation & Scale',
        description:
            'Automation pipelines, background workers, and reliable deployment setups that reduce manual effort.',
        icon: Layers,
    },
];

const timeline = [
    {
        period: '2026',
        title: 'Unified Creator Platform',
        description:
            'Built and integrated blog, gallery, and music modules under one consistent experience with admin workflows.',
        points: ['Track-centric music model', 'Chunked streaming and comments', 'Admin-first content management'],
    },
    {
        period: '2025',
        title: 'Full-stack Product Delivery',
        description:
            'Delivered end-to-end features from API design to polished UI, with focus on stable releases and iteration speed.',
        points: ['Role-based admin tools', 'Media handling pipelines', 'SEO-ready public pages'],
    },
    {
        period: 'Earlier',
        title: 'Foundation & Exploration',
        description:
            'Experimented across automation, web engineering, and creative coding to build a practical product mindset.',
        points: ['Systematic debugging habits', 'Reusable component architecture', 'Cross-domain problem solving'],
    },
];

const stats = [
    { label: 'Focus', value: 'Full Stack + Creative Web', icon: Briefcase },
    { label: 'Approach', value: 'Ship fast, refine deeply', icon: TrendingUp },
    { label: 'Availability', value: 'Open to collaboration', icon: Clock3 },
];

const containerVariants: Variants = {
    hidden: { opacity: 0 },
    visible: {
        opacity: 1,
        transition: { duration: 0.35, staggerChildren: 0.08 },
    },
};

const itemVariants: Variants = {
    hidden: { opacity: 0, y: 14 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.45 } },
};

export default function PortfolioPage() {
    return (
        <motion.div
            className="relative min-h-screen overflow-hidden bg-background/50"
            initial="hidden"
            animate="visible"
            variants={containerVariants}
        >
            <div className="pointer-events-none fixed inset-0 z-[-1]">
                <div className="absolute left-1/2 top-[-18%] h-[32rem] w-[32rem] -translate-x-1/2 rounded-full bg-primary/12 blur-[120px]" />
                <div className="absolute right-[-12%] top-[26%] h-80 w-80 rounded-full bg-accent/20 blur-[120px]" />
                <div className="absolute left-[-10%] bottom-[10%] h-72 w-72 rounded-full bg-secondary/20 blur-[110px]" />
                <div className="absolute inset-0 bg-[linear-gradient(to_right,hsl(var(--border)/0.12)_1px,transparent_1px),linear-gradient(to_bottom,hsl(var(--border)/0.12)_1px,transparent_1px)] bg-[size:56px_56px] [mask-image:radial-gradient(ellipse_at_center,white,transparent_74%)]" />
            </div>

            <section className="px-4 pb-10 pt-24 md:pt-28">
                <div className="container mx-auto max-w-7xl">
                    <motion.div variants={itemVariants} className="grid gap-5 lg:grid-cols-[1.2fr_0.8fr]">
                        <Card className="rounded-3xl border bg-card/55 backdrop-blur-sm">
                            <CardHeader className="space-y-4 p-6 md:p-7">
                                <Badge variant="secondary" className="w-fit rounded-full px-4 py-1.5">
                                    Portfolio
                                </Badge>
                                <h1 className="text-balance text-3xl font-semibold tracking-tight md:text-5xl">
                                    Hi, I&apos;m <span className="text-primary">Jassi</span>.
                                </h1>
                                <CardDescription className="max-w-2xl text-sm leading-relaxed md:text-base">
                                    I build modern digital products across web engineering, UI systems,
                                    content experiences, and platform workflows.
                                </CardDescription>
                                <div className="flex flex-wrap gap-3 pt-2">
                                    <Button asChild size="sm" className="rounded-full px-6 h-10">
                                        <Link href="/contact">
                                            Work with me
                                            <ArrowRight className="ml-2 h-4 w-4" />
                                        </Link>
                                    </Button>
                                    <Button asChild size="sm" variant="outline" className="rounded-full px-6 h-10">
                                        <Link href="/projects">View projects</Link>
                                    </Button>
                                </div>
                            </CardHeader>
                        </Card>

                        <Card className="rounded-3xl border bg-card/50 backdrop-blur-sm">
                            <CardHeader className="p-6 pb-3">
                                <CardTitle className="text-lg">At a glance</CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-3 p-6 pt-1">
                                {stats.map((stat) => {
                                    const Icon = stat.icon;
                                    return (
                                        <div
                                            key={stat.label}
                                            className="rounded-2xl border bg-background/60 px-4 py-3"
                                        >
                                            <div className="mb-1 flex items-center gap-2 text-xs uppercase tracking-wider text-muted-foreground">
                                                <Icon className="h-3.5 w-3.5 text-primary" />
                                                {stat.label}
                                            </div>
                                            <p className="text-sm font-medium">{stat.value}</p>
                                        </div>
                                    );
                                })}
                            </CardContent>
                        </Card>
                    </motion.div>
                </div>
            </section>

            <section className="px-4 pb-2">
                <div className="container mx-auto max-w-7xl">
                    <motion.div variants={itemVariants}>
                        <Card className="rounded-3xl border bg-card/50">
                            <CardHeader className="space-y-3 p-6 md:p-7">
                                <Badge variant="outline" className="w-fit rounded-full px-3 py-1">
                                    Webspace Purpose
                                </Badge>
                                <CardTitle className="text-xl tracking-tight md:text-2xl">
                                    Why this webspace exists
                                </CardTitle>
                                <CardDescription className="space-y-2 text-sm leading-relaxed md:text-base">
                                    <p>
                                        This webspace is my single source for creative and technical work.
                                        Instead of scattered profiles, everything lives in one structured place.
                                    </p>
                                    <p>
                                        It is designed to show how I think, what I build, and how ideas move
                                        from concept to production across music, writing, visuals, and software.
                                    </p>
                                </CardDescription>
                            </CardHeader>
                        </Card>
                    </motion.div>
                </div>
            </section>

            <section className="px-4 py-8">
                <div className="container mx-auto max-w-7xl">
                    <motion.div variants={itemVariants} className="space-y-6">
                        <div className="space-y-2">
                            <h2 className="text-2xl font-semibold tracking-tight md:text-3xl">What I do</h2>
                            <p className="text-muted-foreground">
                                Product-minded development with design sensitivity and system rigor.
                            </p>
                        </div>
                        <div className="grid gap-4 md:grid-cols-3">
                            {offerings.map((item) => {
                                const Icon = item.icon;
                                return (
                                    <Card
                                        key={item.title}
                                        className="rounded-2xl border bg-card/55 transition-colors hover:bg-card/75"
                                    >
                                        <CardHeader className="space-y-3 p-5">
                                            <div className="w-fit rounded-xl border bg-background/65 p-2.5">
                                                <Icon className="h-4 w-4 text-primary" />
                                            </div>
                                            <CardTitle className="text-base">{item.title}</CardTitle>
                                            <CardDescription className="text-sm leading-relaxed">
                                                {item.description}
                                            </CardDescription>
                                        </CardHeader>
                                    </Card>
                                );
                            })}
                        </div>
                    </motion.div>
                </div>
            </section>

            <section className="px-4 py-8">
                <div className="container mx-auto max-w-7xl">
                    <motion.div variants={itemVariants} className="rounded-3xl border bg-card/45 p-5 md:p-6">
                        <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
                            <h2 className="text-xl font-semibold tracking-tight md:text-2xl">Skills</h2>
                            <Badge variant="outline" className="rounded-full px-4 py-1">
                                Tailwind + shadcn aligned
                            </Badge>
                        </div>
                        <div className="grid gap-5 md:grid-cols-3">
                            {skillGroups.map((group) => (
                                <Card key={group.label} className="rounded-2xl border bg-background/70">
                                    <CardHeader className="space-y-3 p-4">
                                        <CardTitle className="text-base">{group.label}</CardTitle>
                                        <div className="flex flex-wrap gap-2">
                                            {group.items.map((skill) => (
                                                <Badge key={skill} variant="secondary" className="rounded-full px-3 py-1">
                                                    {skill}
                                                </Badge>
                                            ))}
                                        </div>
                                    </CardHeader>
                                </Card>
                            ))}
                        </div>
                    </motion.div>
                </div>
            </section>

            <section className="px-4 py-8 pb-16 md:pb-20">
                <div className="container mx-auto max-w-7xl">
                    <motion.div variants={itemVariants} className="space-y-6">
                        <div className="space-y-2">
                            <h2 className="text-2xl font-semibold tracking-tight md:text-3xl">Timeline</h2>
                            <p className="text-muted-foreground">
                                The path from experimentation to full product execution.
                            </p>
                        </div>
                        <div className="relative space-y-5 pl-4 md:pl-8">
                            <div className="absolute left-[7px] top-1 h-[calc(100%-12px)] w-px bg-border md:left-[15px]" />
                            {timeline.map((item, index) => (
                                <motion.div
                                    key={item.title}
                                    initial={{ opacity: 0, y: 14 }}
                                    whileInView={{ opacity: 1, y: 0 }}
                                    viewport={{ once: true, margin: '-80px' }}
                                    transition={{ duration: 0.35, delay: index * 0.06 }}
                                    className="relative"
                                >
                                    <span className="absolute -left-1 top-7 h-4 w-4 rounded-full border-2 border-background bg-primary shadow md:-left-[17px]" />
                                    <Card className="rounded-2xl border bg-card/55">
                                        <CardHeader className="space-y-3 p-5">
                                            <Badge variant="secondary" className="w-fit rounded-full px-3 py-1">
                                                {item.period}
                                            </Badge>
                                            <CardTitle className="text-base md:text-lg">{item.title}</CardTitle>
                                            <CardDescription className="text-sm leading-relaxed">
                                                {item.description}
                                            </CardDescription>
                                            <div className="flex flex-wrap gap-2 pt-1">
                                                {item.points.map((point) => (
                                                    <Badge key={point} variant="outline" className="rounded-full px-3 py-1">
                                                        {point}
                                                    </Badge>
                                                ))}
                                            </div>
                                        </CardHeader>
                                    </Card>
                                </motion.div>
                            ))}
                        </div>
                    </motion.div>
                </div>
            </section>
        </motion.div>
    );
}

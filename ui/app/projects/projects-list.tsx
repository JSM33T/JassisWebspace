'use client';

import Image from 'next/image';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { ArrowUpRight, FolderCode, Rocket } from 'lucide-react';

import type { Project } from '@/data/projects';
import { Badge } from '@/components/ui/badge';
import { Card, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { PageBanner } from '@/components/page-banner';
import { SectionHeader } from '@/components/section-header';
import { VisualFallback } from '@/components/visual-fallback';

export function ProjectsList({ projects }: { projects: Project[] }) {
    return (
        <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: 'easeOut' }}
            className="flex min-h-screen flex-col bg-background/50"
        >
            <div className="pointer-events-none fixed inset-0 z-[-1]">
                <div className="absolute left-1/2 top-[-10%] h-[600px] w-[600px] -translate-x-1/2 rounded-full bg-primary/5 blur-[120px]" />
                <div className="absolute bottom-[-10%] left-[-10%] h-[500px] w-[500px] rounded-full bg-accent/5 blur-[120px]" />
            </div>

            <PageBanner
                badge="Portfolio"
                badgeIcon={FolderCode}
                title="Projects"
                description="Engineering builds across self-hosted infrastructure, automation, AI workflows, media systems, and developer tools."
            />

            <main className="flex-1 px-4 pb-14 pt-8 md:px-8 md:pb-16 md:pt-10">
                <section className="mx-auto max-w-6xl pt-4">
                    <SectionHeader
                        eyebrow={`${projects.length} technical builds`}
                        title="Projects"
                        description="Case-study style notes on systems, tools, and experiments across media, automation, AI, and infrastructure."
                        className="mb-5"
                    />

                    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                        {projects.map((project, index) => {
                            const preview = project.coverImage || project.screenshots[0] || null;

                            return (
                                <motion.div
                                    key={project.slug}
                                    initial={{ opacity: 0, scale: 0.97 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    transition={{ duration: 0.3, delay: index * 0.04 }}
                                >
                                    <Link
                                        href={`/projects/${project.slug}`}
                                        aria-label={`Open project: ${project.title}`}
                                        className="group block h-full rounded-2xl focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"
                                    >
                                        <Card className="flex h-full flex-col rounded-2xl border bg-card/50 transition-all duration-300 group-hover:-translate-y-0.5 group-hover:bg-card/80 group-hover:shadow-lg">
                                            <CardHeader className="space-y-0 px-5 pb-3 pt-5">
                                                <div className="relative mb-4 overflow-hidden rounded-xl border bg-muted/35">
                                                    {preview ? (
                                                        <div className="relative aspect-[16/9]">
                                                            <Image
                                                                src={preview}
                                                                alt={`${project.title} preview`}
                                                                fill
                                                                sizes="(max-width: 768px) 100vw, 50vw"
                                                                className="object-cover transition-transform duration-500 group-hover:scale-105"
                                                            />
                                                        </div>
                                                    ) : (
                                                        <VisualFallback
                                                            kind="project"
                                                            title={project.title}
                                                            eyebrow={project.highlight || 'Project'}
                                                            icon={Rocket}
                                                            className="aspect-[16/9] min-h-0"
                                                        />
                                                    )}
                                                </div>
                                                <Badge variant="secondary" className="mb-3 w-fit rounded-full px-2.5 py-0.5 text-xs font-semibold uppercase tracking-wide">
                                                    {project.highlight || 'Project'}
                                                </Badge>
                                                <CardTitle className="text-lg font-semibold leading-snug tracking-tight transition-colors group-hover:text-primary">
                                                    {project.title}
                                                </CardTitle>
                                                <CardDescription className="line-clamp-3 pt-3 text-sm leading-relaxed">
                                                    {project.description}
                                                </CardDescription>
                                            </CardHeader>
                                            <CardFooter className="mt-auto flex items-center justify-between gap-3 border-t px-5 pb-5 pt-3">
                                                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                                                    <FolderCode className="h-3.5 w-3.5" />
                                                    <span>{project.tech?.length ?? 0} technologies</span>
                                                </div>
                                                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border bg-background/70 text-muted-foreground transition-colors group-hover:text-foreground">
                                                    <ArrowUpRight className="h-4 w-4" />
                                                </span>
                                            </CardFooter>
                                        </Card>
                                    </Link>
                                </motion.div>
                            );
                        })}
                    </div>
                </section>
            </main>
        </motion.div>
    );
}

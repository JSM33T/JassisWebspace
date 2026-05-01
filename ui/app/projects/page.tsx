'use client';

import { Suspense, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { motion } from 'framer-motion';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { FolderCode, ChevronLeft, ChevronRight, MoveUpRight, Rocket, Send } from 'lucide-react';
import { PageBanner } from '@/components/page-banner';
import { projects as projectsData, type Project as ProjectType } from '../../data/projects';

type ProjectCard = ProjectType & { id: string };

const makeProjectId = (title: string) =>
    title
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '');

const projects: ProjectCard[] = projectsData.map((project) => ({
    ...project,
    id: makeProjectId(project.title),
}));

function ProjectsPageContent() {
    const router = useRouter();
    const pathname = usePathname();
    const searchParams = useSearchParams();
    const selectedProject =
        projects.find((project) => project.id === searchParams.get('project')) || null;

    const [slideIndex, setSlideIndex] = useState(0);

    const screenshots = selectedProject?.screenshots ?? [];
    const hasScreenshots = screenshots.length > 0;
    const activeScreenshot = hasScreenshots
        ? screenshots[slideIndex % screenshots.length] ?? null
        : null;
    const swipeThreshold = 40;

    const goToPreviousSlide = () => {
        if (screenshots.length <= 1) return;
        setSlideIndex((prev) => (prev - 1 + screenshots.length) % screenshots.length);
    };

    const goToNextSlide = () => {
        if (screenshots.length <= 1) return;
        setSlideIndex((prev) => (prev + 1) % screenshots.length);
    };

    const setProjectParam = (projectId: string | null) => {
        const params = new URLSearchParams(searchParams.toString());
        if (projectId) {
            params.set('project', projectId);
        } else {
            params.delete('project');
        }
        const query = params.toString();
        router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
    };

    const openProject = (project: (typeof projects)[0]) => {
        setSlideIndex(0);
        setProjectParam(project.id);
    };

    const closeProject = () => {
        setSlideIndex(0);
        setProjectParam(null);
    };

    const goToContactWithRef = () => {
        if (typeof window === 'undefined') {
            router.push('/contact');
            return;
        }
        router.push(`/contact?ref=${encodeURIComponent(window.location.href)}`);
    };

    return (
        <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: 'easeOut' }}
            className="flex flex-col min-h-screen bg-background/50"
        >
            <div className="fixed inset-0 z-[-1] pointer-events-none">
                <div className="absolute top-[-10%] left-1/2 -translate-x-1/2 w-[600px] h-[600px] rounded-full bg-primary/5 blur-[120px]" />
                <div className="absolute bottom-[-10%] left-[-10%] w-[500px] h-[500px] rounded-full bg-accent/5 blur-[120px]" />
            </div>

            <PageBanner
                badge="Portfolio"
                badgeIcon={FolderCode}
                title="Projects"
                description="A showcase of my innovative projects and technical solutions."
            />

            <main className="flex-1 px-4 pb-14 pt-8 md:px-8 md:pb-16 md:pt-10">
                <div className="mx-auto max-w-6xl pt-4">
                    <div className="grid max-w-6xl grid-cols-1 gap-4 md:grid-cols-2">
                        {projects.map((project, index) => (
                            <motion.div
                                key={project.title}
                                initial={{ opacity: 0, scale: 0.95 }}
                                animate={{ opacity: 1, scale: 1 }}
                                transition={{ duration: 0.3, delay: index * 0.05 }}
                            >
                                <Card
                                    className="flex flex-col h-full cursor-pointer rounded-2xl border bg-card/50 hover:bg-card/80 transition-all duration-300 hover:shadow-lg backdrop-blur-sm group"
                                    onClick={() => openProject(project)}
                                >
                                    <CardHeader className="px-5 pt-5 pb-3 space-y-0">
                                        <div className="mb-3">
                                            <Badge variant="secondary" className="rounded-full px-2.5 py-0.5 text-xs font-semibold uppercase tracking-wide">
                                                {project.highlight || 'Project'}
                                            </Badge>
                                        </div>
                                        <CardTitle className="text-lg font-semibold tracking-tight leading-snug group-hover:text-primary transition-colors">
                                            {project.title}
                                        </CardTitle>
                                        <div className="flex items-center gap-2 pt-2">
                                            <div className="flex items-center justify-center w-6 h-6 rounded-full border bg-background/50 shrink-0">
                                                <Rocket className="h-3 w-3 text-primary opacity-70" />
                                            </div>
                                            <span className="text-xs text-muted-foreground font-medium">
                                                {project.tech?.[0] ?? 'Dev Project'}
                                            </span>
                                            {project.links?.live && (
                                                <>
                                                    <span className="text-muted-foreground/40 text-xs">·</span>
                                                    <span className="text-xs text-muted-foreground">Live</span>
                                                </>
                                            )}
                                        </div>
                                        <CardDescription className="text-sm pt-3 line-clamp-2 leading-relaxed">
                                            {project.description}
                                        </CardDescription>
                                    </CardHeader>
                                    <CardFooter className="mt-auto px-5 pb-5 pt-3 border-t flex items-center justify-between gap-3">
                                        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                                            <FolderCode className="h-3.5 w-3.5" />
                                            <span>{project.tech?.length ?? 0} technologies</span>
                                        </div>
                                        <div className="flex items-center gap-1.5 flex-wrap justify-end">
                                            {project.tech?.slice(0, 2).map((t) => (
                                                <Badge key={t} variant="outline" className="rounded-full px-2 py-0 text-xs">
                                                    {t}
                                                </Badge>
                                            ))}
                                            {(project.tech?.length ?? 0) > 2 && (
                                                <span className="text-xs text-muted-foreground">+{(project.tech?.length ?? 0) - 2}</span>
                                            )}
                                        </div>
                                    </CardFooter>
                                </Card>
                            </motion.div>
                        ))}
                    </div>
                </div>
            </main>

            <Dialog open={!!selectedProject} onOpenChange={(open) => !open && closeProject()}>
                <DialogContent className="max-h-[85vh] rounded-3xl border bg-card/90 p-0 backdrop-blur-xl overflow-hidden sm:max-w-[calc(100vw-2rem)] md:max-w-[80vw] lg:max-w-[65vw] xl:max-w-[50vw]">
                    <div className="flex max-h-[85vh] flex-col">
                    <div className="flex-1 overflow-y-auto p-10 space-y-8">
                        <DialogHeader>
                            <div className="flex items-center gap-3 mb-4">
                                <Badge variant="secondary" className="rounded-full">
                                    {selectedProject?.highlight || 'Project'}
                                </Badge>
                                <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Project Details</span>
                            </div>
                        <DialogTitle className="text-3xl font-bold tracking-tight">{selectedProject?.title}</DialogTitle>
                            {hasScreenshots && activeScreenshot && (
                                <div className="pt-6 space-y-3">
                                    <div className="relative rounded-2xl border border-border bg-muted/40 p-3 sm:p-4">
                                        <div
                                            className="relative aspect-[16/9] w-full overflow-hidden rounded-xl"
                                            onTouchStart={(event) => {
                                                const touchX = event.changedTouches[0]?.clientX;
                                                if (typeof touchX !== 'number') return;
                                                event.currentTarget.dataset.touchStartX = String(touchX);
                                            }}
                                            onTouchEnd={(event) => {
                                                const touchX = event.changedTouches[0]?.clientX;
                                                const startXRaw = event.currentTarget.dataset.touchStartX;
                                                if (typeof touchX !== 'number' || !startXRaw) return;

                                                const startX = Number(startXRaw);
                                                const deltaX = touchX - startX;

                                                if (Math.abs(deltaX) < swipeThreshold) return;
                                                if (deltaX > 0) {
                                                    goToPreviousSlide();
                                                } else {
                                                    goToNextSlide();
                                                }
                                            }}
                                        >
                                            <Image
                                                src={activeScreenshot}
                                                alt={`${selectedProject?.title ?? 'Project'} screenshot ${slideIndex + 1}`}
                                                fill
                                                sizes="(max-width: 1024px) 100vw, 65vw"
                                                className="object-cover"
                                            />
                                        </div>
                                        {screenshots.length > 1 && (
                                            <>
                                                <Button
                                                    type="button"
                                                    variant="secondary"
                                                    size="icon"
                                                    className="absolute left-2 top-1/2 z-10 h-9 w-9 -translate-y-1/2 rounded-full border bg-background/80 backdrop-blur"
                                                    onClick={goToPreviousSlide}
                                                    aria-label="Previous slide"
                                                >
                                                    <ChevronLeft className="h-4 w-4" />
                                                </Button>
                                                <Button
                                                    type="button"
                                                    variant="secondary"
                                                    size="icon"
                                                    className="absolute right-2 top-1/2 z-10 h-9 w-9 -translate-y-1/2 rounded-full border bg-background/80 backdrop-blur"
                                                    onClick={goToNextSlide}
                                                    aria-label="Next slide"
                                                >
                                                    <ChevronRight className="h-4 w-4" />
                                                </Button>
                                            </>
                                        )}
                                    </div>
                                </div>
                            )}
                            <div className="pt-6">
                                <article className="prose prose-neutral dark:prose-invert max-w-none text-foreground/80">
                                    <ReactMarkdown remarkPlugins={[remarkGfm]}>
                                        {selectedProject?.details || ''}
                                    </ReactMarkdown>
                                </article>
                            </div>
                        </DialogHeader>

                        <div className="pt-8 border-t">
                            <div className="flex flex-wrap gap-2">
                                {selectedProject?.tech?.map((tech) => (
                                    <Badge key={tech} variant="outline" className="rounded-full">
                                        {tech}
                                    </Badge>
                                ))}
                            </div>
                        </div>
                    </div>
                    <div className="border-t bg-card/95 px-5 pb-5 pt-4 backdrop-blur supports-[backdrop-filter]:bg-card/80 sm:px-8 sm:pb-6 md:px-10">
                        <div className="flex justify-center">
                            <div className="flex w-full flex-col gap-2 rounded-[1.5rem] border bg-background/70 p-2 sm:inline-flex sm:w-auto sm:flex-row sm:flex-wrap sm:items-center sm:rounded-full sm:p-1">
                                {selectedProject?.links?.repo && (
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        asChild
                                        className="h-10 w-full rounded-full px-4 sm:min-w-[110px] sm:w-auto"
                                    >
                                        <Link href={selectedProject.links.repo} target="_blank" rel="noreferrer">
                                            GitHub
                                        </Link>
                                    </Button>
                                )}
                                {selectedProject?.links?.live && (
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        asChild
                                        className="h-10 w-full rounded-full px-4 sm:min-w-[110px] sm:w-auto"
                                    >
                                        <Link href={selectedProject.links.live} target="_blank" rel="noreferrer">
                                            Live
                                        </Link>
                                    </Button>
                                )}
                                <Button
                                    size="sm"
                                    className="h-10 w-full rounded-full px-4 sm:min-w-[110px] sm:w-auto"
                                    onClick={goToContactWithRef}
                                >
                                    <Send className="mr-2 h-4 w-4" />
                                    Contact
                                </Button>
                            </div>
                        </div>
                    </div>
                    </div>
                </DialogContent>
            </Dialog>
        </motion.div>
    );
}

export default function ProjectsPage() {
    return (
        <Suspense>
            <ProjectsPageContent />
        </Suspense>
    );
}

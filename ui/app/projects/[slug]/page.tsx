import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft, ExternalLink, FolderCode, Github, Mail, Rocket } from 'lucide-react';

import { projects } from '@/data/projects';
import { buildMetadata } from '@/lib/seo';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { MarkdownRenderer } from '@/components/blog/MarkdownRenderer';
import { VisualFallback } from '@/components/visual-fallback';

type ProjectPageProps = {
    params: Promise<{ slug: string }>;
};

export const dynamicParams = false;

export function generateStaticParams() {
    return projects.map((project) => ({ slug: project.slug }));
}

export async function generateMetadata({ params }: ProjectPageProps): Promise<Metadata> {
    const { slug } = await params;
    const project = projects.find((item) => item.slug === slug);

    if (!project) {
        return buildMetadata({
            title: 'Project not found',
            description: 'The requested project could not be found.',
            canonicalPath: `/projects/${slug}`,
            noIndex: true,
        });
    }

    return buildMetadata({
        title: project.title,
        description: project.description,
        tags: ['project', 'engineering portfolio', ...(project.tech ?? [])],
        image: project.coverImage || project.screenshots[0],
        canonicalPath: `/projects/${project.slug}`,
    });
}

export default async function ProjectDetailPage({ params }: ProjectPageProps) {
    const { slug } = await params;
    const project = projects.find((item) => item.slug === slug);

    if (!project) notFound();

    const images = project.screenshots.length
        ? project.screenshots
        : project.coverImage
          ? [project.coverImage]
          : [];
    const contactHref = `/contact?ref=${encodeURIComponent(`/projects/${project.slug}`)}`;

    return (
        <main className="min-h-screen bg-background/50 px-4 pb-16 pt-10 sm:px-6 md:px-8 md:pb-24 md:pt-14">
            <article className="mx-auto max-w-5xl">
                <Button asChild variant="ghost" className="mb-6 rounded-full px-4">
                    <Link href="/projects">
                        <ArrowLeft className="mr-2 h-4 w-4" />
                        All projects
                    </Link>
                </Button>

                <header className="overflow-hidden rounded-3xl border bg-card/60 shadow-sm backdrop-blur-sm">
                    <div className="p-6 sm:p-8 md:p-10">
                        <Badge variant="secondary" className="rounded-full px-3 py-1">
                            <FolderCode className="mr-2 h-3.5 w-3.5" />
                            {project.highlight || 'Project'}
                        </Badge>
                        <h1 className="mt-5 text-balance text-3xl font-bold tracking-tight sm:text-4xl md:text-5xl">
                            {project.title}
                        </h1>
                        <p className="mt-4 max-w-3xl text-base leading-relaxed text-muted-foreground sm:text-lg">
                            {project.description}
                        </p>

                        <div className="mt-6 flex flex-wrap gap-2">
                            {project.tech?.map((technology) => (
                                <Badge key={technology} variant="outline" className="rounded-full">
                                    {technology}
                                </Badge>
                            ))}
                        </div>

                        <div className="mt-7 flex flex-wrap gap-3">
                            {project.links?.repo ? (
                                <Button asChild variant="outline" className="rounded-full px-5">
                                    <Link href={project.links.repo} target="_blank" rel="noreferrer">
                                        <Github className="mr-2 h-4 w-4" />
                                        Repository
                                    </Link>
                                </Button>
                            ) : null}
                            {project.links?.live ? (
                                <Button asChild variant="outline" className="rounded-full px-5">
                                    <Link href={project.links.live} target="_blank" rel="noreferrer">
                                        <ExternalLink className="mr-2 h-4 w-4" />
                                        Live project
                                    </Link>
                                </Button>
                            ) : null}
                            <Button asChild className="rounded-full px-5">
                                <Link href={contactHref}>
                                    <Mail className="mr-2 h-4 w-4" />
                                    Ask about this project
                                </Link>
                            </Button>
                        </div>
                    </div>

                    {images[0] ? (
                        <div className="relative aspect-[16/8] border-t bg-muted/30">
                            <Image
                                src={images[0]}
                                alt={`${project.title} screenshot`}
                                fill
                                priority
                                loading="eager"
                                sizes="(max-width: 1024px) 100vw, 1024px"
                                className="object-cover"
                            />
                        </div>
                    ) : (
                        <VisualFallback
                            kind="project"
                            title={project.title}
                            eyebrow={project.highlight || 'Project'}
                            icon={Rocket}
                            className="min-h-72 border-t"
                        />
                    )}
                </header>

                <div className="mt-8 grid gap-8 lg:grid-cols-[minmax(0,1fr)_15rem] lg:items-start">
                    <section className="min-w-0 rounded-3xl border bg-card/55 p-6 sm:p-8 md:p-10">
                        <MarkdownRenderer content={project.details || project.description} />
                    </section>

                    <aside className="rounded-3xl border bg-card/55 p-5 lg:sticky lg:top-24">
                        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">Project links</p>
                        <div className="mt-4 space-y-2 text-sm">
                            {project.links?.repo ? (
                                <Link className="flex items-center justify-between rounded-xl px-3 py-2 hover:bg-accent" href={project.links.repo} target="_blank" rel="noreferrer">
                                    Repository <ExternalLink className="h-3.5 w-3.5" />
                                </Link>
                            ) : null}
                            {project.links?.live ? (
                                <Link className="flex items-center justify-between rounded-xl px-3 py-2 hover:bg-accent" href={project.links.live} target="_blank" rel="noreferrer">
                                    Live project <ExternalLink className="h-3.5 w-3.5" />
                                </Link>
                            ) : null}
                            {!project.links?.repo && !project.links?.live ? (
                                <p className="rounded-xl bg-muted/45 px-3 py-2 text-muted-foreground">
                                    No public repository or demo is available.
                                </p>
                            ) : null}
                            <Link className="flex items-center justify-between rounded-xl px-3 py-2 hover:bg-accent" href={contactHref}>
                                Contact <Mail className="h-3.5 w-3.5" />
                            </Link>
                        </div>
                    </aside>
                </div>

                {images.length > 1 ? (
                    <section className="mt-8">
                        <h2 className="text-2xl font-semibold tracking-tight">More screenshots</h2>
                        <div className="mt-4 grid gap-4 sm:grid-cols-2">
                            {images.slice(1).map((image, index) => (
                                <div key={image} className="relative aspect-video overflow-hidden rounded-2xl border bg-muted/30">
                                    <Image
                                        src={image}
                                        alt={`${project.title} screenshot ${index + 2}`}
                                        fill
                                        sizes="(max-width: 640px) 100vw, 50vw"
                                        className="object-cover"
                                    />
                                </div>
                            ))}
                        </div>
                    </section>
                ) : null}
            </article>
        </main>
    );
}

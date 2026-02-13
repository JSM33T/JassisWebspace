'use client';

import Link from 'next/link';
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
import { FolderCode, ArrowLeft, MoveUpRight, Rocket, Send } from 'lucide-react';

const projects = [
    {
        id: 'ecommerce-analytics-dashboard',
        title: 'E-commerce Analytics Dashboard',
        description: 'Real-time sales, inventory, and campaign tracking for multi-store retail operations.',
        details: 'Built with Next.js and PostgreSQL to unify order data, ad spend, and customer cohorts.\n\n### Highlights\n- Real-time KPI tracking\n- Multi-store aggregation\n- Campaign attribution insights\n\n![Analytics preview](/globe.svg)',
        status: 'Live',
        stack: ['Next.js', 'PostgreSQL', 'Redis'],
    },
    {
        id: 'fleet-iot-monitoring-platform',
        title: 'Fleet IoT Monitoring Platform',
        description: 'Connected dashboard for GPS telemetry, route optimization, and predictive maintenance alerts.',
        details: 'Integrated sensor streams with a low-latency event pipeline and operator-focused control center UX.\n\n### Highlights\n- Route deviation alerts\n- Predictive maintenance windows\n- Live fleet health map',
        status: 'Live',
        stack: ['React', 'Node.js', 'Kafka'],
    },
    {
        id: 'ai-support-assistant',
        title: 'AI Support Assistant',
        description: 'Context-aware support copilot with retrieval pipelines for internal knowledge bases.',
        details: 'Implemented hybrid search and workflow guardrails to improve answer quality and reduce escalations.\n\n### Highlights\n- RAG with internal docs\n- Escalation confidence scoring\n- Human handoff workflows',
        status: 'In Progress',
        stack: ['OpenAI', 'LangChain', 'Vector DB'],
    },
];

export default function ProjectsPage() {
    const router = useRouter();
    const pathname = usePathname();
    const searchParams = useSearchParams();
    const selectedProject =
        projects.find((project) => project.id === searchParams.get('project')) || null;

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
        setProjectParam(project.id);
    };

    const closeProject = () => {
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
                <div className="absolute bottom-[-10%] left-[-10%] w-[500px] h-[500px] rounded-full bg-blue-500/5 blur-[120px]" />
            </div>

            <section className="px-4 py-8 md:py-12 border-b bg-muted/30 backdrop-blur-sm">
                <div className="container mx-auto max-w-7xl pt-16">
                    <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                        <div className="space-y-3">
                            <Badge variant="secondary" className="px-4 py-1.5 rounded-full text-sm font-normal backdrop-blur-sm bg-background/50 border-border/50 gap-2 w-fit">
                                <FolderCode className="h-3.5 w-3.5 text-primary" />
                                <span>Portfolio</span>
                            </Badge>
                            <h1 className="text-4xl md:text-5xl font-bold tracking-tight">Projects</h1>
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

            <section className="flex-1 px-4 py-12">
                <div className="container mx-auto max-w-7xl">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {projects.map((project, index) => (
                            <motion.div
                                key={project.title}
                                initial={{ opacity: 0, scale: 0.95 }}
                                animate={{ opacity: 1, scale: 1 }}
                                transition={{ duration: 0.3, delay: index * 0.05 }}
                            >
                                <Card
                                    className="flex flex-col h-full cursor-pointer rounded-3xl border bg-card/50 hover:bg-card/80 transition-all duration-300 hover:shadow-lg backdrop-blur-sm group"
                                    onClick={() => openProject(project)}
                                >
                                    <CardHeader className="p-8">
                                        <div className="flex items-start justify-between gap-4 mb-4">
                                            <div className="p-3 rounded-2xl border bg-background/50 group-hover:scale-110 transition-transform">
                                                <Rocket className="h-5 w-5 text-primary opacity-70" />
                                            </div>
                                            <Badge variant={project.status === 'Live' ? 'default' : 'secondary'} className="rounded-full px-3">
                                                {project.status}
                                            </Badge>
                                        </div>
                                        <CardTitle className="text-xl font-medium tracking-tight group-hover:text-primary transition-colors">
                                            {project.title}
                                        </CardTitle>
                                        <CardDescription className="text-sm pt-2 line-clamp-2 leading-relaxed">
                                            {project.description}
                                        </CardDescription>
                                    </CardHeader>
                                    <CardFooter className="mt-auto px-8 pb-8 pt-0 flex items-center justify-between gap-3">
                                        <div className="text-sm font-medium text-muted-foreground group-hover:text-primary transition-colors">
                                            View Project
                                        </div>
                                        <MoveUpRight className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
                                    </CardFooter>
                                </Card>
                            </motion.div>
                        ))}
                    </div>
                </div>
            </section>

            <Dialog open={!!selectedProject} onOpenChange={(open) => !open && closeProject()}>
                <DialogContent className="sm:max-w-[50vw] max-h-[85vh] rounded-3xl border bg-card/90 backdrop-blur-xl p-0 overflow-hidden">
                    <div className="p-10 space-y-8 overflow-y-auto max-h-[85vh]">
                        <DialogHeader>
                            <div className="flex items-center gap-3 mb-4">
                                <Badge variant={selectedProject?.status === 'Live' ? 'default' : 'secondary'} className="rounded-full">
                                    {selectedProject?.status}
                                </Badge>
                                <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Project Details</span>
                            </div>
                            <DialogTitle className="text-3xl font-bold tracking-tight">{selectedProject?.title}</DialogTitle>
                            <div className="pt-6">
                                <article className="prose prose-neutral dark:prose-invert max-w-none text-foreground/80">
                                    <ReactMarkdown remarkPlugins={[remarkGfm]}>
                                        {selectedProject?.details || ''}
                                    </ReactMarkdown>
                                </article>
                            </div>
                        </DialogHeader>

                        <div className="pt-8 border-t flex flex-col gap-6">
                            <div className="flex flex-wrap gap-2">
                                {selectedProject?.stack.map((tech) => (
                                    <Badge key={tech} variant="outline" className="rounded-full">
                                        {tech}
                                    </Badge>
                                ))}
                            </div>
                            <div className="flex items-center justify-end gap-3">
                                <Button variant="ghost" className="rounded-full px-8" onClick={closeProject}>
                                    Close
                                </Button>
                                <Button className="rounded-full px-10 h-12 text-base" onClick={goToContactWithRef}>
                                    <Send className="mr-2 h-4 w-4" />
                                    Start Similar Project
                                </Button>
                            </div>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>
        </motion.div>
    );
}

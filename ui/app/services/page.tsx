'use client';

import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { motion } from 'framer-motion';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Briefcase, Send, Info } from 'lucide-react';
import { ContentRail } from '@/components/content-rail';
import { PageBanner } from '@/components/page-banner';
import { SectionHeader } from '@/components/section-header';
import { VisualFallback } from '@/components/visual-fallback';

type ServiceStatus = 'Active' | 'Inactive';

type Service = {
    title: string;
    description: string;
    details: string;
    status: ServiceStatus;
    proof?: string;
};

const services: Service[] = [
    {
        "title": "Web Development",
        "description": "Custom Next.js and React applications built for speed, accessibility, and search engine optimization.",
        "details": "We build modern, high-performance web applications using the latest technologies.\n\n### What we offer:\n- **Responsive Design**: Perfect viewing on all devices.\n- **Accessibility**: Built for everyone.\n- **SEO Optimization**: High rankings on search engines.\n- **Tech Stack**: Next.js, React, Tailwind CSS, and more.",
        "status": "Inactive"
    },
    {
        "title": "IoT Solutions",
        "description": "End-to-end IoT implementation from sensors to cloud dashboards.",
        "details": "Our IoT services cover the entire spectrum of connected devices.\n\n- **Sensor Integration**: Hardware connectivity.\n- **Real-time Dashboards**: Interactive visualizations.\n- **Secure Data**: Industry-standard encryption.",
        "status": "Inactive"
    },
    {
        "title": "Data Scraping & Automation",
        "description": "Enterprise-grade scraping and browser automation using Playwright and Puppeteer.",
        "details": "Automate your data collection with our robust scraping solutions.\n\n- **Complex Navigation**: Handling anti-bot measures.\n- **Large-scale Extraction**: Distributed scraping architecture.\n- **Data Cleaning**: Automated QC pipelines.",
        "status": "Active",
        "proof": "Playwright and Puppeteer automation for complex navigation, extraction, and cleanup workflows."
    },
    {
        "title": "DevOps & Deployments",
        "description": "Streamlined CI/CD pipelines, containerization, and infrastructure scaling.",
        "details": "Optimize your deployment workflow with our DevOps expertise.\n\n- **CI/CD**: GitHub Actions, Jenkins.\n- **Containerization**: Docker, Orchestration.\n- **Observability**: Monitoring and Logging.",
        "status": "Inactive"
    },
    {
        "title": "Custom Tools & SDKs",
        "description": "Workflow utilities, internal dashboards, and custom CLI/SDK development.",
        "details": "Boost your team's productivity with custom-built tools.\n\n- **CLI Utilities**: Automate local workflows.\n- **Internal Dashboards**: Manage your data visually.\n- **Tailored SDKs**: Integration made easy.",
        "status": "Inactive"
    },
    {
        "title": "MS Office Plugins",
        "description": "Advanced Excel and Word add-ins with external data integration.",
        "details": "Extend the functionality of Microsoft Office with our custom plugins.\n\n- **Excel Automation**: Complex calculation engines.\n- **External Linkage**: Sync documents with your database.",
        "status": "Inactive"
    },
    {
        "title": "AI/ML Products",
        "description": "Modern AI integration with RAG, vector databases, and semantic search.",
        "details": "Leverage the power of AI in your products.\n\n- **LLM Integration**: OpenAI, Anthropic, etc.\n- **RAG Architecture**: Smart retrieval from your docs.\n- **Vector Databases**: Pinecone, Milvus, etc.",
        "status": "Inactive"
    },
    {
        "title": "Computer Vision (OpenCV)",
        "description": "Object detection, OCR, and quality control pipelines for visual data.",
        "details": "Automate visual inspections and data extraction with computer vision.\n\n- **Object Detection**: YOLO, Faster R-CNN.\n- **OCR**: Extracting text from images accurately.",
        "status": "Inactive"
    },
    {
        "title": "Intelligent Chatbots",
        "description": "Advanced hybrid chatbots with OpenAI integration and easy deployment.",
        "details": "Engage your users with intelligent, responsive chatbots.\n\n- **Hybrid Approach**: Logic + AI.\n- **Multi-channel**: Slack, WhatsApp, Web.",
        "status": "Active",
        "proof": "Hybrid logic and AI assistants for web, Slack, WhatsApp, and support-style workflows."
    },
    {
        "title": "Data Analytics",
        "description": "Comprehensive ETL processes and interactive visual reporting.",
        "details": "Turn your data into actionable insights.\n\n- **ETL Processes**: Transform messy data into clean info.\n- **Interactive Reporting**: D3.js, Chart.js visualizations.",
        "status": "Inactive"
    },
    {
        "title": "Creative Portfolios",
        "description": "Elegant and dynamic showcases for artists and professionals.",
        "details": "Stand out with a stunning digital portfolio.\n\n- **Animations**: Smooth transitions.\n- **Media Galleries**: High-quality visual displays.",
        "status": "Active",
        "proof": "Polished personal showcases with animation, media galleries, and responsive presentation."
    },
    {
        "title": "C# Architecture Consulting",
        "description": "Expert guidance on .NET system design and code structure.",
        "details": "Build robust, scalable, and maintainable .NET systems with our end-to-end architecture consulting services.\n\n### Expertise Areas:\n- **Clean Architecture & DDD**: Proven patterns for success.\n- **High-level System Design**: Microservices vs. Monolith.\n- **Performance & Scaling**: Redis, database tuning, and caching.\n- **Modernization**: Cloud adoption and legacy migrations.\n\nFrom initial planning to optimization, we help you build resilient solutions.",
        "status": "Active",
        "proof": "Architecture reviews focused on clean boundaries, system design, scaling, and modernization."
    }
];

export default function ServicesPage() {
    const router = useRouter();
    const pathname = usePathname();
    const searchParams = useSearchParams();

    const serviceSlug = (title: string) =>
        title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');

    const setServiceParam = (slug: string | null) => {
        const params = new URLSearchParams(searchParams.toString());
        if (slug) {
            params.set('service', slug);
        } else {
            params.delete('service');
        }
        const query = params.toString();
        router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
    };

    const openService = (service: Service) => {
        setServiceParam(serviceSlug(service.title));
    };

    const closeService = () => {
        setServiceParam(null);
    };

    const goToContactWithRef = () => {
        if (typeof window === 'undefined') {
            router.push('/contact');
            return;
        }
        router.push(`/contact?ref=${encodeURIComponent(window.location.href)}`);
    };

    const selectedService =
        services.find((service) => serviceSlug(service.title) === searchParams.get('service')) || null;
    const activeServices = services.filter((service) => service.status === 'Active');
    const inactiveServices = services.filter((service) => service.status !== 'Active');

    return (
        <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: "easeOut" }}
            className="flex flex-col min-h-screen bg-background/50"
        >
            <PageBanner
                badge="Our Solutions"
                badgeIcon={Briefcase}
                title="Services"
                description="Explore my technical expertise and professional offerings."
                maxWidth="max-w-7xl"
            />

            <main className="flex-1 px-4 pb-14 pt-8 md:px-8 md:pb-16 md:pt-10">
                <div className="mx-auto max-w-7xl pt-4">
                    <ContentRail
                        header={
                            <SectionHeader
                                eyebrow="Active Services"
                                title="Focused offers ready for real scopes."
                                description="Production-minded support across automation, AI workflows, creative web, and .NET architecture."
                            />
                        }
                        className="pb-12 md:pb-16"
                    >
                        <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-4">
                            {activeServices.map((service, index) => (
                                <motion.div
                                    key={service.title}
                                    initial={{ opacity: 0, scale: 0.95 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    transition={{ duration: 0.3, delay: index * 0.05 }}
                                >
                                    <Card
                                        className="group flex h-full cursor-pointer rounded-3xl border border-primary/20 bg-card/55 transition-all duration-300 hover:-translate-y-0.5 hover:bg-card/85 hover:shadow-lg"
                                        onClick={() => openService(service)}
                                    >
                                        <CardHeader className="space-y-0 p-4">
                                            <div className="relative mb-4 overflow-hidden rounded-2xl border bg-muted/35">
                                                <VisualFallback
                                                    kind="service"
                                                    title={service.title}
                                                    eyebrow={service.status}
                                                    icon={Briefcase}
                                                    className="aspect-[16/10] min-h-0"
                                                />
                                            </div>
                                            <div className="mb-3 flex items-center justify-between gap-3">
                                                <Badge variant="default" className="rounded-full px-3">
                                                    {service.status}
                                                </Badge>
                                                <span className="flex h-9 w-9 items-center justify-center rounded-full border bg-background/60 text-muted-foreground transition-colors group-hover:text-foreground">
                                                    <Briefcase className="h-4 w-4" />
                                                </span>
                                            </div>
                                            <CardTitle className="text-lg font-semibold tracking-tight transition-colors group-hover:text-primary">
                                                {service.title}
                                            </CardTitle>
                                            <CardDescription className="line-clamp-2 pt-2 text-sm leading-relaxed">
                                                {service.description}
                                            </CardDescription>
                                        </CardHeader>
                                        <CardContent className="mt-auto px-4">
                                            <div className="rounded-2xl border bg-background/55 px-4 py-3">
                                                <p className="mb-1 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                                                    Delivery focus
                                                </p>
                                                <p className="line-clamp-3 text-sm leading-relaxed text-foreground/80">
                                                    {service.proof}
                                                </p>
                                            </div>
                                        </CardContent>
                                        <CardFooter className="px-4 pb-4 pt-4">
                                            <div className="flex items-center text-sm font-medium text-muted-foreground transition-colors group-hover:text-primary">
                                                View Details
                                                <Info className="ml-2 h-4 w-4" />
                                            </div>
                                        </CardFooter>
                                    </Card>
                                </motion.div>
                            ))}
                        </div>
                    </ContentRail>

                    <ContentRail
                        header={
                            <SectionHeader
                                eyebrow="More Capabilities"
                                title="Available as scoped work when needed."
                                description="Specialized areas that can be scoped for the right project."
                            />
                        }
                        className="pb-0"
                    >
                        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
                            {inactiveServices.map((service, index) => (
                                <motion.div
                                    key={service.title}
                                    initial={{ opacity: 0, y: 12 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ duration: 0.25, delay: index * 0.03 }}
                                >
                                    <button
                                        type="button"
                                        className="group flex h-full w-full flex-col rounded-2xl border bg-card/35 p-4 text-left opacity-85 transition-all duration-300 hover:-translate-y-0.5 hover:bg-card/65 hover:opacity-100"
                                        onClick={() => openService(service)}
                                    >
                                        <div className="mb-4 flex items-center justify-between gap-3">
                                            <span className="flex h-10 w-10 items-center justify-center rounded-2xl border bg-background/55 text-muted-foreground transition-colors group-hover:text-foreground">
                                                <Briefcase className="h-4 w-4" />
                                            </span>
                                            <Badge variant="secondary" className="rounded-full px-3">
                                                {service.status}
                                            </Badge>
                                        </div>
                                        <h3 className="text-base font-semibold tracking-tight group-hover:text-primary">
                                            {service.title}
                                        </h3>
                                        <p className="mt-2 line-clamp-2 text-sm leading-relaxed text-muted-foreground">
                                            {service.description}
                                        </p>
                                    </button>
                                </motion.div>
                            ))}
                        </div>
                    </ContentRail>
                </div>
            </main>

            {/* Service Details Dialog */}
            <Dialog open={!!selectedService} onOpenChange={(open) => !open && closeService()}>
                <DialogContent className="w-[calc(100%-1rem)] max-w-[calc(100%-1rem)] rounded-3xl border bg-card/90 p-0 overflow-hidden backdrop-blur-xl sm:max-w-2xl lg:max-w-[50vw]">
                    <div className="space-y-6 p-5 sm:p-8 md:space-y-8 md:p-10">
                        <DialogHeader>
                            <div className="mb-4 flex items-center gap-3">
                                <Badge variant={selectedService?.status === 'Active' ? 'default' : 'secondary'} className="rounded-full">
                                    {selectedService?.status}
                                </Badge>
                                <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Service Details</span>
                            </div>
                            <DialogTitle className="text-2xl font-bold tracking-tight sm:text-3xl">{selectedService?.title}</DialogTitle>
                            <DialogDescription className="sr-only">
                                {selectedService?.description || 'Service details and availability.'}
                            </DialogDescription>
                            <div className="pt-4 sm:pt-6">
                                <article className="prose prose-neutral dark:prose-invert max-w-none text-foreground/80">
                                    <ReactMarkdown remarkPlugins={[remarkGfm]}>
                                        {selectedService?.details || ""}
                                    </ReactMarkdown>
                                </article>
                            </div>
                        </DialogHeader>
                        <div className="flex flex-col gap-5 border-t pt-6 sm:gap-6 sm:pt-8">
                            <div className="text-sm text-muted-foreground italic">
                                {selectedService?.status === 'Active'
                                    ? "Currently accepting new projects."
                                    : "Check back later for availability."
                                }
                            </div>
                            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-end">
                                <Button variant="ghost" className="w-full rounded-full px-6 sm:w-auto sm:px-8" onClick={closeService}>
                                    Close
                                </Button>
                                <Button className="h-12 w-full rounded-full px-6 text-base sm:w-auto sm:px-10" onClick={goToContactWithRef}>
                                    <Send className="mr-2 h-4 w-4" />
                                    Enquire Now
                                </Button>
                            </div>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>
        </motion.div>
    );
}

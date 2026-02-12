'use client';

import { useState } from 'react';
import Link from 'next/link';
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
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Briefcase, ArrowLeft, Send, Info } from 'lucide-react';

const services = [
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
        "status": "Active"
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
        "status": "Active"
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
        "status": "Active"
    },
    {
        "title": "C# Architecture Consulting",
        "description": "Expert guidance on .NET system design and code structure.",
        "details": "Build robust, scalable, and maintainable .NET systems with our end-to-end architecture consulting services.\n\n### Expertise Areas:\n- **Clean Architecture & DDD**: Proven patterns for success.\n- **High-level System Design**: Microservices vs. Monolith.\n- **Performance & Scaling**: Redis, database tuning, and caching.\n- **Modernization**: Cloud adoption and legacy migrations.\n\nFrom initial planning to optimization, we help you build resilient solutions.",
        "status": "Active"
    }
];

export default function ServicesPage() {
    const [selectedService, setSelectedService] = useState<typeof services[0] | null>(null);

    return (
        <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: "easeOut" }}
            className="flex flex-col min-h-screen bg-background/50"
        >
            {/* Ambient Background Glow (Same as homepage) */}
            <div className="fixed inset-0 z-[-1] pointer-events-none">
                <div className="absolute top-[-10%] left-1/2 -translate-x-1/2 w-[600px] h-[600px] rounded-full bg-primary/5 blur-[120px]" />
                <div className="absolute bottom-[-10%] left-[-10%] w-[500px] h-[500px] rounded-full bg-blue-500/5 blur-[120px]" />
            </div>

            {/* Header */}
            <section className="px-4 py-8 md:py-12 border-b bg-muted/30 backdrop-blur-sm">
                <div className="container mx-auto max-w-7xl pt-16">
                    <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                        <div className="space-y-3">
                            <Badge variant="secondary" className="px-4 py-1.5 rounded-full text-sm font-normal backdrop-blur-sm bg-background/50 border-border/50 gap-2 w-fit">
                                <Briefcase className="h-3.5 w-3.5 text-primary" />
                                <span>Our Solutions</span>
                            </Badge>
                            <h1 className="text-4xl md:text-5xl font-bold tracking-tight">
                                Services
                            </h1>
                            <p className="text-lg text-muted-foreground max-w-2xl">
                                Explore our technical expertise and professional offerings.
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

            {/* Services Grid */}
            <section className="flex-1 px-4 py-12">
                <div className="container mx-auto max-w-7xl">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {services.map((service, index) => (
                            <motion.div
                                key={index}
                                initial={{ opacity: 0, scale: 0.95 }}
                                animate={{ opacity: 1, scale: 1 }}
                                transition={{ duration: 0.3, delay: index * 0.05 }}
                            >
                                <Card
                                    className={`flex flex-col h-full cursor-pointer rounded-3xl border bg-card/50 hover:bg-card/80 transition-all duration-300 hover:shadow-lg backdrop-blur-sm group ${service.status === 'Active' ? 'border-primary/20' : 'opacity-80'}`}
                                    onClick={() => setSelectedService(service)}
                                >
                                    <CardHeader className="p-8">
                                        <div className="flex items-start justify-between gap-4 mb-4">
                                            <div className="p-3 rounded-2xl border bg-background/50 group-hover:scale-110 transition-transform">
                                                <Briefcase className="h-5 w-5 text-primary opacity-70" />
                                            </div>
                                            <Badge variant={service.status === 'Active' ? 'default' : 'secondary'} className="rounded-full px-3">
                                                {service.status}
                                            </Badge>
                                        </div>
                                        <CardTitle className="text-xl font-medium tracking-tight group-hover:text-primary transition-colors">{service.title}</CardTitle>
                                        <CardDescription className="text-sm pt-2 line-clamp-2 leading-relaxed">
                                            {service.description}
                                        </CardDescription>
                                    </CardHeader>
                                    <CardFooter className="mt-auto px-8 pb-8 pt-0">
                                        <div className="flex items-center text-sm font-medium text-muted-foreground group-hover:text-primary transition-colors">
                                            View Details
                                            <Info className="ml-2 h-4 w-4" />
                                        </div>
                                    </CardFooter>
                                </Card>
                            </motion.div>
                        ))}
                    </div>
                </div>
            </section>

            {/* Service Details Dialog */}
            <Dialog open={!!selectedService} onOpenChange={(open) => !open && setSelectedService(null)}>
                <DialogContent className="sm:max-w-[50vw] rounded-3xl border bg-card/90 backdrop-blur-xl p-0 overflow-hidden">
                    <div className="p-10 space-y-8">
                        <DialogHeader>
                            <div className="flex items-center gap-3 mb-4">
                                <Badge variant={selectedService?.status === 'Active' ? 'default' : 'secondary'} className="rounded-full">
                                    {selectedService?.status}
                                </Badge>
                                <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Service Details</span>
                            </div>
                            <DialogTitle className="text-3xl font-bold tracking-tight">{selectedService?.title}</DialogTitle>
                            <div className="pt-6">
                                <article className="prose prose-neutral dark:prose-invert max-w-none text-foreground/80">
                                    <ReactMarkdown remarkPlugins={[remarkGfm]}>
                                        {selectedService?.details || ""}
                                    </ReactMarkdown>
                                </article>
                            </div>
                        </DialogHeader>
                        <div className="pt-8 border-t flex flex-col gap-6">
                            <div className="text-sm text-muted-foreground italic">
                                {selectedService?.status === 'Active'
                                    ? "Currently accepting new projects."
                                    : "Check back later for availability."
                                }
                            </div>
                            <div className="flex items-center justify-end gap-3">
                                <Button variant="ghost" className="rounded-full px-8" onClick={() => setSelectedService(null)}>
                                    Close
                                </Button>
                                <Button className="rounded-full px-10 h-12 text-base" asChild>
                                    <Link href="/contact">
                                        <Send className="mr-2 h-4 w-4" />
                                        Enquire Now
                                    </Link>
                                </Button>
                            </div>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>
        </motion.div>
    );
}

'use client';

import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { motion } from 'framer-motion';
import { ArrowUpRight, Briefcase, Check, Info, Send } from 'lucide-react';

import { ContentRail } from '@/components/content-rail';
import { PageBanner } from '@/components/page-banner';
import { SectionHeader } from '@/components/section-header';
import { VisualFallback } from '@/components/visual-fallback';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
    availableServices,
    getServiceBySlug,
    getServiceEnquiryHref,
    unavailableServices,
    type Service,
} from '@/data/services';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';

export default function ServicesPage() {
    const router = useRouter();
    const pathname = usePathname();
    const searchParams = useSearchParams();
    const selectedService = getServiceBySlug(searchParams.get('service'));

    const setServiceParam = (slug: string | null) => {
        const params = new URLSearchParams(searchParams.toString());
        if (slug) params.set('service', slug);
        else params.delete('service');
        const query = params.toString();
        router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
    };

    return (
        <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: 'easeOut' }}
            className="flex min-h-screen flex-col bg-background/50"
        >
            <PageBanner
                badge="Services"
                badgeIcon={Briefcase}
                title="Focused engineering support"
                description="I take on bounded automation, AI assistant, portfolio, and .NET architecture work with a clear scope and next step."
                maxWidth="max-w-7xl"
            />

            <main className="flex-1 px-4 pb-14 pt-8 md:px-8 md:pb-16 md:pt-10">
                <div className="mx-auto max-w-7xl pt-4">
                    <ContentRail
                        header={
                            <SectionHeader
                                eyebrow="Currently Available"
                                title="Choose the problem closest to yours."
                                description="Each offer states who it is for, what I can deliver, and what to send for a useful first conversation."
                            />
                        }
                        className="pb-12 md:pb-16"
                    >
                        <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-4">
                            {availableServices.map((service, index) => (
                                <motion.div
                                    key={service.slug}
                                    initial={{ opacity: 0, scale: 0.96 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    transition={{ duration: 0.3, delay: index * 0.05 }}
                                >
                                    <button
                                        type="button"
                                        data-service-availability="available"
                                        onClick={() => setServiceParam(service.slug)}
                                        className="group flex h-full w-full flex-col overflow-hidden rounded-3xl border border-primary/20 bg-card/55 p-4 text-left transition-all duration-300 hover:-translate-y-0.5 hover:bg-card/85 hover:shadow-lg focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"
                                    >
                                        <VisualFallback kind="service" title={service.title} eyebrow="Available" icon={Briefcase} className="aspect-[16/10] min-h-0 rounded-2xl border" />
                                        <div className="mt-4 flex items-center justify-between gap-3">
                                            <Badge className="rounded-full px-3">Available</Badge>
                                            <Info className="h-4 w-4 text-muted-foreground transition-colors group-hover:text-foreground" />
                                        </div>
                                        <h2 className="mt-3 text-lg font-semibold tracking-tight transition-colors group-hover:text-primary">{service.title}</h2>
                                        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{service.summary}</p>
                                        <div className="mt-4 rounded-2xl border bg-background/55 px-4 py-3">
                                            <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">Best for</p>
                                            <p className="mt-1 line-clamp-3 text-sm leading-relaxed text-foreground/80">{service.audience}</p>
                                        </div>
                                        <span className="mt-auto inline-flex items-center pt-4 text-sm font-medium">View scope <ArrowUpRight className="ml-1.5 h-4 w-4" /></span>
                                    </button>
                                </motion.div>
                            ))}
                        </div>
                    </ContentRail>

                    <ContentRail
                        header={
                            <SectionHeader
                                eyebrow="Not Currently Offered"
                                title="Capabilities outside the current service list."
                                description="These areas remain part of my experience, but I am not accepting them as standalone engagements right now."
                            />
                        }
                        className="pb-0"
                    >
                        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
                            {unavailableServices.map((service, index) => (
                                <motion.div key={service.slug} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25, delay: index * 0.03 }}>
                                    <button
                                        type="button"
                                        data-service-availability="unavailable"
                                        className="group flex h-full w-full flex-col rounded-2xl border bg-card/35 p-4 text-left transition-colors hover:bg-card/60 focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"
                                        onClick={() => setServiceParam(service.slug)}
                                    >
                                        <div className="mb-4 flex items-center justify-between gap-3">
                                            <span className="flex h-10 w-10 items-center justify-center rounded-2xl border bg-background/55 text-muted-foreground"><Briefcase className="h-4 w-4" /></span>
                                            <Badge variant="secondary" className="rounded-full px-3">Unavailable</Badge>
                                        </div>
                                        <h2 className="text-base font-semibold tracking-tight group-hover:text-primary">{service.title}</h2>
                                        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{service.summary}</p>
                                    </button>
                                </motion.div>
                            ))}
                        </div>
                    </ContentRail>
                </div>
            </main>

            <ServiceDialog service={selectedService} onClose={() => setServiceParam(null)} />
        </motion.div>
    );
}

function ServiceDialog({ service, onClose }: { service: Service | null; onClose: () => void }) {
    const available = service?.availability === 'available';

    return (
        <Dialog open={Boolean(service)} onOpenChange={(open) => !open && onClose()}>
            <DialogContent data-service-dialog className="max-h-[calc(100vh-1rem)] w-[calc(100%-1rem)] max-w-[calc(100%-1rem)] overflow-y-auto rounded-3xl border bg-card/95 p-0 backdrop-blur-xl sm:max-w-3xl">
                {service ? (
                    <div className="space-y-7 p-5 sm:p-8">
                        <DialogHeader className="text-left">
                            <div className="mb-3 flex flex-wrap items-center gap-3">
                                <Badge variant={available ? 'default' : 'secondary'} className="rounded-full px-3">
                                    {available ? 'Available' : 'Unavailable'}
                                </Badge>
                                <span className="text-sm text-muted-foreground">{service.availabilityNote}</span>
                            </div>
                            <DialogTitle className="text-2xl font-bold tracking-tight sm:text-3xl">{service.title}</DialogTitle>
                            <DialogDescription className="pt-2 text-base leading-relaxed">{service.summary}</DialogDescription>
                        </DialogHeader>

                        <div className="grid gap-5 sm:grid-cols-2">
                            <DetailBlock title="Who it is for" text={service.audience} />
                            <DetailBlock title="Problem I help solve" text={service.problem} />
                        </div>

                        {service.deliverables.length > 0 ? (
                            <section>
                                <h3 className="font-semibold">Typical deliverables</h3>
                                <ul className="mt-3 grid gap-2 sm:grid-cols-2">
                                    {service.deliverables.map((deliverable) => (
                                        <li key={deliverable} className="flex gap-2 rounded-xl border bg-background/55 px-3 py-2.5 text-sm leading-relaxed">
                                            <Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden="true" />
                                            {deliverable}
                                        </li>
                                    ))}
                                </ul>
                            </section>
                        ) : null}

                        {service.evidence.length > 0 ? (
                            <section>
                                <h3 className="font-semibold">Relevant work</h3>
                                <div className="mt-3 flex flex-wrap gap-2">
                                    {service.evidence.map((item) => (
                                        <Button key={item.href} asChild variant="outline" className="rounded-full">
                                            <Link href={item.href}>{item.label}<ArrowUpRight className="ml-2 h-4 w-4" /></Link>
                                        </Button>
                                    ))}
                                </div>
                            </section>
                        ) : null}

                        <div className="rounded-2xl border bg-background/55 p-4">
                            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Next step</p>
                            <p className="mt-2 text-sm leading-relaxed">{service.nextStep}</p>
                        </div>

                        <div className="flex flex-col gap-3 border-t pt-6 sm:flex-row sm:justify-end">
                            <Button variant="ghost" className="rounded-full px-6" onClick={onClose}>Close</Button>
                            {available ? (
                                <Button asChild className="h-11 rounded-full px-7">
                                    <Link href={getServiceEnquiryHref(service)}><Send className="mr-2 h-4 w-4" />Enquire about this service</Link>
                                </Button>
                            ) : (
                                <Button asChild variant="secondary" className="h-11 rounded-full px-7">
                                    <Link href="/contact?purpose=General+Inquiry&ref=%2Fservices">Send a general enquiry</Link>
                                </Button>
                            )}
                        </div>
                    </div>
                ) : null}
            </DialogContent>
        </Dialog>
    );
}

function DetailBlock({ title, text }: { title: string; text: string }) {
    return (
        <section className="rounded-2xl border bg-background/55 p-4">
            <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{title}</h3>
            <p className="mt-2 text-sm leading-relaxed">{text}</p>
        </section>
    );
}

'use client';

import { Suspense } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { motion } from 'framer-motion';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Activity, ArrowUpRight, Github, LinkIcon, Package, Send, Sparkles, Workflow } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { PageBanner } from '@/components/page-banner';
import { products, type Product } from '@/data/products';

const productIconMap = {
    Activity,
    Workflow,
    Link: LinkIcon,
} satisfies Record<Product['icon'], typeof Activity>;

function ProductsPageContent() {
    const router = useRouter();
    const pathname = usePathname();
    const searchParams = useSearchParams();

    const selectedProduct =
        products.find((product) => product.slug === searchParams.get('product')) || null;

    const setProductParam = (slug: string | null) => {
        const params = new URLSearchParams(searchParams.toString());
        if (slug) {
            params.set('product', slug);
        } else {
            params.delete('product');
        }
        const query = params.toString();
        router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
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
            className="flex min-h-screen flex-col bg-background/50"
        >
            <PageBanner
                badge="Product Lab"
                badgeIcon={Package}
                title="Products"
                description="Focused software products built around monitoring, link infrastructure, and intelligent automation."
                maxWidth="max-w-7xl"
                rightContent={
                    <div className="rounded-2xl border border-border/70 bg-card/70 p-4 text-sm shadow-sm backdrop-blur">
                        <div className="flex items-center gap-2 font-medium">
                            <Sparkles className="h-4 w-4 text-primary" />
                            {products.length} products
                        </div>
                        <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                            Live, private beta, and in-development product work.
                        </p>
                    </div>
                }
            />

            <main className="flex-1 px-4 pb-14 pt-8 md:px-8 md:pb-16 md:pt-10">
                <div className="mx-auto max-w-7xl pt-4">
                    <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
                        {products.map((product, index) => {
                            const Icon = productIconMap[product.icon];
                            return (
                                <motion.div
                                    key={product.slug}
                                    initial={{ opacity: 0, scale: 0.96 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    transition={{ duration: 0.3, delay: index * 0.06 }}
                                >
                                    <Card
                                        className="group flex h-full cursor-pointer rounded-3xl border bg-card/55 transition-all duration-300 hover:-translate-y-1 hover:bg-card/85 hover:shadow-lg"
                                        onClick={() => setProductParam(product.slug)}
                                    >
                                        <CardHeader className="space-y-0 p-5">
                                            <div className="relative mb-5 overflow-hidden rounded-2xl border border-border/70 bg-muted/35">
                                                {product.screenshots?.[0] ? (
                                                    <div className="relative aspect-[16/10]">
                                                        <Image
                                                            src={product.screenshots[0]}
                                                            alt={`${product.name} product preview`}
                                                            fill
                                                            sizes="(max-width: 1024px) 100vw, 33vw"
                                                            className="object-cover transition-transform duration-500 group-hover:scale-105"
                                                        />
                                                    </div>
                                                ) : (
                                                    <div className="relative aspect-[16/10] overflow-hidden p-5">
                                                        <div className="absolute inset-0 bg-[radial-gradient(circle_at_25%_20%,color-mix(in_srgb,var(--primary)_18%,transparent),transparent_34%),linear-gradient(135deg,color-mix(in_srgb,var(--card)_92%,white_8%),color-mix(in_srgb,var(--muted)_82%,white_18%))]" />
                                                        <div className="relative flex h-full flex-col justify-between">
                                                            <div className="flex items-center justify-between">
                                                                <div className="flex h-10 w-10 items-center justify-center rounded-xl border bg-background/70">
                                                                    <Icon className="h-5 w-5 text-primary" />
                                                                </div>
                                                                <div className="rounded-full border bg-background/70 px-3 py-1 text-xs font-medium">
                                                                    {product.status}
                                                                </div>
                                                            </div>
                                                            <div className="space-y-2">
                                                                <div className="h-2 w-2/3 rounded-full bg-foreground/25" />
                                                                <div className="h-2 w-1/2 rounded-full bg-foreground/15" />
                                                                <div className="grid grid-cols-3 gap-2 pt-2">
                                                                    <div className="h-10 rounded-xl border bg-background/55" />
                                                                    <div className="h-10 rounded-xl border bg-background/55" />
                                                                    <div className="h-10 rounded-xl border bg-background/55" />
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                            <div className="mb-3 flex flex-wrap items-center gap-2">
                                                <Badge variant="secondary" className="rounded-full px-3">
                                                    {product.highlight}
                                                </Badge>
                                                <Badge variant="outline" className="rounded-full px-3">
                                                    {product.status}
                                                </Badge>
                                            </div>
                                            <CardTitle className="text-2xl font-semibold tracking-tight group-hover:text-primary">
                                                {product.name}
                                            </CardTitle>
                                            <p className="pt-1 text-sm font-medium text-muted-foreground">
                                                {product.tagline}
                                            </p>
                                            <CardDescription className="line-clamp-3 pt-3 text-sm leading-relaxed">
                                                {product.description}
                                            </CardDescription>
                                        </CardHeader>
                                        <CardContent className="mt-auto px-5">
                                            <div className="grid gap-2">
                                                {product.features.slice(0, 3).map((feature) => (
                                                    <div key={feature} className="flex items-start gap-2 text-sm text-muted-foreground">
                                                        <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-primary/70" />
                                                        <span>{feature}</span>
                                                    </div>
                                                ))}
                                            </div>
                                        </CardContent>
                                        <CardFooter className="justify-between gap-3 border-t px-5 pb-5 pt-5">
                                            <span className="text-xs font-medium text-muted-foreground">
                                                {product.audience}
                                            </span>
                                            <Button size="sm" variant="ghost" className="rounded-full">
                                                Details
                                                <ArrowUpRight className="ml-1 h-4 w-4" />
                                            </Button>
                                        </CardFooter>
                                    </Card>
                                </motion.div>
                            );
                        })}
                    </div>
                </div>
            </main>

            <Dialog open={!!selectedProduct} onOpenChange={(open) => !open && setProductParam(null)}>
                <DialogContent className="max-h-[85vh] overflow-hidden rounded-3xl border bg-card/90 p-0 backdrop-blur-xl sm:max-w-[calc(100vw-2rem)] md:max-w-[78vw] lg:max-w-[58vw]">
                    <div className="flex max-h-[85vh] flex-col">
                        <div className="flex-1 overflow-y-auto p-5 sm:p-8 md:p-10">
                            <DialogHeader>
                                <div className="mb-4 flex flex-wrap items-center gap-3">
                                    <Badge variant="secondary" className="rounded-full">
                                        {selectedProduct?.highlight}
                                    </Badge>
                                    <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                                        Product Details
                                    </span>
                                </div>
                                <DialogTitle className="text-3xl font-bold tracking-tight">
                                    {selectedProduct?.name}
                                </DialogTitle>
                                <DialogDescription className="sr-only">
                                    {selectedProduct?.description || 'Product details, features, technologies, and links.'}
                                </DialogDescription>
                            </DialogHeader>

                            {selectedProduct?.screenshots?.length ? (
                                <div className="mt-6 grid gap-3">
                                    <div className="relative aspect-[16/9] overflow-hidden rounded-2xl border bg-muted/40">
                                        <Image
                                            src={selectedProduct.screenshots[0]}
                                            alt={`${selectedProduct.name} screenshot`}
                                            fill
                                            sizes="(max-width: 1024px) 100vw, 58vw"
                                            className="object-cover"
                                        />
                                    </div>
                                </div>
                            ) : null}

                            <div className="mt-8 grid gap-6 lg:grid-cols-[1fr_15rem]">
                                <article className="prose prose-neutral dark:prose-invert max-w-none text-foreground/80">
                                    <ReactMarkdown remarkPlugins={[remarkGfm]}>
                                        {selectedProduct?.details || ''}
                                    </ReactMarkdown>
                                </article>
                                <aside className="h-fit rounded-2xl border bg-background/60 p-4">
                                    <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                                        Stack
                                    </p>
                                    <div className="mt-3 flex flex-wrap gap-2">
                                        {selectedProduct?.tech.map((tech) => (
                                            <Badge key={tech} variant="outline" className="rounded-full">
                                                {tech}
                                            </Badge>
                                        ))}
                                    </div>
                                    <div className="mt-5 border-t pt-4">
                                        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                                            Built For
                                        </p>
                                        <p className="mt-2 text-sm leading-relaxed text-foreground/75">
                                            {selectedProduct?.audience}
                                        </p>
                                    </div>
                                </aside>
                            </div>
                        </div>
                        <div className="border-t bg-card/95 px-5 pb-5 pt-4 backdrop-blur supports-[backdrop-filter]:bg-card/80 sm:px-8 md:px-10">
                            <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center sm:justify-end">
                                {selectedProduct?.links?.repo ? (
                                    <Button variant="ghost" size="sm" asChild className="h-10 rounded-full px-4">
                                        <Link href={selectedProduct.links.repo} target="_blank" rel="noreferrer">
                                            <Github className="mr-2 h-4 w-4" />
                                            GitHub
                                        </Link>
                                    </Button>
                                ) : null}
                                {selectedProduct?.links?.live ? (
                                    <Button variant="ghost" size="sm" asChild className="h-10 rounded-full px-4">
                                        <Link href={selectedProduct.links.live} target="_blank" rel="noreferrer">
                                            <ArrowUpRight className="mr-2 h-4 w-4" />
                                            Live
                                        </Link>
                                    </Button>
                                ) : null}
                                <Button size="sm" className="h-10 rounded-full px-4" onClick={goToContactWithRef}>
                                    <Send className="mr-2 h-4 w-4" />
                                    Contact
                                </Button>
                            </div>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>
        </motion.div>
    );
}

export default function ProductsPage() {
    return (
        <Suspense>
            <ProductsPageContent />
        </Suspense>
    );
}

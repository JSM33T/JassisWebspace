'use client';

import { Suspense } from 'react';
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
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Users, Send, ExternalLink, Github, Twitter, Linkedin } from 'lucide-react';
import { PageBanner } from '@/components/page-banner';
import { pals as palsData, type Pal as PalType } from '../../data/pals';

type PalCard = PalType & { id: string };

const makePalId = (name: string) =>
    name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '');

const pals: PalCard[] = palsData.map((pal) => ({
    ...pal,
    id: makePalId(pal.name),
}));

const getInitials = (name: string) =>
    name
        .split(' ')
        .map((n) => n[0])
        .join('')
        .toUpperCase()
        .slice(0, 2);

function PalsPageContent() {
    const router = useRouter();
    const pathname = usePathname();
    const searchParams = useSearchParams();
    const selectedPal = pals.find((pal) => pal.id === searchParams.get('pal')) || null;

    const setPalParam = (palId: string | null) => {
        const params = new URLSearchParams(searchParams.toString());
        if (palId) {
            params.set('pal', palId);
        } else {
            params.delete('pal');
        }
        const query = params.toString();
        router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
    };

    const openPal = (pal: PalCard) => setPalParam(pal.id);
    const closePal = () => setPalParam(null);

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
                badge="People"
                badgeIcon={Users}
                title="Pals"
                description="People I admire, collaborate with, and learn from."
            />

            <main className="flex-1 px-4 pb-14 pt-8 md:px-8 md:pb-16 md:pt-10">
                <div className="mx-auto max-w-6xl pt-4">
                    <div className="grid max-w-6xl grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
                        {pals.map((pal, index) => (
                            <motion.div
                                key={pal.id}
                                initial={{ opacity: 0, scale: 0.95 }}
                                animate={{ opacity: 1, scale: 1 }}
                                transition={{ duration: 0.3, delay: index * 0.05 }}
                            >
                                <Card
                                    className="flex flex-col h-full cursor-pointer rounded-2xl border bg-card/50 hover:bg-card/80 transition-all duration-300 hover:shadow-lg backdrop-blur-sm group"
                                    onClick={() => openPal(pal)}
                                >
                                    <CardHeader className="px-5 pt-5 pb-3 space-y-0">
                                        <div className="flex items-center gap-3 mb-3">
                                            <Avatar className="h-10 w-10 border">
                                                <AvatarImage src={pal.avatar} alt={pal.name} />
                                                <AvatarFallback className="text-sm font-semibold">
                                                    {getInitials(pal.name)}
                                                </AvatarFallback>
                                            </Avatar>
                                            <Badge variant="secondary" className="rounded-full px-2.5 py-0.5 text-xs font-semibold uppercase tracking-wide">
                                                {pal.connection || 'Pal'}
                                            </Badge>
                                        </div>
                                        <CardTitle className="text-lg font-semibold tracking-tight leading-snug group-hover:text-primary transition-colors">
                                            {pal.name}
                                        </CardTitle>
                                        <div className="flex items-center gap-2 pt-1">
                                            <span className="text-xs text-muted-foreground font-medium">{pal.role}</span>
                                        </div>
                                        <CardDescription className="text-sm pt-3 line-clamp-2 leading-relaxed">
                                            {pal.description}
                                        </CardDescription>
                                    </CardHeader>
                                    <CardFooter className="mt-auto px-5 pb-5 pt-3 border-t flex items-center justify-between gap-3">
                                        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                                            <Users className="h-3.5 w-3.5" />
                                            <span>{pal.tags?.length ?? 0} tags</span>
                                        </div>
                                        <div className="flex items-center gap-1.5 flex-wrap justify-end">
                                            {pal.tags?.slice(0, 2).map((t) => (
                                                <Badge key={t} variant="outline" className="rounded-full px-2 py-0 text-xs">
                                                    {t}
                                                </Badge>
                                            ))}
                                            {(pal.tags?.length ?? 0) > 2 && (
                                                <span className="text-xs text-muted-foreground">+{(pal.tags?.length ?? 0) - 2}</span>
                                            )}
                                        </div>
                                    </CardFooter>
                                </Card>
                            </motion.div>
                        ))}
                    </div>
                </div>
            </main>

            <Dialog open={!!selectedPal} onOpenChange={(open) => !open && closePal()}>
                <DialogContent className="max-h-[85vh] rounded-3xl border bg-card/90 p-0 backdrop-blur-xl overflow-hidden sm:max-w-[calc(100vw-2rem)] md:max-w-[80vw] lg:max-w-[65vw] xl:max-w-[50vw]">
                    <div className="flex max-h-[85vh] flex-col">
                        <div className="flex-1 overflow-y-auto p-10 space-y-8">
                            <DialogHeader>
                                <div className="flex items-center gap-4 mb-4">
                                    <Avatar className="h-16 w-16 border-2">
                                        <AvatarImage src={selectedPal?.avatar} alt={selectedPal?.name} />
                                        <AvatarFallback className="text-xl font-bold">
                                            {selectedPal ? getInitials(selectedPal.name) : ''}
                                        </AvatarFallback>
                                    </Avatar>
                                    <div className="flex flex-col gap-1">
                                        <div className="flex items-center gap-2">
                                            <Badge variant="secondary" className="rounded-full">
                                                {selectedPal?.connection || 'Pal'}
                                            </Badge>
                                            <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Profile</span>
                                        </div>
                                        <DialogTitle className="text-3xl font-bold tracking-tight">{selectedPal?.name}</DialogTitle>
                                        <span className="text-sm text-muted-foreground">{selectedPal?.role}</span>
                                    </div>
                                </div>

                                <div className="pt-2">
                                    <article className="prose prose-neutral dark:prose-invert max-w-none text-foreground/80">
                                        <ReactMarkdown remarkPlugins={[remarkGfm]}>
                                            {selectedPal?.details || selectedPal?.description || ''}
                                        </ReactMarkdown>
                                    </article>
                                </div>
                            </DialogHeader>

                            {(selectedPal?.tags?.length ?? 0) > 0 && (
                                <div className="pt-8 border-t">
                                    <div className="flex flex-wrap gap-2">
                                        {selectedPal?.tags?.map((tag) => (
                                            <Badge key={tag} variant="outline" className="rounded-full">
                                                {tag}
                                            </Badge>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>

                        <div className="border-t bg-card/95 px-5 pb-5 pt-4 backdrop-blur supports-[backdrop-filter]:bg-card/80 sm:px-8 sm:pb-6 md:px-10">
                            <div className="flex justify-center">
                                <div className="flex w-full flex-col gap-2 rounded-[1.5rem] border bg-background/70 p-2 sm:inline-flex sm:w-auto sm:flex-row sm:flex-wrap sm:items-center sm:rounded-full sm:p-1">
                                    {selectedPal?.links?.github && (
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            asChild
                                            className="h-10 w-full rounded-full px-4 sm:min-w-[110px] sm:w-auto"
                                        >
                                            <a href={selectedPal.links.github} target="_blank" rel="noreferrer">
                                                <Github className="mr-2 h-4 w-4" />
                                                GitHub
                                            </a>
                                        </Button>
                                    )}
                                    {selectedPal?.links?.twitter && (
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            asChild
                                            className="h-10 w-full rounded-full px-4 sm:min-w-[110px] sm:w-auto"
                                        >
                                            <a href={selectedPal.links.twitter} target="_blank" rel="noreferrer">
                                                <Twitter className="mr-2 h-4 w-4" />
                                                Twitter
                                            </a>
                                        </Button>
                                    )}
                                    {selectedPal?.links?.linkedin && (
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            asChild
                                            className="h-10 w-full rounded-full px-4 sm:min-w-[110px] sm:w-auto"
                                        >
                                            <a href={selectedPal.links.linkedin} target="_blank" rel="noreferrer">
                                                <Linkedin className="mr-2 h-4 w-4" />
                                                LinkedIn
                                            </a>
                                        </Button>
                                    )}
                                    {selectedPal?.links?.website && (
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            asChild
                                            className="h-10 w-full rounded-full px-4 sm:min-w-[110px] sm:w-auto"
                                        >
                                            <a href={selectedPal.links.website} target="_blank" rel="noreferrer">
                                                <ExternalLink className="mr-2 h-4 w-4" />
                                                Website
                                            </a>
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

export default function PalsPage() {
    return (
        <Suspense>
            <PalsPageContent />
        </Suspense>
    );
}

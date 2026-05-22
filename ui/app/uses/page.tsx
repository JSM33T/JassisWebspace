'use client';

import { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Wrench, ArrowUpRight, ChevronDown } from 'lucide-react';
import { PageBanner } from '@/components/page-banner';
import { usesCategories } from '@/data/uses';

export default function UsesPage() {
    const [openSections, setOpenSections] = useState<Record<string, boolean>>(
        () => Object.fromEntries(usesCategories.map((c) => [c.title, false])),
    );

    const toggle = (title: string) =>
        setOpenSections((prev) => ({ ...prev, [title]: !prev[title] }));

    const allOpen = usesCategories.every((c) => openSections[c.title]);

    const setAll = (open: boolean) =>
        setOpenSections(Object.fromEntries(usesCategories.map((c) => [c.title, open])));

    return (
        <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, ease: 'easeOut' }}
            className="flex flex-col min-h-screen bg-background/50"
        >
            <PageBanner
                badge="My Setup"
                badgeIcon={Wrench}
                title="Uses"
                description="The tools, gear, and software I reach for every day."
            />

            <main className="flex-1 px-6 pb-20 pt-10 md:px-10 md:pt-14">
                <div className="mx-auto max-w-3xl space-y-2">
                    <div className="flex justify-end pb-2">
                        <button
                            type="button"
                            onClick={() => setAll(!allOpen)}
                            className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground transition-colors hover:text-foreground"
                        >
                            {allOpen ? 'Collapse all' : 'Expand all'}
                        </button>
                    </div>

                    {usesCategories.map((category) => {
                        const isOpen = openSections[category.title];
                        return (
                            <section
                                key={category.title}
                                className="border-b border-border/40"
                            >
                                <button
                                    type="button"
                                    onClick={() => toggle(category.title)}
                                    className="group flex w-full items-center justify-between gap-4 py-5 text-left transition-colors"
                                    aria-expanded={isOpen}
                                >
                                    <div className="min-w-0">
                                        <h2 className="text-xs font-semibold uppercase tracking-[0.18em] text-foreground transition-colors group-hover:text-primary">
                                            {category.title}
                                        </h2>
                                        <p className="mt-1 text-sm text-muted-foreground/80">
                                            {category.description}
                                        </p>
                                    </div>
                                    <motion.div
                                        animate={{ rotate: isOpen ? 180 : 0 }}
                                        transition={{ duration: 0.2 }}
                                        className="shrink-0 text-muted-foreground transition-colors group-hover:text-foreground"
                                    >
                                        <ChevronDown className="h-4 w-4" />
                                    </motion.div>
                                </button>

                                <AnimatePresence initial={false}>
                                    {isOpen && (
                                        <motion.div
                                            key="content"
                                            initial={{ height: 0, opacity: 0 }}
                                            animate={{ height: 'auto', opacity: 1 }}
                                            exit={{ height: 0, opacity: 0 }}
                                            transition={{ duration: 0.25, ease: 'easeInOut' }}
                                            className="overflow-hidden"
                                        >
                                            <ul className="divide-y divide-border/30 pb-2">
                                                {category.items.map((item) => {
                                                    const content = (
                                                        <div className="flex items-start justify-between gap-6 py-4">
                                                            <div className="min-w-0 flex-1">
                                                                <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                                                                    <span className="text-sm font-medium text-foreground">
                                                                        {item.name}
                                                                    </span>
                                                                    {item.highlight && (
                                                                        <span className="text-[10px] font-medium uppercase tracking-wider text-primary/80">
                                                                            {item.highlight}
                                                                        </span>
                                                                    )}
                                                                </div>
                                                                <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
                                                                    {item.description}
                                                                </p>
                                                            </div>
                                                            {item.url && (
                                                                <ArrowUpRight className="mt-1 h-3.5 w-3.5 shrink-0 text-muted-foreground/60 transition-colors group-hover/item:text-foreground" />
                                                            )}
                                                        </div>
                                                    );

                                                    return (
                                                        <li key={item.name}>
                                                            {item.url ? (
                                                                <a
                                                                    href={item.url}
                                                                    target="_blank"
                                                                    rel="noopener noreferrer"
                                                                    className="group/item block transition-colors hover:bg-muted/20"
                                                                >
                                                                    {content}
                                                                </a>
                                                            ) : (
                                                                <div>{content}</div>
                                                            )}
                                                        </li>
                                                    );
                                                })}
                                            </ul>
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                            </section>
                        );
                    })}

                    <p className="pt-8 text-center text-xs text-muted-foreground/60">
                        Inspired by{' '}
                        <a
                            href="https://uses.tech"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="underline underline-offset-4 hover:text-foreground"
                        >
                            uses.tech
                        </a>
                        .
                    </p>
                </div>
            </main>
        </motion.div>
    );
}

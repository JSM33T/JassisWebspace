'use client';

import { useEffect, useMemo, useState } from 'react';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { extractHeadings } from '@/lib/toc';

interface TableOfContentsProps {
    content: string;
}

export function TableOfContents({ content }: TableOfContentsProps) {
    const pathname = usePathname();
    const headings = useMemo(() => extractHeadings(content), [content]);
    const [activeId, setActiveId] = useState('');

    const minLevel = useMemo(
        () => (headings.length ? Math.min(...headings.map((h) => h.level)) : 0),
        [headings]
    );

    useEffect(() => {
        if (headings.length === 0) return;

        // The y-line below the top of the viewport where a heading is "reached".
        const activeLine = 120;
        let frame = 0;
        let headingObserver: MutationObserver | null = null;

        const update = () => {
            frame = 0;
            // Resolve the elements at update time. During a client-side route
            // transition the effect can run before the new article headings are
            // available, so keeping a one-time snapshot leaves the TOC inert.
            const elements = headings
                .map((heading) => document.getElementById(heading.id))
                .filter((element): element is HTMLElement => element !== null);

            if (elements.length === 0) return;

            headingObserver?.disconnect();
            headingObserver = null;

            let currentId = elements[0].id;
            for (const el of elements) {
                if (el.getBoundingClientRect().top - activeLine <= 0) {
                    currentId = el.id;
                } else {
                    break;
                }
            }
            setActiveId(currentId);
        };

        const scheduleUpdate = () => {
            if (frame) return;
            frame = window.requestAnimationFrame(update);
        };

        headingObserver = new MutationObserver(scheduleUpdate);
        headingObserver.observe(document.body, { childList: true, subtree: true });

        // Run after the route commit instead of during the transition frame.
        scheduleUpdate();
        window.addEventListener('scroll', scheduleUpdate, { passive: true });
        window.addEventListener('resize', scheduleUpdate);
        return () => {
            window.removeEventListener('scroll', scheduleUpdate);
            window.removeEventListener('resize', scheduleUpdate);
            headingObserver?.disconnect();
            if (frame) window.cancelAnimationFrame(frame);
        };
    }, [headings, pathname]);

    if (headings.length === 0) return null;

    const handleClick = (event: React.MouseEvent<HTMLAnchorElement>, id: string) => {
        event.preventDefault();
        const el = document.getElementById(id);
        if (!el) return;
        el.scrollIntoView({ behavior: 'smooth', block: 'start' });
        setActiveId(id);
        window.history.replaceState(null, '', `#${id}`);
    };

    return (
        <nav aria-label="Table of contents" className="text-sm">
            <p className="mb-4 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                On this page
            </p>
            <ul className="space-y-0.5 border-l border-border/60">
                {headings.map((heading) => {
                    const isActive = activeId === heading.id;
                    return (
                        <li key={heading.id}>
                            <a
                                href={`#${heading.id}`}
                                onClick={(event) => handleClick(event, heading.id)}
                                style={{
                                    paddingLeft: `${(heading.level - minLevel) * 0.875 + 0.875}rem`,
                                }}
                                className={cn(
                                    '-ml-px block border-l-2 py-1 pr-2 leading-snug transition-colors',
                                    isActive
                                        ? 'border-primary font-medium text-primary'
                                        : 'border-transparent text-muted-foreground hover:text-foreground'
                                )}
                            >
                                {heading.text}
                            </a>
                        </li>
                    );
                })}
            </ul>
        </nav>
    );
}

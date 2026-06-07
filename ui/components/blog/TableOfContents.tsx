'use client';

import { useEffect, useMemo, useState } from 'react';
import { cn } from '@/lib/utils';
import { extractHeadings } from '@/lib/toc';

interface TableOfContentsProps {
    content: string;
}

export function TableOfContents({ content }: TableOfContentsProps) {
    const headings = useMemo(() => extractHeadings(content), [content]);
    const [activeId, setActiveId] = useState('');

    const minLevel = useMemo(
        () => (headings.length ? Math.min(...headings.map((h) => h.level)) : 0),
        [headings]
    );

    useEffect(() => {
        if (headings.length === 0) return;

        const elements = headings
            .map((h) => document.getElementById(h.id))
            .filter((el): el is HTMLElement => el !== null);

        if (elements.length === 0) return;

        // The y-line below the top of the viewport where a heading is "reached".
        const activeLine = 120;
        let frame = 0;

        const update = () => {
            frame = 0;
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

        const onScroll = () => {
            if (frame) return;
            frame = window.requestAnimationFrame(update);
        };

        update(); // set initial highlight
        window.addEventListener('scroll', onScroll, { passive: true });
        window.addEventListener('resize', onScroll);
        return () => {
            window.removeEventListener('scroll', onScroll);
            window.removeEventListener('resize', onScroll);
            if (frame) window.cancelAnimationFrame(frame);
        };
    }, [headings]);

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

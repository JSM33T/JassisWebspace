export interface TocItem {
    id: string;
    text: string;
    level: number;
}

/** Turn heading text into a stable, anchor-friendly id (github-style). */
export function slugify(text: string): string {
    return text
        .toLowerCase()
        .trim()
        .replace(/[^\w\s-]/g, '')
        .replace(/\s+/g, '-')
        .replace(/-+/g, '-')
        .replace(/^-+|-+$/g, '');
}

/** Strip inline markdown (bold, italic, links, code, etc.) down to plain text. */
function stripInline(value: string): string {
    return value
        .replace(/!\[([^\]]*)\]\([^)]*\)/g, '$1') // images
        .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1') // links
        .replace(/`([^`]+)`/g, '$1') // inline code
        .replace(/(\*\*|__)(.*?)\1/g, '$2') // bold
        .replace(/(\*|_)(.*?)\1/g, '$2') // italic
        .replace(/~~(.*?)~~/g, '$1') // strikethrough
        .trim();
}

/**
 * Parse h2/h3 headings out of raw markdown for a table of contents.
 * Skips fenced code blocks so `#` comments aren't mistaken for headings.
 */
export function extractHeadings(markdown: string): TocItem[] {
    if (!markdown) return [];

    const items: TocItem[] = [];
    let inFence = false;

    for (const line of markdown.split('\n')) {
        if (/^\s*(```|~~~)/.test(line)) {
            inFence = !inFence;
            continue;
        }
        if (inFence) continue;

        const match = line.match(/^(#{2,3})\s+(.+?)\s*#*\s*$/);
        if (!match) continue;

        const text = stripInline(match[2]);
        if (!text) continue;

        items.push({ id: slugify(text), text, level: match[1].length });
    }

    return items;
}

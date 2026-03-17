'use client';
/* eslint-disable @next/next/no-img-element */

import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

interface BotChatMarkdownProps {
    content: string;
}

export function BotChatMarkdown({ content }: BotChatMarkdownProps) {
    return (
        <div className="prose prose-sm prose-neutral dark:prose-invert max-w-none break-words text-foreground prose-headings:my-2 prose-headings:text-foreground prose-h2:text-sm prose-h2:font-semibold prose-h3:text-sm prose-h3:font-semibold prose-p:my-2 prose-p:text-foreground prose-p:leading-6 prose-ul:my-2 prose-ul:text-foreground prose-ul:pl-5 prose-ol:my-2 prose-ol:text-foreground prose-ol:pl-5 prose-li:my-1 prose-li:text-foreground prose-strong:text-foreground prose-em:text-muted-foreground prose-a:text-primary prose-a:no-underline prose-a:font-medium hover:prose-a:underline prose-code:rounded prose-code:bg-muted prose-code:px-1 prose-code:py-0.5 prose-code:text-[0.85em] prose-code:text-foreground prose-img:my-2 prose-img:w-full prose-img:rounded-2xl prose-img:border prose-img:border-border/60 prose-img:object-cover">
            <ReactMarkdown
                remarkPlugins={[remarkGfm]}
                components={{
                    a: ({ href, children }) => (
                        <a
                            href={href}
                            target="_blank"
                            rel="noreferrer noopener"
                            className="font-medium text-primary underline-offset-4 hover:underline"
                        >
                            {children}
                        </a>
                    ),
                    img: ({ src, alt }) => (
                        <img
                            src={src ?? ''}
                            alt={alt ?? ''}
                            loading="lazy"
                            className="my-2 h-auto max-h-40 w-full rounded-2xl border border-border/70 object-cover"
                        />
                    ),
                    p: ({ children }) => <p className="my-2 leading-6 first:mt-0 last:mb-0">{children}</p>,
                    ul: ({ children }) => <ul className="my-2 list-disc pl-5">{children}</ul>,
                    ol: ({ children }) => <ol className="my-2 list-decimal pl-5">{children}</ol>,
                    li: ({ children }) => <li className="my-1">{children}</li>,
                    h2: ({ children }) => <h2 className="my-2 text-sm font-semibold">{children}</h2>,
                    h3: ({ children }) => <h3 className="my-2 text-sm font-semibold">{children}</h3>,
                    code: ({ children }) => (
                        <code className="rounded bg-muted px-1 py-0.5 text-[0.85em] text-foreground">{children}</code>
                    ),
                }}
            >
                {content}
            </ReactMarkdown>
        </div>
    );
}

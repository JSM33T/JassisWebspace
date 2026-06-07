'use client';

import ReactMarkdown from 'react-markdown';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { dracula } from 'react-syntax-highlighter/dist/esm/styles/prism';
import remarkGfm from 'remark-gfm';

import { Check, Copy } from 'lucide-react';
import { Children, ComponentProps, isValidElement, ReactNode, useState } from 'react';

import { slugify } from '@/lib/toc';

interface MarkdownRendererProps {
    content: string;
}

/** Flatten React children into plain text so headings can get a stable anchor id. */
const getNodeText = (node: ReactNode): string => {
    if (typeof node === 'string' || typeof node === 'number') return String(node);
    if (Array.isArray(node)) return node.map(getNodeText).join('');
    if (isValidElement<{ children?: ReactNode }>(node)) {
        return Children.toArray(node.props.children).map(getNodeText).join('');
    }
    return '';
};

interface CodeBlockProps {
    language: string;
    children: ReactNode;
}

type MarkdownCodeProps = ComponentProps<'code'> & {
    inline?: boolean;
    node?: unknown;
};

const CodeBlock = ({ language, children }: CodeBlockProps) => {
    const [copied, setCopied] = useState(false);

    const onCopy = () => {
        navigator.clipboard.writeText(String(children));
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    return (
        <div className="relative group rounded-md overflow-hidden my-4">
            <div className="absolute right-2 top-2 z-10 opacity-0 group-hover:opacity-100 transition-opacity">
                <button
                    onClick={onCopy}
                    className="p-1.5 rounded-md bg-muted/80 hover:bg-muted text-muted-foreground hover:text-foreground transition-colors border"
                    title="Copy code"
                >
                    {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                </button>
            </div>
            <div className="relative">
                <div className="absolute top-0 right-0 px-2 py-1 text-xs text-muted-foreground bg-muted/30 rounded-bl-md select-none">
                    {language}
                </div>
                <SyntaxHighlighter
                    style={dracula}
                    language={language}
                    PreTag="div"
                    showLineNumbers={true}
                    wrapLines={true}
                    customStyle={{ margin: 0, borderRadius: '0.375rem' }}
                >
                    {String(children).replace(/\n$/, '')}
                </SyntaxHighlighter>
            </div>
        </div>
    );
};

export const MarkdownRenderer = ({ content }: MarkdownRendererProps) => {
    return (
        <div className="prose prose-lg dark:prose-invert max-w-none">
            <ReactMarkdown
                remarkPlugins={[remarkGfm]}
                components={{
                    h2: ({ children }) => (
                        <h2 id={slugify(getNodeText(children))} className="scroll-mt-24">
                            {children}
                        </h2>
                    ),
                    h3: ({ children }) => (
                        <h3 id={slugify(getNodeText(children))} className="scroll-mt-24">
                            {children}
                        </h3>
                    ),
                    code({ inline, className, children, ...props }: MarkdownCodeProps) {
                        const match = /language-(\w+)/.exec(className || '');
                        return !inline && match ? (
                            <CodeBlock language={match[1]}>
                                {children}
                            </CodeBlock>
                        ) : (
                            <code {...props} className={className}>
                                {children}
                            </code>
                        );
                    },
                }}
            >
                {content}
            </ReactMarkdown>
        </div>
    );
};

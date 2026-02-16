import type { Metadata } from 'next';
import { buildMetadata } from '@/lib/seo';

export const metadata: Metadata = buildMetadata({
    title: 'Portfolio',
    description: 'Explore the portfolio, skill set, and timeline behind JassSpace.',
    tags: ['portfolio', 'skills', 'timeline', 'JassSpace'],
    canonicalPath: '/portfolio',
});

export default function PortfolioLayout({ children }: { children: React.ReactNode }) {
    return children;
}

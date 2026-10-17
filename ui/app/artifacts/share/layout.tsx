import type { Metadata } from 'next';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
    title: 'Shared artifact | Jass Space',
    description: 'Download a privately shared artifact.',
    robots: { index: false, follow: false, nocache: true },
    referrer: 'no-referrer',
    alternates: { canonical: null },
    openGraph: { title: 'Shared artifact', description: 'A privately shared artifact.' },
};
export default function ArtifactShareLayout({ children }: { children: React.ReactNode }) { return children; }

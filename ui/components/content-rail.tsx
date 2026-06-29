import { cn } from '@/lib/utils';

type ContentRailProps = {
    children: React.ReactNode;
    header?: React.ReactNode;
    surface?: 'plain' | 'panel';
    className?: string;
};

export function ContentRail({
    children,
    header,
    surface = 'plain',
    className,
}: ContentRailProps) {
    if (surface === 'panel') {
        return (
            <section className={cn('pb-12 md:pb-20', className)}>
                <div className="relative overflow-hidden rounded-2xl border bg-card/65 p-4 backdrop-blur-sm sm:p-5 md:rounded-3xl md:p-8">
                    <div className="pointer-events-none absolute inset-0">
                        <div className="absolute inset-0 bg-[radial-gradient(circle_at_16%_20%,color-mix(in_oklch,var(--primary)_15%,transparent),transparent_44%),radial-gradient(circle_at_84%_74%,color-mix(in_oklch,var(--secondary)_11%,transparent),transparent_52%)]" />
                        <div className="absolute inset-0 bg-[linear-gradient(to_right,color-mix(in_oklch,var(--border)_11%,transparent)_1px,transparent_1px),linear-gradient(to_bottom,color-mix(in_oklch,var(--border)_11%,transparent)_1px,transparent_1px)] bg-[size:24px_24px] opacity-40" />
                        <div className="absolute inset-0 bg-[linear-gradient(145deg,color-mix(in_oklch,var(--background)_12%,transparent),transparent_62%)]" />
                    </div>
                    <div className="relative min-w-0 space-y-5 sm:space-y-6">
                        {header}
                        {children}
                    </div>
                </div>
            </section>
        );
    }

    return (
        <section className={cn('min-w-0 space-y-5 pb-12 sm:space-y-6 md:pb-20', className)}>
            {header}
            {children}
        </section>
    );
}

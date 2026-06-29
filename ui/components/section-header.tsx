import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

type SectionHeaderProps = {
    eyebrow: string;
    title: React.ReactNode;
    description?: React.ReactNode;
    action?: React.ReactNode;
    align?: 'left' | 'center';
    className?: string;
};

export function SectionHeader({
    eyebrow,
    title,
    description,
    action,
    align = 'left',
    className,
}: SectionHeaderProps) {
    const isCentered = align === 'center';

    return (
        <div
            className={cn(
                'flex min-w-0 flex-col gap-4 sm:flex-row sm:items-end sm:justify-between',
                isCentered && 'items-center text-center sm:flex-col sm:items-center sm:justify-start',
                className,
            )}
        >
            <div className={cn('min-w-0 space-y-3', isCentered ? 'mx-auto max-w-2xl' : 'max-w-2xl')}>
                <Badge variant="secondary" className="w-fit rounded-full px-3.5 py-1.5 text-xs sm:px-4">
                    {eyebrow}
                </Badge>
                <div className="space-y-2">
                    <h2 className="text-balance text-2xl font-semibold tracking-tight sm:text-3xl md:text-4xl">
                        {title}
                    </h2>
                    {description ? (
                        <p className="text-sm leading-relaxed text-muted-foreground sm:text-base">
                            {description}
                        </p>
                    ) : null}
                </div>
            </div>
            {action ? <div className="shrink-0">{action}</div> : null}
        </div>
    );
}

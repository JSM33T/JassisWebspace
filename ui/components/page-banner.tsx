import { type LucideIcon } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

type PageBannerProps = {
    badge: string;
    badgeIcon: LucideIcon;
    title: string;
    description: string;
    maxWidth?: 'max-w-6xl' | 'max-w-7xl';
    /** Rendered below the description, full width */
    children?: React.ReactNode;
    /** Rendered to the right of the title block on sm+ screens */
    rightContent?: React.ReactNode;
    className?: string;
};

export function PageBanner({
    badge,
    badgeIcon: BadgeIcon,
    title,
    description,
    maxWidth = 'max-w-6xl',
    children,
    rightContent,
    className,
}: PageBannerProps) {
    return (
        <div
            className={cn(
                'relative overflow-hidden border-b border-border/30 px-6 pb-10 pt-28 md:px-10 md:pb-14 md:pt-32',
                className,
            )}
        >
            <div className="absolute right-0 top-0 h-[28rem] w-[28rem] -translate-y-1/2 translate-x-1/3 rounded-full bg-primary/6 blur-3xl" />
            <div
                className={cn(
                    'relative mx-auto',
                    maxWidth,
                    rightContent && 'flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between',
                )}
            >
                <div>
                    <Badge
                        variant="secondary"
                        className="w-fit gap-2 rounded-full border-border/50 bg-background/55 px-4 py-1.5 text-sm font-normal backdrop-blur-sm"
                    >
                        <BadgeIcon className="h-3.5 w-3.5 text-primary" />
                        {badge}
                    </Badge>
                    <h1 className="mt-5 text-5xl font-bold tracking-tight md:text-6xl">{title}</h1>
                    <p className="mt-3 text-lg leading-relaxed text-muted-foreground">{description}</p>
                    {children ? <div className="mt-6">{children}</div> : null}
                </div>
                {rightContent ? <div className="w-full shrink-0 sm:w-[200px]">{rightContent}</div> : null}
            </div>
        </div>
    );
}

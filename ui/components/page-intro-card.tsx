import Link from 'next/link';
import { ArrowLeft, type LucideIcon } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

type PageIntroCardProps = {
    badge?: string;
    badgeIcon?: LucideIcon;
    title: React.ReactNode;
    description?: React.ReactNode;
    topContent?: React.ReactNode;
    showBackButton?: boolean;
    backHref?: string;
    backLabel?: string;
    stickToTop?: boolean;
    className?: string;
    descriptionClassName?: string;
    children?: React.ReactNode;
};

export function PageIntroCard({
    badge,
    badgeIcon: BadgeIcon,
    title,
    description,
    topContent,
    showBackButton = false,
    backHref = '/',
    backLabel = 'Back',
    stickToTop = false,
    className,
    descriptionClassName,
    children,
}: PageIntroCardProps) {
    return (
        <div
            className={cn(
                'relative overflow-hidden border border-border/60 bg-card/55 px-6 py-6 shadow-xl shadow-black/5 backdrop-blur-xl sm:px-8 sm:py-8 md:px-10 md:py-10',
                stickToTop
                    ? 'sticky top-0 z-20 rounded-b-[2rem] border-t-0'
                    : 'rounded-[2rem]',
                className,
            )}
        >
            <div className="absolute right-[-8%] top-[-24%] h-44 w-44 rounded-full bg-primary/14 blur-3xl" />
            <div className="absolute left-[14%] bottom-[-30%] h-48 w-48 rounded-full bg-secondary/18 blur-3xl" />
            <div className="absolute inset-0 bg-gradient-to-br from-transparent via-accent/6 to-primary/6" />

            <div className="relative">
                <div
                    className={cn(
                        'flex flex-col gap-4 sm:flex-row sm:items-start',
                        badge && BadgeIcon ? 'sm:justify-between' : 'sm:justify-end',
                    )}
                >
                    {badge && BadgeIcon ? (
                        <Badge
                            variant="secondary"
                            className="w-fit gap-2 rounded-full border-border/50 bg-background/55 px-4 py-1.5 text-sm font-normal backdrop-blur-sm"
                        >
                            <BadgeIcon className="h-3.5 w-3.5 text-primary" />
                            <span>{badge}</span>
                        </Badge>
                    ) : null}
                    {showBackButton ? (
                        <Button
                            variant="ghost"
                            asChild
                            className="h-11 rounded-full border border-border/60 bg-background/60 px-5 backdrop-blur-sm hover:bg-background/90"
                        >
                            <Link href={backHref}>
                                <ArrowLeft className="mr-2 h-4 w-4" />
                                {backLabel}
                            </Link>
                        </Button>
                    ) : null}
                </div>

                {topContent ? <div className="mt-6">{topContent}</div> : null}

                <div className={cn('max-w-3xl space-y-4', topContent ? 'mt-5' : 'mt-6')}>
                    <h1 className="break-words text-4xl font-bold tracking-tight md:text-5xl">{title}</h1>
                    {description ? (
                        <p className={cn('text-lg leading-relaxed text-muted-foreground', descriptionClassName)}>
                            {description}
                        </p>
                    ) : null}
                </div>

                {children ? <div className="mt-6">{children}</div> : null}
            </div>
        </div>
    );
}

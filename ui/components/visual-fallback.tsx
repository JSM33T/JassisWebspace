import {
    Activity,
    BookOpen,
    Briefcase,
    Disc3,
    Image as ImageIcon,
    Package,
    Sparkles,
    type LucideIcon,
} from 'lucide-react';

import { cn } from '@/lib/utils';

export type VisualFallbackKind = 'product' | 'project' | 'blog' | 'music' | 'gallery' | 'service';

type VisualFallbackProps = {
    kind: VisualFallbackKind;
    title: string;
    eyebrow?: string;
    icon?: LucideIcon;
    className?: string;
    children?: React.ReactNode;
};

const fallbackConfig = {
    product: {
        icon: Package,
        accent: 'from-primary/28 via-accent/12 to-secondary/18',
        glow: 'bg-primary/28',
    },
    project: {
        icon: Activity,
        accent: 'from-accent/24 via-primary/12 to-secondary/16',
        glow: 'bg-accent/26',
    },
    blog: {
        icon: BookOpen,
        accent: 'from-primary/20 via-secondary/14 to-muted/50',
        glow: 'bg-secondary/24',
    },
    music: {
        icon: Disc3,
        accent: 'from-primary/24 via-accent/18 to-secondary/20',
        glow: 'bg-primary/24',
    },
    gallery: {
        icon: ImageIcon,
        accent: 'from-accent/24 via-primary/12 to-muted/60',
        glow: 'bg-accent/24',
    },
    service: {
        icon: Briefcase,
        accent: 'from-primary/22 via-accent/10 to-secondary/16',
        glow: 'bg-primary/22',
    },
} satisfies Record<VisualFallbackKind, { icon: LucideIcon; accent: string; glow: string }>;

export function VisualFallback({
    kind,
    title,
    eyebrow,
    icon,
    className,
    children,
}: VisualFallbackProps) {
    const config = fallbackConfig[kind];
    const Icon = icon ?? config.icon;

    return (
        <div
            className={cn(
                'relative flex min-h-40 w-full overflow-hidden bg-card text-card-foreground',
                className,
            )}
        >
            <div className={cn('absolute inset-0 bg-gradient-to-br', config.accent)} />
            <div className="absolute inset-0 bg-[linear-gradient(to_right,color-mix(in_oklch,var(--border)_16%,transparent)_1px,transparent_1px),linear-gradient(to_bottom,color-mix(in_oklch,var(--border)_16%,transparent)_1px,transparent_1px)] bg-[size:22px_22px] opacity-45" />
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_78%_18%,color-mix(in_oklch,white_16%,transparent),transparent_36%),radial-gradient(circle_at_18%_82%,color-mix(in_oklch,var(--primary)_22%,transparent),transparent_42%)]" />
            <div className={cn('absolute -right-12 -top-12 h-40 w-40 rounded-full blur-3xl', config.glow)} />
            <div className="absolute -bottom-16 left-8 h-44 w-44 rounded-full bg-background/35 blur-3xl" />

            <div className="relative flex min-h-full w-full flex-col justify-between p-4 sm:p-5">
                <div className="flex items-start justify-between gap-3">
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-border/55 bg-background/60 text-primary shadow-sm backdrop-blur-sm">
                        <Icon className="h-5 w-5" />
                    </div>
                    <div className="flex items-center gap-1.5 rounded-full border border-border/55 bg-background/55 px-2.5 py-1 text-[10px] font-medium uppercase text-muted-foreground backdrop-blur-sm">
                        <Sparkles className="h-3 w-3 text-primary" />
                        {eyebrow ?? kind}
                    </div>
                </div>

                <div className="mt-10 max-w-[86%] space-y-2">
                    <p className="line-clamp-2 text-base font-semibold leading-tight tracking-tight sm:text-lg">
                        {title}
                    </p>
                    {children ? (
                        <div className="text-xs leading-relaxed text-muted-foreground">
                            {children}
                        </div>
                    ) : (
                        <div className="grid max-w-44 grid-cols-3 gap-1.5" aria-hidden="true">
                            <span className="h-1.5 rounded-full bg-foreground/25" />
                            <span className="h-1.5 rounded-full bg-foreground/15" />
                            <span className="h-1.5 rounded-full bg-foreground/20" />
                            <span className="col-span-2 h-1.5 rounded-full bg-foreground/15" />
                            <span className="h-1.5 rounded-full bg-foreground/10" />
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

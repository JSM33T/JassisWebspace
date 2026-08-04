'use client';

import { Code2, Layers3, Server } from 'lucide-react';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from '@/components/ui/dialog';
import { softwareVersions } from '@/lib/product-version';

const components = [
    {
        label: 'User interface',
        name: softwareVersions.ui.name,
        version: softwareVersions.ui.version,
        icon: Code2,
    },
    {
        label: 'Application API',
        name: softwareVersions.api.name,
        version: softwareVersions.api.version,
        icon: Server,
    },
] as const;

export function VersionDialog() {
    return (
        <Dialog>
            <DialogTrigger asChild>
                <button
                    type="button"
                    className="rounded-full border border-transparent px-2 py-0.5 text-[9px] font-medium uppercase tracking-wider text-muted-foreground/60 transition-colors hover:border-border/40 hover:bg-accent/30 hover:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
                    aria-label={`View software versions: UI ${softwareVersions.ui.version}, API ${softwareVersions.api.version}`}
                >
                    UI v{softwareVersions.ui.version} · API v{softwareVersions.api.version}
                </button>
            </DialogTrigger>

            <DialogContent className="overflow-hidden rounded-2xl border-border/60 bg-card/95 p-0 shadow-2xl backdrop-blur-xl sm:max-w-md">
                <DialogHeader className="border-b border-border/50 px-6 pb-5 pt-6">
                    <div className="mb-2 flex h-10 w-10 items-center justify-center rounded-xl border border-border/60 bg-accent/50">
                        <Layers3 className="h-5 w-5 text-foreground" aria-hidden="true" />
                    </div>
                    <DialogTitle className="text-lg">Software versions</DialogTitle>
                    <DialogDescription>
                        Components currently powering Jass Space.
                    </DialogDescription>
                </DialogHeader>

                <div className="grid gap-3 px-6 pb-6">
                    {components.map(({ label, name, version, icon: Icon }) => (
                        <div
                            key={name}
                            className="flex items-center justify-between gap-4 rounded-xl border border-border/50 bg-background/50 p-4"
                        >
                            <div className="flex min-w-0 items-center gap-3">
                                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-accent/70 text-muted-foreground">
                                    <Icon className="h-4 w-4" aria-hidden="true" />
                                </span>
                                <span className="min-w-0">
                                    <span className="block text-xs text-muted-foreground">{label}</span>
                                    <span className="block truncate font-medium text-foreground">{name}</span>
                                </span>
                            </div>
                            <span className="shrink-0 rounded-full border border-border/60 bg-muted/40 px-2.5 py-1 font-mono text-xs text-foreground">
                                v{version}
                            </span>
                        </div>
                    ))}
                </div>
            </DialogContent>
        </Dialog>
    );
}

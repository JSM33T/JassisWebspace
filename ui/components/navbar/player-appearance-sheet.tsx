'use client';

import { NavbarAudioControls } from '@/components/navbar/audio-controls';
import { NavbarAppearanceControls } from '@/components/navbar/theme-controls';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet';

export function PlayerAppearanceSheet({ open, onOpenChange }: {
    open: boolean;
    onOpenChange: (open: boolean) => void;
}) {
    return (
        <Sheet open={open} onOpenChange={onOpenChange}>
            <SheetContent
                side="right"
                className="h-[100dvh] w-screen max-w-none overflow-y-auto data-[side=right]:w-screen data-[side=right]:max-w-none sm:h-full sm:max-w-sm [&_a:focus-visible]:outline-2 [&_a:focus-visible]:outline-offset-2 [&_a:focus-visible]:outline-primary"
            >
                <SheetHeader>
                    <SheetTitle>Player & appearance</SheetTitle>
                    <SheetDescription>Appearance settings and quick controls</SheetDescription>
                </SheetHeader>
                <div className="mt-6 space-y-4 px-4">
                    <NavbarAudioControls isOpen={open} />
                    <NavbarAppearanceControls />
                </div>
            </SheetContent>
        </Sheet>
    );
}

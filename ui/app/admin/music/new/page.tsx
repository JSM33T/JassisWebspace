"use client";

import { MusicForm } from "@/components/admin/music-form";

export default function CreateTrackPage() {
    return (
        <div className="p-8 pt-24 max-w-6xl mx-auto">
            <div className="mb-8">
                <h2 className="text-3xl font-bold tracking-tight">Create Track</h2>
                <p className="text-muted-foreground">Create and publish a new music track.</p>
            </div>
            <MusicForm />
        </div>
    );
}

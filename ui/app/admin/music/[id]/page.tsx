"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { MusicForm } from "@/components/admin/music-form";
import { adminMusicService } from "@/lib/api/admin-music.service";
import { AdminTrackDetail } from "@/lib/api/admin-music.types";
import { Skeleton } from "@/components/ui/skeleton";

export default function EditTrackPage() {
    const params = useParams();
    const [track, setTrack] = useState<AdminTrackDetail | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const loadTrack = async () => {
            if (!params.id) return;
            try {
                setLoading(true);
                const data = await adminMusicService.getTrack(params.id as string);
                setTrack(data);
            } catch (error) {
                console.error("Failed to load track", error);
            } finally {
                setLoading(false);
            }
        };

        loadTrack();
    }, [params.id]);

    if (loading) {
        return (
            <div className="p-8 pt-24 max-w-6xl mx-auto space-y-8">
                <div className="space-y-2">
                    <Skeleton className="h-10 w-1/3" />
                    <Skeleton className="h-4 w-1/4" />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                    <div className="md:col-span-2 space-y-8">
                        <Skeleton className="h-[420px] w-full" />
                    </div>
                    <div className="space-y-8">
                        <Skeleton className="h-[420px] w-full" />
                    </div>
                </div>
            </div>
        );
    }

    if (!track) {
        return (
            <div className="p-8 pt-24 text-center">
                <h2 className="text-2xl font-bold">Track not found</h2>
                <p className="text-muted-foreground">The track you are trying to edit does not exist.</p>
            </div>
        );
    }

    return (
        <div className="p-8 pt-24 max-w-6xl mx-auto">
            <div className="mb-8">
                <h2 className="text-3xl font-bold tracking-tight">Edit Track</h2>
                <p className="text-muted-foreground">Update metadata for &quot;{track.title}&quot;</p>
            </div>
            <MusicForm initialData={track} />
        </div>
    );
}

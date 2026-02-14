"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Music2, Pencil, Plus, Trash2 } from "lucide-react";
import { adminMusicService } from "@/lib/api/admin-music.service";
import { AdminTrackListItem } from "@/lib/api/admin-music.types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";

export default function AdminMusicPage() {
    const [tracks, setTracks] = useState<AdminTrackListItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [deletingId, setDeletingId] = useState<string | null>(null);
    const [search, setSearch] = useState("");
    const [selectedCategory, setSelectedCategory] = useState("all");
    const [artist, setArtist] = useState("");
    const [genre, setGenre] = useState("");
    const [dateFrom, setDateFrom] = useState("");
    const [dateTo, setDateTo] = useState("");
    const [sortBy, setSortBy] = useState<"releaseDate" | "artist" | "genre" | "title" | "created">("releaseDate");
    const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");

    const loadTracks = useCallback(async () => {
        try {
            setLoading(true);
            const data = await adminMusicService.getTracks({
                search: search.trim() || undefined,
                category: selectedCategory === "all" ? undefined : selectedCategory,
                artist: artist.trim() || undefined,
                genre: genre.trim() || undefined,
                dateFrom: dateFrom ? new Date(`${dateFrom}T00:00:00Z`).toISOString() : undefined,
                dateTo: dateTo ? new Date(`${dateTo}T23:59:59Z`).toISOString() : undefined,
                sortBy,
                sortDir,
                page: 1,
                pageSize: 200,
            });
            setTracks(data);
        } catch (error) {
            console.error("Failed to load tracks", error);
            toast.error("Failed to load tracks");
        } finally {
            setLoading(false);
        }
    }, [search, selectedCategory, artist, genre, dateFrom, dateTo, sortBy, sortDir]);

    useEffect(() => {
        const timeout = setTimeout(() => {
            loadTracks();
        }, 250);

        return () => clearTimeout(timeout);
    }, [loadTracks]);

    const handleDelete = async (track: AdminTrackListItem) => {
        const ok = window.confirm(`Delete "${track.title}"?`);
        if (!ok) return;

        try {
            setDeletingId(track.id);
            await adminMusicService.deleteTrack(track.id);
            setTracks((prev) => prev.filter((item) => item.id !== track.id));
            toast.success("Track deleted");
        } catch (error) {
            console.error("Failed to delete track", error);
            toast.error("Failed to delete track");
        } finally {
            setDeletingId(null);
        }
    };

    return (
        <div className="p-8 pt-24 space-y-8">
            <div className="flex items-center justify-between gap-4">
                <div>
                    <h2 className="text-3xl font-bold tracking-tight">Music Management</h2>
                    <p className="text-muted-foreground">
                        Create, edit, and delete tracks with playback and stream metadata.
                    </p>
                </div>
                <Button asChild>
                    <Link href="/admin/music/new">
                        <Plus className="mr-2 h-4 w-4" />
                        Create Track
                    </Link>
                </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <Input
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Search tracks..."
                    className="md:col-span-2"
                />
                <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                    <SelectTrigger>
                        <SelectValue placeholder="Category" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">All Categories</SelectItem>
                        <SelectItem value="originals">Originals</SelectItem>
                        <SelectItem value="remixes">Remixes</SelectItem>
                        <SelectItem value="snippets">Snippets</SelectItem>
                        <SelectItem value="features">Features</SelectItem>
                        <SelectItem value="collaborations">Collaborations</SelectItem>
                        <SelectItem value="covers">Covers</SelectItem>
                    </SelectContent>
                </Select>
                <Input
                    value={artist}
                    onChange={(e) => setArtist(e.target.value)}
                    placeholder="Filter by artist..."
                />
                <Input
                    value={genre}
                    onChange={(e) => setGenre(e.target.value)}
                    placeholder="Filter by genre..."
                />
                <div className="grid grid-cols-2 gap-2">
                    <Input
                        type="date"
                        value={dateFrom}
                        onChange={(e) => setDateFrom(e.target.value)}
                    />
                    <Input
                        type="date"
                        value={dateTo}
                        onChange={(e) => setDateTo(e.target.value)}
                    />
                </div>
                <Select value={sortBy} onValueChange={(value) => setSortBy(value as typeof sortBy)}>
                    <SelectTrigger>
                        <SelectValue placeholder="Sort by" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="releaseDate">Sort: Date</SelectItem>
                        <SelectItem value="artist">Sort: Artist</SelectItem>
                        <SelectItem value="genre">Sort: Genre</SelectItem>
                        <SelectItem value="title">Sort: Title</SelectItem>
                        <SelectItem value="created">Sort: Created</SelectItem>
                    </SelectContent>
                </Select>
                <Select value={sortDir} onValueChange={(value) => setSortDir(value as typeof sortDir)}>
                    <SelectTrigger>
                        <SelectValue placeholder="Direction" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="desc">Desc</SelectItem>
                        <SelectItem value="asc">Asc</SelectItem>
                    </SelectContent>
                </Select>
                <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                        setSearch("");
                        setSelectedCategory("all");
                        setArtist("");
                        setGenre("");
                        setDateFrom("");
                        setDateTo("");
                        setSortBy("releaseDate");
                        setSortDir("desc");
                    }}
                >
                    Clear Filters
                </Button>
            </div>

            {loading ? (
                <div className="space-y-3">
                    {[1, 2, 3].map((i) => (
                        <Skeleton key={i} className="h-24 rounded-xl" />
                    ))}
                </div>
            ) : tracks.length === 0 ? (
                <div className="rounded-xl border bg-card p-8 text-center text-muted-foreground">
                    No tracks found. Create one to get started.
                </div>
            ) : (
                <div className="grid gap-3">
                    {tracks.map((track) => (
                        <Card key={track.id} className="p-4 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                            <div className="space-y-2">
                                <div className="flex items-center gap-2">
                                    <Music2 className="h-4 w-4 text-primary" />
                                    <p className="font-medium">{track.title}</p>
                                </div>
                                <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                                    <Badge variant="outline" className="capitalize">{track.category}</Badge>
                                    <Badge variant={track.isPublished ? "default" : "secondary"}>
                                        {track.isPublished ? "Published" : "Draft"}
                                    </Badge>
                                    <Badge variant={track.hasPlayableSource ? "default" : "outline"}>
                                        {track.hasPlayableSource ? "Playable" : "Inactive"}
                                    </Badge>
                                    <span>{new Date(track.releaseDate).toLocaleDateString()}</span>
                                </div>
                            </div>
                            <div className="flex items-center gap-2">
                                <Button
                                    type="button"
                                    size="sm"
                                    variant="outline"
                                    asChild
                                >
                                    <Link href={`/admin/music/${track.id}`}>
                                        <Pencil className="h-4 w-4 mr-1" />
                                        Edit
                                    </Link>
                                </Button>
                                <Button
                                    type="button"
                                    size="sm"
                                    variant="destructive"
                                    onClick={() => handleDelete(track)}
                                    disabled={deletingId === track.id}
                                >
                                    <Trash2 className="h-4 w-4 mr-1" />
                                    Delete
                                </Button>
                            </div>
                        </Card>
                    ))}
                </div>
            )}
        </div>
    );
}

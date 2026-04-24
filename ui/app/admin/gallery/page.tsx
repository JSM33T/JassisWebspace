"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Plus, Pencil, Trash } from "lucide-react";
import { Album } from "@/lib/api/gallery.types";
import { adminGalleryService } from "@/lib/api/admin-gallery.service";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import Image from "next/image";
import { toast } from "sonner";

export default function AdminGalleryPage() {
    const [albums, setAlbums] = useState<Album[]>([]);
    const [loading, setLoading] = useState(true);
    const [deleting, setDeleting] = useState<string | null>(null);

    useEffect(() => {
        loadAlbums();
    }, []);

    const loadAlbums = async () => {
        try {
            setLoading(true);
            const data = await adminGalleryService.getAllAlbums();
            setAlbums(data);
        } catch (error) {
            console.error("Failed to load albums", error);
            toast.error("Failed to load albums");
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (albumId: string, albumName: string) => {
        if (!confirm(`Are you sure you want to delete "${albumName}"? This will permanently delete all images in this album.`)) {
            return;
        }

        try {
            setDeleting(albumId);
            await adminGalleryService.deleteAlbum(albumId);
            setAlbums(albums.filter(a => a.id !== albumId));
            toast.success("Album deleted");
        } catch (error) {
            console.error("Failed to delete album", error);
            toast.error("Failed to delete album");
        } finally {
            setDeleting(null);
        }
    };

    return (
        <div className="p-8 pt-24 space-y-8">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-3xl font-bold tracking-tight">Gallery</h2>
                    <p className="text-muted-foreground">Manage your photo albums</p>
                </div>
                <Button asChild>
                    <Link href="/admin/gallery/new">
                        <Plus className="mr-2 h-4 w-4" />
                        Create Album
                    </Link>
                </Button>
            </div>

            {loading ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {[1, 2, 3].map((i) => (
                        <Skeleton key={i} className="h-[300px] w-full rounded-xl" />
                    ))}
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {albums.map((album) => (
                        <Card key={album.id} className="overflow-hidden">
                            <div className="relative aspect-video w-full bg-muted">
                                {album.cover ? (
                                    <Image
                                        src={album.cover}
                                        alt={album.name}
                                        fill
                                        sizes="(max-width: 768px) 100vw, (max-width: 1024px) 50vw, 33vw"
                                        className="object-cover"
                                    />
                                ) : (
                                    <div className="flex items-center justify-center h-full text-muted-foreground">
                                        No Cover
                                    </div>
                                )}
                            </div>
                            <CardHeader>
                                <CardTitle>{album.name}</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="flex items-center gap-2 text-xs">
                                    <Badge variant={album.isActive ? "secondary" : "outline"}>
                                        {album.isActive ? "Active" : "Inactive"}
                                    </Badge>
                                    <span className="text-muted-foreground">Sort {album.sortOrder}</span>
                                </div>
                                <p className="text-sm text-muted-foreground line-clamp-2">
                                    {album.description || "No description"}
                                </p>
                                {album.authors.length > 0 && (
                                    <p className="mt-2 text-xs text-muted-foreground line-clamp-1">
                                        By {album.authors.map((a) => a.displayName || a.username).join(", ")}
                                    </p>
                                )}
                                <div className="mt-2 text-xs text-muted-foreground">
                                    {album.imageCount} images - {new Date(album.createdAt).toLocaleDateString()}
                                </div>
                            </CardContent>
                            <CardFooter className="flex justify-end gap-2">
                                <Button variant="outline" size="sm" asChild>
                                    <Link href={`/admin/gallery/${album.id}/edit`}>
                                        <Pencil className="h-4 w-4 mr-2" />
                                        Edit
                                    </Link>
                                </Button>
                                <Button 
                                    variant="destructive" 
                                    size="sm"
                                    onClick={() => handleDelete(album.id, album.name)}
                                    disabled={deleting === album.id}
                                >
                                    <Trash className="h-4 w-4" />
                                </Button>
                            </CardFooter>
                        </Card>
                    ))}
                </div>
            )}
        </div>
    );
}


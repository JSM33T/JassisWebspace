"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { ArrowLeft, Loader2, Upload, X, Trash, Image as ImageIcon, Save } from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
    Form,
    FormControl,
    FormDescription,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { adminGalleryService } from "@/lib/api/admin-gallery.service";
import { galleryService } from "@/lib/api/gallery.service";
import { AlbumWithImages, Image as GalleryImage } from "@/lib/api/gallery.types";
import { Separator } from "@/components/ui/separator";

const formSchema = z.object({
    name: z.string().min(1, "Name is required"),
    description: z.string().optional(),
});

export default function EditAlbumPage() {
    const params = useParams();
    const router = useRouter();
    const albumId = params.id as string;

    const [loading, setLoading] = useState(true);
    const [savingDetails, setSavingDetails] = useState(false);
    const [uploadingImages, setUploadingImages] = useState(false);

    const [album, setAlbum] = useState<AlbumWithImages | null>(null);
    const [coverFile, setCoverFile] = useState<File | null>(null);
    const [coverPreview, setCoverPreview] = useState<string | null>(null);

    const [newImageFiles, setNewImageFiles] = useState<File[]>([]);
    const [newImagesPreview, setNewImagesPreview] = useState<string[]>([]);

    const form = useForm<z.infer<typeof formSchema>>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            name: "",
            description: "",
        },
    });

    useEffect(() => {
        loadAlbum();
    }, [albumId]);

    const loadAlbum = async () => {
        try {
            setLoading(true);
            const data = await galleryService.getAlbumById(albumId);
            setAlbum(data);
            form.reset({
                name: data.name,
                description: data.description || "",
            });
            if (data.cover) {
                setCoverPreview(data.cover);
            }
        } catch (error) {
            console.error("Failed to load album", error);
            toast.error("Failed to load album details");
            router.push("/admin/gallery");
        } finally {
            setLoading(false);
        }
    };

    const handleCoverChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            setCoverFile(file);
            const reader = new FileReader();
            reader.onloadend = () => {
                setCoverPreview(reader.result as string);
            };
            reader.readAsDataURL(file);
        }
    };

    const handleNewImagesChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = Array.from(e.target.files || []);
        if (files.length > 0) {
            setNewImageFiles((prev) => [...prev, ...files]);
            files.forEach((file) => {
                const reader = new FileReader();
                reader.onloadend = () => {
                    setNewImagesPreview((prev) => [...prev, reader.result as string]);
                };
                reader.readAsDataURL(file);
            });
        }
    };

    const removeNewImage = (index: number) => {
        setNewImageFiles((prev) => prev.filter((_, i) => i !== index));
        setNewImagesPreview((prev) => prev.filter((_, i) => i !== index));
    };

    const handleDeleteExistingImage = async (imageId: string) => {
        if (!confirm("Are you sure you want to delete this image?")) return;

        try {
            await adminGalleryService.deleteImage(imageId);
            toast.success("Image deleted");
            // Refresh album data
            loadAlbum();
        } catch (error) {
            console.error(error);
            toast.error("Failed to delete image");
        }
    };

    const onSaveDetails = async (values: z.infer<typeof formSchema>) => {
        try {
            setSavingDetails(true);
            await adminGalleryService.updateAlbum(albumId, {
                name: values.name,
                description: values.description,
                coverImage: coverFile || undefined,
            });
            toast.success("Album details updated");
            // Refresh to get new cover url if changed
            loadAlbum();
        } catch (error) {
            console.error(error);
            toast.error("Failed to update album details");
        } finally {
            setSavingDetails(false);
        }
    };

    const onUploadImages = async () => {
        if (newImageFiles.length === 0) return;

        try {
            setUploadingImages(true);
            const imageTitles = newImageFiles.map((_, i) => `Image`);
            const imageDescriptions = newImageFiles.map(() => "");
            const imageOrders = newImageFiles.map((_, i) => (album?.images.length || 0) + i + 1);

            await adminGalleryService.addImagesToAlbum(albumId, {
                imageFiles: newImageFiles,
                imageTitles,
                imageDescriptions,
                imageOrders,
            });

            toast.success("Images uploaded successfully");
            setNewImageFiles([]);
            setNewImagesPreview([]);
            loadAlbum();
        } catch (error) {
            console.error(error);
            toast.error("Failed to upload images");
        } finally {
            setUploadingImages(false);
        }
    };

    if (loading) {
        return (
            <div className="flex h-[50vh] items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
        );
    }

    if (!album) return null;

    return (
        <div className="p-8 max-w-5xl mx-auto space-y-10">
            <div className="flex items-center gap-4">
                <Button variant="outline" size="icon" asChild>
                    <Link href="/admin/gallery">
                        <ArrowLeft className="h-4 w-4" />
                    </Link>
                </Button>
                <div>
                    <h1 className="text-3xl font-bold">Edit Album</h1>
                    <p className="text-muted-foreground text-sm mt-1">
                        {album.name}
                    </p>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Left Column: Details Form */}
                <div className="lg:col-span-1 space-y-6">
                    <Card>
                        <CardHeader>
                            <CardTitle>Album Details</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <Form {...form}>
                                <form onSubmit={form.handleSubmit(onSaveDetails)} className="space-y-6">
                                    <FormField
                                        control={form.control}
                                        name="name"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Name</FormLabel>
                                                <FormControl>
                                                    <Input {...field} />
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />

                                    <FormField
                                        control={form.control}
                                        name="description"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Description</FormLabel>
                                                <FormControl>
                                                    <Textarea
                                                        className="resize-none min-h-[100px]"
                                                        {...field}
                                                    />
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />

                                    <div className="space-y-3">
                                        <FormLabel>Cover Image</FormLabel>
                                        <div className="relative aspect-video w-full border-2 border-dashed rounded-lg flex items-center justify-center overflow-hidden bg-muted group">
                                            {coverPreview ? (
                                                <Image
                                                    src={coverPreview}
                                                    alt="Cover preview"
                                                    fill
                                                    className="object-cover"
                                                />
                                            ) : (
                                                <div className="text-center text-muted-foreground p-2">
                                                    <ImageIcon className="mx-auto h-8 w-8 mb-2 opacity-50" />
                                                    <span className="text-xs">No cover</span>
                                                </div>
                                            )}
                                            <label className="absolute inset-0 flex items-center justify-center bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer text-white font-medium">
                                                Change Cover
                                                <input
                                                    type="file"
                                                    className="hidden"
                                                    accept="image/*"
                                                    onChange={handleCoverChange}
                                                />
                                            </label>
                                        </div>
                                    </div>

                                    <Button type="submit" className="w-full" disabled={savingDetails}>
                                        {savingDetails && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                        Save Details
                                    </Button>
                                </form>
                            </Form>
                        </CardContent>
                    </Card>
                </div>

                {/* Right Column: Images Management */}
                <div className="lg:col-span-2 space-y-6">
                    {/* Add New Images Section */}
                    <Card>
                        <CardHeader>
                            <CardTitle>Add New Images</CardTitle>
                            <CardDescription>Upload more photos to this album</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="flex items-center gap-4">
                                <Button type="button" variant="outline" className="relative cursor-pointer">
                                    <Upload className="h-4 w-4 mr-2" />
                                    Select Images
                                    <input
                                        type="file"
                                        multiple
                                        accept="image/*"
                                        onChange={handleNewImagesChange}
                                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                                    />
                                </Button>
                                {newImageFiles.length > 0 && (
                                    <span className="text-sm text-muted-foreground">
                                        {newImageFiles.length} images selected
                                    </span>
                                )}
                            </div>

                            {newImagesPreview.length > 0 && (
                                <div className="space-y-4">
                                    <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-3">
                                        {newImagesPreview.map((preview, index) => (
                                            <div key={index} className="relative aspect-square group rounded-md overflow-hidden border bg-muted">
                                                <Image
                                                    src={preview}
                                                    alt={`New ${index}`}
                                                    fill
                                                    className="object-cover"
                                                />
                                                <button
                                                    onClick={() => removeNewImage(index)}
                                                    className="absolute top-1 right-1 p-1 bg-destructive text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                                                >
                                                    <X className="h-3 w-3" />
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                    <div className="flex justify-end">
                                        <Button onClick={onUploadImages} disabled={uploadingImages}>
                                            {uploadingImages && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                            Upload {newImageFiles.length} Images
                                        </Button>
                                    </div>
                                </div>
                            )}
                        </CardContent>
                    </Card>

                    <Separator />

                    {/* Existing Images List */}
                    <div className="space-y-4">
                        <div className="flex items-center justify-between">
                            <h2 className="text-xl font-bold">Existing Images ({album.images.length})</h2>
                        </div>

                        {album.images.length === 0 ? (
                            <div className="text-center py-10 text-muted-foreground">
                                No images in this album yet.
                            </div>
                        ) : (
                            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                                {album.images.map((image) => (
                                    <div key={image.id} className="group relative aspect-square rounded-lg overflow-hidden border bg-muted shadow-sm">
                                        <Image
                                            src={image.url}
                                            alt={image.title || "Album image"}
                                            fill
                                            className="object-cover transition-transform group-hover:scale-105"
                                        />
                                        <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                                            <Button
                                                variant="destructive"
                                                size="icon"
                                                className="h-8 w-8"
                                                onClick={() => handleDeleteExistingImage(image.id)}
                                            >
                                                <Trash className="h-4 w-4" />
                                            </Button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}

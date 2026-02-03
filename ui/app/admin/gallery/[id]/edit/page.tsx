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

    interface NewImage {
        file: File;
        id: string; // temporary id for react key
        preview: string;
        title: string;
        description: string;
        order: number;
    }

    const [newImages, setNewImages] = useState<NewImage[]>([]);

    // State for managing existing image edits
    const [editingImageId, setEditingImageId] = useState<string | null>(null);
    const [editForm, setEditForm] = useState<{ title: string; description: string; order: number } | null>(null);

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
                setCoverPreview(`${data.cover}?t=${new Date().getTime()}`);
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
            const currentCount = (album?.images.length || 0) + newImages.length;

            files.forEach((file, index) => {
                const reader = new FileReader();
                reader.onloadend = () => {
                    setNewImages((prev) => [
                        ...prev,
                        {
                            file,
                            id: Math.random().toString(36).substring(7),
                            preview: reader.result as string,
                            title: file.name.split('.')[0], // Default title from filename
                            description: "",
                            order: currentCount + index + 1
                        }
                    ]);
                };
                reader.readAsDataURL(file);
            });
        }
        // Reset input
        e.target.value = '';
    };

    const updateNewImage = (id: string, field: keyof NewImage, value: string | number) => {
        setNewImages(prev => prev.map(img =>
            img.id === id ? { ...img, [field]: value } : img
        ));
    };

    const removeNewImage = (id: string) => {
        setNewImages((prev) => prev.filter((img) => img.id !== id));
    };

    const handleDeleteExistingImage = async (imageId: string) => {
        if (!confirm("Are you sure you want to delete this image?")) return;

        try {
            await adminGalleryService.deleteImage(imageId);
            toast.success("Image deleted");
            // If deleting the currently edited image, exit edit mode
            if (editingImageId === imageId) {
                setEditingImageId(null);
                setEditForm(null);
            }
            loadAlbum();
        } catch (error) {
            console.error(error);
            toast.error("Failed to delete image");
        }
    };

    const startEditingImage = (image: GalleryImage) => {
        setEditingImageId(image.id);
        setEditForm({
            title: image.title || "",
            description: image.description || "",
            order: image.order
        });
    };

    const cancelEditing = () => {
        setEditingImageId(null);
        setEditForm(null);
    };

    const saveImageEdits = async (imageId: string) => {
        if (!editForm) return;

        try {
            await adminGalleryService.updateImage(imageId, editForm);
            toast.success("Image updated");
            setEditingImageId(null);
            setEditForm(null);
            loadAlbum();
        } catch (error) {
            console.error(error);
            toast.error("Failed to update image");
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
        if (newImages.length === 0) return;

        try {
            setUploadingImages(true);

            const imageFiles = newImages.map(img => img.file);
            const imageTitles = newImages.map(img => img.title);
            const imageDescriptions = newImages.map(img => img.description);
            const imageOrders = newImages.map(img => img.order);

            await adminGalleryService.addImagesToAlbum(albumId, {
                imageFiles,
                imageTitles,
                imageDescriptions,
                imageOrders,
            });

            toast.success("Images uploaded successfully");
            setNewImages([]);
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
                                                    unoptimized
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
                        <CardContent className="space-y-6">
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
                                {newImages.length > 0 && (
                                    <span className="text-sm text-muted-foreground">
                                        {newImages.length} images selected
                                    </span>
                                )}
                            </div>

                            {newImages.length > 0 && (
                                <div className="space-y-4">
                                    <div className="grid grid-cols-1 gap-4">
                                        {newImages.map((img, index) => (
                                            <div key={img.id} className="flex gap-4 p-4 border rounded-lg bg-muted/30">
                                                <div className="relative w-32 h-32 flex-shrink-0 bg-muted rounded-md overflow-hidden">
                                                    <Image
                                                        src={img.preview}
                                                        alt="Preview"
                                                        fill
                                                        className="object-cover"
                                                    />
                                                </div>
                                                <div className="flex-1 space-y-3">
                                                    <div className="grid grid-cols-2 gap-3">
                                                        <div className="space-y-1">
                                                            <label className="text-xs font-medium">Title</label>
                                                            <Input
                                                                value={img.title}
                                                                onChange={(e) => updateNewImage(img.id, 'title', e.target.value)}
                                                                placeholder="Image title"
                                                                className="h-8"
                                                            />
                                                        </div>
                                                        <div className="space-y-1">
                                                            <label className="text-xs font-medium">Order</label>
                                                            <Input
                                                                type="number"
                                                                value={img.order}
                                                                onChange={(e) => updateNewImage(img.id, 'order', parseInt(e.target.value))}
                                                                className="h-8"
                                                            />
                                                        </div>
                                                    </div>
                                                    <div className="space-y-1">
                                                        <label className="text-xs font-medium">Description</label>
                                                        <Input
                                                            value={img.description}
                                                            onChange={(e) => updateNewImage(img.id, 'description', e.target.value)}
                                                            placeholder="Description (optional)"
                                                            className="h-8"
                                                        />
                                                    </div>
                                                </div>
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    className="h-8 w-8 text-muted-foreground hover:text-destructive"
                                                    onClick={() => removeNewImage(img.id)}
                                                >
                                                    <X className="h-4 w-4" />
                                                </Button>
                                            </div>
                                        ))}
                                    </div>
                                    <div className="flex justify-end border-t pt-4">
                                        <Button onClick={onUploadImages} disabled={uploadingImages}>
                                            {uploadingImages && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                            Upload {newImages.length} Images
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
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {album.images.map((image) => (
                                    <div key={image.id} className="group relative border rounded-lg overflow-hidden bg-card shadow-sm">
                                        <div className="flex gap-4 p-3">
                                            {/* Preview */}
                                            <div className="relative w-24 h-24 flex-shrink-0 bg-muted rounded-md overflow-hidden">
                                                <Image
                                                    src={image.url}
                                                    alt={image.title || "Album image"}
                                                    fill
                                                    className="object-cover"
                                                    unoptimized
                                                />
                                            </div>

                                            {/* Content */}
                                            <div className="flex-1 min-w-0">
                                                {editingImageId === image.id && editForm ? (
                                                    <div className="space-y-3">
                                                        <div className="grid grid-cols-3 gap-2">
                                                            <div className="col-span-2">
                                                                <Input
                                                                    value={editForm.title}
                                                                    onChange={(e) => setEditForm({ ...editForm, title: e.target.value })}
                                                                    placeholder="Title"
                                                                    className="h-8 text-sm"
                                                                />
                                                            </div>
                                                            <div>
                                                                <Input
                                                                    type="number"
                                                                    value={editForm.order}
                                                                    onChange={(e) => setEditForm({ ...editForm, order: parseInt(e.target.value) })}
                                                                    className="h-8 text-sm"
                                                                    placeholder="Order"
                                                                />
                                                            </div>
                                                        </div>
                                                        <Input
                                                            value={editForm.description}
                                                            onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                                                            placeholder="Description"
                                                            className="h-8 text-sm"
                                                        />
                                                        <div className="flex justify-between items-center pt-1">
                                                            <Button
                                                                variant="destructive"
                                                                size="sm"
                                                                className="h-7 px-2 text-xs"
                                                                onClick={() => handleDeleteExistingImage(image.id)}
                                                            >
                                                                Delete
                                                            </Button>
                                                            <div className="flex gap-2">
                                                                <Button
                                                                    variant="ghost"
                                                                    size="sm"
                                                                    className="h-7 px-2 text-xs"
                                                                    onClick={cancelEditing}
                                                                >
                                                                    Cancel
                                                                </Button>
                                                                <Button
                                                                    size="sm"
                                                                    className="h-7 px-2 text-xs"
                                                                    onClick={() => saveImageEdits(image.id)}
                                                                >
                                                                    Save
                                                                </Button>
                                                            </div>
                                                        </div>
                                                    </div>
                                                ) : (
                                                    <div className="flex flex-col h-full justify-between">
                                                        <div>
                                                            <div className="flex justify-between items-start gap-2">
                                                                <p className="font-medium text-sm truncate" title={image.title || ""}>
                                                                    {image.title || <span className="text-muted-foreground italic">No title</span>}
                                                                </p>
                                                                <span className="text-xs text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
                                                                    #{image.order}
                                                                </span>
                                                            </div>
                                                            {image.description && (
                                                                <p className="text-xs text-muted-foreground line-clamp-2 mt-1">
                                                                    {image.description}
                                                                </p>
                                                            )}
                                                        </div>
                                                        <div className="flex justify-end pt-2">
                                                            <Button
                                                                variant="outline"
                                                                size="sm"
                                                                className="h-7 text-xs opacity-0 group-hover:opacity-100 transition-opacity"
                                                                onClick={() => startEditingImage(image)}
                                                            >
                                                                Edit
                                                            </Button>
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
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

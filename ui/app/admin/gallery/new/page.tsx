"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { ArrowLeft, Loader2, Upload, X, Image as ImageIcon } from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import { toast } from "sonner";
import { ImageCropper } from "@/components/ui/image-cropper";

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
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { adminGalleryService } from "@/lib/api/admin-gallery.service";
import { GalleryAuthor } from "@/lib/api/gallery.types";

const formSchema = z.object({
    name: z.string().min(1, "Name is required"),
    slug: z.string().optional(),
    description: z.string().optional(),
    authorIds: z.array(z.string()).optional(),
    isActive: z.boolean(),
    sortOrder: z.string().optional().refine(
        (value) => {
            const normalized = value?.trim() ?? "";
            return normalized === "" || /^\d+$/.test(normalized);
        },
        "Sort order must be zero or greater",
    ),
});

export default function CreateAlbumPage() {
    const router = useRouter();
    const [loading, setLoading] = useState(false);
    const [coverFile, setCoverFile] = useState<File | null>(null);
    const [coverPreview, setCoverPreview] = useState<string | null>(null);
    const [selectedImages, setSelectedImages] = useState<Array<{ id: string; file: File; preview: string }>>([]);
    const [uploadProgress, setUploadProgress] = useState<{ current: number; total: number } | null>(null);
    const [authors, setAuthors] = useState<GalleryAuthor[]>([]);
    const [authorSearch, setAuthorSearch] = useState("");

    // Cropper state
    const [cropperOpen, setCropperOpen] = useState(false);
    const [tempCoverSrc, setTempCoverSrc] = useState<string | null>(null);

    const form = useForm<z.infer<typeof formSchema>>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            name: "",
            slug: "",
            description: "",
            authorIds: [],
            isActive: true,
            sortOrder: "",
        },
    });

    useEffect(() => {
        const timeoutId = setTimeout(async () => {
            try {
                const data = await adminGalleryService.getPotentialAuthors(authorSearch.trim() || undefined);
                setAuthors(data);
            } catch (error) {
                console.error("Failed to load authors", error);
            }
        }, 250);

        return () => clearTimeout(timeoutId);
    }, [authorSearch]);

    const handleCoverChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => {
                setTempCoverSrc(reader.result as string);
                setCropperOpen(true);
                e.target.value = ""; // Reset input
            };
            reader.readAsDataURL(file);
        }
    };

    const onCropComplete = (croppedBlob: Blob) => {
        const file = new File([croppedBlob], "cover-image.webp", { type: "image/webp" });
        setCoverFile(file);
        setCoverPreview(URL.createObjectURL(file));
    };

    const handleImagesChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = Array.from(e.target.files || []);
        if (files.length > 0) {
            files.forEach((file) => {
                const reader = new FileReader();
                reader.onloadend = () => {
                    setSelectedImages((prev) => [
                        ...prev,
                        {
                            id: Math.random().toString(36).slice(2),
                            file,
                            preview: reader.result as string,
                        },
                    ]);
                };
                reader.readAsDataURL(file);
            });
        }

        e.target.value = "";
    };

    const removeImage = (imageId: string) => {
        setSelectedImages((prev) => prev.filter((image) => image.id !== imageId));
    };

    async function onSubmit(values: z.infer<typeof formSchema>) {
        let createdAlbumId: string | null = null;

        try {
            setLoading(true);
            const sortOrder = values.sortOrder?.trim() ? Number(values.sortOrder) : undefined;

            const createdAlbum = await adminGalleryService.createAlbum({
                name: values.name,
                slug: values.slug,
                description: values.description,
                authorIds: values.authorIds || [],
                isActive: values.isActive,
                sortOrder,
                coverImage: coverFile || undefined,
            });
            createdAlbumId = createdAlbum.id;

            if (selectedImages.length > 0) {
                setUploadProgress({ current: 0, total: selectedImages.length });

                for (const [index, image] of selectedImages.entries()) {
                    setUploadProgress({ current: index + 1, total: selectedImages.length });
                    await adminGalleryService.addImageToAlbum(createdAlbum.id, {
                        imageFile: image.file,
                        title: `Image ${index + 1}`,
                        description: "",
                        order: index + 1,
                    });
                }
            }

            toast.success("Album created successfully");

            router.push("/admin/gallery");
            router.refresh();
        } catch (error) {
            console.error(error);
            if (createdAlbumId) {
                toast.error("Album was created, but one or more images failed to upload. You can continue from the edit page.");
                router.push(`/admin/gallery/${createdAlbumId}/edit`);
                router.refresh();
                return;
            }

            toast.error("Failed to create album. Please try again.");
        } finally {
            setUploadProgress(null);
            setLoading(false);
        }
    }

    return (
        <div className="p-8 max-w-5xl mx-auto">
            <div className="flex items-center gap-4 mb-8 pt-16 ">
                <Button variant="outline" size="icon" asChild>
                    <Link href="/admin/gallery">
                        <ArrowLeft className="h-4 w-4" />
                    </Link>
                </Button>
                <h1 className="text-3xl font-bold">Create New Album</h1>
            </div>

            <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        <div className="space-y-6">
                            <FormField
                                control={form.control}
                                name="name"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Album Name</FormLabel>
                                        <FormControl>
                                            <Input placeholder="Summer Vacation 2024" {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            <FormField
                                control={form.control}
                                name="slug"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Slug</FormLabel>
                                        <FormControl>
                                            <Input placeholder="album-slug" {...field} />
                                        </FormControl>
                                        <FormDescription>
                                            Leave empty to auto-generate from name.
                                        </FormDescription>
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
                                                placeholder="A brief description of this album..."
                                                className="resize-none min-h-[120px]"
                                                {...field}
                                            />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            <FormField
                                control={form.control}
                                name="sortOrder"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Sort Order</FormLabel>
                                        <FormControl>
                                            <Input
                                                type="number"
                                                min={0}
                                                placeholder="Leave empty to append at the end"
                                                value={field.value ?? ""}
                                                onChange={(event) => field.onChange(event.target.value)}
                                            />
                                        </FormControl>
                                        <FormDescription>
                                            Lower values appear first in the public gallery.
                                        </FormDescription>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            <FormField
                                control={form.control}
                                name="isActive"
                                render={({ field }) => (
                                    <FormItem className="flex items-center justify-between rounded-lg border p-4">
                                        <div className="space-y-1 pr-4">
                                            <FormLabel>Album Active</FormLabel>
                                            <FormDescription>
                                                Inactive albums stay hidden from the public gallery until enabled.
                                            </FormDescription>
                                        </div>
                                        <FormControl>
                                            <Switch checked={field.value} onCheckedChange={field.onChange} />
                                        </FormControl>
                                    </FormItem>
                                )}
                            />

                            <FormField
                                control={form.control}
                                name="authorIds"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Authors</FormLabel>
                                        <FormControl>
                                            <div className="border rounded-md p-4 space-y-3 max-h-56 overflow-y-auto">
                                                <Input
                                                    placeholder="Search authors..."
                                                    value={authorSearch}
                                                    onChange={(e) => setAuthorSearch(e.target.value)}
                                                    className="h-8"
                                                />
                                                {authors.map((author) => (
                                                    <div key={author.userId} className="flex items-center space-x-2">
                                                        <input
                                                            type="checkbox"
                                                            checked={field.value?.includes(author.userId) || false}
                                                            onChange={(e) => {
                                                                const checked = e.target.checked;
                                                                const current = field.value || [];
                                                                const updated = checked
                                                                    ? [...current, author.userId]
                                                                    : current.filter((id) => id !== author.userId);
                                                                field.onChange(updated);
                                                            }}
                                                            className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-600"
                                                        />
                                                        <label className="text-sm font-medium leading-none">
                                                            {author.displayName || author.username}
                                                        </label>
                                                    </div>
                                                ))}
                                                {authors.length === 0 && (
                                                    <p className="text-xs text-muted-foreground">No authors found.</p>
                                                )}
                                            </div>
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            <div className="space-y-4">
                                <FormLabel>Cover Image</FormLabel>
                                <div className="flex items-center gap-4">
                                    <div className="relative w-40 h-40 border-2 border-dashed rounded-lg flex items-center justify-center overflow-hidden bg-muted">
                                        {coverPreview ? (
                                            <Image
                                                src={coverPreview}
                                                alt="Cover preview"
                                                fill
                                                className="object-cover"
                                            />
                                        ) : (
                                            <div className="text-center text-muted-foreground p-2">
                                                <Upload className="mx-auto h-8 w-8 mb-2 opacity-50" />
                                                <span className="text-xs">No cover selected</span>
                                            </div>
                                        )}
                                    </div>
                                    <div className="flex-1">
                                        <Input
                                            type="file"
                                            accept="image/*"
                                            onChange={handleCoverChange}
                                            className="cursor-pointer"
                                        />
                                        <p className="text-xs text-muted-foreground mt-2">
                                            Upload a cover image for the album card.
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="space-y-4">
                            <div className="flex items-center justify-between">
                                <FormLabel>Gallery Images</FormLabel>
                                <div className="relative">
                                    <Button type="button" variant="outline" size="sm" className="relative cursor-pointer">
                                        <Upload className="h-4 w-4 mr-2" />
                                        Add Images
                                        <input
                                            type="file"
                                            multiple
                                            accept="image/*"
                                            onChange={handleImagesChange}
                                            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                                        />
                                    </Button>
                                </div>
                            </div>
                            <p className="text-xs text-muted-foreground">
                                Images are uploaded one by one after the album is created to avoid oversized requests.
                            </p>

                            <Card className="min-h-[400px]">
                                <CardContent className="p-4">
                                    {selectedImages.length === 0 ? (
                                        <div className="h-full flex flex-col items-center justify-center text-muted-foreground py-20">
                                            <ImageIcon className="h-16 w-16 mb-4 opacity-20" />
                                            <p>No images added yet</p>
                                            <p className="text-sm">Click &quot;Add Images&quot; to upload photos</p>
                                        </div>
                                    ) : (
                                        <div className="space-y-4">
                                            {uploadProgress ? (
                                                <p className="text-sm text-muted-foreground">
                                                    Uploading image {uploadProgress.current} of {uploadProgress.total}
                                                </p>
                                            ) : null}
                                            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                                                {selectedImages.map((image, index) => (
                                                    <div key={image.id} className="relative aspect-square group rounded-md overflow-hidden border bg-muted">
                                                        <Image
                                                            src={image.preview}
                                                            alt={`Preview ${index}`}
                                                            fill
                                                            className="object-cover"
                                                        />
                                                        <button
                                                            type="button"
                                                            onClick={() => removeImage(image.id)}
                                                            className="absolute top-2 right-2 p-1 bg-destructive text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                                                        >
                                                            <X className="h-3 w-3" />
                                                        </button>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </CardContent>
                            </Card>
                        </div>
                    </div>

                    <div className="flex justify-end">
                        <Button type="submit" size="lg" disabled={loading}>
                            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            {uploadProgress
                                ? `Uploading ${uploadProgress.current}/${uploadProgress.total}`
                                : "Create Album"}
                        </Button>
                    </div>
                </form>
            </Form>

            <ImageCropper
                isOpen={cropperOpen}
                onClose={() => setCropperOpen(false)}
                imageSrc={tempCoverSrc}
                onCropComplete={onCropComplete}
                aspectRatio={4 / 3}
                outputWidth={800}
                outputHeight={600}
                outputFormat="image/webp"
            />
        </div>
    );
}

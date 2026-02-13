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
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { adminGalleryService } from "@/lib/api/admin-gallery.service";
import { GalleryAuthor } from "@/lib/api/gallery.types";

const formSchema = z.object({
    name: z.string().min(1, "Name is required"),
    slug: z.string().optional(),
    description: z.string().optional(),
    authorIds: z.array(z.string()).optional(),
});

export default function CreateAlbumPage() {
    const router = useRouter();
    const [loading, setLoading] = useState(false);
    const [coverFile, setCoverFile] = useState<File | null>(null);
    const [coverPreview, setCoverPreview] = useState<string | null>(null);
    const [imageFiles, setImageFiles] = useState<File[]>([]);
    const [imagesPreview, setImagesPreview] = useState<string[]>([]);
    const [authors, setAuthors] = useState<GalleryAuthor[]>([]);

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
        },
    });

    useEffect(() => {
        const loadAuthors = async () => {
            try {
                const data = await adminGalleryService.getPotentialAuthors();
                setAuthors(data);
            } catch (error) {
                console.error("Failed to load authors", error);
            }
        };

        loadAuthors();
    }, []);

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
            setImageFiles((prev) => [...prev, ...files]);
            files.forEach((file) => {
                const reader = new FileReader();
                reader.onloadend = () => {
                    setImagesPreview((prev) => [...prev, reader.result as string]);
                };
                reader.readAsDataURL(file);
            });
        }
    };

    const removeImage = (index: number) => {
        setImageFiles((prev) => prev.filter((_, i) => i !== index));
        setImagesPreview((prev) => prev.filter((_, i) => i !== index));
    };

    async function onSubmit(values: z.infer<typeof formSchema>) {
        try {
            setLoading(true);

            const imageTitles = imageFiles.map((_, i) => `Image ${i + 1}`);
            const imageDescriptions = imageFiles.map(() => "");
            const imageOrders = imageFiles.map((_, i) => i + 1);

            await adminGalleryService.createAlbum({
                name: values.name,
                description: values.description,
                authorIds: values.authorIds || [],
                coverImage: coverFile || undefined,
                imageFiles: imageFiles.length > 0 ? imageFiles : undefined,
                imageTitles,
                imageDescriptions,
                imageOrders,
            });

            toast.success("Album created successfully");

            router.push("/admin/gallery");
            router.refresh();
        } catch (error) {
            console.error(error);
            toast.error("Failed to create album. Please try again.");
        } finally {
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
                                name="authorIds"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Authors</FormLabel>
                                        <FormControl>
                                            <div className="border rounded-md p-4 space-y-2 max-h-48 overflow-y-auto">
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

                            <Card className="min-h-[400px]">
                                <CardContent className="p-4">
                                    {imagesPreview.length === 0 ? (
                                        <div className="h-full flex flex-col items-center justify-center text-muted-foreground py-20">
                                            <ImageIcon className="h-16 w-16 mb-4 opacity-20" />
                                            <p>No images added yet</p>
                                            <p className="text-sm">Click &quot;Add Images&quot; to upload photos</p>
                                        </div>
                                    ) : (
                                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                                            {imagesPreview.map((preview, index) => (
                                                <div key={index} className="relative aspect-square group rounded-md overflow-hidden border bg-muted">
                                                    <Image
                                                        src={preview}
                                                        alt={`Preview ${index}`}
                                                        fill
                                                        className="object-cover"
                                                    />
                                                    <button
                                                        type="button"
                                                        onClick={() => removeImage(index)}
                                                        className="absolute top-2 right-2 p-1 bg-destructive text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                                                    >
                                                        <X className="h-3 w-3" />
                                                    </button>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </CardContent>
                            </Card>
                        </div>
                    </div>

                    <div className="flex justify-end">
                        <Button type="submit" size="lg" disabled={loading}>
                            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Create Album
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

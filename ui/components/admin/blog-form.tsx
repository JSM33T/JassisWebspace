"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Loader2, Upload, X } from "lucide-react";

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
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { BlogAuthor, BlogCategory, BlogDetail, CreateBlogRequest } from "@/lib/api/blog.types";
import { adminBlogService } from "@/lib/api/admin-blog.service";
import { adminGalleryService } from "@/lib/api/admin-gallery.service";
import Image from "next/image";
import { ImageCropper } from "@/components/ui/image-cropper";

const blogSchema = z.object({
    title: z.string().min(1, "Title is required"),
    slug: z.string().optional(),
    excerpt: z.string().optional(),
    content: z.string().optional(), // Content is optional for initial creation
    featuredImage: z.string().optional(),
    categoryId: z.string().optional(),
    authorIds: z.array(z.string()).optional(),
    isPublished: z.boolean(),
});

type BlogFormValues = z.infer<typeof blogSchema>;

interface BlogFormProps {
    initialData?: BlogDetail;
}

export function BlogForm({ initialData }: BlogFormProps) {
    const router = useRouter();
    const [loading, setLoading] = useState(false);
    const [categories, setCategories] = useState<BlogCategory[]>([]);
    const [authors, setAuthors] = useState<BlogAuthor[]>([]);
    const [authorSearch, setAuthorSearch] = useState("");
    const [uploading, setUploading] = useState(false);

    // Determine if we are in "Edit" mode (have an existing blog ID)
    const isEditing = !!initialData?.id;

    const form = useForm<BlogFormValues>({
        resolver: zodResolver(blogSchema),
        defaultValues: {
            title: initialData?.title || "",
            slug: initialData?.slug || "",
            excerpt: initialData?.excerpt || "",
            // Default content to empty string if not present
            content: initialData?.content || "",
            featuredImage: initialData?.featuredImage || "",
            categoryId: initialData?.category?.id || undefined,
            authorIds: initialData?.authors?.map((a) => a.userId) || [],
            isPublished: initialData?.isPublished || false,
        },
    });

    useEffect(() => {
        const loadCategories = async () => {
            try {
                const cats = await adminBlogService.getAllCategories();
                setCategories(cats);
            } catch (error) {
                console.error("Failed to load categories", error);
            }
        };

        loadCategories();
    }, []);

    useEffect(() => {
        const timeoutId = setTimeout(async () => {
            try {
                const auths = await adminBlogService.getPotentialAuthors(authorSearch.trim() || undefined);
                setAuthors(auths);
            } catch (error) {
                console.error("Failed to load authors", error);
            }
        }, 250);

        return () => clearTimeout(timeoutId);
    }, [authorSearch]);

    const [selectedImage, setSelectedImage] = useState<File | null>(null);
    const [previewUrl, setPreviewUrl] = useState<string | null>(null);
    const [cropperOpen, setCropperOpen] = useState(false);
    const [tempImageSrc, setTempImageSrc] = useState<string | null>(null);

    const onCropComplete = (croppedBlob: Blob) => {
        const file = new File([croppedBlob], "cropped-cover.jpg", { type: "image/jpeg" });
        setSelectedImage(file);
        setPreviewUrl(URL.createObjectURL(file));
    };

    const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        if (!file.type.startsWith("image/")) {
            alert("Please select an image file");
            return;
        }

        const reader = new FileReader();
        reader.addEventListener("load", () => {
            setTempImageSrc(reader.result?.toString() || null);
            setCropperOpen(true);
            e.target.value = ""; // Reset input
        });
        reader.readAsDataURL(file);
    };
    const onSubmit = async (data: BlogFormValues) => {
        try {
            setLoading(true);

            // Determine Blog ID (use existing or generate new for CREATE)
            // For creation, we generate one to ensure image sync, 
            // BUT backend might ignore it if we don't pass it correctly.
            // We already updated backend to accept ID.
            const blogId = initialData?.id || crypto.randomUUID();

            let featuredImageUrl = data.featuredImage;

            if (selectedImage) {
                try {
                    // Upload image with blogId as filename
                    const { url } = await adminGalleryService.uploadImage(selectedImage, blogId);
                    featuredImageUrl = url;
                } catch (error) {
                    console.error("Failed to upload image", error);
                    alert("Failed to upload image.");
                    return; // Stop submission if upload fails
                }
            }

            const requestData: CreateBlogRequest = {
                ...data,
                id: blogId,
                content: data.content || "", // Allow empty content for draft
                slug: data.slug || undefined,
                excerpt: data.excerpt || undefined,
                featuredImage: featuredImageUrl || undefined,
                categoryId: data.categoryId || undefined,
                authorIds: data.authorIds || [],
            };

            if (initialData) {
                await adminBlogService.updateBlog(initialData.id, requestData);
                router.refresh();
                // Stay on page or optional redirect
            } else {
                const response = await adminBlogService.createBlog(requestData);
                // Redirect to the edit page for this new blog to enable content editing
                // response should ideally contain the ID, but we generated 'blogId' so we know it.
                // However, let's use the response ID if available to be safe, or fall back to ours.
                // The API might return the created object.
                // Assuming createBlog returns the created blog or we can use our generated ID.
                // Let's assume we can navigate to /admin/blogs/{blogId}
                router.push(`/admin/blogs/${blogId}`);
                router.refresh();
            }
        } catch (error) {
            console.error("Failed to save blog", error);
            alert("Failed to save blog. Please try again.");
        } finally {
            setLoading(false);
        }
    };


    return (
        <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                    <div className="md:col-span-2 space-y-8">
                        <FormField
                            control={form.control}
                            name="title"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Title</FormLabel>
                                    <FormControl>
                                        <Input
                                            placeholder="Blog post title"
                                            {...field}
                                        />
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
                                        <Input placeholder="url-friendly-slug" {...field} />
                                    </FormControl>
                                    <FormDescription>
                                        Leave empty to auto-generate from title.
                                    </FormDescription>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        {isEditing ? (
                            <FormField
                                control={form.control}
                                name="content"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Content</FormLabel>
                                        <FormControl>
                                            <div className="space-y-2">
                                                <div className="flex justify-between items-center">
                                                    <p className="text-sm text-muted-foreground">
                                                        Supports Markdown
                                                    </p>
                                                    <div>
                                                        <input
                                                            type="file"
                                                            id="content-image-upload"
                                                            className="hidden"
                                                            accept="image/*"
                                                            onChange={async (e) => {
                                                                const file = e.target.files?.[0];
                                                                if (!file) return;

                                                                try {
                                                                    setUploading(true);
                                                                    // Use the existing blog ID from initialData
                                                                    // Generate custom filename: blog-{blogId}-{random/timestamp}
                                                                    const blogId = initialData?.id;
                                                                    if (!blogId) {
                                                                        alert("Error: Missing Blog ID");
                                                                        return;
                                                                    }

                                                                    const timestamp = Date.now();
                                                                    const fileName = `blog-${blogId}-${timestamp}`;

                                                                    const { url } = await adminGalleryService.uploadImage(file, fileName);

                                                                    // Insert markdown into textarea
                                                                    const textarea = document.getElementById("content-textarea") as HTMLTextAreaElement;
                                                                    if (textarea) {
                                                                        const start = textarea.selectionStart;
                                                                        const end = textarea.selectionEnd;
                                                                        const text = textarea.value;
                                                                        const before = text.substring(0, start);
                                                                        const after = text.substr(end);
                                                                        const imageMarkdown = `\n![Image](${url})\n`;

                                                                        const newText = before + imageMarkdown + after;

                                                                        // Update form value
                                                                        field.onChange(newText);

                                                                        // Wait for render then restore cursor ?? 
                                                                        // React Hook Form handles value binding.
                                                                    }
                                                                } catch (error) {
                                                                    console.error("Failed to upload content image", error);
                                                                    alert("Failed to upload image");
                                                                } finally {
                                                                    setUploading(false);
                                                                    // Reset input
                                                                    e.target.value = "";
                                                                }
                                                            }}
                                                        />
                                                        <Button
                                                            type="button"
                                                            variant="ghost"
                                                            size="sm"
                                                            onClick={() => document.getElementById("content-image-upload")?.click()}
                                                            disabled={uploading}
                                                        >
                                                            {uploading ? (
                                                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                                            ) : (
                                                                <Upload className="mr-2 h-4 w-4" />
                                                            )}
                                                            Insert Image
                                                        </Button>
                                                    </div>
                                                </div>
                                                <Textarea
                                                    placeholder="Write your blog post content here..."
                                                    className="min-h-[400px] font-mono"
                                                    {...field}
                                                    id="content-textarea"
                                                />
                                            </div>
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        ) : (
                            <div className="p-12 border-2 border-dashed rounded-lg text-center bg-muted/20">
                                <h3 className="text-lg font-medium text-muted-foreground mb-2">Content Editor Locked</h3>
                                <p className="text-sm text-muted-foreground mb-4">
                                    Please save the blog details first to unlock the content editor and image uploads.
                                </p>
                                <Button type="button" variant="secondary" disabled>
                                    Save to start writing
                                </Button>
                            </div>
                        )}

                        <FormField
                            control={form.control}
                            name="excerpt"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Excerpt</FormLabel>
                                    <FormControl>
                                        <Textarea
                                            placeholder="Brief summary for list view"
                                            className="h-24"
                                            {...field}
                                        />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                    </div>

                    <div className="space-y-8">
                        <Card className="p-4 space-y-4">
                            <FormField
                                control={form.control}
                                name="isPublished"
                                render={({ field }) => (
                                    <FormItem className="flex flex-row items-center space-x-3 space-y-0 rounded-md border p-4">
                                        <FormControl>
                                            <input
                                                type="checkbox"
                                                checked={field.value}
                                                onChange={field.onChange}
                                                className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-600"
                                            />
                                        </FormControl>
                                        <div className="space-y-1 leading-none">
                                            <FormLabel>
                                                Published
                                            </FormLabel>
                                            <FormDescription>
                                                Make this post visible to the public.
                                            </FormDescription>
                                        </div>
                                    </FormItem>
                                )}
                            />

                            <Button type="submit" disabled={loading} className="w-full">
                                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                {initialData ? "Update Post" : "Create Draft & Continue"}
                            </Button>
                        </Card>

                        <div className="space-y-4">
                            <FormField
                                control={form.control}
                                name="categoryId"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Category</FormLabel>
                                        <Select
                                            onValueChange={field.onChange}
                                            defaultValue={field.value}
                                            value={field.value}
                                        >
                                            <FormControl>
                                                <SelectTrigger>
                                                    <SelectValue placeholder="Select a category" />
                                                </SelectTrigger>
                                            </FormControl>
                                            <SelectContent>
                                                {categories.map((category) => (
                                                    <SelectItem key={category.id} value={category.id}>
                                                        {category.name}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
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
                                                        <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
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
                        </div>

                        <FormField
                            control={form.control}
                            name="featuredImage"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Featured Image</FormLabel>
                                    <FormControl>
                                        <div className="space-y-4">
                                            {(previewUrl || field.value) && (
                                                <div className="relative aspect-video rounded-md overflow-hidden border">
                                                    <Image
                                                        src={previewUrl || field.value || ""}
                                                        alt="Featured"
                                                        fill
                                                        className="object-cover"
                                                        unoptimized
                                                    />
                                                    <Button
                                                        type="button"
                                                        variant="destructive"
                                                        size="icon"
                                                        className="absolute top-2 right-2 h-6 w-6"
                                                        onClick={() => {
                                                            field.onChange("");
                                                            setSelectedImage(null);
                                                            setPreviewUrl(null);
                                                        }}
                                                    >
                                                        <X className="h-4 w-4" />
                                                    </Button>
                                                </div>
                                            )}
                                            <div className="flex items-center gap-2">
                                                <Input
                                                    placeholder="Image URL"
                                                    {...field}
                                                    className="flex-1"
                                                />
                                                <Button
                                                    type="button"
                                                    variant="outline"
                                                    size="icon"
                                                    disabled={uploading}
                                                    onClick={() => document.getElementById("featured-image-upload")?.click()}
                                                >
                                                    {uploading ? (
                                                        <Loader2 className="h-4 w-4 animate-spin" />
                                                    ) : (
                                                        <Upload className="h-4 w-4" />
                                                    )}
                                                </Button>
                                                <input
                                                    id="featured-image-upload"
                                                    type="file"
                                                    accept="image/*"
                                                    className="hidden"
                                                    onChange={handleImageUpload}
                                                />
                                            </div>
                                        </div>
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                    </div>
                </div>
            </form>
            <ImageCropper
                isOpen={cropperOpen}
                onClose={() => setCropperOpen(false)}
                imageSrc={tempImageSrc}
                onCropComplete={onCropComplete}
                aspectRatio={16 / 9}
                outputWidth={1920}
                outputHeight={1080}
                outputFormat="image/jpeg"
            />
        </Form>
    );
}

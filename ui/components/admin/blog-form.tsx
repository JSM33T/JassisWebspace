"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { ChevronDown, Loader2, Upload, X } from "lucide-react";

import { BlogWritingPad } from "@/components/admin/blog-writing-pad";
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
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { BlogAuthor, BlogCategory, BlogDetail, CreateBlogRequest } from "@/lib/api/blog.types";
import { adminBlogService } from "@/lib/api/admin-blog.service";
import Image from "next/image";
import { ImageCropper } from "@/components/ui/image-cropper";
import { toast } from "sonner";

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
    allowCategoryManagement?: boolean;
    allowAuthorSelection?: boolean;
}

export function BlogForm({
    initialData,
    allowCategoryManagement = true,
    allowAuthorSelection = true,
}: BlogFormProps) {
    const router = useRouter();
    const [loading, setLoading] = useState(false);
    const [categories, setCategories] = useState<BlogCategory[]>([]);
    const [authors, setAuthors] = useState<BlogAuthor[]>([]);
    const [authorSearch, setAuthorSearch] = useState("");
    const [categoryEditorName, setCategoryEditorName] = useState("");
    const [categoryEditorDescription, setCategoryEditorDescription] = useState("");
    const [savingCategory, setSavingCategory] = useState(false);

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
        if (!allowAuthorSelection) {
            return;
        }

        const timeoutId = setTimeout(async () => {
            try {
                const auths = await adminBlogService.getPotentialAuthors(authorSearch.trim() || undefined);
                setAuthors(auths);
            } catch (error) {
                console.error("Failed to load authors", error);
            }
        }, 250);

        return () => clearTimeout(timeoutId);
    }, [allowAuthorSelection, authorSearch]);

    const selectedCategoryId = form.watch("categoryId");

    useEffect(() => {
        if (!selectedCategoryId) {
            setCategoryEditorName("");
            setCategoryEditorDescription("");
            return;
        }

        const selected = categories.find((c) => c.id === selectedCategoryId);
        if (!selected) return;
        setCategoryEditorName(selected.name);
        setCategoryEditorDescription(selected.description || "");
    }, [selectedCategoryId, categories]);

    const reloadCategories = async () => {
        const cats = await adminBlogService.getAllCategories();
        setCategories(cats);
        return cats;
    };

    const handleCreateCategory = async () => {
        if (!categoryEditorName.trim()) {
            toast.error("Category name is required");
            return;
        }

        try {
            setSavingCategory(true);
            const created = await adminBlogService.createCategory({
                name: categoryEditorName.trim(),
                description: categoryEditorDescription.trim() || undefined,
            });
            const cats = await reloadCategories();
            form.setValue("categoryId", created.id, { shouldDirty: true });
            const selected = cats.find((c) => c.id === created.id);
            setCategoryEditorName(selected?.name || created.name);
            setCategoryEditorDescription(selected?.description || "");
            toast.success("Category created");
        } catch (error) {
            console.error("Failed to create category", error);
            toast.error("Failed to create category");
        } finally {
            setSavingCategory(false);
        }
    };

    const handleUpdateCategory = async () => {
        if (!selectedCategoryId) {
            toast.error("Select a category to update");
            return;
        }

        if (!categoryEditorName.trim()) {
            toast.error("Category name is required");
            return;
        }

        try {
            setSavingCategory(true);
            await adminBlogService.updateCategory(selectedCategoryId, {
                name: categoryEditorName.trim(),
                description: categoryEditorDescription.trim() || undefined,
            });
            await reloadCategories();
            toast.success("Category updated");
        } catch (error) {
            console.error("Failed to update category", error);
            toast.error("Failed to update category");
        } finally {
            setSavingCategory(false);
        }
    };

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
            toast.error("Please select an image file");
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
                    const { url } = await adminBlogService.uploadImage(selectedImage, initialData?.id);
                    featuredImageUrl = url;
                } catch (error) {
                    console.error("Failed to upload image", error);
                    toast.error("Failed to upload image");
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
                toast.success("Blog updated");
                router.refresh();
                // Stay on page or optional redirect
            } else {
                const created = await adminBlogService.createBlog(requestData);
                toast.success("Blog created");
                // Redirect to the edit page for this new blog to enable content editing
                // response should ideally contain the ID, but we generated 'blogId' so we know it.
                // However, let's use the response ID if available to be safe, or fall back to ours.
                // The API might return the created object.
                // Assuming createBlog returns the created blog or we can use our generated ID.
                // Let's assume we can navigate to /admin/blogs/{blogId}
                router.push(`/admin/blogs/${created.id || blogId}`);
                router.refresh();
            }
        } catch (error) {
            console.error("Failed to save blog", error);
            toast.error("Failed to save blog");
        } finally {
            setLoading(false);
        }
    };

    const isPublished = form.watch("isPublished");
    const submitLabel = isEditing
        ? "Update post"
        : (isPublished ? "Publish and continue" : "Create draft and continue");

    return (
        <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="@container">
                <div className="grid min-w-0 items-start gap-6 @3xl:grid-cols-[minmax(0,1fr)_19rem]">
                    <div className="grid min-w-0 gap-6">
                        <Card role="region" aria-labelledby="blog-details-heading">
                            <CardHeader>
                                <h3 id="blog-details-heading" className="text-base font-semibold">Post details</h3>
                            </CardHeader>
                            <CardContent className="space-y-5">
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
                            </CardContent>
                        </Card>

                        <Card role="region" aria-labelledby="blog-content-heading">
                            <CardHeader>
                                <h3 id="blog-content-heading" className="text-base font-semibold">Post content</h3>
                            </CardHeader>
                            <CardContent>
                                <FormField
                                    control={form.control}
                                    name="content"
                                    render={({ field }) => (
                                        <BlogWritingPad
                                            content={field.value ?? ""}
                                            onChange={field.onChange}
                                            blogId={initialData?.id}
                                            disabled={loading}
                                        />
                                    )}
                                />
                            </CardContent>
                        </Card>
                    </div>

                    <div className="grid min-w-0 gap-6">
                        <Card role="region" aria-labelledby="blog-organization-heading" size="sm">
                            <CardHeader>
                                <h3 id="blog-organization-heading" className="text-base font-semibold">Organization</h3>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <FormField
                                    control={form.control}
                                    name="categoryId"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Category</FormLabel>
                                            <Select
                                                onValueChange={field.onChange}
                                                value={field.value ?? ""}
                                            >
                                                <FormControl>
                                                    <SelectTrigger className="w-full">
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

                                {allowCategoryManagement && (
                                    <details className="group/category rounded-lg border bg-muted/25">
                                        <summary className="flex cursor-pointer list-none items-center justify-between gap-2 rounded-lg px-3 py-2 text-sm font-medium focus-visible:outline-2 focus-visible:outline-ring [&::-webkit-details-marker]:hidden">
                                            Manage categories
                                            <ChevronDown aria-hidden="true" className="size-4 shrink-0 text-muted-foreground transition-transform group-open/category:rotate-180" />
                                        </summary>
                                        <div className="space-y-3 border-t p-3">
                                            <div className="space-y-2">
                                                <Label htmlFor="blog-category-name">Name</Label>
                                                <Input
                                                    id="blog-category-name"
                                                    value={categoryEditorName}
                                                    onChange={(e) => setCategoryEditorName(e.target.value)}
                                                />
                                            </div>
                                            <div className="space-y-2">
                                                <Label htmlFor="blog-category-description">Description (optional)</Label>
                                                <Textarea
                                                    id="blog-category-description"
                                                    value={categoryEditorDescription}
                                                    onChange={(e) => setCategoryEditorDescription(e.target.value)}
                                                />
                                            </div>
                                            <div className="flex flex-wrap gap-2">
                                                <Button
                                                    type="button"
                                                    size="sm"
                                                    variant="outline"
                                                    onClick={handleCreateCategory}
                                                    disabled={savingCategory}
                                                >
                                                    Create category
                                                </Button>
                                                <Button
                                                    type="button"
                                                    size="sm"
                                                    variant="outline"
                                                    onClick={handleUpdateCategory}
                                                    disabled={savingCategory || !selectedCategoryId}
                                                >
                                                    Update selected
                                                </Button>
                                            </div>
                                            {savingCategory && (
                                                <p role="status" className="text-xs text-muted-foreground">Saving category…</p>
                                            )}
                                        </div>
                                    </details>
                                )}

                                {allowAuthorSelection && (
                                    <FormField
                                        control={form.control}
                                        name="authorIds"
                                        render={({ field }) => (
                                            <fieldset className="min-w-0 space-y-3">
                                                <legend className="mb-2 text-sm font-medium">Authors</legend>
                                                <Input
                                                    aria-label="Search authors"
                                                    placeholder="Search authors…"
                                                    value={authorSearch}
                                                    onChange={(e) => setAuthorSearch(e.target.value)}
                                                />
                                                <div className="max-h-40 space-y-1 overflow-y-auto rounded-lg border p-1">
                                                    {authors.map((author) => (
                                                        <label key={author.userId} className="flex cursor-pointer items-start gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-muted">
                                                            <input
                                                                type="checkbox"
                                                                checked={field.value?.includes(author.userId) || false}
                                                                onChange={(e) => {
                                                                    const current = field.value || [];
                                                                    field.onChange(e.target.checked
                                                                        ? [...current, author.userId]
                                                                        : current.filter((id) => id !== author.userId));
                                                                }}
                                                                className="mt-0.5 size-4 shrink-0 accent-primary"
                                                            />
                                                            <span className="wrap-anywhere">{author.displayName || author.username}</span>
                                                        </label>
                                                    ))}
                                                    {authors.length === 0 && (
                                                        <p className="px-2 py-1.5 text-xs text-muted-foreground">No authors found.</p>
                                                    )}
                                                </div>
                                            </fieldset>
                                        )}
                                    />
                                )}
                            </CardContent>
                        </Card>

                        <Card role="region" aria-labelledby="blog-image-heading" size="sm">
                            <CardHeader>
                                <h3 id="blog-image-heading" className="text-base font-semibold">Featured image</h3>
                            </CardHeader>
                            <CardContent>
                                <FormField
                                    control={form.control}
                                    name="featuredImage"
                                    render={({ field }) => (
                                        <FormItem className="space-y-3">
                                            {(previewUrl || field.value) && (
                                                <div className="relative aspect-video overflow-hidden rounded-md border">
                                                    <Image
                                                        src={previewUrl || field.value || ""}
                                                        alt="Featured image preview"
                                                        fill
                                                        sizes="(max-width: 767px) 100vw, 560px"
                                                        className="object-cover"
                                                    />
                                                    <Button
                                                        type="button"
                                                        aria-label="Remove featured image"
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
                                            <div className="space-y-2">
                                                <FormLabel>Image URL</FormLabel>
                                                <div className="flex items-center gap-2">
                                                    <FormControl>
                                                        <Input
                                                            placeholder="https://…"
                                                            {...field}
                                                            className="min-w-0 flex-1"
                                                        />
                                                    </FormControl>
                                                    <Button
                                                        type="button"
                                                        aria-label="Upload featured image"
                                                        variant="outline"
                                                        size="icon"
                                                        className="shrink-0"
                                                        onClick={() => document.getElementById("featured-image-upload")?.click()}
                                                    >
                                                        <Upload className="h-4 w-4" />
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
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                            </CardContent>
                        </Card>

                        <Card role="region" aria-labelledby="blog-publishing-heading" size="sm">
                            <CardHeader>
                                <h3 id="blog-publishing-heading" className="text-base font-semibold">Publishing</h3>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <FormField
                                    control={form.control}
                                    name="isPublished"
                                    render={({ field }) => (
                                        <FormItem className="flex flex-row items-center gap-3 space-y-0 rounded-lg border bg-muted/25 p-3">
                                            <FormControl>
                                                <input
                                                    type="checkbox"
                                                    checked={field.value}
                                                    onChange={field.onChange}
                                                    className="size-4 shrink-0 accent-primary"
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
                                    {submitLabel}
                                </Button>
                            </CardContent>
                        </Card>
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

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

const blogSchema = z.object({
    title: z.string().min(1, "Title is required"),
    excerpt: z.string().optional(),
    content: z.string().min(1, "Content is required"),
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
    const [uploading, setUploading] = useState(false);

    const form = useForm<BlogFormValues>({
        resolver: zodResolver(blogSchema),
        defaultValues: {
            title: initialData?.title || "",
            excerpt: initialData?.excerpt || "",
            content: initialData?.content || "",
            featuredImage: initialData?.featuredImage || "",
            categoryId: initialData?.category?.id || undefined,
            authorIds: initialData?.authors?.map((a) => a.userId) || [],
            isPublished: initialData?.isPublished || false,
        },
    });

    useEffect(() => {
        const loadData = async () => {
            try {
                const [cats, auths] = await Promise.all([
                    adminBlogService.getAllCategories(),
                    adminBlogService.getPotentialAuthors(),
                ]);
                setCategories(cats);
                setAuthors(auths);
            } catch (error) {
                console.error("Failed to load dependency data", error);
            }
        };
        loadData();
    }, []);

    const [selectedImage, setSelectedImage] = useState<File | null>(null);
    const [previewUrl, setPreviewUrl] = useState<string | null>(null);

    const onSubmit = async (data: BlogFormValues) => {
        try {
            setLoading(true);

            // Determine Blog ID (use existing or generate new)
            // We need a stable ID to ensure image name matches blog ID
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
                id: blogId, // Pass ID to backend
                excerpt: data.excerpt || undefined,
                featuredImage: featuredImageUrl || undefined,
                categoryId: data.categoryId || undefined,
                authorIds: data.authorIds || [],
            };

            if (initialData) {
                await adminBlogService.updateBlog(initialData.id, requestData);
            } else {
                await adminBlogService.createBlog(requestData);
            }
            router.push("/admin/blogs");
            router.refresh();
        } catch (error) {
            console.error("Failed to save blog", error);
            alert("Failed to save blog. Please try again.");
        } finally {
            setLoading(false);
        }
    };

    const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setSelectedImage(file);
        setPreviewUrl(URL.createObjectURL(file));
        // We don't set the form value yet, as it's not uploaded
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
                                        <Input placeholder="Blog post title" {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        <FormField
                            control={form.control}
                            name="content"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Content</FormLabel>
                                    <FormControl>
                                        <Textarea
                                            placeholder="Write your blog post content here..."
                                            className="min-h-[400px] font-mono"
                                            {...field}
                                        />
                                    </FormControl>
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
                                {initialData ? "Update Post" : "Create Post"}
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
                                                        <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
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
        </Form>
    );
}

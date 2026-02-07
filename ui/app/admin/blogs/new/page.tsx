"use client";

import { BlogForm } from "@/components/admin/blog-form";

export default function CreateBlogPage() {
    return (
        <div className="p-8 pt-24 max-w-5xl mx-auto">
            <div className="mb-8">
                <h2 className="text-3xl font-bold tracking-tight">Create New Post</h2>
                <p className="text-muted-foreground">Write and publish a new blog post.</p>
            </div>
            <BlogForm />
        </div>
    );
}

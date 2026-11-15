"use client";

import { BlogForm } from "@/components/admin/blog-form";

export default function CreateBlogPage() {
    return (
        <div className="mx-auto max-w-6xl px-4 pt-24 pb-8 sm:px-6 xl:px-8">
            <div className="mb-8">
                <h2 className="text-3xl font-bold tracking-tight">Create New Post</h2>
            </div>
            <BlogForm />
        </div>
    );
}

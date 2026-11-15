"use client";

import { useEffect, useId, useState } from "react";
import { ArrowLeft, Loader2, Pencil, Plus, Tags } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { adminBlogService } from "@/lib/api/admin-blog.service";
import type { BlogCategory, CreateBlogCategoryRequest } from "@/lib/api/blog.types";
import { ApiError } from "@/lib/api/types";

type CategoryList = {
    categories: BlogCategory[];
    status: "loading" | "ready" | "error";
};

export function useBlogCategories(enabled = true) {
    const [list, setList] = useState<CategoryList>({ categories: [], status: "loading" });
    const [request, setRequest] = useState(0);

    useEffect(() => {
        if (!enabled) return;

        let active = true;
        adminBlogService.getAllCategories().then(
            (categories) => {
                if (active) setList({ categories, status: "ready" });
            },
            (error) => {
                if (!active) return;
                console.error("Failed to load blog categories", error);
                setList((current) => ({ ...current, status: "error" }));
            },
        );
        return () => { active = false; };
    }, [enabled, request]);

    function retry() {
        setList((current) => ({ ...current, status: "loading" }));
        setRequest((current) => current + 1);
    }

    function upsert(category: BlogCategory) {
        setList((current) => ({
            ...current,
            categories: [...current.categories.filter((item) => item.id !== category.id), category]
                .sort((a, b) => a.name.localeCompare(b.name) || a.slug.localeCompare(b.slug)),
        }));
    }

    return { ...list, retry, upsert };
}

interface BlogCategoryDialogProps {
    categoryList: ReturnType<typeof useBlogCategories>;
}

type CategoryEditor = {
    id?: string;
    name: string;
    description: string;
};

export function BlogCategoryDialog({ categoryList }: BlogCategoryDialogProps) {
    const [open, setOpen] = useState(false);
    const [search, setSearch] = useState("");
    const [editor, setEditor] = useState<CategoryEditor | null>(null);
    const [saving, setSaving] = useState(false);
    const [saveError, setSaveError] = useState("");
    const inputId = useId();
    const query = search.trim().toLowerCase();
    const visibleCategories = categoryList.categories.filter((category) =>
        [category.name, category.slug, category.description].some((value) => value?.toLowerCase().includes(query)),
    );

    function changeOpen(nextOpen: boolean) {
        if (saving) return;
        if (nextOpen) {
            setSearch("");
            setEditor(null);
            setSaveError("");
        }
        setOpen(nextOpen);
    }

    function editCategory(category?: BlogCategory) {
        setSaveError("");
        setEditor({ id: category?.id, name: category?.name ?? "", description: category?.description ?? "" });
    }

    async function saveCategory(event: React.FormEvent<HTMLFormElement>) {
        event.preventDefault();
        event.stopPropagation();
        if (!editor || saving) return;

        const name = editor.name.trim();
        if (!name) {
            setSaveError("Category name is required.");
            return;
        }

        const data: CreateBlogCategoryRequest = { name, description: editor.description.trim() || undefined };
        setSaving(true);
        setSaveError("");
        try {
            const category = editor.id
                ? await adminBlogService.updateCategory(editor.id, data)
                : await adminBlogService.createCategory(data);

            categoryList.upsert(category);
            setSearch("");
            setEditor(null);
            toast.success(editor.id ? "Category updated" : "Category created");
        } catch (error) {
            console.error("Failed to save blog category", error);
            setSaveError(error instanceof ApiError ? error.message : "Could not save the category. Try again.");
        } finally {
            setSaving(false);
        }
    }

    return (
        <Dialog open={open} onOpenChange={changeOpen}>
            <DialogTrigger asChild>
                <Button type="button" variant="outline">
                    <Tags />
                    Manage categories
                </Button>
            </DialogTrigger>
            <DialogContent
                className="max-h-[calc(100dvh-2rem)] gap-4 overflow-y-auto p-4 sm:max-w-xl sm:p-6"
                showCloseButton={!saving}
                onEscapeKeyDown={(event) => {
                    if (saving) event.preventDefault();
                }}
                onInteractOutside={(event) => {
                    if (editor) event.preventDefault();
                }}
            >
                <DialogHeader className="pr-10">
                    <DialogTitle className="text-lg font-semibold">Manage categories</DialogTitle>
                    <DialogDescription>Changes apply to every post that uses the category.</DialogDescription>
                </DialogHeader>

                {editor ? (
                    <form onSubmit={saveCategory} className="space-y-4">
                        <Button type="button" variant="ghost" size="sm" onClick={() => setEditor(null)} disabled={saving}>
                            <ArrowLeft />
                            Back to categories
                        </Button>
                        <h3 className="font-semibold">{editor.id ? "Edit category" : "New category"}</h3>
                        <div className="space-y-2">
                            <Label htmlFor={`${inputId}-name`}>Name</Label>
                            <Input
                                id={`${inputId}-name`}
                                value={editor.name}
                                onChange={(event) => setEditor({ ...editor, name: event.target.value })}
                                required
                                autoFocus
                                readOnly={saving}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor={`${inputId}-description`}>Description (optional)</Label>
                            <Textarea
                                id={`${inputId}-description`}
                                value={editor.description}
                                onChange={(event) => setEditor({ ...editor, description: event.target.value })}
                                readOnly={saving}
                            />
                        </div>
                        {saveError && <p role="alert" className="text-sm text-destructive">{saveError}</p>}
                        <div className="flex justify-end border-t pt-4">
                            <Button type="submit" disabled={saving}>
                                {saving && <Loader2 className="animate-spin" />}
                                {saving ? "Saving…" : editor.id ? "Save changes" : "Create category"}
                            </Button>
                        </div>
                    </form>
                ) : (
                    <div className="space-y-3">
                        <div className="flex flex-wrap items-center gap-2">
                            <Input
                                type="search"
                                aria-label="Search categories"
                                placeholder="Search categories…"
                                value={search}
                                onChange={(event) => setSearch(event.target.value)}
                                className="min-w-40 flex-1"
                                autoFocus
                            />
                            <Button type="button" onClick={() => editCategory()} disabled={categoryList.status !== "ready"}>
                                <Plus />
                                New category
                            </Button>
                        </div>
                        {categoryList.status === "loading" ? (
                            <p role="status" className="py-4 text-muted-foreground">Loading categories…</p>
                        ) : categoryList.status === "error" ? (
                            <div className="flex flex-wrap items-center justify-between gap-2 py-4">
                                <p role="alert" className="text-destructive">Could not load categories.</p>
                                <Button type="button" variant="outline" size="sm" onClick={categoryList.retry}>Try again</Button>
                            </div>
                        ) : visibleCategories.length > 0 ? (
                            <ul aria-label="Categories" className="max-h-[min(46dvh,24rem)] divide-y overflow-y-auto rounded-lg border">
                                {visibleCategories.map((category) => (
                                    <li key={category.id} className="flex items-center justify-between gap-3 px-3 py-2.5">
                                        <div className="min-w-0">
                                            <p className="font-medium wrap-anywhere">{category.name}</p>
                                            <p className="text-xs text-muted-foreground wrap-anywhere">{category.slug}</p>
                                            {category.description && (
                                                <p className="mt-0.5 line-clamp-2 text-sm text-muted-foreground wrap-anywhere">{category.description}</p>
                                            )}
                                        </div>
                                        <Button type="button" variant="ghost" size="sm" aria-label={`Edit ${category.name}`} onClick={() => editCategory(category)}>
                                            <Pencil />
                                            Edit
                                        </Button>
                                    </li>
                                ))}
                            </ul>
                        ) : (
                            <p className="py-4 text-muted-foreground">{query ? "No matching categories." : "No categories yet."}</p>
                        )}
                    </div>
                )}
            </DialogContent>
        </Dialog>
    );
}

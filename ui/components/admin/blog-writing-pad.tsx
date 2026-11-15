"use client";

import { useLayoutEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { ImagePlus, Loader2, PencilLine } from "lucide-react";
import { Tabs } from "radix-ui";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
    Dialog,
    DialogClose,
    DialogContent,
    DialogDescription,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { adminBlogService } from "@/lib/api/admin-blog.service";

const MarkdownRenderer = dynamic(
    () => import("@/components/blog/MarkdownRenderer").then((module) => module.MarkdownRenderer),
    { loading: () => <p role="status" className="text-muted-foreground">Loading preview…</p> },
);

type EditorPosition = Pick<HTMLTextAreaElement, "selectionStart" | "selectionEnd" | "selectionDirection" | "scrollTop" | "scrollLeft">;

interface BlogWritingPadProps {
    content: string;
    onChange: (content: string) => void;
    blogId?: string;
    disabled?: boolean;
}

function getEditorPosition(editor: HTMLTextAreaElement): EditorPosition {
    const { selectionStart, selectionEnd, selectionDirection, scrollTop, scrollLeft } = editor;
    return { selectionStart, selectionEnd, selectionDirection, scrollTop, scrollLeft };
}

const tabClassName = "rounded-md px-3 py-1.5 font-medium text-muted-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-xs";

export function BlogWritingPad({ content, onChange, blogId, disabled }: BlogWritingPadProps) {
    const [open, setOpen] = useState(false);
    const [mode, setMode] = useState("write");
    const [uploading, setUploading] = useState(false);
    const editorRef = useRef<HTMLTextAreaElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const editorPosition = useRef<EditorPosition | null>(null);

    useLayoutEffect(() => {
        const editor = editorRef.current;
        const position = editorPosition.current;
        if (!open || mode !== "write" || !editor || !position) return;

        editor.setSelectionRange(position.selectionStart, position.selectionEnd, position.selectionDirection);
        editor.scrollTop = position.scrollTop;
        editor.scrollLeft = position.scrollLeft;
        editorPosition.current = null;
    }, [content, mode, open]);

    function changeMode(nextMode: string) {
        if (mode === "write" && editorRef.current) {
            editorPosition.current = getEditorPosition(editorRef.current);
        }

        setMode(nextMode);
    }

    function changeOpen(nextOpen: boolean) {
        if (uploading) return;

        if (!nextOpen) {
            editorPosition.current = null;
            setMode("write");
        }

        setOpen(nextOpen);
    }

    async function insertImage(event: React.ChangeEvent<HTMLInputElement>) {
        const input = event.currentTarget;
        const file = input.files?.[0];
        input.value = "";
        const editor = editorRef.current;
        if (!file || !editor) return;

        if (!file.type.startsWith("image/")) {
            toast.error("Please select an image file");
            return;
        }

        const position = getEditorPosition(editor);
        try {
            setUploading(true);
            const { url } = await adminBlogService.uploadImage(file, blogId);
            const markdown = `\n![Image](${url})\n`;
            const caret = position.selectionStart + markdown.length;
            editorPosition.current = { ...position, selectionStart: caret, selectionEnd: caret };
            onChange(content.slice(0, position.selectionStart) + markdown + content.slice(position.selectionEnd));
        } catch (error) {
            console.error("Failed to upload content image", error);
            toast.error("Failed to upload image");
        } finally {
            setUploading(false);
        }
    }

    return (
        <Dialog open={open} onOpenChange={changeOpen}>
            <DialogTrigger asChild>
                <Button type="button" variant="outline" disabled={disabled}>
                    <PencilLine />
                    {content.trim() ? "Open writing pad" : "Start writing"}
                </Button>
            </DialogTrigger>
            <DialogContent
                showCloseButton={false}
                className="inset-0 flex h-dvh max-w-none translate-x-0 translate-y-0 flex-col gap-0 rounded-none p-0 ring-0 data-closed:zoom-out-100 data-open:zoom-in-100 sm:max-w-none"
                onEscapeKeyDown={(event) => {
                    if (uploading) event.preventDefault();
                }}
            >
                <DialogDescription className="sr-only">
                    Write in Markdown and preview the formatted body. Choose Done to return to the post form.
                </DialogDescription>
                <Tabs.Root value={mode} onValueChange={changeMode} className="flex min-h-0 flex-1 flex-col">
                    <header className="flex flex-wrap items-center gap-x-5 gap-y-2 border-b px-4 py-3 sm:px-6">
                        <DialogTitle className="text-base font-semibold">Writing pad</DialogTitle>
                        <Tabs.List aria-label="Writing pad view" className="inline-flex gap-1 rounded-lg bg-muted p-1">
                            <Tabs.Trigger value="write" className={tabClassName}>Write</Tabs.Trigger>
                            <Tabs.Trigger value="preview" className={tabClassName}>Preview</Tabs.Trigger>
                        </Tabs.List>
                        <div className="ml-auto flex items-center gap-2">
                            <input
                                ref={fileInputRef}
                                type="file"
                                accept="image/*"
                                className="hidden"
                                onChange={insertImage}
                            />
                            {(mode === "write" || uploading) && (
                                <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    onClick={() => fileInputRef.current?.click()}
                                    disabled={uploading}
                                >
                                    {uploading ? <Loader2 className="animate-spin" /> : <ImagePlus />}
                                    {uploading ? "Uploading…" : "Insert image"}
                                </Button>
                            )}
                            <DialogClose asChild>
                                <Button type="button" size="sm" disabled={uploading}>Done</Button>
                            </DialogClose>
                        </div>
                    </header>
                    <Tabs.Content
                        value="write"
                        forceMount
                        tabIndex={-1}
                        className="mx-auto flex min-h-0 w-full max-w-5xl flex-1 flex-col px-4 py-4 data-[state=inactive]:hidden sm:px-6 sm:py-6"
                    >
                        <Textarea
                            ref={editorRef}
                            value={content}
                            onChange={(event) => onChange(event.target.value)}
                            readOnly={uploading}
                            aria-label="Markdown body"
                            placeholder="Write your post in Markdown…"
                            className="min-h-0 flex-1 resize-none overflow-auto font-mono leading-relaxed sm:p-4"
                        />
                    </Tabs.Content>
                    <Tabs.Content value="preview" className="min-h-0 flex-1 overflow-auto">
                        <div className="mx-auto max-w-4xl px-4 py-6 sm:px-8 sm:py-10">
                            {content.trim() ? (
                                <MarkdownRenderer content={content} />
                            ) : (
                                <p className="text-muted-foreground">Write some Markdown to see a preview here.</p>
                            )}
                        </div>
                    </Tabs.Content>
                </Tabs.Root>
            </DialogContent>
        </Dialog>
    );
}

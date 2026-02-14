"use client";

import { type ChangeEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useFieldArray, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Loader2, Plus, Upload, X } from "lucide-react";
import { toast } from "sonner";
import { adminMusicService } from "@/lib/api/admin-music.service";
import { AdminTrackDetail, CreateTrackRequest } from "@/lib/api/admin-music.types";
import { TrackAuthor } from "@/lib/api/music.types";
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
import { Badge } from "@/components/ui/badge";

const categoryValues = [
    "originals",
    "remixes",
    "snippets",
    "features",
    "collaborations",
    "covers",
] as const;

const trackSchema = z.object({
    title: z.string().min(1, "Title is required"),
    slug: z.string().optional(),
    description: z.string().min(1, "Description is required"),
    category: z.enum(categoryValues),
    duration: z.string().optional(),
    releaseDate: z.string().min(1, "Release date is required"),
    genre: z.string().optional(),
    tagsCsv: z.string().optional(),
    cover: z.string().optional(),
    bootlegAssetId: z.string().optional(),
    featured: z.boolean(),
    isPublished: z.boolean(),
    authorIds: z.array(z.string()).optional(),
    authorRoles: z.record(z.string(), z.string()).optional(),
    links: z.array(
        z.object({
            type: z.string().optional(),
            url: z.string().optional(),
            label: z.string().optional(),
        })
    ).optional(),
});

type TrackFormValues = z.infer<typeof trackSchema>;

type MusicFormProps = {
    initialData?: AdminTrackDetail;
};

const formatDateInput = (value: string) => {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "";
    return date.toISOString().slice(0, 10);
};

const formatCategory = (value: string) =>
    value
        .split("-")
        .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
        .join(" ");

const createDraftTrackId = () => {
    if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
        return crypto.randomUUID();
    }

    const segment = () => Math.floor(Math.random() * 0xffffffff).toString(16).padStart(8, "0");
    return `${segment()}-${segment().slice(0, 4)}-${segment().slice(0, 4)}-${segment().slice(0, 4)}-${segment()}${segment().slice(0, 4)}`;
};

export function MusicForm({ initialData }: MusicFormProps) {
    const router = useRouter();
    const [saving, setSaving] = useState(false);
    const [authorSearch, setAuthorSearch] = useState("");
    const [authors, setAuthors] = useState<TrackAuthor[]>([]);
    const [trackId] = useState<string>(() => initialData?.id || createDraftTrackId());
    const [selectedCoverFile, setSelectedCoverFile] = useState<File | null>(null);
    const [uploadingCover, setUploadingCover] = useState(false);
    const [coverInputKey, setCoverInputKey] = useState(0);
    const [selectedAudioFile, setSelectedAudioFile] = useState<File | null>(null);
    const [uploadingAudio, setUploadingAudio] = useState(false);
    const [audioInputKey, setAudioInputKey] = useState(0);
    const [uploadedAudioName, setUploadedAudioName] = useState<string | null>(null);
    const isEditing = !!initialData?.id;

    const form = useForm<TrackFormValues>({
        resolver: zodResolver(trackSchema),
        defaultValues: {
            title: initialData?.title || "",
            slug: initialData?.slug || "",
            description: initialData?.description || "",
            category: (initialData?.category as typeof categoryValues[number]) || "originals",
            duration: initialData?.duration || "",
            releaseDate: initialData?.releaseDate ? formatDateInput(initialData.releaseDate) : "",
            genre: initialData?.genre || "",
            tagsCsv: initialData?.tags?.join(", ") || "",
            cover: initialData?.cover || "",
            bootlegAssetId: initialData?.bootlegAssetId || "",
            featured: initialData?.featured || false,
            isPublished: initialData?.isPublished || false,
            authorIds: initialData?.authors?.map((a) => a.userId) || [],
            authorRoles: initialData?.authors?.reduce((acc, author) => {
                if (author.role) acc[author.userId] = author.role;
                return acc;
            }, {} as Record<string, string>) || {},
            links: initialData?.links?.map((link) => ({
                type: link.type,
                url: link.url,
                label: link.label,
            })) || [{ type: "", url: "", label: "" }],
        },
    });

    const { fields, append, remove } = useFieldArray({
        control: form.control,
        name: "links",
    });

    useEffect(() => {
        const timeout = setTimeout(async () => {
            try {
                const data = await adminMusicService.getAuthors({
                    search: authorSearch.trim() || undefined,
                    take: 100,
                });
                setAuthors(data);
            } catch (error) {
                console.error("Failed to load authors", error);
            }
        }, 250);

        return () => clearTimeout(timeout);
    }, [authorSearch]);

    const coverUrl = form.watch("cover");
    const attachedBootlegAssetId = form.watch("bootlegAssetId");

    const handleCoverSelection = (event: ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0] || null;

        if (file && !file.type.startsWith("image/")) {
            toast.error("Only image files are allowed");
            event.target.value = "";
            setSelectedCoverFile(null);
            return;
        }

        setSelectedCoverFile(file);
    };

    const handleCoverUpload = async () => {
        const file = selectedCoverFile;
        if (!file) {
            toast.error("Select a cover image first");
            return;
        }

        try {
            setUploadingCover(true);
            const uploaded = await adminMusicService.uploadTrackCover(trackId, file);
            form.setValue("cover", uploaded.url, { shouldDirty: true, shouldValidate: true });
            setSelectedCoverFile(null);
            setCoverInputKey((key) => key + 1);
            toast.success("Cover uploaded and attached to this track");
        } catch (error) {
            console.error("Failed to upload cover", error);
            toast.error("Failed to upload cover");
        } finally {
            setUploadingCover(false);
        }
    };

    const handleAudioSelection = (event: ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0] || null;

        if (file && !file.type.startsWith("audio/")) {
            toast.error("Only audio files are allowed");
            event.target.value = "";
            setSelectedAudioFile(null);
            return;
        }

        setSelectedAudioFile(file);
    };

    const handleAudioUpload = async () => {
        const file = selectedAudioFile;
        if (!file) {
            toast.error("Select an audio file first");
            return;
        }

        try {
            setUploadingAudio(true);
            const uploaded = await adminMusicService.uploadTrackAudio(trackId, file);
            form.setValue("bootlegAssetId", uploaded.assetId, { shouldDirty: true, shouldValidate: true });
            setUploadedAudioName(uploaded.fileName);
            setSelectedAudioFile(null);
            setAudioInputKey((key) => key + 1);
            toast.success("Audio uploaded and attached to this track");
        } catch (error) {
            console.error("Failed to upload audio", error);
            toast.error("Failed to upload audio");
        } finally {
            setUploadingAudio(false);
        }
    };

    const onSubmit = async (values: TrackFormValues) => {
        const hasIncompleteLink = (values.links || []).some((link) => {
            const hasAny = !!(link.type?.trim() || link.url?.trim() || link.label?.trim());
            const hasAll = !!(link.type?.trim() && link.url?.trim() && link.label?.trim());
            return hasAny && !hasAll;
        });

        if (hasIncompleteLink) {
            toast.error("Each link row must have type, URL, and label");
            return;
        }

        const requestBase: CreateTrackRequest = {
            title: values.title.trim(),
            slug: values.slug?.trim() || undefined,
            description: values.description.trim(),
            category: values.category,
            duration: values.duration?.trim() || undefined,
            releaseDate: new Date(`${values.releaseDate}T00:00:00Z`).toISOString(),
            genre: values.genre?.trim() || undefined,
            tags: (values.tagsCsv || "")
                .split(",")
                .map((tag) => tag.trim())
                .filter(Boolean),
            cover: values.cover?.trim() || undefined,
            authors: (values.authorIds || []).map((id) => ({
                userId: id,
                role: values.authorRoles?.[id]?.trim() || undefined,
            })),
            links: (values.links || [])
                .filter((link) => link.type?.trim() && link.url?.trim() && link.label?.trim())
                .map((link, index) => ({
                    type: link.type!.trim().toLowerCase(),
                    url: link.url!.trim(),
                    label: link.label!.trim(),
                    order: index,
                })),
            bootlegAssetId: values.bootlegAssetId || undefined,
            featured: values.featured,
            isPublished: values.isPublished,
        };

        try {
            setSaving(true);
            if (isEditing && initialData) {
                await adminMusicService.updateTrack(initialData.id, requestBase);
                toast.success("Track updated");
                router.refresh();
                return;
            }

            const created = await adminMusicService.createTrack({
                ...requestBase,
                id: trackId,
            });
            toast.success("Track created");
            router.push(`/admin/music/${created.id}`);
            router.refresh();
        } catch (error) {
            console.error("Failed to save track", error);
            toast.error("Failed to save track");
        } finally {
            setSaving(false);
        }
    };

    return (
        <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                    <div className="md:col-span-2 space-y-6">
                        <FormField
                            control={form.control}
                            name="title"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Title</FormLabel>
                                    <FormControl>
                                        <Input placeholder="Track title" {...field} />
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
                                        <Input placeholder="auto-from-title-if-empty" {...field} />
                                    </FormControl>
                                    <FormDescription>Leave empty to auto-generate.</FormDescription>
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
                                        <Textarea placeholder="Track description" className="min-h-[160px]" {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        <Card className="p-4 space-y-4">
                            <div className="flex items-center justify-between">
                                <h3 className="font-medium">External Links</h3>
                                <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    onClick={() => append({ type: "", url: "", label: "" })}
                                >
                                    <Plus className="h-4 w-4 mr-1" />
                                    Add Link
                                </Button>
                            </div>
                            <div className="space-y-3">
                                {fields.map((item, index) => (
                                    <div key={item.id} className="grid grid-cols-1 md:grid-cols-12 gap-2 items-start">
                                        <FormField
                                            control={form.control}
                                            name={`links.${index}.type`}
                                            render={({ field }) => (
                                                <FormItem className="md:col-span-3">
                                                    <FormControl>
                                                        <Input placeholder="Type (spotify)" {...field} />
                                                    </FormControl>
                                                </FormItem>
                                            )}
                                        />
                                        <FormField
                                            control={form.control}
                                            name={`links.${index}.url`}
                                            render={({ field }) => (
                                                <FormItem className="md:col-span-5">
                                                    <FormControl>
                                                        <Input placeholder="https://..." {...field} />
                                                    </FormControl>
                                                </FormItem>
                                            )}
                                        />
                                        <FormField
                                            control={form.control}
                                            name={`links.${index}.label`}
                                            render={({ field }) => (
                                                <FormItem className="md:col-span-3">
                                                    <FormControl>
                                                        <Input placeholder="Label" {...field} />
                                                    </FormControl>
                                                </FormItem>
                                            )}
                                        />
                                        <div className="md:col-span-1">
                                            <Button
                                                type="button"
                                                variant="ghost"
                                                size="icon"
                                                onClick={() => remove(index)}
                                                disabled={fields.length <= 1}
                                            >
                                                <X className="h-4 w-4" />
                                            </Button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </Card>
                    </div>

                    <div className="space-y-6">
                        <Card className="p-4 space-y-4">
                            <FormField
                                control={form.control}
                                name="category"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Category</FormLabel>
                                        <Select value={field.value} onValueChange={field.onChange}>
                                            <FormControl>
                                                <SelectTrigger>
                                                    <SelectValue />
                                                </SelectTrigger>
                                            </FormControl>
                                            <SelectContent>
                                                {categoryValues.map((category) => (
                                                    <SelectItem key={category} value={category}>
                                                        {formatCategory(category)}
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
                                name="releaseDate"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Release Date</FormLabel>
                                        <FormControl>
                                            <Input type="date" {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            <FormField
                                control={form.control}
                                name="duration"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Duration</FormLabel>
                                        <FormControl>
                                            <Input placeholder="e.g. 4:12" {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            <FormField
                                control={form.control}
                                name="genre"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Genre</FormLabel>
                                        <FormControl>
                                            <Input placeholder="Genre" {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            <FormField
                                control={form.control}
                                name="tagsCsv"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Tags</FormLabel>
                                        <FormControl>
                                            <Input placeholder="dnb, remix, orchestral" {...field} />
                                        </FormControl>
                                        <FormDescription>Comma-separated tags.</FormDescription>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            <div className="space-y-3">
                                <div className="flex items-center justify-between gap-2">
                                    <FormLabel className="m-0">Cover Artwork</FormLabel>
                                    {coverUrl ? <Badge variant="secondary">Attached</Badge> : <Badge variant="outline">No Cover</Badge>}
                                </div>
                                <p className="text-xs text-muted-foreground break-all">
                                    Track ID: {trackId}
                                </p>
                                <Input
                                    key={coverInputKey}
                                    type="file"
                                    accept="image/*"
                                    onChange={handleCoverSelection}
                                />
                                <div className="flex flex-wrap gap-2">
                                    <Button
                                        type="button"
                                        variant="outline"
                                        onClick={handleCoverUpload}
                                        disabled={uploadingCover || !selectedCoverFile}
                                    >
                                        {uploadingCover ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Upload className="mr-2 h-4 w-4" />}
                                        Upload Cover
                                    </Button>
                                    {coverUrl ? (
                                        <Button
                                            type="button"
                                            variant="ghost"
                                            onClick={() => form.setValue("cover", "", { shouldDirty: true, shouldValidate: true })}
                                        >
                                            Remove Cover
                                        </Button>
                                    ) : null}
                                </div>
                                {selectedCoverFile ? (
                                    <p className="text-xs text-muted-foreground">
                                        Selected image: {selectedCoverFile.name}
                                    </p>
                                ) : null}
                                {coverUrl ? (
                                    <div className="rounded-md border bg-muted/20 p-2">
                                        {/* eslint-disable-next-line @next/next/no-img-element */}
                                        <img
                                            src={coverUrl}
                                            alt="Track cover preview"
                                            className="w-full aspect-square object-cover rounded-md"
                                        />
                                    </div>
                                ) : null}
                                <FormField
                                    control={form.control}
                                    name="cover"
                                    render={({ field }) => (
                                        <FormItem className="hidden">
                                            <FormControl>
                                                <Input type="hidden" {...field} value={field.value || ""} />
                                            </FormControl>
                                        </FormItem>
                                    )}
                                />
                            </div>
                        </Card>

                        <Card className="p-4 space-y-4">
                            <div className="flex items-center justify-between gap-2">
                                <FormLabel className="m-0">Playback Source</FormLabel>
                                {attachedBootlegAssetId ? <Badge variant="secondary">Attached</Badge> : <Badge variant="outline">No Audio</Badge>}
                            </div>
                            <p className="text-xs text-muted-foreground">
                                Upload and attach audio directly here. File placement is tied to this track ID.
                            </p>
                            <p className="text-xs text-muted-foreground break-all">
                                Track ID: {trackId}
                            </p>
                            <div className="space-y-2">
                                <Input
                                    key={audioInputKey}
                                    type="file"
                                    accept="audio/*"
                                    onChange={handleAudioSelection}
                                />
                                <div className="flex flex-wrap gap-2">
                                    <Button
                                        type="button"
                                        variant="outline"
                                        onClick={handleAudioUpload}
                                        disabled={uploadingAudio || !selectedAudioFile}
                                    >
                                        {uploadingAudio ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Upload className="mr-2 h-4 w-4" />}
                                        Upload & Attach
                                    </Button>
                                    {attachedBootlegAssetId ? (
                                        <Button
                                            type="button"
                                            variant="ghost"
                                            onClick={() => {
                                                form.setValue("bootlegAssetId", "", { shouldDirty: true, shouldValidate: true });
                                                setUploadedAudioName(null);
                                            }}
                                        >
                                            Remove Audio
                                        </Button>
                                    ) : null}
                                </div>
                            </div>
                            {selectedAudioFile ? (
                                <p className="text-xs text-muted-foreground">
                                    Selected file: {selectedAudioFile.name}
                                </p>
                            ) : null}
                            {attachedBootlegAssetId ? (
                                <div className="rounded-md border bg-muted/30 px-3 py-2 text-xs text-muted-foreground space-y-1">
                                    <p className="font-medium text-foreground">Attached audio</p>
                                    {uploadedAudioName ? <p>{uploadedAudioName}</p> : null}
                                    <p className="break-all">Asset ID: {attachedBootlegAssetId}</p>
                                </div>
                            ) : null}
                            <FormField
                                control={form.control}
                                name="bootlegAssetId"
                                render={({ field }) => (
                                    <FormItem className="hidden">
                                        <FormControl>
                                            <Input type="hidden" {...field} value={field.value || ""} />
                                        </FormControl>
                                    </FormItem>
                                )}
                            />
                        </Card>

                        <Card className="p-4 space-y-4">
                            <FormField
                                control={form.control}
                                name="authorIds"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Authors</FormLabel>
                                        <FormControl>
                                            <div className="space-y-3">
                                                <Input
                                                    value={authorSearch}
                                                    onChange={(e) => setAuthorSearch(e.target.value)}
                                                    placeholder="Search authors..."
                                                />
                                                <div className="max-h-56 overflow-y-auto border rounded-md p-3 space-y-2">
                                                    {authors.map((author) => {
                                                        const selected = field.value?.includes(author.userId) || false;
                                                        return (
                                                            <div key={author.userId} className="space-y-2">
                                                                <label className="flex items-center gap-2 text-sm">
                                                                    <input
                                                                        type="checkbox"
                                                                        checked={selected}
                                                                        onChange={(e) => {
                                                                            const current = field.value || [];
                                                                            const next = e.target.checked
                                                                                ? [...current, author.userId]
                                                                                : current.filter((id) => id !== author.userId);
                                                                            field.onChange(next);
                                                                        }}
                                                                    />
                                                                    <span>{author.displayName || author.username}</span>
                                                                </label>
                                                                {selected ? (
                                                                    <FormField
                                                                        control={form.control}
                                                                        name={`authorRoles.${author.userId}`}
                                                                        render={({ field: roleField }) => (
                                                                            <FormItem>
                                                                                <FormControl>
                                                                                    <Input
                                                                                        placeholder="Role (optional)"
                                                                                        value={(roleField.value as string) ?? ""}
                                                                                        onChange={roleField.onChange}
                                                                                        onBlur={roleField.onBlur}
                                                                                        name={roleField.name}
                                                                                        ref={roleField.ref}
                                                                                    />
                                                                                </FormControl>
                                                                            </FormItem>
                                                                        )}
                                                                    />
                                                                ) : null}
                                                            </div>
                                                        );
                                                    })}
                                                    {authors.length === 0 ? (
                                                        <p className="text-xs text-muted-foreground">No authors found.</p>
                                                    ) : null}
                                                </div>
                                            </div>
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        </Card>

                        <Card className="p-4 space-y-4">
                            <FormField
                                control={form.control}
                                name="featured"
                                render={({ field }) => (
                                    <FormItem className="flex items-center gap-2">
                                        <FormControl>
                                            <input type="checkbox" checked={field.value} onChange={field.onChange} />
                                        </FormControl>
                                        <FormLabel className="m-0">Featured</FormLabel>
                                    </FormItem>
                                )}
                            />

                            <FormField
                                control={form.control}
                                name="isPublished"
                                render={({ field }) => (
                                    <FormItem className="flex items-center gap-2">
                                        <FormControl>
                                            <input type="checkbox" checked={field.value} onChange={field.onChange} />
                                        </FormControl>
                                        <FormLabel className="m-0">Published</FormLabel>
                                    </FormItem>
                                )}
                            />

                            <Button type="submit" className="w-full" disabled={saving}>
                                {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                                {isEditing ? "Update Track" : "Create Track"}
                            </Button>
                        </Card>
                    </div>
                </div>
            </form>
        </Form>
    );
}

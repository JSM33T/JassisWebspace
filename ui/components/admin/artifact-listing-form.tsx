'use client';

import { useEffect, useState, type FormEvent } from 'react';
import Image from 'next/image';
import { ImagePlus, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { artifactService } from '@/lib/api/artifact.service';
import type { ArtifactDetail } from '@/lib/api/artifact.types';

export function ArtifactListingForm({ detail, busy, onBusyChange, onSaved }: {
    detail: ArtifactDetail;
    busy: boolean;
    onBusyChange: (busy: boolean) => void;
    onSaved: (detail: ArtifactDetail) => void;
}) {
    const { artifact, listing } = detail;
    const [title, setTitle] = useState(artifact.title);
    const [description, setDescription] = useState(listing.description ?? '');
    const [body, setBody] = useState(listing.body ?? '');
    const [category, setCategory] = useState(listing.category ?? '');
    const [tags, setTags] = useState(listing.tags.join(', '));
    const [file, setFile] = useState<File | null>(null);
    const [localPreview, setLocalPreview] = useState<string | null>(null);
    const [savedCover, setSavedCover] = useState<string | null>(null);
    const [removeCover, setRemoveCover] = useState(false);
    const [coverRevision, setCoverRevision] = useState(0);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        if (!listing.hasCover) return;
        let active = true;
        artifactService.coverPreview(artifact.id).then(
            (image) => { if (active) setSavedCover(`data:image/webp;base64,${image}`); },
            () => { if (active) setSavedCover(null); },
        );
        return () => { active = false; };
    }, [artifact.id, listing.hasCover, coverRevision]);

    useEffect(() => () => {
        if (localPreview) URL.revokeObjectURL(localPreview);
    }, [localPreview]);

    async function save(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();
        const uniqueTags = [...new Map(tags.split(',').map(tag => tag.trim()).filter(Boolean)
            .map(tag => [tag.toLowerCase(), tag])).values()];
        if (uniqueTags.length > 12 || uniqueTags.some(tag => tag.length > 40)) {
            toast.error('Use up to 12 tags with no more than 40 characters each.');
            return;
        }

        setSaving(true);
        onBusyChange(true);
        try {
            const result = await artifactService.updateListing(artifact.id, {
                title, description, body, category, tags: uniqueTags, coverImage: file, removeCover,
            });
            onSaved(result);
            setTitle(result.artifact.title);
            setDescription(result.listing.description ?? '');
            setBody(result.listing.body ?? '');
            setCategory(result.listing.category ?? '');
            setTags(result.listing.tags.join(', '));
            if (file || removeCover) {
                setSavedCover(null);
                setCoverRevision(value => value + 1);
            }
            setFile(null);
            setLocalPreview(null);
            setRemoveCover(false);
            toast.success('Download listing updated.');
        } catch (error) {
            toast.error(error instanceof Error ? error.message : 'Unable to save the download listing.');
        } finally {
            setSaving(false);
            onBusyChange(false);
        }
    }

    const preview = localPreview ?? (listing.hasCover && !removeCover ? savedCover : null);

    return (
        <form onSubmit={save} className="space-y-5">
            <fieldset disabled={busy} className="grid min-w-0 gap-5 lg:grid-cols-[minmax(0,1fr)_16rem]">
                <div className="space-y-4">
                    <div className="space-y-2">
                        <Label htmlFor="listing-title">Title</Label>
                        <Input id="listing-title" required maxLength={200} value={title} onChange={event => setTitle(event.target.value)} />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="listing-description">Short description</Label>
                        <Textarea id="listing-description" rows={3} maxLength={500} value={description} onChange={event => setDescription(event.target.value)} placeholder="What is this download for?" />
                        <p className="text-xs text-muted-foreground">Shown on the Downloads card and the article page.</p>
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="listing-body">Article details</Label>
                        <Textarea id="listing-body" rows={8} maxLength={20000} className="min-h-40" value={body} onChange={event => setBody(event.target.value)} placeholder="Describe what’s included, requirements, or how to use the file. Markdown is supported." />
                    </div>
                    <div className="grid gap-4 sm:grid-cols-2">
                        <div className="space-y-2">
                            <Label htmlFor="listing-category">Category</Label>
                            <Input id="listing-category" maxLength={80} value={category} onChange={event => setCategory(event.target.value)} placeholder="Presets, templates, or guides" />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="listing-tags">Tags</Label>
                            <Input id="listing-tags" maxLength={502} value={tags} onChange={event => setTags(event.target.value)} placeholder="Lightroom, portrait, XMP" />
                            <p className="text-xs text-muted-foreground">Separate up to 12 tags with commas.</p>
                        </div>
                    </div>
                </div>
                <div className="space-y-3">
                    <Label htmlFor="listing-cover">Cover image</Label>
                    <div className="relative grid aspect-video place-items-center overflow-hidden rounded-lg border bg-muted">
                        {preview ? <Image src={preview} alt="Cover preview" fill unoptimized className="object-cover" /> :
                            <ImagePlus aria-hidden="true" className="size-6 text-muted-foreground" />}
                    </div>
                    <Input id="listing-cover" type="file" accept="image/jpeg,image/png,image/webp" onChange={event => {
                        const selected = event.target.files?.[0];
                        event.target.value = '';
                        if (!selected) return;
                        if (!['image/jpeg', 'image/png', 'image/webp'].includes(selected.type) || selected.size > 8 * 1024 ** 2) {
                            toast.error('Choose a JPEG, PNG, or WebP cover up to 8 MiB.');
                            return;
                        }
                        setFile(selected);
                        setLocalPreview(URL.createObjectURL(selected));
                        setRemoveCover(false);
                    }} />
                    {file && <p className="text-xs text-muted-foreground wrap-anywhere">{file.name}</p>}
                    {(file || (listing.hasCover && !removeCover)) &&
                        <Button type="button" variant="outline" size="sm" onClick={() => {
                            if (file) {
                                setFile(null);
                                setLocalPreview(null);
                            } else {
                                setRemoveCover(true);
                            }
                        }}>{file ? 'Discard new cover' : 'Remove cover'}</Button>}
                    {removeCover && <Button type="button" variant="outline" size="sm" onClick={() => setRemoveCover(false)}>Keep cover</Button>}
                    <p className="text-xs text-muted-foreground">JPEG, PNG, or WebP up to 8 MiB. Upload the ZIP or PDF separately as the artifact file.</p>
                </div>
            </fieldset>
            <Button type="submit" disabled={busy}>
                {saving && <Loader2 className="animate-spin" />}
                {saving ? 'Saving…' : 'Save listing'}
            </Button>
        </form>
    );
}

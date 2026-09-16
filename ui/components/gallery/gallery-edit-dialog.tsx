'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Album, AlbumWithImages, Image } from '@/lib/api/gallery.types';
import { adminGalleryService } from '@/lib/api/admin-gallery.service';

export type GalleryEditTarget =
    | { kind: 'album'; album: Album | AlbumWithImages }
    | { kind: 'image' | 'replace'; image: Image };

export function GalleryEditDialog({ target, onClose, onSaved }: {
    target: GalleryEditTarget;
    onClose: () => void;
    onSaved: (result: Album | Image) => void;
}) {
    const record = target.kind === 'album' ? target.album : target.image;
    const [title, setTitle] = useState('name' in record ? record.name : record.title ?? '');
    const [description, setDescription] = useState(record.description ?? '');
    const [order, setOrder] = useState('order' in record ? record.order : 0);
    const [file, setFile] = useState<File>();
    const [preview, setPreview] = useState<string>();
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState<string>();
    const replacing = target.kind === 'replace';

    useEffect(() => {
        if (!file) return;
        const url = URL.createObjectURL(file);
        setPreview(url);
        return () => URL.revokeObjectURL(url);
    }, [file]);

    const save = async (event: React.FormEvent) => {
        event.preventDefault();
        setBusy(true);
        setError(undefined);
        try {
            let result: Album | Image;
            if (target.kind === 'album') {
                result = await adminGalleryService.updateAlbum(target.album.id, {
                    name: title.trim(), slug: target.album.slug, description, coverImage: file,
                });
            } else if (target.kind === 'replace') {
                if (!file) throw new Error('Choose an image first.');
                result = await adminGalleryService.replaceImage(target.image.id, file);
            } else if (file) {
                result = await adminGalleryService.replaceImage(target.image.id, file, { title, description, order });
            } else {
                result = await adminGalleryService.updateImage(target.image.id, { title, description, order });
            }
            onSaved(result);
            toast.success(replacing ? 'Image replaced' : 'Changes saved');
            onClose();
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Unable to save changes. Please try again.');
        } finally {
            setBusy(false);
        }
    };

    return (
        <Dialog open onOpenChange={open => { if (!open && !busy) onClose(); }}>
            <DialogContent className="max-h-[90dvh] overflow-y-auto" showCloseButton={!busy}>
                <DialogTitle>{replacing ? 'Replace image' : target.kind === 'album' ? 'Edit album' : 'Edit image'}</DialogTitle>
                <DialogDescription>{replacing ? 'Choose a new file. The image link and details will stay the same.' : target.kind === 'image' ? 'Edit details and optionally choose a replacement image. Changes apply when you save.' : 'Save changes directly from the gallery.'}</DialogDescription>
                <form onSubmit={save} className="space-y-4">
                    <fieldset disabled={busy} className="space-y-4">
                        {!replacing && <>
                            <label className="block space-y-2"><span>{target.kind === 'album' ? 'Name' : 'Title'}</span>
                                <Input value={title} required={target.kind === 'album'} onChange={e => setTitle(e.target.value)} />
                            </label>
                            <label className="block space-y-2"><span>Description</span>
                                <Textarea value={description} onChange={e => setDescription(e.target.value)} />
                            </label>
                            {target.kind === 'image' && <label className="block space-y-2"><span>Display order</span>
                                <Input type="number" step="1" required value={order} onChange={e => setOrder(e.target.valueAsNumber)} />
                            </label>}
                        </>}
                        <label className="block space-y-2">
                            <span>{target.kind === 'album' ? 'Cover image' : replacing ? 'New image (up to 25 MB)' : 'Replace image (optional, up to 25 MB)'}</span>
                            <Input type="file" accept="image/*" required={replacing} onChange={e => {
                                const selected = e.target.files?.[0];
                                if (selected && selected.size > 25 * 1024 * 1024) {
                                    setError('Choose an image up to 25 MB.');
                                    e.target.value = '';
                                    setFile(undefined);
                                    setPreview(undefined);
                                    return;
                                }
                                setError(undefined);
                                setFile(selected);
                                setPreview(undefined);
                            }} />
                        </label>
                        {preview && (
                            // Local upload previews must not go through the image optimizer.
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={preview} alt="Selected image preview" className="max-h-56 w-full rounded object-contain" />
                        )}
                        {target.kind === 'album' && <Link className="block underline" href={`/admin/gallery/${target.album.id}/edit`}>Advanced album settings</Link>}
                    </fieldset>
                    {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
                    <DialogFooter>
                        <Button type="button" variant="outline" disabled={busy} onClick={onClose}>Cancel</Button>
                        <Button type="submit" disabled={busy || (replacing && !file) || (target.kind === 'album' && !title.trim())}>
                            {busy ? 'Saving…' : replacing ? 'Replace' : 'Save'}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}

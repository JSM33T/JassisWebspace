import { AlbumWithImages, Image } from "./gallery.types";
import { post, put, del } from "./client";

export interface CreateAlbumRequest {
    name: string;
    description?: string;
    coverImage?: File;
    imageFiles?: File[];
    imageTitles?: string[];
    imageDescriptions?: string[];
    imageOrders?: number[];
}

class AdminGalleryService {
    async createAlbum(data: CreateAlbumRequest): Promise<AlbumWithImages> {
        const formData = new FormData();
        formData.append('name', data.name);
        if (data.description) formData.append('description', data.description);
        if (data.coverImage) formData.append('coverImage', data.coverImage);

        if (data.imageFiles) {
            data.imageFiles.forEach((file) => {
                formData.append('imageFiles', file);
            });
        }

        if (data.imageTitles) {
            data.imageTitles.forEach((title) => {
                formData.append('imageTitles', title);
            });
        }

        if (data.imageDescriptions) {
            data.imageDescriptions.forEach((desc) => {
                formData.append('imageDescriptions', desc);
            });
        }

        if (data.imageOrders) {
            data.imageOrders.forEach((order) => {
                formData.append('imageOrders', order.toString());
            });
        }

        return post<AlbumWithImages>('/admin/gallery/albums', formData);
    }

    async updateAlbum(id: string, data: Partial<CreateAlbumRequest> & { isActive?: boolean }): Promise<AlbumWithImages> {
        const formData = new FormData();
        if (data.name) formData.append('name', data.name);
        if (data.description !== undefined) formData.append('description', data.description);
        if (data.coverImage) formData.append('coverImage', data.coverImage);
        if (data.isActive !== undefined) formData.append('isActive', data.isActive.toString());

        return put<AlbumWithImages>(`/admin/gallery/albums/${id}`, formData);
    }

    async addImagesToAlbum(albumId: string, data: Pick<CreateAlbumRequest, 'imageFiles' | 'imageTitles' | 'imageDescriptions' | 'imageOrders'>): Promise<Image[]> {
        const formData = new FormData();

        if (data.imageFiles) {
            data.imageFiles.forEach((file) => {
                formData.append('imageFiles', file);
            });
        }

        if (data.imageTitles) {
            data.imageTitles.forEach((title) => {
                formData.append('imageTitles', title);
            });
        }

        if (data.imageDescriptions) {
            data.imageDescriptions.forEach((desc) => {
                formData.append('imageDescriptions', desc);
            });
        }

        if (data.imageOrders) {
            data.imageOrders.forEach((order) => {
                formData.append('imageOrders', order.toString());
            });
        }

        return post<Image[]>(`/admin/gallery/albums/${albumId}/images`, formData);
    }

    async deleteImage(imageId: string): Promise<void> {
        return del(`/admin/gallery/images/${imageId}`);
    }

    async uploadImage(file: File): Promise<{ publicId: string, url: string }> {
        const formData = new FormData();
        formData.append('file', file);

        return post<{ publicId: string, url: string }>('/admin/gallery/upload-image', formData);
    }
}

export const adminGalleryService = new AdminGalleryService();

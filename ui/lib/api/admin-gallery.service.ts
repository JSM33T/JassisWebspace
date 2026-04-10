import { Album, AlbumWithImages, GalleryAuthor, Image } from "./gallery.types";
import { post, put, del, get } from "./client";

export interface CreateAlbumRequest {
    name: string;
    slug?: string;
    description?: string;
    createdAt?: string;
    authorIds?: string[];
    isActive?: boolean;
    sortOrder?: number;
    coverImage?: File;
    imageFiles?: File[];
    imageTitles?: string[];
    imageDescriptions?: string[];
    imageOrders?: number[];
}

export interface AddAlbumImageRequest {
    imageFile: File;
    title?: string;
    description?: string;
    order?: number;
}

class AdminGalleryService {
    async getAllAlbums(isActive?: boolean): Promise<Album[]> {
        const queryParams = new URLSearchParams();
        if (isActive !== undefined) queryParams.append('isActive', isActive.toString());
        const query = queryParams.toString();
        return get<Album[]>(`/admin/gallery/albums${query ? `?${query}` : ''}`);
    }

    async getAlbumById(id: string): Promise<AlbumWithImages> {
        return get<AlbumWithImages>(`/admin/gallery/albums/${id}`);
    }

    async getPotentialAuthors(search?: string): Promise<GalleryAuthor[]> {
        const queryParams = new URLSearchParams();
        if (search) queryParams.append('search', search);
        queryParams.append('take', '100');
        const query = queryParams.toString();
        return get<GalleryAuthor[]>(`/admin/gallery/authors${query ? `?${query}` : ''}`);
    }

    async createAlbum(data: CreateAlbumRequest): Promise<AlbumWithImages> {
        const formData = new FormData();
        formData.append('name', data.name);
        if (data.slug) formData.append('slug', data.slug);
        if (data.description) formData.append('description', data.description);
        if (data.isActive !== undefined) formData.append('isActive', data.isActive.toString());
        if (data.sortOrder !== undefined) formData.append('sortOrder', data.sortOrder.toString());
        if (data.authorIds) {
            data.authorIds.forEach((authorId) => {
                formData.append('authorIds', authorId);
            });
        }
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

    async updateAlbum(id: string, data: Partial<CreateAlbumRequest>): Promise<Album> {
        const formData = new FormData();
        if (data.name) formData.append('name', data.name);
        if (data.slug !== undefined) formData.append('slug', data.slug || "");
        if (data.description !== undefined) formData.append('description', data.description);
        if (data.createdAt !== undefined) formData.append('createdAt', data.createdAt);
        if (data.authorIds) {
            data.authorIds.forEach((authorId) => {
                formData.append('authorIds', authorId);
            });
        }
        if (data.coverImage) formData.append('coverImage', data.coverImage);
        if (data.isActive !== undefined) formData.append('isActive', data.isActive.toString());
        if (data.sortOrder !== undefined) formData.append('sortOrder', data.sortOrder.toString());

        return put<Album>(`/admin/gallery/albums/${id}`, formData);
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

    async addImageToAlbum(albumId: string, data: AddAlbumImageRequest): Promise<Image> {
        const formData = new FormData();
        formData.append('imageFile', data.imageFile);

        if (data.title !== undefined) formData.append('title', data.title);
        if (data.description !== undefined) formData.append('description', data.description);
        if (data.order !== undefined) formData.append('order', data.order.toString());

        return post<Image>(`/admin/gallery/albums/${albumId}/images/single`, formData);
    }

    async updateImage(imageId: string, data: { title?: string, description?: string, order?: number }): Promise<Image> {
        const formData = new FormData();
        if (data.title !== undefined) formData.append('title', data.title);
        if (data.description !== undefined) formData.append('description', data.description);
        if (data.order !== undefined) formData.append('order', data.order.toString());

        return put<Image>(`/admin/gallery/images/${imageId}`, formData);
    }

    async deleteAlbum(albumId: string): Promise<void> {
        return post(`/admin/gallery/albums/${albumId}/delete`);
    }

    async deleteImage(imageId: string): Promise<void> {
        return del(`/admin/gallery/images/${imageId}`);
    }

    async uploadImage(file: File, fileName?: string): Promise<{ publicId: string, url: string }> {
        const formData = new FormData();
        formData.append('file', file);
        if (fileName) {
            formData.append('fileName', fileName);
        }

        return post<{ publicId: string, url: string }>('/admin/gallery/upload-image', formData);
    }
}

export const adminGalleryService = new AdminGalleryService();

import { get, post } from './client';
import { Album, AlbumWithImages, Image, CreateAlbumRequest, AddImageRequest } from './gallery.types';

/**
 * Gallery Service
 * Handles all gallery-related API calls
 */

export const galleryService = {
    /**
     * Get all albums with their image counts
     */
    async getAllAlbums(): Promise<Album[]> {
        return get<Album[]>('/gallery/albums');
    },

    /**
     * Get a specific album by ID with all its images
     */
    async getAlbumById(albumId: string): Promise<AlbumWithImages> {
        return get<AlbumWithImages>(`/gallery/albums/${albumId}`);
    },

    /**
     * Get all images for a specific album
     */
    async getImagesByAlbum(albumId: string): Promise<Image[]> {
        return get<Image[]>(`/gallery/albums/${albumId}/images`);
    },

    /**
     * Create a new album (requires authentication)
     */
    async createAlbum(request: CreateAlbumRequest): Promise<Album> {
        return post<Album, CreateAlbumRequest>('/gallery/albums', request);
    },

    /**
     * Add an image to an album (requires authentication)
     */
    async addImageToAlbum(albumId: string, request: AddImageRequest): Promise<Image> {
        return post<Image, AddImageRequest>(`/gallery/albums/${albumId}/images`, request);
    },
};

export default galleryService;

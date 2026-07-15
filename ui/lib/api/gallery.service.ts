import { get, getEnvelope, post } from './client';
import { Album, AlbumWithImages, Image, CreateAlbumRequest, AddImageRequest, AlbumListPage, GallerySortOrder } from './gallery.types';
import { PagedMeta } from './types';

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

    async getAlbumsPage(params?: {
        sortOrder?: GallerySortOrder;
        page?: number;
        pageSize?: number;
    }): Promise<AlbumListPage> {
        const queryParams = new URLSearchParams();
        if (params?.sortOrder) queryParams.append('sortOrder', params.sortOrder);
        if (params?.page) queryParams.append('page', params.page.toString());
        if (params?.pageSize) queryParams.append('pageSize', params.pageSize.toString());

        const query = queryParams.toString();
        const response = await getEnvelope<Album[]>(`/gallery/albums${query ? `?${query}` : ''}`);
        return toAlbumListPage(response.data, response.meta, params?.page, params?.pageSize);
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

function toAlbumListPage(
    albums: Album[],
    meta: PagedMeta | Record<string, unknown> | null | undefined,
    fallbackPage: number = 1,
    fallbackPageSize: number = albums.length
): AlbumListPage {
    const pageMeta = meta as Partial<PagedMeta> | null | undefined;

    return {
        albums,
        page: typeof pageMeta?.page === 'number' ? pageMeta.page : fallbackPage,
        pageSize: typeof pageMeta?.pageSize === 'number' ? pageMeta.pageSize : fallbackPageSize,
        total: typeof pageMeta?.total === 'number' ? pageMeta.total : albums.length,
    };
}

export default galleryService;

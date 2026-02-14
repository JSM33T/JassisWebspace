import { del, get, post, put } from "./client";
import { TrackAuthor } from "./music.types";
import {
    AdminTrackDetail,
    AdminTrackListItem,
    CreateTrackRequest,
    TrackAudioUploadResponse,
    TrackCoverUploadResponse,
    UpdateTrackRequest
} from "./admin-music.types";

class AdminMusicService {
    async getAuthors(params?: { search?: string; take?: number }): Promise<TrackAuthor[]> {
        const query = new URLSearchParams();
        if (params?.search) query.append("search", params.search);
        if (params?.take) query.append("take", String(params.take));
        const suffix = query.toString();
        return get<TrackAuthor[]>(`/admin/music/authors${suffix ? `?${suffix}` : ""}`);
    }

    async getTracks(params?: {
        search?: string;
        category?: string;
        artist?: string;
        genre?: string;
        dateFrom?: string;
        dateTo?: string;
        sortBy?: "releaseDate" | "artist" | "genre" | "title" | "created";
        sortDir?: "asc" | "desc";
        page?: number;
        pageSize?: number;
    }): Promise<AdminTrackListItem[]> {
        const query = new URLSearchParams();
        if (params?.search) query.append("search", params.search);
        if (params?.category) query.append("category", params.category);
        if (params?.artist) query.append("artist", params.artist);
        if (params?.genre) query.append("genre", params.genre);
        if (params?.dateFrom) query.append("dateFrom", params.dateFrom);
        if (params?.dateTo) query.append("dateTo", params.dateTo);
        if (params?.sortBy) query.append("sortBy", params.sortBy);
        if (params?.sortDir) query.append("sortDir", params.sortDir);
        if (params?.page) query.append("page", String(params.page));
        if (params?.pageSize) query.append("pageSize", String(params.pageSize));
        const suffix = query.toString();
        return get<AdminTrackListItem[]>(`/admin/music/tracks${suffix ? `?${suffix}` : ""}`);
    }

    async getTrack(id: string): Promise<AdminTrackDetail> {
        return get<AdminTrackDetail>(`/admin/music/tracks/${id}`);
    }

    async createTrack(data: CreateTrackRequest): Promise<AdminTrackDetail> {
        return post<AdminTrackDetail, CreateTrackRequest>("/admin/music/tracks", data);
    }

    async updateTrack(id: string, data: UpdateTrackRequest): Promise<AdminTrackDetail> {
        return put<AdminTrackDetail, UpdateTrackRequest>(`/admin/music/tracks/${id}`, data);
    }

    async deleteTrack(id: string): Promise<void> {
        return del<void>(`/admin/music/tracks/${id}`);
    }

    async uploadTrackCover(trackId: string, file: File): Promise<TrackCoverUploadResponse> {
        const formData = new FormData();
        formData.append("file", file);
        return post<TrackCoverUploadResponse>(`/admin/music/tracks/${trackId}/cover`, formData);
    }

    async uploadTrackAudio(trackId: string, file: File): Promise<TrackAudioUploadResponse> {
        const formData = new FormData();
        formData.append("file", file);
        return post<TrackAudioUploadResponse>(`/admin/music/tracks/${trackId}/audio`, formData);
    }
}

export const adminMusicService = new AdminMusicService();

import { get, post } from "./client";
import { MusicTrack, TrackDetail, TrackPlayLinkResponse } from "./music.types";

class MusicService {
    async getTracks(params?: {
        search?: string;
        category?: string;
        featured?: boolean;
        page?: number;
        pageSize?: number;
    }): Promise<MusicTrack[]> {
        const query = new URLSearchParams();
        if (params?.search) query.append("search", params.search);
        if (params?.category) query.append("category", params.category);
        if (params?.featured !== undefined) query.append("featured", String(params.featured));
        if (params?.page) query.append("page", String(params.page));
        if (params?.pageSize) query.append("pageSize", String(params.pageSize));
        const suffix = query.toString();
        return get<MusicTrack[]>(`/music/tracks${suffix ? `?${suffix}` : ""}`);
    }

    async getTrackBySlug(slug: string): Promise<TrackDetail> {
        return get<TrackDetail>(`/music/tracks/${encodeURIComponent(slug)}`);
    }

    async createPlayLink(trackId: string): Promise<TrackPlayLinkResponse> {
        return post<TrackPlayLinkResponse>(`/music/tracks/${trackId}/play-link`);
    }
}

export const musicService = new MusicService();

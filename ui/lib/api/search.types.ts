export type ContentType = 'Album' | 'Blog' | 'Video' | 'Music';

export interface SearchResultItem {
    contentId: string;
    contentRefId: string;
    contentType: ContentType;
    title: string;
    slug: string;
    headline: string | null;
    rank: number;
    publishedAt: string | null;
}

export interface SearchResponse {
    items: SearchResultItem[];
    total: number;
    page: number;
    pageSize: number;
}

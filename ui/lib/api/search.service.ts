import { get } from './client';
import type { ContentType, SearchResponse, SearchResultItem } from './search.types';

type RawSearchResultItem = Omit<SearchResultItem, 'contentType'> & {
    contentType: unknown;
};

type RawSearchResponse = Omit<SearchResponse, 'items'> & {
    items: RawSearchResultItem[];
};

const CONTENT_TYPES: ContentType[] = ['Album', 'Blog', 'Video', 'Music'];

const CONTENT_TYPE_BY_ENUM_VALUE: Record<number, ContentType> = {
    1: 'Album',
    2: 'Blog',
    3: 'Video',
    4: 'Music',
};

function normalizeContentType(value: unknown): ContentType | null {
    if (typeof value === 'number') {
        return CONTENT_TYPE_BY_ENUM_VALUE[value] ?? null;
    }

    if (typeof value !== 'string') {
        return null;
    }

    const enumValue = Number(value);
    if (Number.isInteger(enumValue)) {
        return CONTENT_TYPE_BY_ENUM_VALUE[enumValue] ?? null;
    }

    const match = CONTENT_TYPES.find(
        (contentType) => contentType.toLowerCase() === value.toLowerCase()
    );

    return match ?? null;
}

function normalizeSearchResponse(response: RawSearchResponse): SearchResponse {
    return {
        ...response,
        items: response.items
            .map((item): SearchResultItem | null => {
                const contentType = normalizeContentType(item.contentType);
                return contentType ? { ...item, contentType } : null;
            })
            .filter((item): item is SearchResultItem => item !== null),
    };
}

export const searchService = {
    async search(params: {
        q: string;
        types?: ContentType[];
        page?: number;
        pageSize?: number;
    }): Promise<SearchResponse> {
        const query = new URLSearchParams();
        query.set('q', params.q);
        if (params.types?.length) {
            for (const t of params.types) query.append('types', t);
        }
        if (params.page) query.set('page', String(params.page));
        if (params.pageSize) query.set('pageSize', String(params.pageSize));
        const response = await get<RawSearchResponse>(`/search?${query.toString()}`);
        return normalizeSearchResponse(response);
    },
};

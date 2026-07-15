import { get, getEnvelope, post } from './client';
import { 
    BlogListItem, 
    BlogDetail, 
    BlogCategory, 
    CreateBlogRequest,
    CreateBlogCategoryRequest,
    BlogListPage
} from './blog.types';
import { PagedMeta } from './types';

/**
 * Blog Service
 * Handles all blog-related API calls
 */

export const blogService = {
    /**
     * Get all published blogs with optional filters
     */
    async getBlogs(params?: {
        search?: string;
        startDate?: string;
        endDate?: string;
        categoryId?: string;
        authorUsername?: string;
        page?: number;
        pageSize?: number;
    }): Promise<BlogListItem[]> {
        const page = await this.getBlogsPage(params);
        return page.blogs;
    },

    async getBlogsPage(params?: {
        search?: string;
        startDate?: string;
        endDate?: string;
        categoryId?: string;
        authorUsername?: string;
        page?: number;
        pageSize?: number;
    }): Promise<BlogListPage> {
        const queryParams = new URLSearchParams();
        if (params?.search) queryParams.append('search', params.search);
        if (params?.startDate) queryParams.append('startDate', params.startDate);
        if (params?.endDate) queryParams.append('endDate', params.endDate);
        if (params?.categoryId) queryParams.append('categoryId', params.categoryId);
        if (params?.authorUsername) queryParams.append('authorUsername', params.authorUsername);
        if (params?.page) queryParams.append('page', params.page.toString());
        if (params?.pageSize) queryParams.append('pageSize', params.pageSize.toString());
        
        const query = queryParams.toString();
        const response = await getEnvelope<BlogListItem[]>(`/blog${query ? `?${query}` : ''}`);
        return toBlogListPage(response.data, response.meta, params?.page, params?.pageSize);
    },

    /**
     * Get a specific blog by slug
     */
    async getBlogBySlug(slug: string): Promise<BlogDetail> {
        return get<BlogDetail>(`/blog/${slug}`);
    },

    /**
     * Get all blog categories
     */
    async getCategories(): Promise<BlogCategory[]> {
        return get<BlogCategory[]>('/blog/categories');
    },

    /**
     * Get blogs by category slug
     */
    async getBlogsByCategory(
        categorySlug: string,
        page: number = 1,
        pageSize: number = 10
    ): Promise<BlogListItem[]> {
        const result = await this.getBlogsByCategoryPage(categorySlug, page, pageSize);
        return result.blogs;
    },

    async getBlogsByCategoryPage(
        categorySlug: string,
        page: number = 1,
        pageSize: number = 10
    ): Promise<BlogListPage> {
        const response = await getEnvelope<BlogListItem[]>(
            `/blog/categories/${categorySlug}/blogs?page=${page}&pageSize=${pageSize}`
        );
        return toBlogListPage(response.data, response.meta, page, pageSize);
    },

    /**
     * Create a new blog post (requires authentication)
     */
    async createBlog(request: CreateBlogRequest): Promise<BlogDetail> {
        return post<BlogDetail, CreateBlogRequest>('/blog', request);
    },

    /**
     * Create a new blog category (requires authentication)
     */
    async createCategory(request: CreateBlogCategoryRequest): Promise<BlogCategory> {
        return post<BlogCategory, CreateBlogCategoryRequest>('/blog/categories', request);
    },
};

function toBlogListPage(
    blogs: BlogListItem[],
    meta: PagedMeta | Record<string, unknown> | null | undefined,
    fallbackPage: number = 1,
    fallbackPageSize: number = blogs.length
): BlogListPage {
    const pageMeta = meta as Partial<PagedMeta> | null | undefined;

    return {
        blogs,
        page: typeof pageMeta?.page === 'number' ? pageMeta.page : fallbackPage,
        pageSize: typeof pageMeta?.pageSize === 'number' ? pageMeta.pageSize : fallbackPageSize,
        total: typeof pageMeta?.total === 'number' ? pageMeta.total : blogs.length,
    };
}

export default blogService;

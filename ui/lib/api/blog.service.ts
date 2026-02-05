import { get, post } from './client';
import { 
    BlogListItem, 
    BlogDetail, 
    BlogCategory, 
    CreateBlogRequest,
    CreateBlogCategoryRequest 
} from './blog.types';

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
        const queryParams = new URLSearchParams();
        if (params?.search) queryParams.append('search', params.search);
        if (params?.startDate) queryParams.append('startDate', params.startDate);
        if (params?.endDate) queryParams.append('endDate', params.endDate);
        if (params?.categoryId) queryParams.append('categoryId', params.categoryId);
        if (params?.authorUsername) queryParams.append('authorUsername', params.authorUsername);
        if (params?.page) queryParams.append('page', params.page.toString());
        if (params?.pageSize) queryParams.append('pageSize', params.pageSize.toString());
        
        const query = queryParams.toString();
        return get<BlogListItem[]>(`/blog${query ? `?${query}` : ''}`);
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
        return get<BlogListItem[]>(
            `/blog/categories/${categorySlug}/blogs?page=${page}&pageSize=${pageSize}`
        );
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

export default blogService;

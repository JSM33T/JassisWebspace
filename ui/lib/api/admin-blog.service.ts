import { BlogDetail, BlogListItem, CreateBlogRequest, BlogCategory, BlogAuthor } from "./blog.types";
import { post, put, del, get } from "./client";

class AdminBlogService {
    async getBlogs(params?: {
        search?: string;
        startDate?: string;
        endDate?: string;
        categoryId?: string;
        authorUsername?: string;
        isPublished?: boolean;
        page?: number;
        pageSize?: number;
    }): Promise<BlogListItem[]> {
        const queryParams = new URLSearchParams();
        if (params?.search) queryParams.append("search", params.search);
        if (params?.startDate) queryParams.append("startDate", params.startDate);
        if (params?.endDate) queryParams.append("endDate", params.endDate);
        if (params?.categoryId) queryParams.append("categoryId", params.categoryId);
        if (params?.authorUsername) queryParams.append("authorUsername", params.authorUsername);
        if (typeof params?.isPublished === "boolean") queryParams.append("isPublished", params.isPublished.toString());
        if (params?.page) queryParams.append("page", params.page.toString());
        if (params?.pageSize) queryParams.append("pageSize", params.pageSize.toString());

        const queryString = queryParams.toString();
        return get<BlogListItem[]>(`/admin/blog${queryString ? `?${queryString}` : ""}`);
    }

    async getAllCategories(): Promise<BlogCategory[]> {
        return get<BlogCategory[]>('/admin/blog/categories');
    }

    async getPotentialAuthors(search?: string): Promise<BlogAuthor[]> {
        const queryParams = new URLSearchParams();
        if (search) queryParams.append('search', search);
        queryParams.append('take', '100');
        const query = queryParams.toString();
        return get<BlogAuthor[]>(`/admin/blog/authors${query ? `?${query}` : ''}`);
    }

    async createBlog(data: CreateBlogRequest): Promise<BlogDetail> {
        return post<BlogDetail>('/admin/blog', data);
    }

    async createCategory(data: { name: string; description?: string }): Promise<BlogCategory> {
        return post<BlogCategory>('/admin/blog/categories', data);
    }

    async updateCategory(id: string, data: { name: string; description?: string }): Promise<BlogCategory> {
        return put<BlogCategory>(`/admin/blog/categories/${id}`, data);
    }

    async updateBlog(id: string, data: CreateBlogRequest): Promise<BlogDetail> {
        return put<BlogDetail>(`/admin/blog/${id}`, data);
    }

    async deleteBlog(id: string): Promise<void> {
        return del(`/admin/blog/${id}`);
    }

    async getBlog(id: string): Promise<BlogDetail> {
        // We can reuse the public endpoint or add a specific admin one. 
        // For now, let's assume we can fetch it via the update endpoint return or a specific get.
        // The controller `UpdateBlog` returns `BlogDetailResponse`. 
        // We actually didn't make a `GET /admin/blog/{id}` endpoint in the controller! 
        // We should fixes that or use the public one if available.
        // Checking `AdminBlogController`... I missed `GET /{id}`.
        // But `UpdateBlog` returns the details.
        // Creating a get endpoint is better.
        // For now, I'll rely on the public blog service for fetching details if it exists, 
        // or I will add the GET endpoint to `AdminBlogController` quickly.

        // Let's assume there is a public way, or I'll implement GET in the controller in the next step.
        // Waiting... I'll add GET to the controller as it is safer for admin to see unpublished blogs.
        return get<BlogDetail>(`/admin/blog/${id}`);
    }

    async uploadImage(file: File, fileName?: string): Promise<{ publicId: string, url: string }> {
        const formData = new FormData();
        formData.append('file', file);
        if (fileName) {
            formData.append('fileName', fileName);
        }

        return post<{ publicId: string, url: string }>('/admin/blog/upload-image', formData);
    }
}

export const adminBlogService = new AdminBlogService();

export interface BlogCategory {
    id: string;
    name: string;
    slug: string;
    description: string | null;
    createdAt: string;
    updatedAt: string | null;
}

export interface BlogAuthor {
    userId: string;
    username: string;
    displayName: string | null;
    order: number;
}

export interface BlogListItem {
    id: string;
    title: string;
    slug: string;
    excerpt: string | null;
    featuredImage: string | null;
    category: BlogCategory | null;
    authors: BlogAuthor[];
    isPublished: boolean;
    publishedAt: string | null;
    createdAt: string;
    updatedAt: string | null;
}

export interface BlogDetail {
    id: string;
    title: string;
    slug: string;
    excerpt: string | null;
    content: string;
    featuredImage: string | null;
    category: BlogCategory | null;
    authors: BlogAuthor[];
    isPublished: boolean;
    publishedAt: string | null;
    createdAt: string;
    updatedAt: string | null;
}

export interface CreateBlogRequest {
    id?: string;
    title: string;
    excerpt?: string;
    content: string;
    featuredImage?: string;
    categoryId?: string;
    authorIds?: string[];
    isPublished: boolean;
}

export interface CreateBlogCategoryRequest {
    name: string;
    description?: string;
}

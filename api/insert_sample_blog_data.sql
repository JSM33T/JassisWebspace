-- Get the first user from the database to use as author
DO $$
DECLARE
    v_user_id UUID;
    v_tech_category_id UUID;
    v_travel_category_id UUID;
    v_blog1_id UUID;
    v_blog2_id UUID;
BEGIN
    -- Get first user ID
    SELECT "Id" INTO v_user_id FROM "Users" LIMIT 1;
    
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'No users found in the database. Please create a user first.';
    END IF;
    
    RAISE NOTICE 'Using user ID: %', v_user_id;
    
    -- Insert Technology Category
    INSERT INTO "BlogCategories" ("Id", "Name", "Slug", "Description", "CreatedAt", "UpdatedAt")
    VALUES (
        gen_random_uuid(),
        'Technology',
        'technology',
        'Articles about technology, programming, and software development',
        NOW(),
        NOW()
    )
    RETURNING "Id" INTO v_tech_category_id;
    
    RAISE NOTICE 'Created Technology category with ID: %', v_tech_category_id;
    
    -- Insert Travel Category
    INSERT INTO "BlogCategories" ("Id", "Name", "Slug", "Description", "CreatedAt", "UpdatedAt")
    VALUES (
        gen_random_uuid(),
        'Travel',
        'travel',
        'Travel stories and destination guides',
        NOW(),
        NOW()
    )
    RETURNING "Id" INTO v_travel_category_id;
    
    RAISE NOTICE 'Created Travel category with ID: %', v_travel_category_id;
    
    -- Insert First Blog Post
    INSERT INTO "Blogs" (
        "Id", 
        "Title", 
        "Slug", 
        "Excerpt", 
        "Content", 
        "FeaturedImage", 
        "CategoryId", 
        "IsPublished", 
        "PublishedAt", 
        "CreatedAt", 
        "UpdatedAt"
    )
    VALUES (
        gen_random_uuid(),
        'Getting Started with ASP.NET Core',
        'getting-started-with-aspnet-core',
        'Learn the fundamentals of building modern web applications with ASP.NET Core',
        '<h2>Introduction</h2><p>ASP.NET Core is a cross-platform, high-performance framework for building modern, cloud-based, internet-connected applications.</p><h2>Key Features</h2><ul><li>Cross-platform support</li><li>High performance</li><li>Dependency injection built-in</li><li>Modern web development</li></ul><h2>Conclusion</h2><p>ASP.NET Core is an excellent choice for building web applications.</p>',
        'https://images.unsplash.com/photo-1461749280684-dccba630e2f6',
        v_tech_category_id,
        true,
        NOW(),
        NOW(),
        NOW()
    )
    RETURNING "Id" INTO v_blog1_id;
    
    RAISE NOTICE 'Created first blog with ID: %', v_blog1_id;
    
    -- Link Author to First Blog
    INSERT INTO "BlogAuthors" ("Id", "BlogId", "UserId", "Order", "CreatedAt")
    VALUES (
        gen_random_uuid(),
        v_blog1_id,
        v_user_id,
        0,
        NOW()
    );
    
    -- Insert Second Blog Post
    INSERT INTO "Blogs" (
        "Id", 
        "Title", 
        "Slug", 
        "Excerpt", 
        "Content", 
        "FeaturedImage", 
        "CategoryId", 
        "IsPublished", 
        "PublishedAt", 
        "CreatedAt", 
        "UpdatedAt"
    )
    VALUES (
        gen_random_uuid(),
        'Top 10 Destinations in Europe',
        'top-10-destinations-in-europe',
        'Discover the most beautiful places to visit in Europe for your next vacation',
        '<h2>Introduction</h2><p>Europe offers countless amazing destinations for travelers.</p><h2>The List</h2><ol><li>Paris, France</li><li>Rome, Italy</li><li>Barcelona, Spain</li><li>Amsterdam, Netherlands</li><li>Prague, Czech Republic</li></ol>',
        'https://images.unsplash.com/photo-1488646953014-85cb44e25828',
        v_travel_category_id,
        true,
        NOW(),
        NOW(),
        NOW()
    )
    RETURNING "Id" INTO v_blog2_id;
    
    RAISE NOTICE 'Created second blog with ID: %', v_blog2_id;
    
    -- Link Author to Second Blog
    INSERT INTO "BlogAuthors" ("Id", "BlogId", "UserId", "Order", "CreatedAt")
    VALUES (
        gen_random_uuid(),
        v_blog2_id,
        v_user_id,
        0,
        NOW()
    );
    
    RAISE NOTICE 'Successfully created 2 categories, 2 blogs, and linked them to user';
    
END $$;

-- Verify the data
SELECT 
    b."Title",
    b."Slug",
    b."IsPublished",
    bc."Name" as "CategoryName",
    u."Username" as "AuthorUsername",
    u."DisplayName" as "AuthorDisplayName"
FROM "Blogs" b
LEFT JOIN "BlogCategories" bc ON b."CategoryId" = bc."Id"
LEFT JOIN "BlogAuthors" ba ON b."Id" = ba."BlogId"
LEFT JOIN "Users" u ON ba."UserId" = u."Id"
ORDER BY b."CreatedAt" DESC;

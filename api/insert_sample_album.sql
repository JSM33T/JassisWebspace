-- Insert sample album data with images and content entry

-- 1. Create an album
INSERT INTO "Albums" ("Id", "Name", "Slug", "Cover", "Description", "IsActive", "CreatedAt", "UpdatedAt")
VALUES 
    ('a1b2c3d4-e5f6-4a5b-8c9d-0e1f2a3b4c5d', 'Summer Vacation 2025', 'summer-vacation-2025', 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4', 'Beautiful moments from our summer trip to the mountains', true, NOW(), NOW());

-- 2. Insert images for the album
INSERT INTO "Images" ("Id", "AlbumId", "Url", "Title", "Description", "Order", "CreatedAt")
VALUES 
    ('11111111-1111-1111-1111-111111111111', 'a1b2c3d4-e5f6-4a5b-8c9d-0e1f2a3b4c5d', 
     'https://images.unsplash.com/photo-1506905925346-21bda4d32df4', 
     'Mountain Sunrise', 'Breathtaking sunrise over the mountain peaks', 1, NOW()),
    
    ('22222222-2222-2222-2222-222222222222', 'a1b2c3d4-e5f6-4a5b-8c9d-0e1f2a3b4c5d', 
     'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b', 
     'Mountain Lake', 'Crystal clear lake reflecting the mountains', 2, NOW()),
    
    ('33333333-3333-3333-3333-333333333333', 'a1b2c3d4-e5f6-4a5b-8c9d-0e1f2a3b4c5d', 
     'https://images.unsplash.com/photo-1519904981063-b0cf448d479e', 
     'Hiking Trail', 'Scenic hiking trail through the forest', 3, NOW());

-- 3. Create content entry for the album (ContentType: Album = 1)
INSERT INTO "Contents" ("Id", "ContentType", "ContentRefId", "Title", "Slug", "IsPublished", "PublishedAt", "CreatedAt", "UpdatedAt")
VALUES 
    ('c0c0c0c0-c0c0-c0c0-c0c0-c0c0c0c0c0c0', 1, 'a1b2c3d4-e5f6-4a5b-8c9d-0e1f2a3b4c5d', 
     'Summer Vacation 2025', 'summer-vacation-2025', true, NOW(), NOW(), NOW());

-- Verify the data
SELECT 'Albums' as table_name, COUNT(*) as count FROM "Albums"
UNION ALL
SELECT 'Images', COUNT(*) FROM "Images"
UNION ALL
SELECT 'Contents', COUNT(*) FROM "Contents";

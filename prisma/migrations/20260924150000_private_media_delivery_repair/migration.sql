CREATE TEMP TABLE "_MediaUrlRepair" AS
SELECT
  "url" AS old_url,
  '/api/media/file?key=' || "storageKey" AS new_url
FROM "Media"
WHERE "provider" = 'S3'
  AND "storageKey" IS NOT NULL
  AND "url" <> '/api/media/file?key=' || "storageKey";

UPDATE "SitePage" p
SET "ogImage" = m.new_url
FROM "_MediaUrlRepair" m
WHERE p."ogImage" = m.old_url;

UPDATE "SiteSection" s
SET "imageUrl" = m.new_url
FROM "_MediaUrlRepair" m
WHERE s."imageUrl" = m.old_url;

UPDATE "SiteSection" s
SET "mediaUrls" = ARRAY(
  SELECT COALESCE(
    (SELECT m.new_url FROM "_MediaUrlRepair" m WHERE m.old_url = item LIMIT 1),
    item
  )
  FROM unnest(s."mediaUrls") AS item
)
WHERE EXISTS (
  SELECT 1
  FROM unnest(s."mediaUrls") AS item
  JOIN "_MediaUrlRepair" m ON m.old_url = item
);

UPDATE "Accommodation" a
SET "coverImage" = m.new_url
FROM "_MediaUrlRepair" m
WHERE a."coverImage" = m.old_url;

UPDATE "Accommodation" a
SET "galleryImages" = ARRAY(
  SELECT COALESCE(
    (SELECT m.new_url FROM "_MediaUrlRepair" m WHERE m.old_url = item LIMIT 1),
    item
  )
  FROM unnest(a."galleryImages") AS item
)
WHERE EXISTS (
  SELECT 1
  FROM unnest(a."galleryImages") AS item
  JOIN "_MediaUrlRepair" m ON m.old_url = item
);

UPDATE "BlogPost" p
SET "coverImage" = m.new_url
FROM "_MediaUrlRepair" m
WHERE p."coverImage" = m.old_url;

UPDATE "RestaurantProduct" p
SET "imageUrl" = m.new_url
FROM "_MediaUrlRepair" m
WHERE p."imageUrl" = m.old_url;

UPDATE "Media" media
SET "url" = m.new_url
FROM "_MediaUrlRepair" m
WHERE media."url" = m.old_url;

DROP TABLE "_MediaUrlRepair";

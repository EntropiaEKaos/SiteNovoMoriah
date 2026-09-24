CREATE TABLE IF NOT EXISTS "SitePage" (
  "id" TEXT NOT NULL,
  "slug" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "description" TEXT,
  "seoTitle" TEXT,
  "seoDescription" TEXT,
  "ogImage" TEXT,
  "published" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "SitePage_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "SitePage_slug_key"
  ON "SitePage"("slug");

CREATE TABLE IF NOT EXISTS "SiteSection" (
  "id" TEXT NOT NULL,
  "pageId" TEXT NOT NULL,
  "type" TEXT NOT NULL,
  "eyebrow" TEXT,
  "title" TEXT,
  "subtitle" TEXT,
  "body" TEXT,
  "imageUrl" TEXT,
  "imageAlt" TEXT,
  "mediaUrls" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  "ctaLabel" TEXT,
  "ctaHref" TEXT,
  "secondaryCtaLabel" TEXT,
  "secondaryCtaHref" TEXT,
  "theme" TEXT NOT NULL DEFAULT 'LIGHT',
  "layout" TEXT NOT NULL DEFAULT 'DEFAULT',
  "sortOrder" INTEGER NOT NULL DEFAULT 100,
  "active" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "SiteSection_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "SiteSection_pageId_fkey"
    FOREIGN KEY ("pageId") REFERENCES "SitePage"("id")
    ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS "SiteSection_pageId_active_sortOrder_idx"
  ON "SiteSection"("pageId","active","sortOrder");

INSERT INTO "SitePage" ("id","slug","title","description","published","createdAt","updatedAt")
VALUES ('home','home','Home','Página inicial da Pousada Moriah',true,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP)
ON CONFLICT ("slug") DO NOTHING;

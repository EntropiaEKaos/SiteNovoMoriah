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


INSERT INTO "SiteSection"
("id","pageId","type","eyebrow","title","body","ctaLabel","ctaHref","secondaryCtaLabel","secondaryCtaHref","theme","layout","sortOrder","active","createdAt","updatedAt")
VALUES
('home-hero','home','HERO','POUSADA & HOSTEL • PRAIA GRANDE',NULL,NULL,'Reservar agora','/reservar','Conhecer acomodações','#hospedagem','LIGHT','SPLIT',10,true,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP),
('home-stays','home','ACCOMMODATIONS','ESCOLHA SUA ESTADIA','Hospedagem sem complicação.','Quartos pensados para aproveitar Praia Grande com conforto, praticidade e uma experiência direta.',NULL,NULL,NULL,NULL,'LIGHT','WIDE',20,true,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP),
('home-gallery','home','GALLERY','CONHEÇA A MORIAH','Um pouco do seu próximo descanso.',NULL,NULL,NULL,NULL,NULL,'DARK','MOSAIC',30,true,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP),
('home-trust','home','TRUST',NULL,NULL,'Praia Grande, SP\nReserva direta\nAtendimento acolhedor\nExperiência Moriah',NULL,NULL,NULL,NULL,'YELLOW','WIDE',40,true,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP),
('home-features','home','FEATURES','MORIAH ESSENCIAL','O que importa, bem feito.','Wi-Fi para sua estadia\nEspaços de convivência\nBoa localização em Praia Grande',NULL,NULL,NULL,NULL,'DARK','SPLIT',50,true,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP),
('home-food','home','FOOD','MORIAH FOOD','Comida boa também faz parte da estadia.','Conheça o cardápio e peça direto pelo restaurante Moriah.','Ver Moriah Food','/restaurante',NULL,NULL,'SOFT','SPLIT',60,true,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP),
('home-blog','home','BLOG','DICAS & NOVIDADES','Journal Moriah.',NULL,'Ver todas','/blog',NULL,NULL,'LIGHT','WIDE',70,true,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP),
('home-cta','home','CTA','PRONTO PARA VIAJAR?','Faça da Moriah a sua base.','Reserve direto conosco e tenha uma experiência simples do início ao fim.','Quero reservar','/reservar',NULL,NULL,'YELLOW','CENTERED',80,true,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP)
ON CONFLICT ("id") DO NOTHING;

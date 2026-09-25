ALTER TABLE "RouletteSettings"
ADD COLUMN IF NOT EXISTS "reviewLinks" JSONB;

ALTER TABLE "RoulettePrize"
ADD COLUMN IF NOT EXISTS "campaignKey" TEXT NOT NULL DEFAULT 'moriah-1';

UPDATE "RoulettePrize"
SET "campaignKey" = COALESCE(
  (SELECT "campaignKey" FROM "RouletteSettings" WHERE "id" = 'main'),
  'moriah-1'
)
WHERE "campaignKey" IS NULL OR "campaignKey" = 'moriah-1';

CREATE INDEX IF NOT EXISTS "RoulettePrize_campaignKey_active_sortOrder_idx"
ON "RoulettePrize"("campaignKey","active","sortOrder");

INSERT INTO "RouletteSettings" (
  "id","active","campaignKey","title","subtitle","introText",
  "googleReviewLabel","termsText","themeMode","themePreset",
  "themePrimaryColor","themeSecondaryColor","themeAccentColor",
  "themeSurfaceColor","themeTextColor","animationStyle","showEventBanner",
  "reviewLinks","updatedAt"
) VALUES (
  'delivery',true,'moriah-delivery-demo','Roleta Entregas Moriah',
  'Seu pedido chegou. Agora é hora de tentar a sorte.',
  'Se quiser, conte como foi sua experiência em um dos aplicativos abaixo. A avaliação é opcional e não altera sua chance nem o prêmio.',
  'Avaliar a Moriah','Ao participar, você autoriza o uso do nome e telefone apenas para administrar esta promoção e validar a entrega do prêmio.',
  'CUSTOM','NEON','#101010','#181818','#FFD400','#FFFFFF','#101010','SPARKLES',false,
  '[{"key":"IFOOD","label":"Avaliar no iFood","url":""},{"key":"99FOOD","label":"Avaliar no 99Food","url":""},{"key":"KEETA","label":"Avaliar no Keeta","url":""}]'::jsonb,
  NOW()
)
ON CONFLICT ("id") DO NOTHING;

INSERT INTO "RoulettePrize" (
  "id","campaignKey","name","description","color","textColor","weight",
  "quantityTotal","awardedCount","validityDays","active","sortOrder","createdAt","updatedAt"
)
SELECT
  seed.id,
  seed."campaignKey",
  seed.name,
  seed.description,
  seed.color,
  seed."textColor",
  seed.weight,
  seed."quantityTotal",
  seed."awardedCount",
  seed."validityDays",
  seed.active,
  seed."sortOrder",
  seed."createdAt",
  seed."updatedAt"
FROM (VALUES
  ('delivery-demo-01'::text,'moriah-delivery-demo'::text,'10% OFF'::text,'10% de desconto no próximo pedido direto.'::text,'#FFD400'::text,'#101010'::text,3::integer,NULL::integer,0::integer,14::integer,true,10::integer,NOW(),NOW()),
  ('delivery-demo-02'::text,'moriah-delivery-demo'::text,'Refrigerante grátis'::text,'Ganhe um refrigerante no próximo pedido elegível.'::text,'#101010'::text,'#FFFFFF'::text,3::integer,NULL::integer,0::integer,14::integer,true,20::integer,NOW(),NOW()),
  ('delivery-demo-03'::text,'moriah-delivery-demo'::text,'Sobremesa grátis'::text,'Uma sobremesa selecionada pela casa.'::text,'#FFFFFF'::text,'#101010'::text,2::integer,NULL::integer,0::integer,14::integer,true,30::integer,NOW(),NOW()),
  ('delivery-demo-04'::text,'moriah-delivery-demo'::text,'Frete grátis'::text,'Frete grátis em um próximo pedido elegível.'::text,'#F5C400'::text,'#101010'::text,2::integer,NULL::integer,0::integer,14::integer,true,40::integer,NOW(),NOW()),
  ('delivery-demo-05'::text,'moriah-delivery-demo'::text,'Upgrade de bebida'::text,'Troque sua bebida por uma opção maior, conforme disponibilidade.'::text,'#222222'::text,'#FFFFFF'::text,2::integer,NULL::integer,0::integer,14::integer,true,50::integer,NOW(),NOW()),
  ('delivery-demo-06'::text,'moriah-delivery-demo'::text,'Brinde surpresa'::text,'Um mimo surpresa da Moriah no próximo pedido.'::text,'#FFF3A6'::text,'#101010'::text,1::integer,NULL::integer,0::integer,14::integer,true,60::integer,NOW(),NOW())
) AS seed(
  id,"campaignKey",name,description,color,"textColor",weight,
  "quantityTotal","awardedCount","validityDays",active,"sortOrder","createdAt","updatedAt"
)
WHERE NOT EXISTS (
  SELECT 1 FROM "RoulettePrize" WHERE "campaignKey"='moriah-delivery-demo'
)
ON CONFLICT ("id") DO NOTHING;

INSERT INTO "RoulettePrize" (
  "id","campaignKey","name","description","color","textColor","weight",
  "quantityTotal","awardedCount","validityDays","active","sortOrder","createdAt","updatedAt"
)
SELECT
  seed.id,
  COALESCE(
    (SELECT "campaignKey" FROM "RouletteSettings" WHERE "id"='main'),
    seed."campaignKey"
  ),
  seed.name,
  seed.description,
  seed.color,
  seed."textColor",
  seed.weight,
  seed."quantityTotal",
  seed."awardedCount",
  seed."validityDays",
  seed.active,
  seed."sortOrder",
  seed."createdAt",
  seed."updatedAt"
FROM (VALUES
  ('main-demo-01'::text,'moriah-1'::text,'5% OFF'::text,'5% de desconto em uma próxima compra elegível.'::text,'#FFD400'::text,'#101010'::text,3::integer,NULL::integer,0::integer,14::integer,true,10::integer,NOW(),NOW()),
  ('main-demo-02'::text,'moriah-1'::text,'Refrigerante grátis'::text,'Ganhe um refrigerante em uma próxima compra elegível.'::text,'#101010'::text,'#FFFFFF'::text,3::integer,NULL::integer,0::integer,14::integer,true,20::integer,NOW(),NOW()),
  ('main-demo-03'::text,'moriah-1'::text,'Sobremesa grátis'::text,'Uma sobremesa selecionada pela casa.'::text,'#FFFFFF'::text,'#101010'::text,2::integer,NULL::integer,0::integer,14::integer,true,30::integer,NOW(),NOW()),
  ('main-demo-04'::text,'moriah-1'::text,'10% OFF'::text,'10% de desconto em uma próxima compra elegível.'::text,'#F5C400'::text,'#101010'::text,2::integer,NULL::integer,0::integer,14::integer,true,40::integer,NOW(),NOW())
) AS seed(
  id,"campaignKey",name,description,color,"textColor",weight,
  "quantityTotal","awardedCount","validityDays",active,"sortOrder","createdAt","updatedAt"
)
WHERE NOT EXISTS (
  SELECT 1 FROM "RoulettePrize"
  WHERE "campaignKey" = COALESCE(
    (SELECT "campaignKey" FROM "RouletteSettings" WHERE "id"='main'),
    'moriah-1'
  )
)
ON CONFLICT ("id") DO NOTHING;

UPDATE "RoulettePrize"
SET "campaignKey" = COALESCE(
  (SELECT "campaignKey" FROM "RouletteSettings" WHERE "id"='main'),
  'moriah-1'
)
WHERE "id" LIKE 'main-demo-%';

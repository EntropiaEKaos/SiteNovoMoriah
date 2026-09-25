ALTER TABLE "RouletteSettings" ADD COLUMN "reviewLinks" JSONB;

ALTER TABLE "RoulettePrize" ADD COLUMN "campaignKey" TEXT NOT NULL DEFAULT 'moriah-1';

UPDATE "RoulettePrize"
SET "campaignKey" = COALESCE(
  (SELECT "campaignKey" FROM "RouletteSettings" WHERE "id" = 'main'),
  'moriah-1'
);

CREATE INDEX "RoulettePrize_campaignKey_active_sortOrder_idx"
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
SELECT * FROM (VALUES
  ('delivery-demo-01','moriah-delivery-demo','10% OFF','10% de desconto no próximo pedido direto.','#FFD400','#101010',3,NULL,0,14,true,10,NOW(),NOW()),
  ('delivery-demo-02','moriah-delivery-demo','Refrigerante grátis','Ganhe um refrigerante no próximo pedido elegível.','#101010','#FFFFFF',3,NULL,0,14,true,20,NOW(),NOW()),
  ('delivery-demo-03','moriah-delivery-demo','Sobremesa grátis','Uma sobremesa selecionada pela casa.','#FFFFFF','#101010',2,NULL,0,14,true,30,NOW(),NOW()),
  ('delivery-demo-04','moriah-delivery-demo','Frete grátis','Frete grátis em um próximo pedido elegível.','#F5C400','#101010',2,NULL,0,14,true,40,NOW(),NOW()),
  ('delivery-demo-05','moriah-delivery-demo','Upgrade de bebida','Troque sua bebida por uma opção maior, conforme disponibilidade.','#222222','#FFFFFF',2,NULL,0,14,true,50,NOW(),NOW()),
  ('delivery-demo-06','moriah-delivery-demo','Brinde surpresa','Um mimo surpresa da Moriah no próximo pedido.','#FFF3A6','#101010',1,NULL,0,14,true,60,NOW(),NOW())
) AS seed(
  "id","campaignKey","name","description","color","textColor","weight",
  "quantityTotal","awardedCount","validityDays","active","sortOrder","createdAt","updatedAt"
)
WHERE NOT EXISTS (
  SELECT 1 FROM "RoulettePrize" WHERE "campaignKey"='moriah-delivery-demo'
);

INSERT INTO "RoulettePrize" (
  "id","campaignKey","name","description","color","textColor","weight",
  "quantityTotal","awardedCount","validityDays","active","sortOrder","createdAt","updatedAt"
)
SELECT * FROM (VALUES
  ('main-demo-01','moriah-1','5% OFF','5% de desconto em uma próxima compra elegível.','#FFD400','#101010',3,NULL,0,14,true,10,NOW(),NOW()),
  ('main-demo-02','moriah-1','Refrigerante grátis','Ganhe um refrigerante em uma próxima compra elegível.','#101010','#FFFFFF',3,NULL,0,14,true,20,NOW(),NOW()),
  ('main-demo-03','moriah-1','Sobremesa grátis','Uma sobremesa selecionada pela casa.','#FFFFFF','#101010',2,NULL,0,14,true,30,NOW(),NOW()),
  ('main-demo-04','moriah-1','10% OFF','10% de desconto em uma próxima compra elegível.','#F5C400','#101010',2,NULL,0,14,true,40,NOW(),NOW())
) AS seed(
  "id","campaignKey","name","description","color","textColor","weight",
  "quantityTotal","awardedCount","validityDays","active","sortOrder","createdAt","updatedAt"
)
WHERE NOT EXISTS (
  SELECT 1 FROM "RoulettePrize"
  WHERE "campaignKey" = COALESCE((SELECT "campaignKey" FROM "RouletteSettings" WHERE "id"='main'),'moriah-1')
);

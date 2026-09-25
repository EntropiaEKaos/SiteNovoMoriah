INSERT INTO "NotificationRule"
("id","module","eventKey","label","active","channels","audience","advanceMinutes","templateTitle","templateBody","createdAt","updatedAt")
VALUES
('nr_inv_purchase','INVENTORY','PURCHASE_RECEIVED','Entrada de compra recebida',true,ARRAY['IN_APP']::TEXT[],'INTERNAL',0,'Entrada de insumo recebida','Uma compra de insumo foi recebida e incorporada ao estoque.',CURRENT_TIMESTAMP,CURRENT_TIMESTAMP),
('nr_inv_variance','INVENTORY','COUNT_VARIANCE','Divergência de inventário',true,ARRAY['IN_APP','PUSH']::TEXT[],'INTERNAL',0,'Divergência de inventário','Uma contagem física gerou ajuste de estoque.',CURRENT_TIMESTAMP,CURRENT_TIMESTAMP),
('nr_inv_cmv','INVENTORY','CMV_TARGET_EXCEEDED','CMV acima da meta',true,ARRAY['IN_APP','PUSH']::TEXT[],'INTERNAL',0,'CMV acima da meta','Uma ficha técnica ultrapassou a meta de CMV configurada.',CURRENT_TIMESTAMP,CURRENT_TIMESTAMP)
ON CONFLICT ("module","eventKey") DO NOTHING;

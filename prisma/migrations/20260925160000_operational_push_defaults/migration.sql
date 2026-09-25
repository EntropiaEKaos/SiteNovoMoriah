-- Enable Admin PWA push for the core operational rules without removing existing channels.
UPDATE "NotificationRule"
SET "channels" = array_append("channels",'PUSH'), "updatedAt" = CURRENT_TIMESTAMP
WHERE "module" IN ('RESERVAS','PMS','COZINHA')
  AND "active" = true
  AND NOT ('PUSH' = ANY("channels"));

INSERT INTO "NotificationRule"
("id","module","eventKey","label","active","channels","audience","advanceMinutes","templateTitle","templateBody","createdAt","updatedAt")
VALUES
('nr_channels_sync_error','CANAIS','SYNC_ERROR','Falha de sincronização de canal',true,ARRAY['IN_APP','PUSH']::TEXT[],'INTERNAL',0,'Falha de sincronização de canal','Um canal de reservas apresentou falha e precisa de atenção.',CURRENT_TIMESTAMP,CURRENT_TIMESTAMP),
('nr_inventory_low','INVENTORY','LOW_STOCK','Estoque crítico de insumo',true,ARRAY['IN_APP','PUSH']::TEXT[],'INTERNAL',0,'Estoque crítico','Um insumo atingiu ou ficou abaixo do estoque mínimo.',CURRENT_TIMESTAMP,CURRENT_TIMESTAMP)
ON CONFLICT ("module","eventKey") DO NOTHING;

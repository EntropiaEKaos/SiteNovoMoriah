UPDATE "NotificationRule"
SET "channels" = array_append("channels",'PUSH'), "updatedAt" = CURRENT_TIMESTAMP
WHERE "module"='MENSALISTAS'
  AND "eventKey"='PAYMENT_DUE'
  AND NOT ('PUSH'=ANY("channels"));

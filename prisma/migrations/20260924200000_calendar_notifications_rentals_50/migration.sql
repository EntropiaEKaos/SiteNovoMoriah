-- Calendar Widget + Notification Rules + Rentals 5.0
CREATE TABLE "NotificationRule" (
  "id" TEXT NOT NULL,
  "module" TEXT NOT NULL,
  "eventKey" TEXT NOT NULL,
  "label" TEXT NOT NULL,
  "active" BOOLEAN NOT NULL DEFAULT true,
  "channels" TEXT[] DEFAULT ARRAY['IN_APP']::TEXT[],
  "audience" TEXT NOT NULL DEFAULT 'INTERNAL',
  "advanceMinutes" INTEGER NOT NULL DEFAULT 0,
  "templateTitle" TEXT,
  "templateBody" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "NotificationRule_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "NotificationRule_module_eventKey_key" ON "NotificationRule"("module","eventKey");
CREATE INDEX "NotificationRule_module_active_idx" ON "NotificationRule"("module","active");

CREATE TABLE "CalendarWidgetSettings" (
  "id" TEXT NOT NULL DEFAULT 'main',
  "publicToken" TEXT NOT NULL,
  "active" BOOLEAN NOT NULL DEFAULT true,
  "title" TEXT NOT NULL DEFAULT 'Disponibilidade Moriah',
  "subtitle" TEXT,
  "primaryColor" TEXT NOT NULL DEFAULT '#0b607a',
  "accentColor" TEXT NOT NULL DEFAULT '#ffc845',
  "showPrices" BOOLEAN NOT NULL DEFAULT true,
  "allowBooking" BOOLEAN NOT NULL DEFAULT true,
  "compact" BOOLEAN NOT NULL DEFAULT false,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "CalendarWidgetSettings_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "CalendarWidgetSettings_publicToken_key" ON "CalendarWidgetSettings"("publicToken");

CREATE TABLE "RentalItem" (
  "id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "category" TEXT NOT NULL DEFAULT 'BIKE',
  "description" TEXT,
  "imageUrl" TEXT,
  "active" BOOLEAN NOT NULL DEFAULT true,
  "quantityTotal" INTEGER NOT NULL DEFAULT 1,
  "hourlyPriceCents" INTEGER,
  "dailyPriceCents" INTEGER,
  "depositCents" INTEGER NOT NULL DEFAULT 0,
  "sortOrder" INTEGER NOT NULL DEFAULT 100,
  "notes" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "RentalItem_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "RentalItem_active_sortOrder_idx" ON "RentalItem"("active","sortOrder");
CREATE INDEX "RentalItem_category_active_idx" ON "RentalItem"("category","active");

CREATE TABLE "RentalOrder" (
  "id" TEXT NOT NULL,
  "itemId" TEXT NOT NULL,
  "guestId" TEXT,
  "bookingId" TEXT,
  "renterName" TEXT NOT NULL,
  "phone" TEXT,
  "quantity" INTEGER NOT NULL DEFAULT 1,
  "pricingMode" TEXT NOT NULL DEFAULT 'HOURLY',
  "unitPriceCents" INTEGER NOT NULL,
  "startAt" TIMESTAMP(3) NOT NULL,
  "dueAt" TIMESTAMP(3) NOT NULL,
  "returnedAt" TIMESTAMP(3),
  "status" TEXT NOT NULL DEFAULT 'ACTIVE',
  "totalCents" INTEGER NOT NULL,
  "depositCents" INTEGER NOT NULL DEFAULT 0,
  "paymentStatus" TEXT NOT NULL DEFAULT 'PENDING',
  "notes" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "RentalOrder_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "RentalOrder_itemId_status_startAt_dueAt_idx" ON "RentalOrder"("itemId","status","startAt","dueAt");
CREATE INDEX "RentalOrder_bookingId_status_idx" ON "RentalOrder"("bookingId","status");
CREATE INDEX "RentalOrder_guestId_status_idx" ON "RentalOrder"("guestId","status");
CREATE INDEX "RentalOrder_dueAt_status_idx" ON "RentalOrder"("dueAt","status");

ALTER TABLE "RentalOrder" ADD CONSTRAINT "RentalOrder_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "RentalItem"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "RentalOrder" ADD CONSTRAINT "RentalOrder_guestId_fkey" FOREIGN KEY ("guestId") REFERENCES "Guest"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "RentalOrder" ADD CONSTRAINT "RentalOrder_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "BookingLead"("id") ON DELETE SET NULL ON UPDATE CASCADE;


-- Default notification rules. Admin can customize these after migration.
INSERT INTO "NotificationRule" ("id","module","eventKey","label","active","channels","audience","advanceMinutes","templateTitle","templateBody","createdAt","updatedAt") VALUES
('nr_res_new','RESERVAS','NEW_REQUEST','Nova solicitação de reserva',true,ARRAY['IN_APP']::TEXT[],'INTERNAL',0,'Nova reserva de {{guest}}','{{guest}} solicitou {{accommodation}} para {{checkIn}} → {{checkOut}}.',CURRENT_TIMESTAMP,CURRENT_TIMESTAMP),
('nr_res_conf','RESERVAS','CONFIRMED','Reserva confirmada',true,ARRAY['IN_APP','WHATSAPP']::TEXT[],'GUEST',0,'Reserva confirmada','Olá {{guest}}, sua reserva na Moriah está confirmada para {{checkIn}}.',CURRENT_TIMESTAMP,CURRENT_TIMESTAMP),
('nr_res_cancel','RESERVAS','CANCELLED','Reserva cancelada',true,ARRAY['IN_APP']::TEXT[],'INTERNAL',0,'Reserva cancelada','A reserva de {{guest}} foi cancelada.',CURRENT_TIMESTAMP,CURRENT_TIMESTAMP),
('nr_pms_in','PMS','CHECK_IN','Check-in realizado',true,ARRAY['IN_APP']::TEXT[],'INTERNAL',0,'Check-in concluído','{{guest}} entrou em {{accommodation}}.',CURRENT_TIMESTAMP,CURRENT_TIMESTAMP),
('nr_pms_out','PMS','CHECK_OUT','Check-out realizado',true,ARRAY['IN_APP']::TEXT[],'INTERNAL',0,'Check-out concluído','{{guest}} saiu de {{accommodation}}. Governança pode iniciar o giro.',CURRENT_TIMESTAMP,CURRENT_TIMESTAMP),
('nr_pms_no','PMS','NO_SHOW','No-show',true,ARRAY['IN_APP']::TEXT[],'INTERNAL',0,'No-show registrado','{{guest}} foi marcado como no-show.',CURRENT_TIMESTAMP,CURRENT_TIMESTAMP),
('nr_k_new','COZINHA','NEW_ORDER','Novo pedido da cozinha',true,ARRAY['IN_APP']::TEXT[],'KITCHEN',0,'Novo pedido #{{order}}','{{guest}} • {{location}} • {{total}}',CURRENT_TIMESTAMP,CURRENT_TIMESTAMP),
('nr_k_ready','COZINHA','ORDER_READY','Pedido pronto',true,ARRAY['IN_APP']::TEXT[],'KITCHEN',0,'Pedido pronto #{{order}}','Pedido de {{guest}} está pronto para expedição.',CURRENT_TIMESTAMP,CURRENT_TIMESTAMP),
('nr_house','GOVERNANCA','TASK_CREATED','Nova tarefa de governança',true,ARRAY['IN_APP']::TEXT[],'HOUSEKEEPING',0,'Nova tarefa de governança','{{type}} em {{accommodation}}.',CURRENT_TIMESTAMP,CURRENT_TIMESTAMP),
('nr_rent_start','LOCACOES','RENTAL_STARTED','Locação iniciada',true,ARRAY['IN_APP']::TEXT[],'INTERNAL',0,'Locação iniciada','{{quantity}}× {{item}} para {{guest}} até {{dueAt}}.',CURRENT_TIMESTAMP,CURRENT_TIMESTAMP),
('nr_rent_due','LOCACOES','RENTAL_DUE','Locação próxima do vencimento',true,ARRAY['IN_APP','WHATSAPP']::TEXT[],'GUEST',60,'Locação vence em breve','Sua locação de {{item}} vence às {{dueAt}}.',CURRENT_TIMESTAMP,CURRENT_TIMESTAMP),
('nr_rent_over','LOCACOES','RENTAL_OVERDUE','Locação atrasada',true,ARRAY['IN_APP']::TEXT[],'INTERNAL',0,'Locação atrasada','{{guest}} está com {{item}} em atraso desde {{dueAt}}.',CURRENT_TIMESTAMP,CURRENT_TIMESTAMP),
('nr_rent_ret','LOCACOES','RENTAL_RETURNED','Locação devolvida',true,ARRAY['IN_APP']::TEXT[],'INTERNAL',0,'Locação devolvida','{{guest}} devolveu {{item}}.',CURRENT_TIMESTAMP,CURRENT_TIMESTAMP),
('nr_month','MENSALISTAS','PAYMENT_DUE','Mensalidade próxima do vencimento',true,ARRAY['IN_APP','WHATSAPP']::TEXT[],'GUEST',1440,'Mensalidade Moriah','Olá {{guest}}, seu vencimento é {{dueAt}}.',CURRENT_TIMESTAMP,CURRENT_TIMESTAMP)
ON CONFLICT ("module","eventKey") DO NOTHING;

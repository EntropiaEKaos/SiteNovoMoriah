ALTER TABLE "SiteSettings"
ADD COLUMN "whatsappFloatingEnabled" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN "whatsappFloatingMessage" TEXT NOT NULL DEFAULT 'Olá! Vim pelo site da Moriah e gostaria de atendimento.',
ADD COLUMN "whatsappFloatingLabel" TEXT NOT NULL DEFAULT 'Fale no WhatsApp',
ADD COLUMN "whatsappFloatingPosition" TEXT NOT NULL DEFAULT 'LEFT';

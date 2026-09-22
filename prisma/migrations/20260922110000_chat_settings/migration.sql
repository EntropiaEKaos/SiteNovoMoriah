ALTER TABLE "IntegrationSettings" ADD COLUMN "chatEnabled" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN "chatName" TEXT NOT NULL DEFAULT 'Moriah Assistente',
ADD COLUMN "chatWelcome" TEXT NOT NULL DEFAULT 'Olá! Sou o assistente virtual da Moriah. Como posso ajudar com sua hospedagem?',
ADD COLUMN "chatInstructions" TEXT,
ADD COLUMN "groqModel" TEXT NOT NULL DEFAULT 'llama-3.1-8b-instant',
ADD COLUMN "groqTemperature" DOUBLE PRECISION NOT NULL DEFAULT 0.2;
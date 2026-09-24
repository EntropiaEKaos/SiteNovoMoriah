ALTER TABLE "IntegrationSettings"
  ALTER COLUMN "groqModel" SET DEFAULT 'openai/gpt-oss-20b';

UPDATE "IntegrationSettings"
SET "groqModel" = CASE
  WHEN "groqModel" = 'llama-3.1-8b-instant' THEN 'openai/gpt-oss-20b'
  WHEN "groqModel" = 'llama-3.3-70b-versatile' THEN 'openai/gpt-oss-120b'
  WHEN "groqModel" IN ('groq/compound','groq/compound-mini') THEN 'openai/gpt-oss-20b'
  ELSE "groqModel"
END
WHERE "groqModel" IN (
  'llama-3.1-8b-instant',
  'llama-3.3-70b-versatile',
  'groq/compound',
  'groq/compound-mini'
);

# Deploy e configuração

## Ordem obrigatória
1. Crie/configure PostgreSQL e obtenha DATABASE_URL.
2. Antes do primeiro deploy, determine se o banco está vazio. O projeto possui migrations Prisma e o build Vercel executa `prisma migrate deploy`.
3. Se tabelas deste projeto já foram criadas anteriormente por `prisma db push`, NÃO execute a migration inicial cegamente: faça baseline com Prisma Migrate antes.
4. Configure ADMIN_USER, ADMIN_PASSWORD e SESSION_SECRET forte.
5. Configure AWS/CloudFront conforme AWS-S3-RUNBOOK.md.
6. Configure CRON_SECRET.
7. Configure Firebase somente se notificações/autenticação Firebase forem ativadas.
8. Faça deploy na Vercel e valide /api/health, login do admin, banco, upload S3, reserva e sincronização dos canais.

## Build
`npm run vercel-build` executa generate, migrate deploy e next build. Falha de migration interrompe o deploy.

## Pós-deploy
Nunca considere produção validada apenas porque o CI passou. Teste o ambiente real e os serviços externos.

<!-- redeploy-trigger: 2026-09-25T17:34:00-03:00 -->

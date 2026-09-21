# Pousada Moriah — Site + CMS

Site e CMS da Pousada Moriah em Praia Grande.

## Stack
Next.js 15, React 19, TypeScript, Prisma/PostgreSQL, Vercel, Amazon S3 + CloudFront, Firebase preparado e iCal/ICS para canais.

## Desenvolvimento
```bash
npm install
npm run dev
```

## Documentação operacional
- `docs/DEPLOYMENT.md` — ordem de configuração e deploy
- `docs/DATABASE-MIGRATIONS.md` — migrations e baseline
- `docs/MEDIA-S3.md` e `docs/AWS-S3-RUNBOOK.md` — mídia
- `docs/CHANNELS.md` — Booking/Airbnb/iCal
- `docs/SECURITY.md` — controles e pendências
- `docs/ROADMAP.md` — entregue e próximos passos

## Regra de release
CI verde comprova schema, geração Prisma, TypeScript e build. Produção só é considerada validada depois dos testes no Vercel e serviços externos reais.

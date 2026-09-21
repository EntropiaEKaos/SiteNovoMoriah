# Arquitetura de mídia — Amazon S3

## Objetivo
Arquivos de imagem ficam no S3; PostgreSQL guarda apenas metadados e referências. O navegador faz upload direto ao S3 usando URL pré-assinada emitida pelo backend autenticado.

## Fluxo
1. Admin autenticado seleciona JPEG/PNG/WebP (máx. 10 MB).
2. `POST /api/media/upload` valida sessão, MIME, extensão e tamanho.
3. Backend cria uma key única em `media/YYYY/MM/<uuid>.<ext>`.
4. Backend devolve presigned PUT com validade de 5 minutos.
5. Browser envia bytes diretamente ao S3.
6. CMS registra URL/key/metadados em `Media`.
7. Site público usa `AWS_CLOUDFRONT_URL/<key>` quando CloudFront estiver configurado.

## Variáveis de produção
- `AWS_REGION`
- `AWS_S3_BUCKET`
- `AWS_ACCESS_KEY_ID`
- `AWS_SECRET_ACCESS_KEY`
- `AWS_CLOUDFRONT_URL` (recomendado)

Nunca expor as credenciais AWS em `NEXT_PUBLIC_*` ou no banco.

## Segurança AWS
- S3 Block Public Access ligado.
- IAM dedicado ao site, limitado ao bucket/prefixo necessário.
- CloudFront como camada pública de leitura.
- CORS do bucket limitado ao domínio do Admin/produção e métodos necessários.
- Versioning recomendado.
- Presigned PUT expira em 5 minutos.
- Aplicação limita formatos e tamanho.
- Exclusões S3 devem ocorrer somente por ação Admin autenticada.

## Banco
`Media` mantém compatibilidade com URLs externas existentes e adiciona `storageKey`, `mimeType`, `sizeBytes`, `provider`.

## Deploy
As migrations são aplicadas por `prisma migrate deploy` no `vercel-build`. Credenciais e DATABASE_URL são segredos do ambiente Vercel.

## Próximas etapas
- UI de upload direto e progresso.
- Registrar metadados após PUT bem-sucedido.
- Exclusão coordenada DB + S3.
- Seletor de mídia reutilizável em Hospedagens, Blog, Promoções e futuro Page Builder.
- CloudFront/OAC e política IAM documentadas como infraestrutura.

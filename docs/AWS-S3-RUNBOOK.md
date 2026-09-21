# Operação AWS — mídia da Pousada Moriah

## Arquitetura
O navegador autenticado solicita uma URL de upload de curta duração ao Next.js. O servidor assina um PUT para o S3 sem expor credenciais. O navegador envia o arquivo diretamente ao bucket. Depois, o CMS registra URL, chave, MIME e tamanho no PostgreSQL. Em produção, a leitura pública deve passar pelo CloudFront.

## Bucket
- Ative **Block Public Access** em todas as opções.
- Ative **Versioning**.
- Não configure ACL pública.
- Restrinja CORS ao domínio de produção e aos previews realmente necessários.
- Permita apenas PUT/GET/HEAD necessários; não use origem `*` em produção.

Exemplo de CORS, substituindo o domínio:
```json
[{"AllowedOrigins":["https://SEU-DOMINIO"],"AllowedMethods":["PUT","GET","HEAD"],"AllowedHeaders":["content-type"],"ExposeHeaders":["etag"],"MaxAgeSeconds":300}]
```

## IAM do uploader
Crie um usuário/role exclusivo do aplicativo. Restrinja-o ao prefixo `media/*` do bucket:
```json
{"Version":"2012-10-17","Statement":[{"Effect":"Allow","Action":["s3:PutObject","s3:DeleteObject"],"Resource":"arn:aws:s3:::SEU_BUCKET/media/*"}]}
```
Não conceda `s3:*`.

## CloudFront
Use o bucket privado como origin com **Origin Access Control (OAC)**. A policy do bucket deve permitir leitura somente à distribuição CloudFront configurada. Defina `AWS_CLOUDFRONT_URL` como a URL HTTPS pública da distribuição ou domínio customizado. O aplicativo exige essa variável em produção.

## Vercel
Configure como secrets: `AWS_REGION`, `AWS_S3_BUCKET`, `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY` e `AWS_CLOUDFRONT_URL`. Nunca use prefixo `NEXT_PUBLIC_` nas credenciais.

## Upload
Formatos aceitos: JPEG, PNG e WebP. Limite atual: 10 MB. A URL presigned expira em 5 minutos. O registro no banco só ocorre depois do PUT concluído.

## Exclusão
Para mídia com `storageKey`, o CMS apaga o objeto S3 antes de remover o registro. Mídias externas legadas removem somente o registro local.

## Checklist antes de produção
1. Bucket privado e versionado.
2. IAM mínimo testado.
3. CORS restrito ao domínio.
4. CloudFront + OAC funcionando.
5. Secrets cadastrados na Vercel.
6. Upload, visualização e exclusão testados no ambiente real.
7. Backup e política de lifecycle revisados.

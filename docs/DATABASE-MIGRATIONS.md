# Prisma Migrate

O repositório contém migrations versionadas e o deploy executa `prisma migrate deploy`.

## Banco novo
Use DATABASE_URL do PostgreSQL de produção e permita que o deploy aplique as migrations em ordem.

## Banco já existente
Se o schema foi criado anteriormente por `prisma db push`, a migration inicial pode colidir com tabelas existentes. Antes do deploy, compare o banco com `prisma migrate status` e faça baseline da migration inicial com `prisma migrate resolve --applied 20260921170000_init` somente depois de confirmar que o schema correspondente já existe. Depois aplique as migrations incrementais normalmente.

Faça backup/snapshot antes de qualquer baseline ou migration de produção. Não use `prisma migrate reset` em produção.

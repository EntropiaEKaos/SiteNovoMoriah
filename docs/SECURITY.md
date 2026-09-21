# Segurança operacional

- Admin protegido por sessão assinada, cookie HttpOnly/Secure em produção e middleware.
- SESSION_SECRET, credenciais AWS, DATABASE_URL e CRON_SECRET nunca devem usar NEXT_PUBLIC_.
- S3 deve permanecer privado e ser servido via CloudFront/OAC.
- Upload usa URL presigned curta e valida tipo/tamanho; teste o fluxo real antes de produção.
- Feeds de calendário aceitam somente HTTPS e possuem timeout/tamanho máximo. Para hardening adicional, bloquear resolução DNS para redes privadas antes do fetch.
- Login ainda deve receber rate limiting antes de exposição de alto risco.
- CI valida schema/typecheck/build; não substitui E2E/runtime.

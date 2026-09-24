# Auditoria Total Moriah — 24/09/2026 — Rodada 2

## Escopo
Revisão do estado do `main` após Visual 6.1, Blog Content Studio, branding, PMS/CRM, Moriah Food, Groq, mídia/S3, canais, reservas, colaboradores e pipelines GitHub/Vercel.

## Estado geral
- Código público/admin: estruturalmente saudável.
- CI e Build Diagnostics do `main` anterior ao início desta frente: verdes.
- Nenhum uso de `dangerouslySetInnerHTML` encontrado.
- Upload de mídia exige sessão admin.
- Cron de canais exige `CRON_SECRET`.
- Chat aplica same-origin, limite de payload e rate limit básico.
- Blog usa renderer estruturado em vez de HTML arbitrário.
- Produção continua dependente do deploy Vercel canônico e migrations via `DIRECT_URL`.

## Achados críticos / operacionais

### P1 — Dois projetos Vercel para o mesmo repositório
`moriah` e `site-novo-moriah` continuam disparando deployments para os mesmos commits. Isso duplica consumo de builds e está diretamente relacionado aos bloqueios recorrentes de `build-rate-limit`.

**Ação recomendada:** manter `moriah` como canônico e desabilitar a integração Git/auto-deploy do duplicado depois de confirmar domínio/produção.

### P1 — Credencial de banco previamente exposta durante o setup
Uma credencial apareceu em tela durante a configuração inicial. O valor não é reproduzido neste relatório.

**Ação recomendada:** rotacionar/regenerar a credencial e atualizar `DIRECT_URL` na Vercel canônica antes do próximo ciclo de produção, caso ainda não tenha sido feito.

### P1 — Preview sem migrations automáticas
O Preview pula `prisma migrate deploy` por desenho. Isso evita o P1001 observado no pool, mas significa que recursos com novas tabelas não podem ser considerados runtime-testados até o banco de Preview receber a migration.

**Mitigação atual:** módulos novos degradam com segurança quando a tabela não existe. Nesta rodada, Cargos de Colaborador foi desenhado em tabelas separadas para não adicionar coluna física ao `Guest` e não derrubar consultas legadas.

## Achados técnicos

### P2 — Chat ainda lia SiteSettings completo
O contexto do Groq usava `prisma.siteSettings.findUnique` sem seleção resiliente. Em banco ainda sem branding migrado, isso poderia repetir a quebra de runtime já vista em páginas públicas.

**Correção nesta rodada:** migrado para `loadPublicSiteSettings()`.

### P2 — Metadata global tinha a mesma dependência
O layout global consultava `faviconUrl` junto com campos básicos. Havia fallback por catch, mas ele perdia também nome/slogan quando somente a coluna nova faltava.

**Correção nesta rodada:** metadata agora usa o carregador público resiliente.

### P2 — Cadastro de colaborador era apenas booleano
`Guest.employee` diferenciava colaborador, mas não havia cargo, categoria nem descrição administrável.

**Correção nesta rodada:** `StaffPosition` + `StaffAssignment`, CRUD de cargos, descrição, ordem, ativo/inativo e vínculo pela ficha do colaborador.

### P2 — Site Studio pouco autoexplicativo
Campos de imagem compartilhavam o rótulo genérico "Imagem"; logo, favicon, imagem principal, fundo e OG ficavam visualmente parecidos.

**Correção nesta rodada:** MediaPicker com rótulo específico, recomendação, explicação e miniatura; mapa rápido do Site Studio; thumbnails por seção; atalhos diretos para identidade, galeria, seções e SEO.

### P2 — Instalação CI não é totalmente determinística
O repositório não contém `package-lock.json`; por isso os workflows usam `npm install` em vez de `npm ci`.

**Ação recomendada:** gerar e versionar o lockfile em uma rodada dedicada; depois trocar CI/Feature Certification para `npm ci`.

### P3 — Rate limiting do chat é local ao processo
O rate limit do chat usa `Map` em memória. Em ambiente serverless, múltiplas instâncias não compartilham o contador.

**Ação recomendada:** caso o tráfego cresça, mover rate limit para armazenamento distribuído (KV/Redis/Upstash ou equivalente).

### P3 — Dívida de legibilidade em rotas antigas
Algumas rotas e actions antigas ainda estão compactadas em linhas únicas. Funcionam, mas dificultam revisão e manutenção.

**Ação recomendada:** formatter/lint/prettier em frente separada para evitar diff gigantes junto de mudanças funcionais.

## Itens verificados sem alerta novo
- Mídia S3: upload e finalização protegidos por admin.
- Delivery público de mídia: chave validada.
- Cron: secret obrigatório.
- Groq: chave somente server-side; modelos legados normalizados.
- Conteúdo de Blog: sem HTML arbitrário.
- Admin: ações críticas usam autenticação administrativa.
- Quartos compartilhados: modelo e engine separados do modo privado.
- Mensalistas: vencimento, registro de pagamento, dedupe de notificação e auditoria.
- Presença/turnos: início/fim auditável; logout fecha turno graciosamente.

## Próximos gates antes de produção desta rodada
1. Prisma validate/generate.
2. TypeScript.
3. Next build.
4. Feature Certification.
5. Preview READY quando a cota da Vercel permitir.
6. Migration de `StaffPosition/StaffAssignment` em ambiente autorizado.
7. Smoke: cadastrar cargo → marcar colaborador → escolher cargo → editar descrição → desativar cargo.
8. Smoke Site Studio: logo, favicon, imagem principal, fundo, galeria, OG e preview.
9. Smoke Chat: abrir após branding com e sem schema novo.


## Adendo — persistência de imagens

### P1 — Galeria de quartos descartava mídia interna
A leitura de `galleryImages` aceitava somente URLs `http/https`. O storage atual gera URLs internas `/api/media/file?key=...`, portanto imagens selecionadas podiam ser descartadas silenciosamente ao criar ou editar uma hospedagem.

**Correção:** normalização central de mídia aceita URLs internas `/api/media/...` e `http/https`, com deduplicação e limite de itens.

### P1 — Edição podia remover imagens antigas fora da janela recente
`MediaMultiPicker` recebia apenas as mídias mais recentes. Uma imagem já vinculada, mas fora desse recorte, deixava de ser renderizada e não era reenviada no formulário, podendo desaparecer no save.

**Correção:** imagens vinculadas ausentes da lista recente agora são reinseridas como opções preservadas e podem ser mantidas ou removidas conscientemente. Isso vale para quartos e Site Studio.

### P2 — Identidade visual não participava da proteção de exclusão
A Galeria bloqueava exclusão de imagens usadas em quartos, Blog, Site Studio e Moriah Food, mas não contava referências de logo principal, logo clara, favicon e fundo padrão.

**Correção:** referências de branding agora também impedem exclusão acidental; em schema de Preview ainda pendente, a checagem degrada sem derrubar a Galeria.

### P2 — Normalização inconsistente entre módulos
Blog, Site Studio, quartos, branding e Moriah Food tratavam URLs de mídia de formas diferentes.

**Correção:** novo helper `lib/media-url.ts` centraliza a normalização; quartos, Blog, branding, Site Studio e Moriah Food passam a aceitar o mesmo formato de mídia interna/externa.

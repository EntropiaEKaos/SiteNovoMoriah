# Moriah — Auditoria Final de Produto
Data: 2026-09-24

## Escopo auditado

A auditoria cobre as superfícies públicas, administração, PMS, CRM, reservas, calendário, revenue, Moriah Food, mídia, Site Studio, Groq, notificações, integrações, segurança e build.

## Estado do produto no código

### Site / CMS
- Site Studio 5.0 multipágina.
- Home e páginas adicionais administráveis.
- SEO por página, sitemap dinâmico e robots.
- Navegação pública alimentada pelas páginas publicadas.
- Seções: Hero, Hospedagens, Galeria, Confiança, Estrutura, Blog, CTA, Texto, Moriah Food, Números, FAQ, Depoimentos, Contato e Vídeo.
- Tema, layout, largura, imagem/fundo, cores opcionais, animação, delay, espaçamento, âncora e visibilidade desktop/mobile.
- Duplicação de página e seção.
- 404 e error boundaries públicos/admin.
- Animações respeitam prefers-reduced-motion.

### PMS / CRM
- Check-in financeiro transacional.
- Adicionais de check-in como lançamentos financeiros reais.
- Pagamentos parciais e externos.
- Saldo de hospedagem separado do folio Moriah Food.
- Recibo de check-in e resumo financeiro imprimíveis.
- Hóspedes, acompanhantes, Mensalista e Colaborador.
- Mensalistas/colaboradores podem existir sem reserva.
- Mapa de reservas e bloqueios manuais.

### Moriah Food
- Cardápio Studio completo.
- Categorias, produtos, promoções, fotos, agenda, estoque, insumos, ficha técnica, adicionais e observações por item.
- Checkout revalida preço, disponibilidade, estoque e composição no servidor.
- KDS com SLA, etapas, som opcional e comanda.
- Recibo de cliente separado da comanda.
- Histórico de pedidos e reimpressão.
- Cada pedido cria notificação persistente KITCHEN.
- KDS mostra fila de alertas, atualiza a cada 10s e pode usar Notification API do navegador.

### IA / Groq
- Contexto público em tempo real: hospedagens, promoções, Site Studio, Moriah Food e capacidades operacionais.
- Disponibilidade e tarifa consultadas pelos motores reais.
- Consulta privada de saldo/pedidos somente com restaurantAccessToken válido de uma hospedagem CHECKED_IN.
- Contexto privado enviado ao modelo não inclui nome, telefone, documento ou o token.
- O token deixa de ser válido para a consulta financeira depois do check-out.
- Sem token válido, o assistente orienta o hóspede a usar o link/QR da hospedagem ou falar com a equipe.

### Mídia
- S3 privado servido por rota estável da aplicação.
- Referências antigas reparadas por migration.
- Upload de imagens grandes otimizado.
- Exclusão bloqueada quando a mídia ainda é usada em Site Studio, SEO, hospedagens, Blog, Food, categoria, banner ou fundo de seção.

### Segurança e consistência
- Middleware de sessão/admin corrigido.
- Health endpoint verifica banco.
- Headers básicos de segurança.
- Proteção de origem/rate limit no chat e métricas.
- Gate CI para vulnerabilidade crítica de dependência de produção.
- AWS SDK atualizado para eliminar o advisory crítico encontrado em auditoria.
- Rotas de página e links do Site Studio validados, incluindo bloqueio de protocol-relative URLs.
- Operações financeiras críticas usam transação e lock de banco.

## Bugs encontrados e corrigidos durante as auditorias
- URL direta de S3 privado quebrando imagens.
- Exclusão de mídia ainda publicada.
- Site Builder rejeitando URLs internas de mídia privada.
- Bloqueios manuais ausentes da confirmação final de disponibilidade.
- Receita sumindo do BI após check-in/check-out.
- Pagamento do folio Food reduzindo incorretamente o saldo da hospedagem.
- Chat aparecendo habilitado sem GROQ_API_KEY.
- Telemetria pública do chat sem proteção suficiente.
- Aviso da cozinha dependente apenas do estado visual do KDS.
- Navegação de seção multipágina retornando para a Home.
- Possível hydration mismatch na detecção da Notification API.

## Dependências externas / configuração

### Necessárias para produção
- DATABASE_URL
- SESSION_SECRET
- ADMIN_BOOTSTRAP_TOKEN para bootstrap/recovery quando necessário
- credenciais AWS S3
- GROQ_API_KEY para Moriah Assistente
- CRON_SECRET para sincronizações agendadas
- NEXT_PUBLIC_SITE_URL recomendado para URL canônica/sitemap

### Opcionais
- RESEND_API_KEY + RESEND_FROM_EMAIL: envio automático de e-mail.
- Firebase public config: base web.
- FIREBASE_SERVICE_ACCOUNT_JSON + inscrições de dispositivos: necessário para push remoto real.
  A notificação atual da cozinha funciona de forma persistente no sistema e, quando o KDS está aberto e autorizado, também por som e Notification API do navegador.

## Integrações de canais
- iCal/ICS: operacional.
- Booking.com API oficial: preparada, não implementada.
- Airbnb API oficial: preparada, não implementada.
- Expedia API oficial: preparada, não implementada.
Nenhuma tela deve apresentar essas APIs oficiais como ativas sem credenciais/implementação real.

## Infraestrutura pendente
- O Vercel vem retornando build-rate-limit; uma versão só pode ser considerada em produção após um deployment verde.
- As novas migrations só atingem o banco de produção quando o próximo deployment bem-sucedido executar prisma migrate deploy.

## Hardening posterior não bloqueante
- O repositório ainda não possui package-lock.json. As dependências diretas estão pinadas e o CI possui security gate, mas um lockfile continua recomendado para congelar também a árvore transitiva.
- Push remoto para cozinha pode ser evoluído usando Firebase server-side e service worker/device subscriptions; o fluxo atual não deve ser descrito como push remoto quando o navegador/KDS está fechado.

## Critério de encerramento
Após o próximo deploy Vercel verde:
1. migrations aplicadas;
2. smoke test público;
3. upload e renderização real de mídia;
4. criar/publicar página no Site Studio;
5. reserva -> check-in financeiro -> recibo;
6. pedido Food -> notificação KDS -> preparo -> recibo;
7. consulta Groq de saldo por link autenticado;
8. health endpoint e console sem erro crítico.

Somente após esses testes de runtime o release deve ser chamado de produção certificada.

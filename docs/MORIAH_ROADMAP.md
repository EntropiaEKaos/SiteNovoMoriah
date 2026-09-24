# Moriah — Roadmap de Produto e Operação

Estado-base: `main` certificado após Visual Final 3.2.

## 1. Certificação funcional de produção
- login/logout
- criação e edição de hospedagem
- upload e biblioteca de mídia
- cadastro de hóspede
- reserva pública
- confirmação e alteração de status
- check-in / pagamento / restaurante / check-out
- governança
- mapa de reservas
- bloqueios manuais
- tarifas, promoções e preço dinâmico
- Blog/Journal
- Groq Chat
- testes de runtime e regressão

## 2. Auditoria visual desktop + mobile
- consistência de spacing, tipografia e hierarquia
- formulários longos
- tabelas/cards/listas
- estados vazios
- mensagens de erro/loading
- responsividade completa

## 3. Media Center 2.0
- multi-upload
- otimização e compressão
- preview
- progresso
- edição de ALT
- ordenação
- remoção segura do S3
- seletor reutilizável

## 4. Reservas / PMS 3.0
- ficha completa da reserva
- acompanhantes
- observações
- pagamentos detalhados
- timeline / audit log
- recibo
- despesas e fechamento de conta
- impressão

## 5. Hóspedes / CRM 2.0
- endereço
- nascimento
- nacionalidade
- documento
- preferências
- acompanhantes
- histórico financeiro
- estadias anteriores
- detecção de duplicatas

## 6. Mapa de Reservas 3.0
- criação de reserva no próprio mapa
- mover reserva entre quartos
- alteração de período
- manutenção
- status por cor
- ocupação por dia
- atalhos de check-in/check-out

## 7. Moriah Food 3.0
- KDS cozinha
- Novo → Preparando → Pronto → Entregue
- tempo de preparo
- alertas
- impressão
- estoque / CMV
- lançamento em conta de hospedagem

## 8. Groq / Assistente Moriah 2.0
- testes de contexto real
- disponibilidade e preço reais
- ferramentas específicas
- handoff WhatsApp
- CTA de reserva
- telemetria sem armazenar conteúdo sensível

## 9. Notificações
- confirmação de reserva
- lembrete de check-in
- check-out
- avisos de pedido
- comunicação interna
- e-mail / WhatsApp
- Firebase Push

## 10. Canais profissionais
- manter iCal/ICS operacional
- adapters oficiais Booking.com / Airbnb / Expedia quando houver credenciais e elegibilidade
- saúde, retry e auditoria de sincronização

## 11. Command Center 4.0 / BI
- ocupação
- ADR
- RevPAR
- receita
- ticket médio
- conversão
- origem
- cancelamentos
- no-show
- CMV
- previsões

## 12. Hardening final
- backups
- logs
- rate limits
- auditoria de permissões
- recuperação de acesso
- E2E críticos
- monitoramento
- migrations
- rollback

## 13. Navegação lateral do Admin
- texto e ícones sempre legíveis
- hover como realce, nunca como requisito para leitura
- active state forte
- contraste AA
- mobile / tablet

## 14. Site Premium + Editor Completo no Admin
- Site Builder
- páginas
- seções ordenáveis
- ativar/desativar
- hero
- hospedagens
- galerias
- recursos
- conteúdo editorial
- Moriah Food
- CTA
- textos livres
- imagens e múltiplas imagens
- CTAs primário/secundário
- tema e layout por seção
- SEO por página
- preview
- fallback seguro
- identidade premium e responsiva

## Política de promoção
Cada lote segue:
1. branch isolada;
2. Prisma validate / generate quando aplicável;
3. TypeScript;
4. build;
5. preview `moriah` no Vercel;
6. merge protegido em `main`;
7. verificação do deployment de produção.

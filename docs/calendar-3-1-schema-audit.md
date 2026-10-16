# Calendário 3.1 — auditoria inicial do schema Prisma

Inspeção de `prisma/schema.prisma` na main em 2026-10-15. Nenhuma alteração funcional.

## Estruturas confirmadas
- `Accommodation`: `capacity`, `sharedRoom`, `bedCount`, `active`, `smoobuMapping`.
- `BookingLead`: `accommodationId`, `checkIn`, `checkOut`, `guests`, `status`, `checkedInAt`, `checkedOutAt`, `noShowAt`, `bedNumber`, `bedLevel`.
- `ManualInventoryBlock`: intervalo por acomodação.
- `InventoryHold`: intervalo, unidades e expiração.
- `ChannelBlock`: intervalos externos por integração.
- `SmoobuAccommodationMapping`: vínculo exclusivo de apartamento externo com acomodação.
- `SmoobuReservationInbox`: comentário no próprio schema diz: 'Read-only external reservation inbox. Not part of PMS occupancy calculations.'

## Riscos a resolver antes da implementação
1. Confirmar quais status de BookingLead consomem inventário no motor já existente; não criar lista nova arbitrária.
2. Conferir tratamento de check-in/check-out, reservas sem datas e datas em timezone America/Sao_Paulo.
3. Verificar como unidades são contadas em quartos compartilhados, especialmente bedNumber e reservas de múltiplos hóspedes.
4. Não converter automaticamente entradas da Smoobu em reservas PMS; exigir conciliação explícita, idempotente e auditada.
5. Determinar se ChannelBlock e Smoobu representam a mesma reserva para evitar dupla contagem.
6. Identificar endpoints e controles de autenticação existentes antes de criar um endpoint read-only.

## Plano de execução
Inspecionar serviços de disponibilidade e endpoints atuais, reutilizar regras do motor, criar DTO read-only sem dados pessoais, integrar visualização com estados indeterminados e adicionar testes de regressão. Nunca usar snapshots de tarifas Smoobu como disponibilidade autoritativa.

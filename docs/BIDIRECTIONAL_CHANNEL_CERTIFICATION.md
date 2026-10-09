# Certificação bidirecional — Moriah
## Estado verificado no código (09/10/2026)
- **iCal/ICS**: importação de bloqueios externos e exportação de intervalos confirmados. Não equivale a sincronização transacional bidirecional; atrasos são possíveis.
- **Booking.com / Airbnb / Expedia API**: adapters em `lib/channel-adapters.ts` ainda lançam erro de não configurado. Nenhuma escrita externa pode ser anunciada como operacional.
- **Smoobu**: consulta de acomodações, prévia de reservas e snapshots de tarifas, com revisão manual; não grava reservas no PMS nem atualiza canais.
- **Booking existente**: verificar a conexão SiteMinder antes de ativar outro gerenciador; nunca conectar dois escritores simultâneos para o mesmo inventário.
## Requisitos antes de ativar a escrita
1. Identificar o canal gestor oficial e comprovar autorização para endpoints de leitura e escrita.
2. Confirmar correspondência de cada ID externo com uma acomodação; atenção especial a quartos compartilhados.
3. Validar paginação, janela de alterações, fuso horário, chegadas/saídas e status.
4. Persistir IDs externos e chaves de idempotência, inclusive alterações e cancelamentos.
5. Certificar transações concorrentes, conflitos de inventário, retentativas e reconciliação.
6. Verificar assinatura de webhooks, rejeição de replay e monitoramento de falhas.
7. Testar ambiente sandbox e realizar piloto com uma única acomodação, com reversão.
8. Obter aprovação explícita antes de habilitar qualquer escrita em canal externo.
## Novas funcionalidades propostas
- Painel de saúde por canal: direção de leitura/escrita, última sincronização, atrasos, falhas e capacidade certificada.
- Fila de divergências: reservas sem vínculo, datas inválidas, conflitos, cancelamentos e duplicidades.
- Comparador de disponibilidade por dia entre PMS e gerenciador de canais, inicialmente somente leitura.
- Histórico auditável de alterações com origem, identificador externo e motivo.
- Botão de reprocessamento idempotente e mecanismo de pausa de escrita.
## Critérios de aceite
- Nenhuma escrita externa habilitada por padrão.
- Nenhuma reserva interna criada por leitura diagnóstica.
- Nenhum quarto liberado automaticamente por ausência de evento no feed.
- Testes cobrindo status de capacidade e bloqueio de escrita sem certificação.
- Migrações de produção permanecem sob controle explícito.

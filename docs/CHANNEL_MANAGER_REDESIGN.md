# Moriah PMS — evolução para Channel Manager

## Princípios obrigatórios
- Uma única autoridade de publicação de disponibilidade por acomodação; nunca publicar simultaneamente inventário da mesma unidade por SiteMinder e Smoobu.
- Separar dados operacionais do PMS de reservas importadas dos canais; não confundir bloqueio iCal com reserva confirmada com hóspede.
- Identificador externo composto por provedor + ID externo, com idempotência em webhook e reconciliação.
- Operação inicial de cada API em READ_ONLY, depois shadow reconciliation, depois ativação por acomodação.
- Regras para dormitórios por **camas vendáveis**, não apenas quartos; capacidade e ocupação por data.
- Reserva, alteração e cancelamento exigem transação, trilha de auditoria e prevenção de duplicidade.
- Credenciais apenas no servidor; assinaturas de webhook verificadas; nunca logar segredo ou PII.
- Erro ou indisponibilidade da API não deve resultar em atualização silenciosa de inventário.
- Mudanças no calendário administrativo não devem alterar regras de disponibilidade.

## Entregas por etapas
1. Inventário de contratos e rotas de reserva; testes de regressão de check-in, cancelamento, hold, dormitórios e preços.
2. Persistência de contas de provedores, mapeamentos por unidade/tarifa, cursor de sincronização e fila de eventos com migrations revisadas.
3. Adapter Smoobu: autenticação validada, listagem, reservas e webhooks com deduplicação e reconciliação.
4. Adapter SiteMinder: somente após autorização/documentação contratual da API.
5. Motor de disponibilidade transacional com política explícita de autoridade, reconciliação, métricas e alertas.
6. Calendário: modo foco, visualização por capacidade/camas, edição de reservas e bloqueios com permissões e auditoria.
7. Testes E2E e rollback por acomodação antes de qualquer ativação de escrita.

## Política implementada
`lib/channel-manager-policy.ts` define validações puras de autoridade e identidade. Ainda **não** está ligada às rotas de escrita, e não é sincronização bidirecional. A integração exige migrações e testes antes de habilitar.

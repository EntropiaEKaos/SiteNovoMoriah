# Moriah PMS — Calendário 3.1: contrato de ocupação (proposta)

## Objetivo
Evoluir a grade de tarifas para uma visão operacional de ocupação, sem confundir preço, disponibilidade e reservas confirmadas. Este documento **não implementa** leitura de reservas nem muda a produção.

## Regras obrigatórias
- Dados de ocupação somente de fonte PMS autoritativa validada, incluindo reservas Smoobu efetivamente importadas e vinculadas; não inferir ocupação de preço ou da ausência de dados.
- Intervalos de estadia são [check-in, check-out): checkout libera a noite do próprio dia.
- Reservas canceladas não consomem capacidade; estados pendentes/sem vínculo devem aparecer como indeterminados até definição explícita.
- Capacidade de quarto privativo: unidade; quarto compartilhado: número de camas disponíveis, com consumo por cama/hóspede conforme modelo real.
- Bloqueios manuais e manutenção entram no cálculo de capacidade; se houver conflito, destacar e nunca ocultar.
- Fonte indisponível ou sincronização atrasada: mostrar estado 'não verificado', não 'livre'.
- Toda mutação futura deve revalidar disponibilidade no servidor em transação e ter auditoria e idempotência.

## Contrato visual proposto
- Linha: hospedagem/quarto, com sublinhas por cama quando o modelo autoritativo suportar.
- Coluna: data local America/Sao_Paulo; rolagem horizontal e cabeçalhos fixos.
- Célula: livre, reservado, hospedado, bloqueado, conflito, não verificado; legenda textual e acessibilidade sem depender só de cor.
- Clique: painel lateral com reserva, origem, datas e situação; informações sensíveis somente a perfis autorizados.
- Separar explicitamente modo 'Tarifas' do modo 'Ocupação'.

## Casos mínimos de certificação
1. Check-in e check-out no mesmo dia entre reservas não se sobrepõem por noite.
2. Duas reservas sobrepostas para a mesma unidade geram conflito.
3. Quarto compartilhado com capacidade 3 suporta até 3 camas ocupadas, não 4.
4. Reserva cancelada não ocupa; reserva sem vínculo não é atribuída arbitrariamente.
5. Falha de Smoobu/API não marca nenhuma data como livre.
6. Bloqueio manual concorre com reserva e fica visível.
7. Fuso e virada de mês/ano mantêm datas corretas.
8. Permissões impedem vazamento de dados pessoais.
9. Calendário de tarifas e motor de preços mantêm comportamento atual.
10. CI, Feature Certification e Moriah Certification aprovados no SHA exato antes de merge.

## Próxima implementação
Inspecionar schema Prisma, endpoints PMS, modelos de camas, status de reserva e componentes do calendário; somente então implementar endpoint read-only e UI com testes. Não alterar disponibilidade externa nem publicar automaticamente.

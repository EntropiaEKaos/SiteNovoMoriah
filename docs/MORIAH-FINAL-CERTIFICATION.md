# Moriah — fechamento operacional

Este documento define a ordem de certificação antes de promover um novo HEAD para produção.

## P0 — disponibilidade e hospedagem
- Reserva pública consulta inventário atual.
- Confirmação executa atualização crítica de todos os canais da acomodação.
- Quarto privativo bloqueia qualquer sobreposição.
- Quarto compartilhado respeita capacidade por cama.
- Holds expirados são removidos.
- Bloqueios manuais e blocos externos impedem venda.
- Check-in, adicionais, pagamentos parciais/externos, saldo, recibo e check-out passam no fluxo completo.
- Mensalista e colaborador funcionam sem exigir hospedagem vinculada quando aplicável.

## P0 — canais
- Booking/Airbnb por iCal: importação e exportação validadas.
- Painel exibe última tentativa, último sucesso, próxima sincronização e erro.
- Backoff é preservado em falha.
- Nenhuma disponibilidade é anunciada pelo chat quando a sincronização devida falha.
- Em Vercel Hobby, manter cron diário e depender também do autosync/checagem crítica.
- Em Vercel Pro/Enterprise, reduzir o cron de canais após confirmar o plano.

## P0 — Moriah Food
- Pedido -> KDS -> preparo -> pronto -> entrega/retirada.
- Estoque não baixa duas vezes.
- Conta do quarto não recebe lançamento duplicado.
- Cancelamento/estorno deixa trilha auditável.
- Recibo fecha com o mesmo total persistido.

## P0 — mídia
- Upload JPEG/PNG/WebP.
- Registro só ocorre após HEAD válido no S3.
- URLs públicas estáveis passam pela rota do app.
- Exclusão remove o objeto S3.
- Quartos, galeria, eventos, blog, cardápio, Site Builder e roleta exibem mídia depois de novo deploy.

## P1 — Roleta/Eventos
- Uma participação por telefone e campanha.
- Prêmio respeita estoque/peso/validade.
- Entrega registra usuário/data.
- Evento publicado aparece no site.
- Tema automático da roleta respeita janela do evento.
- Avaliação Google permanece opcional e independente do prêmio.

## P1 — IA
- GROQ_API_KEY existe somente no ambiente.
- Chat nunca confirma reserva.
- Contexto financeiro exige token ativo.
- Disponibilidade atualiza canais devidos antes de ser exibida.
- Falha de sincronização externa resulta em resposta conservadora.

## Gate de promoção
1. Prisma generate.
2. Typecheck.
3. Build.
4. Preview Vercel verde.
5. Smoke de site, admin, reserva, roleta, eventos, mídia, chat e restaurante.
6. Conferir logs sem novos 5xx.
7. Merge usando o HEAD exato aprovado.
8. Certificar novamente o SHA de main; não reutilizar verdes do PR.

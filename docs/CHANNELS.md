# Booking, Airbnb e calendários

Cada integração pertence a uma Accommodation. Feeds iCal/ICS importados geram ChannelBlock somente para aquela unidade. Reservas internas somente bloqueiam inventário quando status=CONFIRMED.

## Importação
Cadastre no CMS o feed HTTPS fornecido pelo canal e associe à hospedagem correta. O endpoint /api/cron/channels sincroniza integrações ativas e exige Authorization Bearer CRON_SECRET. vercel.json agenda execução horária.

## Exportação
Cada integração possui exportToken. O endpoint /api/calendar/{token} publica somente intervalos CONFIRMED da hospedagem, sem nome, telefone ou e-mail do hóspede. Trate o token como segredo compartilhado e regenere-o se vazar.

## Limitações
Esta integração é iCal/ICS, não a API oficial de Booking.com ou Airbnb. A atualização não é instantânea entre plataformas; por isso a validação de disponibilidade é repetida no servidor antes de registrar a solicitação.

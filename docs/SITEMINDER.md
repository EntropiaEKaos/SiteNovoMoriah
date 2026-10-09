# SiteMinder — integração Moriah PMS

## Situação observada (09/10/2026)
Na extranet Booking.com da Moriah Hostel e Pousada (ID 15089254), a conexão ativa é SiteMinder — RDX, ativada em 20/05/2026. O administrador atual não tem acesso à conta SiteMinder.

**Esta etapa adiciona orientação ao painel, não sincronização ativa.** Ainda não existem credenciais, contrato de API ou conexão funcional SiteMinder no Moriah.

## Pré-requisitos
1. Recuperar a conta anterior ou solicitar transferência de titularidade ao suporte SiteMinder.
2. Confirmar produto, plano, disponibilidade da API e autorização de integração PMS; não presumir endpoints.
3. Obter documentação oficial, credenciais e ambiente de homologação.
4. Identificar qual sistema é autoridade de reservas, tarifas e disponibilidade.
5. Mapear quartos privados e camas de dormitório, IDs externos e planos tarifários.

## Requisitos de implementação
- Credenciais somente no servidor, nunca no cliente ou logs.
- Autenticação, renovação e limites de API conforme documentação oficial.
- Reservas importadas com idempotência por ID externo, alterações e cancelamentos.
- Sincronização de inventário e tarifas com direção de autoridade explícita.
- Backoff, retries, conciliação, logs sem PII e alertas.
- Testes de concorrência, timezone, camas compartilhadas e overbooking.
- Feature flag desligada até homologação; rollback sem desconectar a Booking.

## Segurança operacional
Não cadastrar SiteMinder como OTHER_API: esse adapter ainda é placeholder e lança erro. Não alterar a conexão ativa da Booking antes da migração validada. iCal existente permanece separado.

## Critérios para ativação
Acesso e autorização confirmados; API autenticada testada; mapeamento aprovado; importação, alterações, cancelamentos e conflitos certificados; monitoramento e rollback definidos.

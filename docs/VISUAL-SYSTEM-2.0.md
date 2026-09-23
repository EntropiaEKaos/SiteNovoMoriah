# Moriah Visual System 2.0

## Objetivo
Transformar o site público e o painel administrativo em uma experiência premium, responsiva e comercial sem alterar contratos de dados ou remover funcionalidades operacionais.

## Direção visual
A identidade usa preto, branco/off-white e amarelo Moriah como assinatura. O site público segue linguagem editorial de hotelaria contemporânea: fotografia dominante, tipografia de alto contraste, espaços generosos e CTAs claros. O admin segue linguagem de Command Center/SaaS operacional, priorizando densidade de informação, leitura rápida e ações seguras.

## Princípios
- Conteúdo continua vindo do CMS/Prisma; o redesign não transforma conteúdo dinâmico em texto fixo.
- Fluxos críticos de reserva, PMS, restaurante, canais e autenticação mantêm a lógica existente.
- Desktop e mobile são tratados como superfícies de primeira classe.
- Amarelo é usado como assinatura/ação, não como preenchimento indiscriminado.
- Estados vazios, métricas, formulários e feedbacks precisam ser visualmente consistentes.
- Nenhum redesign é considerado certificado apenas por revisão de código: exige build/CI e inspeção real no navegador antes de merge/produção.

## Implementado nesta frente
### Site público
- Home com hierarquia editorial refinada.
- Hero e fotografia com assinatura Moriah.
- Seção de acomodações com composição editorial.
- Galeria cinematográfica e tratamento fotográfico consistente.
- Blocos institucionais, reserva e footer reforçados.
- Responsividade e microinterações.

### Admin
- Shell Command Center com sidebar, perfil, navegação e topbar.
- Dashboard premium com KPIs, módulos, Revenue Command e atendimento.
- Workspace de Reservas com métricas e pipeline visual.
- Design system operacional reutilizável para próximas telas.

## Próximas telas
1. Reserva pública e calendário.
2. PMS / Front Desk e governança.
3. Moriah Food: gestão, KDS e estoque.
4. Hospedagens, tarifas e promoções.
5. Galeria, blog e CMS.
6. Integrações, canais, configurações e Super Admin.
7. Auditoria final de acessibilidade, responsividade e consistência.

## Registro de commits
- `2f1e018b` — shell premium do Command Center.
- `39c1c60a` — redesign do dashboard administrativo.
- `5e423d45` — design system responsivo do admin.
- `fff93e26` — hierarquia editorial da Home.
- `6f597429` — sistema visual público premium.
- `273d134a` — workspace visual de Reservas.
- `85c1a8d9` — estilos reutilizáveis das áreas operacionais.

## Critério de aceite
Antes do merge: Prisma validate/generate, TypeScript, build, workflows do PR e revisão dos diffs. Depois que o deploy Vercel estiver disponível: inspeção visual desktop/mobile, fluxos de reserva/admin e smoke tests de runtime. Produção só será declarada aprovada depois desses gates.

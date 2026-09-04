# Agent instructions — nm-backend-v3

NestJS monorepo (microservicios) para Novedades Maritex. Gateway + servicios: auth, catalog, inventory, pos, finance, hr, ecommerce, mail, report, document.

## Stack

- **Runtime**: Node 20, NestJS 10, Fastify, Prisma, PostgreSQL, Redis/BullMQ
- **Tests**: Jest (`*.spec.ts` en `apps/` y `libs/`)
- **Schema**: `libs/database/prisma/schema.prisma`

## Conventions

- Respeta la estructura por servicio en `apps/<service>/`
- Lógica compartida en `libs/` (`@app/common`, `@app/database`, `@app/contracts`, etc.)
- Migraciones: `npm run db:migrate` (dev) / `db:migrate:prod` (deploy)
- Docker: `docker-compose.full.yml`

## Agent skills (Matt Pocock)

Skills de ingeniería instaladas en `.agents/skills/` (solo desarrollo local; no van a producción).

| Skill | Uso |
|-------|-----|
| `/setup-matt-pocock-skills` | Configuración inicial del repo (ya ejecutado) |
| `/tdd` | Desarrollo test-first (red-green-refactor) |
| `/codebase-design` | Diseño de módulos profundos, SOLID, interfaces |
| `/diagnosing-bugs` | Depurar bugs y regresiones de rendimiento |
| `/domain-modeling` | DDD: CONTEXT.md, ADRs, glosario de dominio |
| `/improve-codebase-architecture` | Auditar y mejorar arquitectura del monorepo |
| `/code-review` | Revisión de cambios vs estándares y spec |
| `/ask-matt` | ¿Qué skill usar? — router de flujos |

Reinstalar skills en otro equipo: `npm run skills:install`

### Issue tracker

Issues en GitHub (`jhon78963/nm-backend-v3`). Ver `docs/agents/issue-tracker.md`.

### Domain docs

Single-context: `CONTEXT.md` + `docs/adr/` en la raíz. Ver `docs/agents/domain.md`.

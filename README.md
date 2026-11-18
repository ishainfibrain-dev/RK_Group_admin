# RK Group Admin

Responsive React and TypeScript administration workspace for the existing RK Group Flutter application. Both clients use the same Supabase Auth identities, canonical `app_*` tables, booking/payment RPCs, Realtime data and Live1/Live2 routing.

## Requirements

- Node.js 20.19+ or Node.js 22.12+
- npm
- An existing RK Group Supabase Auth user whose `app_users` role grants `dashboard.view`

The development machine currently has a pre-release Node 26 build; npm warns that this runtime is outside its supported range. Use Node 20 or 22 for normal development and CI.

## Local setup

```bash
cd admin-panel
cp .env.example .env.local
npm ci
npm run dev
```

Set these browser-safe values in `.env.local`:

```text
VITE_SUPABASE_URL=https://xsvscefhoetjzbzlftmg.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=your_publishable_key
```

Never add a Supabase secret key, service-role key, database password or device key to a `VITE_*` variable. Vite embeds those variables in the public browser bundle.

## Verification

```bash
npm run lint
npm run typecheck
npm test
npm run build
npm audit --audit-level=moderate
```

The production build is written to `admin-panel/dist/`. Configure an SPA fallback to `index.html` when deploying it.

## Supabase backend

Applied migrations:

- `20261117063711_add_react_admin_rbac.sql`
- `20261117070227_harden_react_admin_advisors.sql`

Deployed Edge Function:

- `admin-users` with JWT verification enabled

The function uses Supabase-managed server secrets and accepts browser calls only from `ADMIN_ALLOWED_ORIGINS`. Its safe local default is:

```text
http://localhost:5173,http://127.0.0.1:5173
```

Before production web deployment, set `ADMIN_ALLOWED_ORIGINS` to the exact HTTPS admin-panel origin and add this Supabase Auth redirect URL:

```text
https://YOUR_ADMIN_DOMAIN/recover
```

## Roles

- Builder Admin: every administrative permission
- Project Manager: portfolio, inventory, customer, booking, collection and report operations
- Sales Manager: customer, booking, collection and report operations
- Property Owner: shared administrative visibility; existing owner-scoped Flutter operations remain available
- Read Only: shared visibility only

Authorization is enforced by PostgreSQL RLS, RPC validation and the `admin-users` Edge Function. Hidden React navigation is only a user-experience layer.

## Existing advisories

The admin extension adds RLS to every new exposed table and resolves its own security and performance advisor findings. The project still has pre-existing advisories for thirteen legacy public tables without RLS and disabled leaked-password protection. Those legacy objects are intentionally not used by this admin application and were not changed because enabling RLS without a migration plan could break an unknown legacy consumer.

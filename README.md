# AsExcepted

Next.js app with Supabase auth, achievements, profiles, and friends.

## Local development

1. Create a Supabase project and copy API URL and publishable (or anon) key.
2. Copy `.env.example` to `.env.local` and set `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` (and any other vars your deployment uses).
3. Apply migrations: `pnpm db:push` (or use the Supabase CLI against your project).
4. Run `pnpm dev` and open [http://localhost:3000](http://localhost:3000).

## Scripts

- `pnpm dev` — development server  
- `pnpm build` / `pnpm start` — production build and server  
- `pnpm lint` — ESLint  
- `pnpm db:*` — Supabase CLI helpers in `package.json`

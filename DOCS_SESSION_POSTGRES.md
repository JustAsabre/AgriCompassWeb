**Postgres Sessions & Migration Guide**

- Purpose: show how to run a local Postgres for session storage and how to enable `connect-pg-simple` in this project.

1) Start local Postgres (Docker)

```powershell
# from repo root
docker compose -f docker/postgres-compose.yml up -d
```

2) Set environment variable to enable Postgres-backed sessions

Add to your `.env` (or environment) before starting the server:

```
PG_CONNECTION_STRING=postgres://agricompass:agricompass@127.0.0.1:5432/agricompass
PG_SESSION_TABLE=session
```

3) What the code does

- When `PG_CONNECTION_STRING` is set, `server/session.ts` attempts to initialize `connect-pg-simple` with a `pg` Pool and uses it as the session store.
- If initialization fails for any reason, the server falls back to the in-memory `MemoryStore` transparently and logs the fallback.

4) Optional: create session table manually

`connect-pg-simple` can create the table itself; but if you prefer a manual creation step, run:

```sql
CREATE TABLE IF NOT EXISTS "session" (
    sid varchar NOT NULL COLLATE "default",
    sess json NOT NULL,
    expire timestamp(6) NOT NULL
)
;
CREATE INDEX IF NOT EXISTS "IDX_session_expire" ON "session" (expire);
```

5) Notes & troubleshooting

- On first run the code will print `Session store: using Postgres (connect-pg-simple)` when connected.
- If you get permission errors, confirm the `PG_CONNECTION_STRING` credentials and that the container is listening on `5432`.
- For production, use a managed Postgres or a self-hosted, persistent database. The Docker compose is only for local development.

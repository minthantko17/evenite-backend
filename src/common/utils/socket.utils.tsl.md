# SocketUtils — Test Specification Language (Category-Partition)

Scope: the exports of `common/utils/socket.utils.ts` shared by every gateway:
`extractTokenFromHandshake`, `buildPersonalChannel`, `socketCorsOptions`.
All three are pure apart from `socketCorsOptions.origin`, which reads
`process.env.FRONTEND_URL`; tests save and restore that variable around each
case. Sockets are plain fake objects shaped like `{ handshake: { auth,
headers } }`; no socket.io server is started.

Legend: `[error]` = error case, `[single]` = only needs one representative
test (don't combine with every other category), `[if C]` = choice only
applies / is only meaningful under condition C.

Cases marked "documents current behavior" are not rejected by the code; they
pin down what happens today and are grouped last in each `describe` so they
are easy to remove.

---

## extractTokenFromHandshake(client)

**Categories**
- handshake.auth.token
  - present → returned as is
  - absent / empty string → fall back to the header
  - `handshake.auth` itself undefined → fall back to the header
- handshake.headers.authorization
  - `Bearer <token>` → the token without the prefix
  - present without the `Bearer ` prefix [single] (documents current
    behavior): returned unchanged
  - absent / `headers` undefined
- Combinations
  - auth token and header both present → auth token wins
  - auth token only → auth token
  - header only → token from the header
  - neither → throws UnauthorizedException('No token provided') [error]
  - auth undefined and headers undefined [single] → throws
    UnauthorizedException [error]
  - auth token empty string and header present [single] → header token

---

## buildPersonalChannel(role, profileId)

**Categories**
- role
  - ORGANIZER
  - PARTICIPANT
  - null [error] → `null`
- profileId
  - an id → `user:<ROLE>:<id>`
  - null [error] → `null`
  - empty string [single] (documents current behavior) → `null`
- Combinations: ORGANIZER + id, PARTICIPANT + id, null role, null id, both
  null [single].

---

## socketCorsOptions

**Categories**
- credentials [single]: `true`
- FRONTEND_URL
  - unset → default `http://localhost:5173` is the only allowed origin
  - one origin
  - several comma-separated origins, with spaces around the commas
- request origin
  - undefined (non-browser client, e.g. mobile or server) → allowed
  - an allowed origin → allowed
  - an origin not in the list [error] → not allowed (`callback(null, false)`)
  - the default origin while FRONTEND_URL is set to something else [single]
    → not allowed

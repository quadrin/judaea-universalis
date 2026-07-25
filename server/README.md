# server/ — the cloud shelf

The game is still a static site with no build step. This directory is the one
optional piece that does not ship to the browser: a ~180-line Cloudflare Worker
over a single KV namespace, which gives the game two things it could not have
as pure static files:

- **Short invite codes.** The host parks its WebRTC offer in a room and gets
  back a six-character code (`KFR-2M9`); the guest fetches the offer and posts
  its answer to the same room. No three-kilobyte blob crosses a chat window,
  and there is no reply code to send back.
- **Saves that follow you between devices.** Campaigns are always stored in the
  browser's own database (`js/core/shelf.js`) — that part needs no server at
  all. A cloud adds a second copy, reachable from any device that knows your
  player code.

Everything degrades: with no endpoint configured, saves work exactly as
described above and multiplayer falls back to the old manual invite codes.

## Deploy

```sh
cd server
npx wrangler kv namespace create JU     # prints an id
# paste that id into wrangler.toml
npx wrangler deploy                      # prints https://ju-cloud.<you>.workers.dev
```

## Point the game at it

Either edit `DEFAULT_ENDPOINT` in `js/net/cloud.js`:

```js
export const DEFAULT_ENDPOINT = 'https://ju-cloud.<you>.workers.dev';
```

…or, without touching the code, open the game with the endpoint as a query
parameter:

```
https://quadrin.github.io/judaea-universalis/?cloud=https://ju-cloud.<you>.workers.dev
```

An endpoint that arrives this way is used for the **multiplayer handshake
only** until you accept it in the Saves panel — see the trust note below.
Editing `DEFAULT_ENDPOINT` skips that question entirely, so that is the right
move for your own deploy. `?cloud=` with an empty value clears both. The Saves
panel shows which endpoint is in use and whether it answered.

## Trust

The two things this service stores are not equally sensitive:

- A **room** holds an SDP offer for fifteen minutes. Nothing personal, no key.
- A **save** is your campaign, sent under your player code in a header.

So an endpoint that arrived in a `?cloud=` link is used for rooms only, and the
game asks before it will keep your saves there. This matters: a shared invite
link points at whoever's server minted it, and without the split, following a
friendly-looking link would hand your saves and your player code to a stranger.
An endpoint baked into `DEFAULT_ENDPOINT`, or accepted once, is trusted for
both.

## What it stores

| Key | Value | Lifetime |
| --- | --- | --- |
| `room:<CODE>` | `{offer, answer, at}` — one WebRTC handshake | 15 minutes, then KV expires it |
| `save:<who>:<id>` | one campaign body; its display metadata rides in KV's metadata slot | until deleted; oldest pruned past 24 per player |

`<who>` is `SHA-256(player key)`, truncated to 32 hex characters. **The player
key itself is never written to the shelf** — it arrives in the `X-JU-Key`
header, is hashed, and is thrown away. Possession of the key is the entire
authorization model: no accounts, no email, no passwords, nothing to reset.
Anyone holding a player code can read and write that shelf, so treat it like a
password; anyone holding an invite code can join that one lobby for fifteen
minutes, which is what invite codes are for.

## Routes

```
GET    /health                 -> {ok, service, rooms, maxSaves}

POST   /room          {offer}  -> {code, ttl}
GET    /room/:code             -> {offer, answer|null, at}
POST   /room/:code/answer {answer} -> {ok}

GET    /saves                  -> {saves: [meta…]}        X-JU-Key
GET    /saves/:id              -> {save}                  X-JU-Key
PUT    /saves/:id {meta, save} -> {ok, saves: [meta…]}     X-JU-Key
DELETE /saves/:id              -> {ok, saves: [meta…]}     X-JU-Key
```

CORS is open (`*`) and cookies are never sent — the shelf is a different origin
from the game and has no ambient session to protect.

## Cost

Cloudflare's free tier covers 100k reads and 1k writes a day. A campaign
autosaves once a game year, so a heavy player writes a few dozen times a day;
the lobby writes twice per guest joined. Running out is not a realistic
concern for a game played by people who know each other.

## Anything else that speaks these routes

Nothing in `js/net/cloud.js` is Cloudflare-specific — it is plain `fetch` at
the seven routes above. A Deno Deploy script, a Worker on another account, or
fifty lines of Express behind nginx work just as well; point `?cloud=` at it.

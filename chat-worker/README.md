# Chat assistant (Claude proxy)

The website's chat widget (`chat.js`) answers from the site's own content out of the box.
This Worker upgrades it to AI answers from Claude. It keeps the Anthropic API key secret:
the key is stored as a Worker secret and never appears in the website.

## One-time setup

1. **Anthropic API key** — at console.anthropic.com create an API key. Set a monthly
   spend limit under *Settings → Limits* so a busy (or abused) chat can never cost more
   than you choose.
2. **Cloudflare** (free plan) — at dash.cloudflare.com:
   - note your **Account ID** (Workers & Pages → Overview, right-hand side);
   - create an **API token** with the *Edit Cloudflare Workers* template.
3. **GitHub secrets** — in the repo, *Settings → Secrets and variables → Actions → New
   repository secret*, add `CLOUDFLARE_API_TOKEN`, `CLOUDFLARE_ACCOUNT_ID` and
   `ANTHROPIC_API_KEY`.
4. **Deploy** — *Actions → Deploy chat assistant → Run workflow*. The log prints the
   Worker address, e.g. `https://blooblens-chat.<you>.workers.dev`.
5. **Connect the site** — put that address in `site.js` → `chat.endpoint` and push.

After that, any change in `chat-worker/` redeploys automatically on push.

## Notes

- Model: `claude-opus-5-5` at low effort, answers capped at 4096 tokens. The site
  content is sent with each question and prompt-cached, so follow-up questions are cheap.
- Only pages listed in `ALLOWED_ORIGINS` (`wrangler.toml`) can call it, and each visitor
  is limited to 20 questions per 10 minutes.
- If the Worker is unreachable, the widget quietly falls back to its built-in answers.

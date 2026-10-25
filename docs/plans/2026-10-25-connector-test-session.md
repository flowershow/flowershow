# Connector test session (Rufus, by 10-27)

One sitting, about 60–75 minutes, covers `flowershow-3fr.5`, `flowershow-h4a` and `flowershow-z4f.4`. Mark each step ✅ or ❌, and paste failures (with a screenshot) in the session chat; an agent files the beads and fixes. Afterwards, close `3fr.5`, `h4a`, `z4f.4`, `z4f` and `5fv`; that unblocks `3fr.6`, `k8j.5` and `k8j.6`.

**Have ready:** a claude.ai account (ideally also a Free one for the one-custom-connector limit), ChatGPT with Developer mode, Claude Desktop, a phone, the `fl` CLI (≥ 2.5.0), and a small test folder with one `.md` and one image.

## A. claude.ai web: anonymous connector, following the live docs (h4a), ~15 min

1. Open https://flowershow.app/docs/agents/mcp and follow it exactly as a new user would. Note anything unclear or wrong.
2. In a new chat: "Publish a one-page site about my favourite trees, with an image." The model shows the live URL and the claim link verbatim, and the image renders.
3. In the same chat: "Change the title." The same site is updated, not a new one.
4. Open the claim link **logged out** → sign in → "Add to my account". The site is in the dashboard (z4f.4 check 1).

## B. claude.ai: signed-in connector (OAuth, 3fr.5), ~15 min

5. Add a connector at `https://flowershow.app/api/mcp/account`, sign in with Flowershow, and approve the consent screen. **Screenshot the consent screen** for the changelog.
6. New chat: publish a new site. It appears in your dashboard.
7. Another new chat: "Update <that site>: add an About page." It updates the same site and **the other pages survive** (partial publish, #1508, verified anonymously in prod on 10-26). Then "start the site over with just a home page": the model must first tell you which files would be removed and ask.
8. In chat, claim the anonymous site from A.
9. Dashboard → Connected apps → revoke. The next tool call fails with a sign-in prompt. Reconnect, and it works again.

## C. Claude Desktop and mobile, ~10 min

10. Desktop: repeat step 6.
11. Phone (claude.ai app): repeat step 2, then open the claim link on the phone and claim it.

## D. ChatGPT Developer mode, ~15 min

12. Add the MCP server (`/api/mcp/account`), sign in, consent.
13. Repeat steps 6, 7 and 9.
14. Repeat step 2 using the anonymous endpoint per the docs, if the docs describe a ChatGPT path.

## E. CLI claim checks (z4f.4 checks 4–5), ~5 min

15. `fl --anon <folder>` on a folder whose site you already claimed. It exits 1 with "added to a Flowershow account … fl login" and keeps `.flowershow`.
16. `fl --yes <folder>` while logged in. It updates the claimed site and doesn't create a new one.

## F. Optional, if time: skill in Codex and Cursor (from `61h`)

17. Install the Flowershow skill, ask it to publish the test folder, and confirm `fl` installs and publishes.

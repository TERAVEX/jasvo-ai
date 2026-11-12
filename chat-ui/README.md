# JASVO AI: chat UI

Front-end only chat interface for JASVO AI, an AI product by TERAVEX. No build step and no dependencies: open `index.html` in a browser.

Preview helpers: `index.html?demo=1` loads a sample conversation, and `?theme=dark` or `?theme=light` forces a theme.

## What's in it
- Sidebar with new chat, search, history grouped by day, delete, and a Free plan meter
- Centred hero state on an empty chat, with suggestion chips
- Mode selector (Chat, Tutor, Study, Practice, Exam) with a clear active-mode label
- Streaming replies, markdown and code blocks, copy, regenerate, and a stop button
- Composer with auto-growing input, file chips, Enter to send, Shift+Enter for a new line
- Free-plan rules from the handoff: 10 successful messages per day, reset at midnight EAT, regenerate costs one, stopped or failed replies cost nothing
- Light and dark themes, mobile drawer layout

## What's not in it (on purpose)
No backend, no API keys, no authentication, no memory, no payments. Replies come from a mock in `requestReply()` in `app.js`; that function is the single place to connect the real JASVO AI gateway. Chats and the usage counter are stored in the browser's localStorage only, so the daily limit here is for demonstration and must be enforced on the server.

## Credit
Layout and visual language are adapted from the Akeru Bot web client (MIT License, Copyright (c) 2026 T3 Tools Inc.), https://github.com/opencoredev/akeru-bot. No Akeru source code or branding is included; the MIT notice is retained here out of courtesy.

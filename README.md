# JASVO AI

**Your AI. Your vibe. Your companion.**  
*An AI product by TERAVEX.*

JASVO AI is a Kenyan-origin, globally accessible AI companion being planned and developed by **TERAVEX**. The product vision is to make everyday AI feel natural, useful, culturally aware, and personal—while giving users dedicated tools for learning, creativity, and productivity.

> **Project status:** Planning / early development. This repository is the public home for the JASVO AI project. Features described below are part of the product direction and are not claims that they have already been implemented.

## Vision

JASVO is intended to be more than a conventional chatbot. It aims to help people have everyday conversations, understand new ideas, work through problems, and make progress on personal and learning goals.

The initial market is **Kenya**, with an architecture and experience designed to support international users over time.

## Product principles

- **Natural conversation:** Friendly, intelligent, approachable assistance for everyday life, learning, and work.
- **Language adaptability:** Understand and respond naturally in English, Kiswahili, Sheng, and mixed-language conversations, adapting to each user's style without forcing slang.
- **Personalisation with control:** Useful continuity and memory, with clear user visibility and privacy controls.
- **Learning support:** Guided learning experiences alongside general-purpose chat.
- **Affordable access:** Cost-aware infrastructure and transparent usage limits, with Kenya-first payment considerations.
- **Responsible AI:** Clear disclosure that JASVO is an AI system, careful handling of personal information, and appropriate safeguards.

## Planned capabilities

JASVO is envisioned as one assistant with specialised capabilities—not separate apps or disconnected personalities.

### Everyday AI
- General conversation and question answering
- Writing, brainstorming, and problem-solving
- Coding and technical assistance
- Research and information analysis

### Learning
- **Tutor Mode:** Step-by-step explanations and concept clarification
- **Study Mode:** Notes, summaries, revision materials, and flashcards
- **Practice Mode:** Exercises, guided problem-solving, and feedback
- **Exam Mode:** Mock tests, timed practice, and performance feedback

### Personalisation and library
- Conversation history and retrieval
- User-controlled long-term personalisation
- Learning goals and learning history
- Uploaded learning materials and saved content
- Privacy and memory controls

## Initial product experience

The planned primary areas are:

1. **Chat** — the central conversational experience
2. **Learn** — the four learning modes
3. **Library** — uploaded materials and saved content
4. **History** — previous conversations and search
5. **Profile** — account, personalisation, privacy, usage, and subscription settings

## Planned technology direction

The initial technical direction is subject to validation during architecture and feasibility work.

| Area | Proposed direction |
| --- | --- |
| Frontend | React / Next.js and Tailwind CSS |
| Backend | Node.js application backend and dedicated AI gateway |
| AI inference | Anthropic Claude initially, behind a provider abstraction |
| Authentication and database | Supabase Auth and PostgreSQL |
| Hosting | Affordable managed hosting; Render is an initial candidate |
| Payments | M-Pesa, with server-side payment verification |

The backend is intended to keep provider credentials server-side, isolate each user's data, enforce usage limits, and retrieve only relevant personal context for AI requests.

## Initial access model

The proposed initial plans are:

- **Free:** 10 successful AI messages per user per day, resetting at midnight East Africa Time (UTC+3). Failed AI requests should not consume the allowance. No automatic overage charges.
- **Plus:** A paid productivity upgrade with higher allowances and additional capabilities. Pricing and quotas will be set after cost modelling.

These are proposed product decisions; implementation and final commercial terms remain subject to validation.

## Privacy and security priorities

Privacy is a core product requirement. Planned safeguards include:

- Authenticated user accounts and strict separation of user data
- Row Level Security where Supabase is used
- HTTPS/TLS in transit and encryption at rest
- Server-side handling of API credentials
- User controls to inspect, correct, pause, and delete saved memory
- Conversation and account data deletion workflows
- Data minimisation, controlled memory retrieval, and usage monitoring
- Review against Kenya's Data Protection Act, 2019, and other applicable requirements, including protections relevant to minors

Never commit API keys, access tokens, passwords, private user data, or production secrets to this repository.

## Development approach

JASVO will be built incrementally:

1. Product definition and feasibility
2. Technical architecture and security design
3. User experience and visual identity
4. Core MVP: authentication, general AI chat, and conversation history
5. Personalisation, memory controls, and learning modes
6. Usage accounting, subscriptions, and M-Pesa
7. Security testing and controlled testing in Kenya
8. Public launch and later expansion

The first release should prioritise a reliable core experience rather than attempting every advanced feature at once. Voice conversations, image generation, autonomous agents, and extensive integrations are deferred until the core product is stable.

## Repository scope

This is the public project repository for JASVO AI. It will hold the source code, technical documentation, and development records as the project progresses. Do not assume that a feature is available merely because it appears in this README; consult the code and project documentation for the current implementation status.

## Contributing and project governance

Development decisions, scope, and releases are managed by TERAVEX. Contributions and issues should be relevant, constructive, and respectful. Do not publish security vulnerabilities or personal information in public issues; report sensitive security concerns privately to the project maintainers.

Implementation, infrastructure changes, external purchases, and releases require the appropriate TERAVEX authorisation.

## Brand

**JASVO AI — Your AI. Your vibe. Your companion.**  
An AI product by **TERAVEX**.


## Current web and Android delivery

The web and Android clients share the same `chat-ui/` application. Capacitor packages that frontend for Android; Render serves the same files as a responsive static website.

### Deploy the website on Render

1. Connect `TERAVEX/jasvo-ai` to Render.
2. Create a **Static Site** using the repository's `render.yaml` Blueprint.
3. Render builds the pinned Supabase browser SDK into the static publish directory.
4. Add the Render URL (and any custom domain) to Supabase Auth's allowed redirect URLs.

The Render build does not need an Anthropic key. The Anthropic key remains in Supabase Edge Function secrets; only the public Supabase publishable key is used by the client.

### Email accounts

JASVO supports email/password sign-in, email verification, and password reset through Supabase Auth. Guest sessions can be upgraded by linking an email identity; enable **manual identity linking** in Supabase Auth settings for this flow. The user verifies the email first, then returns to JASVO to set a password.

Configure Supabase Auth's Site URL and Redirect URLs for:
- The deployed Render site and any custom domain.
- The Android Capacitor origin used by the installed app.

Do not place service-role keys or the Anthropic API key in Render static-site environment variables or browser code.

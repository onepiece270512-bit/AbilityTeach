# AbilityTeach

AbilityTeach is an AI-assisted curriculum and learning platform for teachers and students. The current build includes role-based accounts, class enrollment, a VARK preference survey, teacher dashboards, editable lesson and material drafts, assignments, student study tools, quiz attempts, progress views, and a provisioned administrator dashboard.

## Run from GitHub Codespaces

Open the repository on GitHub, choose **Code → Codespaces → Create codespace on main**, and wait for setup to finish. Codespaces starts PostgreSQL, creates the schema and Priya demo data, then launches the app and forwards port 3000 to your browser. GitHub documents this workflow through the repository's `.devcontainer` configuration and forwarded ports.

The preview opens in the VS Code editor when port 3000 is forwarded. If it does not, select the **Ports** panel, then choose **Preview in Editor** for port 3000. If you already had this Codespace open before these settings changed, rebuild the Codespace once so it picks up the preview setting.

## Run locally

Requirements: Node.js 20.9 or newer and PostgreSQL 14 or newer.

1. Copy `.env.example` to `.env.local` and set `DATABASE_URL` to a PostgreSQL database you can use.
2. Run `npm install`.
3. Run `npm run db:push` to create/update the schema.
4. Run `npm run db:seed` to add the fictional Priya demonstration class and accounts.
5. Run `npm run dev` and open `http://localhost:3000`.

The `npm run db:start` helper can start an embedded local PostgreSQL on port 55432 on supported development machines. Some managed environments block the shared memory features PostgreSQL needs; in that case, use a regular local PostgreSQL server and point `DATABASE_URL` to it. Keep a database server running while using the app.

## Demo accounts

The Vercel production build runs `npm run db:setup` before building, creating the database schema and seeding the fictional classroom data. On the sign-in page, click the email field and choose **Teacher demo** or **Student demo · Priya Patel** for one-click access. Classmates are fictional profiles with private, randomly generated credentials, so Priya is the only student demo account that can sign in.

| Role | Email | Password |
| --- | --- | --- |
| Teacher | `teacher@abilityteach.demo` | `LearnTogether2026!` |
| Student | `priya@abilityteach.demo` | `LearnTogether2026!` |
| Administrator | `admin@abilityteach.demo` | `LearnTogether2026!` |

New teacher registrations are held for school approval. Student registration cannot grant teacher permissions. The seeded teacher is approved so the demo can be explored immediately.

## AI and integrations

The student dashboard includes a three-question VARK-inspired quick check-in for live presentations. Its questions are original paraphrases based on common VARK scenarios; it is not the official questionnaire. Preferences are signals to offer choices, not fixed learning types. See [the VARK questionnaire](https://vark-learn.com/the-vark-questionnaire/).\n\nWithout credentials, lesson planning, study materials, quizzes, and tutoring use clearly labelled local demonstration responses. To enable an external AI provider, set `OPENAI_API_KEY`, select `OPENAI_MODEL`, and set `AI_EXTERNAL_PROCESSING_ENABLED=true` only after the school has authorized external processing. Student tutoring also requires the account's guardian-consent flag. The app does not send student names or IDs in AI prompts. Review provider, retention, consent, and school policies before enabling external processing.

Google Classroom is shown as a demo-mode integration until official OAuth credentials and API setup are configured. Nothing is published to Classroom.

## Checks

- `npm run typecheck` — TypeScript check.
- `npm test` — workflow and security helper tests.
- `npm run build` — production build.

The test suite includes unit checks for session-token handling, enrollment scoping, survey validation, material activity, and quiz scoring. The database-dependent end-to-end demo requires a reachable PostgreSQL database.

## Privacy and VARK

VARK results are student-reported preferences for offering choices and varied explanations. They are not fixed learner types and should not be used to limit instruction or infer disability, intelligence, or ability. Student records are restricted by role and class enrollment. This software is not a legal compliance certification; schools should review applicable privacy, consent, retention, and deletion requirements before use with real students.

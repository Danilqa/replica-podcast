# Card kits API

Static JSON for the Replica app, served at `https://replica-podcast.ru/api/cards/`.

- `list.json` — `{ "<lang>": [kit, …] }`. A kit is `{ id, title, description, bgColor, type?, version }`. `id` is the kit folder name and `version` points to the questions file.
- `<id>/v<version>.json` — `{ "<lang>": ["question", …] }`. Every language has the same number of questions, and the question at index `i` means the same thing in every language.
- `<id>/cover.jpg` — the kit cover.

Languages: `en`, `ru`, `uk`, `de`, `es`, `fr`, `it`, `ja`, `ko`, `pl`, `pt-BR`.

Never edit a published `v<N>.json`. To change questions, copy the latest file to `v<N+1>.json`, edit it, then bump `version` for that kit in every language in `list.json`.

- **Add a question:** add it at the same index in every language.
- **Add a language:** add the key to `list.json` and to each kit's new version, then add it to `LANGUAGES` in `validate.mjs`.

Before you push, run `node api/cards/validate.mjs`.

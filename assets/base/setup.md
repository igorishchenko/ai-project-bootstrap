This project was scaffolded by `create-ai-project`. The sections below cover every
technology you selected, in the order you should set them up.

### Before you start

1. Install Node.js 22.22.1 or newer, and the package manager the team uses.
   The tooling in this project sets that floor — an older Node fails during
   install rather than at run time.

2. Initialise the repository **before installing** — the commit hooks are set up
   by a post-install step, and it silently installs nothing when there is no
   `.git` directory yet:

   ```bash
   git init
   ```

3. Copy the environment template and fill it in as you work through the
   sections:

   ```bash
   cp .env.example .env
   ```

4. Install dependencies:

   ```bash
   npm install
   ```

5. Confirm the hooks were wired up. This should print `.husky/_`:

   ```bash
   git config core.hooksPath
   ```

6. Normalise formatting once, so the first real commit is not a wall of
   whitespace changes:

   ```bash
   npm run format
   ```

### How to use this document

Each section below is one technology. Work through them top to bottom — later
sections assume the earlier ones are configured. Every section follows the same
shape: what it does, how to install it, what to configure on each platform, and
what usually goes wrong.

> **Screenshots**
> Dashboard layouts change often, so this guide describes what to click rather
> than showing it. Drop your own screenshots into `docs/images/` and link them
> from the relevant section as you go — the next person will thank you.

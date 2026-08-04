This project was scaffolded by `create-ai-project`. The sections below cover every
technology you selected, in the order you should set them up.

### Before you start

1. Install Node.js 22.22.1 or newer. The tooling in this project sets that
   floor — an older Node fails during install rather than at run time.

2. Run the setup script:

   ```bash
   npm run setup
   ```

   It initialises the repository, creates `.env`, installs dependencies and
   formats. The order matters — the commit hooks are installed by a post-install
   step that silently does nothing when there is no `.git` directory yet — so
   prefer the script over running the steps by hand. It is safe to re-run.

3. Work through the sections below, filling in `.env` as you go.

4. Check what is still outstanding at any point:

   ```bash
   npm run doctor
   ```

   It lists every required value you have not set yet and links each one to the
   section here that explains it. It exits non-zero until everything required is
   configured, so it is also usable in CI.

### How to use this document

Each section below is one technology. Work through them top to bottom — later
sections assume the earlier ones are configured. Every section follows the same
shape: what it does, how to install it, what to configure on each platform, and
what usually goes wrong.

> **Screenshots**
> Dashboard layouts change often, so this guide describes what to click rather
> than showing it. Drop your own screenshots into `docs/images/` and link them
> from the relevant section as you go — the next person will thank you.

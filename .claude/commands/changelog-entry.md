---
description: Add an entry to the Unreleased section of CHANGELOG.md in this repo's voice
argument-hint: "[what changed, or leave empty to read it from the diff]"
---

Add an entry to `## [Unreleased]` in CHANGELOG.md for: $ARGUMENTS

If that is empty, read the change from `git diff main...HEAD` (or the working
tree) and write the entry from what the diff actually does.

## Rules

- Keep a Changelog headings only: `### Added`, `### Changed`, `### Fixed`,
  `### Deprecated`, `### Removed`, `### Security`. Create `## [Unreleased]`
  above the newest released version if it is not there.
- **Lead with the symptom in bold, as the user experienced it** — not the
  file that changed. `**Continue.dev rules shipped a literal
  `{{projectName}}`.**` then the explanation. Someone skimming the release
  notes should recognise their own problem in the first eight words.
- Then say what was actually wrong, in one or two sentences, and what now
  prevents it — usually the test that would have caught it. Naming the test
  is what makes the entry trustworthy rather than reassuring.
- If people already on a released version are left in a bad state, say what
  it looks like and what fixes it (`upgrade` replaces them, re-run `setup`, …).
- No version number, no date, no bump to `package.json` — `/release` moves the
  Unreleased block into a versioned heading and sets the date.
- If the change is a breaking one, say so explicitly in the entry. It decides
  the next version number.

Show the diff you are about to make before writing it.

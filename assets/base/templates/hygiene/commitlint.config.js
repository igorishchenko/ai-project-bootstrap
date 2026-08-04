/**
 * Conventional Commits, so the version bump and changelog can be derived
 * rather than argued about. See docs/release.md.
 *
 *   feat(payments): add restore purchases
 *   fix(auth): refresh an expired session before retrying
 */
export default {
  extends: ['@commitlint/config-conventional'],
};

// Scaffolded by `ai-project-bootstrap implement authentication` (Auth0).
// See implementation/authentication/plan.md, steps 1 and 3.
//
// Deliberately minimal: the Auth0 Next.js SDK's integration shape (middleware
// vs. route handlers) has changed across major versions, so this doesn't
// assume one. Confirm the installed version's actual API — see plan.md,
// step 1 — before filling this in for real.

export function SignInScreen(): React.JSX.Element {
  return (
    <div>
      {/*
        TODO (plan.md, step 1-3): for a server-rendered app this is typically
        a link to the SDK's login route (e.g. `/auth/login`) rather than a
        form — Auth0 hosts the actual login page. Check the current SDK docs
        for the exact route/handler your installed version expects, and
        request the audience (plan.md, step 2) so the token your API receives
        is verifiable.
      */}
      <p>Sign in with Auth0 — not implemented yet.</p>
    </div>
  );
}

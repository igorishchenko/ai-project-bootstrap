// Scaffolded by `ai-project-bootstrap implement authentication` (Clerk).
// See implementation/authentication/plan.md, step 4.
//
// Attaches the current Clerk session token as a bearer token. Your backend
// (plan.md, step 5) is what actually verifies it — this hook only sends it.

import { useCallback } from 'react';
{{#if has.react-native}}import { useAuth } from '@clerk/clerk-expo';
{{/if}}{{#unless has.react-native}}{{#if has.nextjs}}import { useAuth } from '@clerk/nextjs';
{{/if}}{{#unless has.nextjs}}import { useAuth } from '@clerk/clerk-react';
{{/unless}}{{/unless}}
export function useAuthedFetch(): (input: RequestInfo, init?: RequestInit) => Promise<Response> {
  const { getToken } = useAuth();

  return useCallback(
    async (input: RequestInfo, init: RequestInit = {}) => {
      const token = await getToken();
      return fetch(input, {
        ...init,
        headers: { ...init.headers, Authorization: `Bearer ${token}` },
      });
    },
    [getToken],
  );
}

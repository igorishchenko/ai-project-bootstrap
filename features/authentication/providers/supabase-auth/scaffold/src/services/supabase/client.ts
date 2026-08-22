// Scaffolded by `ai-project-bootstrap implement authentication` (Supabase Auth).
// See implementation/authentication/plan.md, step 2.
//
// One client for the whole app — see the Supabase section of docs/setup.md
// ("The client") for why nothing else should import `@supabase/supabase-js`
// directly.
{{#if has.react-native}}//
// The two options below are what make a session survive a cold start: without
// a storage adapter the SDK keeps the session in memory only, and every
// relaunch signs the user out.
import 'react-native-url-polyfill/auto';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';

export const supabase = createClient(
  process.env.{{envPrefix}}SUPABASE_URL!,
  process.env.{{envPrefix}}SUPABASE_ANON_KEY!,
  {
    auth: {
      storage: AsyncStorage,
      autoRefreshToken: true,
      persistSession: true,
      // No URL to inspect outside a browser.
      detectSessionInUrl: false,
    },
  },
);
{{/if}}{{#unless has.react-native}}//
// This is the *browser* client, and it is the only one safe to import from a
// component. Anything rendering on the server needs a per-request client built
// from that request's cookies, or one visitor's session leaks into another's
// render — see the Supabase Auth section of docs/setup.md for that split.
import { createClient } from '@supabase/supabase-js';

export const supabase = createClient(
  process.env.{{envPrefix}}SUPABASE_URL!,
  process.env.{{envPrefix}}SUPABASE_ANON_KEY!,
);
{{/unless}}

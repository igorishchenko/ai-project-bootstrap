// Scaffolded by `ai-project-bootstrap --archetype habit-tracker`.
// One client for the whole app — see technologies/supabase's own setup.md
// ("The client") for why nothing else should import `@supabase/supabase-js`
// directly.
import 'react-native-url-polyfill/auto';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';

export const supabase = createClient(
  process.env.EXPO_PUBLIC_SUPABASE_URL!,
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!,
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

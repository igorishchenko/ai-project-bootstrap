import type { ReactNode } from "react";
import { SessionProvider } from "@/lib/useSession";

/**
 * One `GET /v1/me` for the whole dashboard, rather than one per screen.
 * Client-side by necessity: the session cookie belongs to the API's origin,
 * so the Next server cannot read it.
 */
export default function DashboardLayout({ children }: { children: ReactNode }) {
  return <SessionProvider>{children}</SessionProvider>;
}

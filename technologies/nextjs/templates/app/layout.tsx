import type { Metadata } from 'next';
import type { ReactNode } from 'react';
{{#if has.dark-theme}}
import { ThemeProvider } from '@/theme/ThemeProvider';
{{/if}}
export const metadata: Metadata = {
  title: '{{projectName}}',
  description: '{{projectName}}',
};

export default function RootLayout({ children }: { children: ReactNode }): React.JSX.Element {
  return (
    <html lang="en">
{{#if has.dark-theme}}      <body>
        <ThemeProvider>{children}</ThemeProvider>
      </body>
{{/if}}{{#unless has.dark-theme}}      <body>{children}</body>
{{/unless}}    </html>
  );
}

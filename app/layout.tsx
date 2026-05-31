import { Analytics } from '@vercel/analytics/next';

export const metadata = {
  title: 'Easy Asphalt',
  description: 'Easy Asphalt',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        {children}
        <Analytics />
      </body>
    </html>
  );
}

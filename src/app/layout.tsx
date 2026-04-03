import './globals.css';

export const metadata = {
  title: 'CF Filter - Codeforces Problem Filter',
  description: 'Filter and explore Codeforces problems with advanced filtering options',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}

import './globals.css';
import { Inter } from 'next/font/google';
import { AuthProvider } from '@/context/AuthContext';
import Navigation from '@/components/Navigation';
import ClientDebugger from '@/components/ClientDebugger';

const inter = Inter({ subsets: ['latin'] });

export const metadata = {
  title: 'WrappedUp',
  description: 'Your personal reading tracker',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <AuthProvider>
          <ClientDebugger />
          <Navigation />
          {children}
        </AuthProvider>
      </body>
    </html>
  );
}

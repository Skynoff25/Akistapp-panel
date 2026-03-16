import type { Metadata } from 'next';
import './globals.css';
import { AuthProvider } from '@/context/auth-context';
import { Toaster } from "@/components/ui/toaster"
import { PWACleaner } from '@/components/pwa-cleaner';

export const metadata: Metadata = {
  title: 'Panel de Administración de Akistapp',
  description: 'Panel de administración para Akistapp',
  icons: {
    icon: '/akistapp_logo.png',
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              try {
                if ('serviceWorker' in navigator) {
                  navigator.serviceWorker.getRegistrations().then(function(regs) {
                    for(var i = 0; i < regs.length; i++) { regs[i].unregister(); }
                  });
                }
                if ('caches' in window) {
                  caches.keys().then(function(names) {
                    for (var i = 0; i < names.length; i++) { caches.delete(names[i]); }
                  });
                }
              } catch (e) {}
            `,
          }}
        />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet" />
      </head>
      <body className="font-body antialiased">
        <PWACleaner />
        <AuthProvider>
          {children}
        </AuthProvider>
        <Toaster />
      </body>
    </html>
  );
}

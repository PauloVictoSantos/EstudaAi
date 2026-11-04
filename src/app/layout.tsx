import type { Metadata, Viewport } from 'next';
import { Inter, Space_Grotesk } from 'next/font/google';
import { Providers } from '@/components/Providers';
import './globals.css';

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' });
const grotesk = Space_Grotesk({ subsets: ['latin'], variable: '--font-grotesk', weight: ['500', '700'] });

export const metadata: Metadata = { title: 'EstudaAI', description: 'Estude no seu ritmo com questões reais das provas.', manifest: '/manifest.json' };
export const viewport: Viewport = { themeColor: '#ec3013', width: 'device-width', initialScale: 1 };

// Aplica o tema salvo antes da pintura para não piscar.
const themeScript = `try{document.documentElement.dataset.theme=localStorage.getItem('estudaai.theme')||(matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light')}catch(e){}`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR" className={`${inter.variable} ${grotesk.variable}`} suppressHydrationWarning>
      <head><script dangerouslySetInnerHTML={{ __html: themeScript }} /></head>
      <body>
        <Providers>
          <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>{children}</div>
        </Providers>
      </body>
    </html>
  );
}

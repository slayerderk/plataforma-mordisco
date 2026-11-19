import type { Metadata } from 'next';
import './globals.css';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';

export const metadata: Metadata = {
  title: 'Mordisco | Directorio de Servicios & Talento en Perú',
  description: 'Encuentra y publica anuncios de servicios profesionales y talento independiente en todo el Perú. Modalidad presencial por distritos y virtual.',
  keywords: ['clasificados peru', 'servicios lima', 'directorio peru', 'anuncios yape', 'servicios virtuales'],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es" className="dark">
      <body className="bg-dark-950 text-slate-100 antialiased selection:bg-brand-600 selection:text-white">
        <Navbar />
        <main className="min-h-screen">{children}</main>
        <Footer />
      </body>
    </html>
  );
}

import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  metadataBase: new URL('https://ghostbet-football.mr-kalemba01.chatgpt.site'),
  title: 'GHOSTBET — Football Intelligence',
  description:
    'Calendriers et résultats OpenFootball des cinq grands championnats européens. Comparaisons descriptives, sans conseil de pari.',
  icons: { icon: '/favicon.svg' },
  openGraph: {
    images: [
      {
        url: '/og.png',
        width: 1732,
        height: 908,
        alt: 'GHOSTBET — Observer. Comprendre. Suivre.',
      },
    ],
    title: 'GHOSTBET — Football Intelligence',
    description:
      'Observer. Comprendre. Suivre. Calendriers, résultats et statistiques issus des données publiques OpenFootball.',
    locale: 'fr_FR',
    type: 'website',
  },
  twitter: {
    images: ['/og.png'],
    card: 'summary_large_image',
    title: 'GHOSTBET — Football Intelligence',
    description:
      'Observer. Comprendre. Suivre. Calendriers, résultats et statistiques issus des données publiques OpenFootball.',
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fr">
      <body>{children}</body>
    </html>
  );
}

import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'About MonoLog — Your Daily Photo Journal',
  description: 'Capture meaningful moments each day in a private journal. Build a lasting, ad-free visual archive. Learn about MonoLog\'s philosophy, features, and how we help you create intentional daily reflections.',
  openGraph: {
    title: 'About MonoLog',
    description: 'A mindful daily photo journal for intentional reflection and personal archiving',
    type: 'website',
  },
};

export default function AboutLayout({ children }: { children: React.ReactNode }) {
  // Local wrapper so we can target the About subtree from CSS without
  // relying on global body/html classes. This keeps the override scoped
  // to just the About page.
  return <div className="about-wrapper">{children}</div>;
}

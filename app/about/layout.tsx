export default function AboutLayout({ children }: { children: React.ReactNode }) {
  // Local wrapper so we can target the About subtree from CSS without
  // relying on global body/html classes. This keeps the override scoped
  // to just the About page.
  return <div className="about-wrapper">{children}</div>;
}

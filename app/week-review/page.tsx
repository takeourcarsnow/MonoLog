import { redirect } from 'next/navigation';

export default function WeekReviewPage({ searchParams }: { searchParams?: Record<string, string | string[] | undefined> }) {
  // In Next.js pages, searchParams are passed as props, not a NextRequest.
  const typeParam = searchParams?.type;
  const type = Array.isArray(typeParam) ? typeParam[0] : typeParam;

  if (type === 'month') {
    redirect('/review?type=month');
  }

  redirect('/review');
}
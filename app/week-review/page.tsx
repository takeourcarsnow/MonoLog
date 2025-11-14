import { redirect } from 'next/navigation';
import { NextRequest } from 'next/server';

export default function WeekReviewPage(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const type = searchParams.get('type');

  if (type === 'month') {
    redirect('/review?type=month');
  } else {
    redirect('/review');
  }
}
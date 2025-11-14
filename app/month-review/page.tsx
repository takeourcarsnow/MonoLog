import { redirect } from 'next/navigation';

export default function MonthReviewPage() {
  redirect('/review?type=month');
}
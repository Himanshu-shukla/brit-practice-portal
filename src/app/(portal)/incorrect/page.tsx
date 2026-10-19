import { redirect } from 'next/navigation';

export default function IncorrectPage() {
  redirect('/dashboard#revision');
}

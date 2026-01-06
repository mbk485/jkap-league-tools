import { redirect } from 'next/navigation';

/**
 * Ballyard route - redirects to the Owner Dashboard
 * This maintains backwards compatibility with any existing links
 */
export default function BallyardRedirect() {
  redirect('/dashboard');
}


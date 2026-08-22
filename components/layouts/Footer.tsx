'use client';

import Link from 'next/link';

export default function Footer() {
  return (
    <footer className="bg-gray-900 text-gray-400 py-4 mt-8">
      <div className="container mx-auto text-center">
        <p className="text-sm mb-2">© {new Date().getFullYear()} GenzyStudio</p>
        <Link href="/privacy" className="text-sm underline hover:text-gray-200">
          Privacy Policy
        </Link>
      </div>
    </footer>
  );
}

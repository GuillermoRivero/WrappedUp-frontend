'use client';

import { useAuth } from '@/context/AuthContext';
import Link from 'next/link';

export default function Home() {
  const { user } = useAuth();

  return (
    <div className="min-h-[calc(100vh-4rem)] flex flex-col items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      {user ? (
        <div className="text-center space-y-6">
          <h1 className="text-4xl font-bold text-[#365f60]">
            Welcome back, {user.username}!
          </h1>
          <p className="text-lg text-[#8aa4a9] max-w-2xl">
            Track your reading journey and discover your next favorite book.
          </p>
          <div className="flex flex-wrap gap-4 justify-center mt-8">
            <Link href="/reviews" className="btn-primary">
              Track Reviews
            </Link>
          </div>
        </div>
      ) : (
        <div className="text-center space-y-6">
          <h1 className="text-4xl font-bold text-[#365f60]">
            Welcome to WrappedUp
          </h1>
          <p className="text-lg text-[#8aa4a9] max-w-2xl">
            Your personal reading tracker. Keep track of what you read and love.
          </p>
          <div className="flex flex-wrap gap-4 justify-center mt-8">
            <Link href="/register" className="btn-primary">
              Get Started
            </Link>
            <Link href="/login" className="btn-secondary">
              Sign In
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}

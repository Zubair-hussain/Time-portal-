'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import SignInForm from '@/components/SignInForm';
import RetroComputer from '@/components/RetroComputer';
import LoginBackdrop from '@/components/LoginBackdrop';

export default function HomePage() {
  const { user, loading, error, signIn } = useAuth();
  const router = useRouter();
  const [authing, setAuthing] = useState(false);

  useEffect(() => {
    if (!loading && user) router.replace('/dashboard/');
  }, [user, loading, router]);

  // Wrap sign-in so the CRT plays its loading bar while auth is in flight.
  const handleSignIn = async (email: string, password: string) => {
    setAuthing(true);
    try {
      await signIn(email, password);
      // On success the effect above redirects; keep the bar running until then.
    } catch (e) {
      setAuthing(false);
      throw e;
    }
  };

  return (
    <main className="login-shell">
      <LoginBackdrop />
      <div className="login-media">
        <RetroComputer loading={authing} size={300} />
      </div>

      <div style={{ width: '100%', maxWidth: 560, display: 'flex', justifyContent: 'center' }}>
        <SignInForm onSubmit={handleSignIn} error={error} />
      </div>
    </main>
  );
}

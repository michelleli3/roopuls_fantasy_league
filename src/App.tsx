import { useEffect, useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import type { Session } from '@supabase/supabase-js';
import { supabase } from './lib/supabase';
import { usePlayerByUserId } from './hooks/usePlayers';
import LoginPage from './views/AdminView/LoginPage';
import AdminView from './views/AdminView';
import PlayerView from './views/PlayerView';
import PicksView from './views/PicksView';

function AdminRoute({ session }: { session: Session | null }) {
  const { data: linkedPlayer, isLoading } = usePlayerByUserId(session?.user.id ?? null);
  if (!session) return <LoginPage />;
  if (isLoading) return null;
  // Player accounts are not admins — send them to their picks page
  if (linkedPlayer) return <Navigate to="/picks" replace />;
  return <AdminView />;
}

export default function App() {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  if (loading) return null;

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<PlayerView />} />
        <Route path="/picks" element={<PicksView />} />
        <Route path="/admin" element={<AdminRoute session={session} />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

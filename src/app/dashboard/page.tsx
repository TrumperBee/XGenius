'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, Badge, Button, GuardianBadge } from '@/components/ui';
import { supabase, getCurrentUser, signInWithGoogle, signOut, getFavorites, addFavorite, removeFavorite } from '@/lib/auth';
import { User, Heart, Bookmark, Bell, LogOut, Loader2, Plus, X } from 'lucide-react';
import { mockTeams } from '@/data/mockData';

export default function DashboardPage() {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [favorites, setFavorites] = useState<any[]>([]);
  const [showAddTeam, setShowAddTeam] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    checkUser();
  }, []);

  async function checkUser() {
    const currentUser = await getCurrentUser();
    setUser(currentUser);
    if (currentUser) {
      const favs = await getFavorites(currentUser.id);
      setFavorites(favs);
    }
    setLoading(false);
  }

  async function handleSignIn() {
    const { data, error } = await signInWithGoogle();
    if (error) {
      alert('Sign in failed. Please try again.');
    }
  }

  async function handleSignOut() {
    await signOut();
    setUser(null);
    setFavorites([]);
  }

  async function handleAddFavorite(teamId: number) {
    if (!user) return;
    setSaving(true);
    const team = mockTeams.find(t => t.id === teamId);
    if (team) {
      await addFavorite(user.id, team.id, team.name, team.short_name);
      const favs = await getFavorites(user.id);
      setFavorites(favs);
    }
    setSaving(false);
    setShowAddTeam(false);
  }

  async function handleRemoveFavorite(teamId: number) {
    if (!user) return;
    await removeFavorite(user.id, teamId);
    setFavorites(favorites.filter(f => f.team_id !== teamId));
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-[var(--accent-blue)]" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold mb-1">Dashboard</h1>
        <p className="text-sm text-[var(--text-muted)]">Your predictions and preferences</p>
      </div>

      {!user ? (
        /* Not signed in */
        <Card className="border-blue-500/30 bg-blue-500/5">
          <CardContent className="py-8 text-center">
            <User className="w-12 h-12 mx-auto text-blue-400 mb-4" />
            <h2 className="text-xl font-bold mb-2">Sign in to XGenius</h2>
            <p className="text-[var(--text-muted)] mb-6">
              Save favorite teams, track your predictions, and get alerts
            </p>
            <Button onClick={handleSignIn} className="px-8">
              Sign in with Google
            </Button>
          </CardContent>
        </Card>
      ) : (
        <>
          /* User header */
          <Card>
            <CardContent className="flex items-center justify-between py-4">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-full bg-blue-500/20 flex items-center justify-center">
                  <User className="w-6 h-6 text-blue-400" />
                </div>
                <div>
                  <p className="font-medium">{user.full_name || user.email}</p>
                  <p className="text-xs text-[var(--text-muted)]">{user.email}</p>
                </div>
              </div>
              <Button variant="secondary" onClick={handleSignOut}>
                <LogOut className="w-4 h-4 mr-2" />
                Sign Out
              </Button>
            </CardContent>
          </Card>

          /* Favorite Teams */
          <Card>
            <CardContent className="py-4">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <Heart className="w-5 h-5 text-red-400" />
                  <h3 className="font-medium">Favorite Teams</h3>
                </div>
                <Button variant="ghost" size="sm" onClick={() => setShowAddTeam(!showAddTeam)}>
                  <Plus className="w-4 h-4 mr-1" />
                  Add Team
                </Button>
              </div>

              {showAddTeam && (
                <div className="mb-4 p-3 bg-[var(--bg-tertiary)] rounded-lg">
                  <p className="text-xs text-[var(--text-muted)] mb-2">Select a team to add:</p>
                  <div className="flex flex-wrap gap-2">
                    {mockTeams.filter(t => !favorites.find(f => f.team_id === t.id)).map(team => (
                      <button
                        key={team.id}
                        onClick={() => handleAddFavorite(team.id)}
                        disabled={saving}
                        className="px-3 py-1.5 text-sm bg-[var(--bg-card)] hover:bg-blue-500/20 rounded-lg transition-colors"
                      >
                        {team.short_name}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {favorites.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {favorites.map(fav => (
                    <div key={fav.id} className="flex items-center gap-2 px-3 py-2 bg-[var(--bg-tertiary)] rounded-lg">
                      <span className="font-medium">{fav.team_short_name}</span>
                      <button onClick={() => handleRemoveFavorite(fav.team_id)} className="text-[var(--text-muted)] hover:text-red-400">
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-[var(--text-muted)]">No favorite teams yet. Add some to see their matches first.</p>
              )}
            </CardContent>
          </Card>

          /* Stats */
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <Card>
              <CardContent className="text-center py-4">
                <p className="text-2xl font-bold">{favorites.length}</p>
                <p className="text-xs text-[var(--text-muted)]">Favorites</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="text-center py-4">
                <p className="text-2xl font-bold">0</p>
                <p className="text-xs text-[var(--text-muted)]">Saved Predictions</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="text-center py-4">
                <p className="text-2xl font-bold">--</p>
                <p className="text-xs text-[var(--text-muted)]">Your Accuracy</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="text-center py-4">
                <p className="text-2xl font-bold">0</p>
                <p className="text-xs text-[var(--text-muted)]">Active Alerts</p>
              </CardContent>
            </Card>
          </div>

          /* Guardian status */
          <GuardianBadge quality="high" lastVerified={new Date().toISOString()} />
        </>
      )}
    </div>
  );
}

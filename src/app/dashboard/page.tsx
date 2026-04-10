'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, Badge, Button, GuardianBadge } from '@/components/ui';
import { useAuth } from '@/lib/AuthContext';
import { getFavorites, addFavorite, removeFavorite, getSavedPredictions } from '@/lib/auth';
import { User, Heart, Bookmark, Bell, Loader2, Plus, X, Target, TrendingUp, Trophy, Calendar } from 'lucide-react';
import Link from 'next/link';
import { mockTeams } from '@/data/mockData';

export default function DashboardPage() {
  const { user, loading: authLoading, openAuthModal } = useAuth();
  const [favorites, setFavorites] = useState<any[]>([]);
  const [savedPredictions, setSavedPredictions] = useState<any[]>([]);
  const [showAddTeam, setShowAddTeam] = useState(false);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    if (user) {
      loadData();
    } else {
      setLoading(false);
    }
  }, [user]);

  async function loadData() {
    setLoading(true);
    try {
      const favs = await getFavorites(user!.id);
      setFavorites(favs);
      
      const preds = await getSavedPredictions(user!.id);
      setSavedPredictions(preds || []);
    } catch (e) {
      console.error('Failed to load data:', e);
    }
    setLoading(false);
  }

  async function handleAddFavorite(teamId: number) {
    if (!user) return;
    setSaving(true);
    const team = mockTeams.find(t => t.id === teamId);
    if (team) {
      await addFavorite(user.id, team.id, team.name, team.short_name, team.logo);
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

  const filteredTeams = mockTeams.filter(t => 
    !favorites.find(f => f.team_id === t.id) &&
    (t.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
     t.short_name.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  if (authLoading || loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-[var(--accent-blue)]" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold mb-1">Dashboard</h1>
          <p className="text-sm text-[var(--text-muted)]">Your predictions and preferences</p>
        </div>
        
        <Card className="border-blue-500/30 bg-blue-500/5">
          <CardContent className="py-12 text-center">
            <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-gradient-to-br from-blue-500/20 to-purple-500/20 flex items-center justify-center">
              <User className="w-10 h-10 text-blue-400" />
            </div>
            <h2 className="text-2xl font-bold mb-3">Sign in to XGenius</h2>
            <p className="text-[var(--text-muted)] mb-8 max-w-md mx-auto">
              Save your predictions, track your favorite teams, and see how accurate your predictions are over time.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Button onClick={() => openAuthModal('signup')} className="px-8 py-3 text-base">
                Get Started Free
              </Button>
              <Button variant="secondary" onClick={() => openAuthModal('signin')} className="px-8 py-3 text-base">
                Sign In
              </Button>
            </div>
          </CardContent>
        </Card>

        <div className="grid md:grid-cols-3 gap-4">
          <Card>
            <CardContent className="py-6 text-center">
              <Heart className="w-8 h-8 mx-auto mb-3 text-red-400" />
              <h3 className="font-bold mb-1">Favorite Teams</h3>
              <p className="text-sm text-[var(--text-muted)]">Track your favorite teams and get alerts</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="py-6 text-center">
              <Target className="w-8 h-8 mx-auto mb-3 text-purple-400" />
              <h3 className="font-bold mb-1">Save Predictions</h3>
              <p className="text-sm text-[var(--text-muted)]">Save your predictions for any match</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="py-6 text-center">
              <TrendingUp className="w-8 h-8 mx-auto mb-3 text-green-400" />
              <h3 className="font-bold mb-1">Track Accuracy</h3>
              <p className="text-sm text-[var(--text-muted)]">See your prediction accuracy over time</p>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold mb-1">Dashboard</h1>
        <p className="text-sm text-[var(--text-muted)]">Welcome back, {user.full_name?.split(' ')[0] || 'there'}!</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border-green-500/20">
          <CardContent className="py-4 text-center">
            <p className="text-3xl font-bold text-green-400">{favorites.length}</p>
            <p className="text-xs text-[var(--text-muted)] mt-1">Favorite Teams</p>
          </CardContent>
        </Card>
        <Card className="border-purple-500/20">
          <CardContent className="py-4 text-center">
            <p className="text-3xl font-bold text-purple-400">{savedPredictions.length}</p>
            <p className="text-xs text-[var(--text-muted)] mt-1">Saved Predictions</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="py-4 text-center">
            <p className="text-3xl font-bold">--</p>
            <p className="text-xs text-[var(--text-muted)] mt-1">Accuracy Rate</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="py-4 text-center">
            <p className="text-3xl font-bold text-yellow-400">0</p>
            <p className="text-xs text-[var(--text-muted)] mt-1">Win Streak</p>
          </CardContent>
        </Card>
      </div>

      {/* Favorite Teams */}
      <Card>
        <CardContent>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-red-500/20 flex items-center justify-center">
                <Heart className="w-5 h-5 text-red-400" />
              </div>
              <div>
                <h3 className="font-bold">Favorite Teams</h3>
                <p className="text-xs text-[var(--text-muted)]">Get notified when these teams play</p>
              </div>
            </div>
            <Button variant="secondary" size="sm" onClick={() => setShowAddTeam(!showAddTeam)}>
              <Plus className="w-4 h-4 mr-1" />
              Add Team
            </Button>
          </div>

          {showAddTeam && (
            <div className="mb-4 p-4 bg-[var(--bg-tertiary)] rounded-lg">
              <input
                type="text"
                placeholder="Search teams..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full px-4 py-2 mb-3 bg-[var(--bg-card)] border border-[var(--border-color)] rounded-lg text-sm focus:outline-none focus:border-green-500"
              />
              <div className="flex flex-wrap gap-2 max-h-48 overflow-y-auto">
                {filteredTeams.length === 0 ? (
                  <p className="text-sm text-[var(--text-muted)]">No teams found</p>
                ) : (
                  filteredTeams.slice(0, 30).map(team => (
                    <button
                      key={team.id}
                      onClick={() => handleAddFavorite(team.id)}
                      disabled={saving || favorites.length >= 10}
                      className="flex items-center gap-2 px-3 py-2 text-sm bg-[var(--bg-card)] hover:bg-green-500/20 border border-[var(--border-color)] hover:border-green-500/50 rounded-lg transition-all"
                    >
                      {team.logo && (
                        <img src={team.logo} alt={team.name} className="w-5 h-5 object-contain" />
                      )}
                      <span>{team.short_name}</span>
                      <span className="text-xs text-[var(--text-muted)]">{team.name.split(' ').slice(0, 2).join(' ')}</span>
                    </button>
                  ))
                )}
              </div>
              <p className="text-xs text-[var(--text-muted)] mt-2">{favorites.length}/10 teams selected</p>
            </div>
          )}

          {favorites.length > 0 ? (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
              {favorites.map(fav => (
                <div key={fav.id} className="flex items-center justify-between p-3 bg-[var(--bg-tertiary)] rounded-lg group">
                  <div className="flex items-center gap-2">
                    {fav.logo && (
                      <img src={fav.logo} alt={fav.team_name} className="w-6 h-6 object-contain" />
                    )}
                    <div>
                      <p className="font-medium text-sm">{fav.team_short_name}</p>
                      <p className="text-xs text-[var(--text-muted)] truncate">{fav.team_name}</p>
                    </div>
                  </div>
                  <button 
                    onClick={() => handleRemoveFavorite(fav.team_id)} 
                    className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-red-500/20 text-[var(--text-muted)] hover:text-red-400 transition-all"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <Heart className="w-12 h-12 mx-auto mb-3 text-[var(--text-muted)] opacity-30" />
              <p className="text-[var(--text-muted)]">No favorite teams yet</p>
              <p className="text-xs text-[var(--text-muted)] mt-1">Add teams to get notified when they play</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Saved Predictions */}
      <Card>
        <CardContent>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-purple-500/20 flex items-center justify-center">
                <Bookmark className="w-5 h-5 text-purple-400" />
              </div>
              <div>
                <h3 className="font-bold">Saved Predictions</h3>
                <p className="text-xs text-[var(--text-muted)]">Your predictions for upcoming matches</p>
              </div>
            </div>
            <Link href="/predictions">
              <Button variant="ghost" size="sm">
                View All
                <TrendingUp className="w-4 h-4 ml-1" />
              </Button>
            </Link>
          </div>

          {savedPredictions.length > 0 ? (
            <div className="space-y-3">
              {savedPredictions.slice(0, 5).map(pred => (
                <div key={pred.id} className="flex items-center justify-between p-3 bg-[var(--bg-tertiary)] rounded-lg">
                  <div className="flex items-center gap-3">
                    <Trophy className="w-5 h-5 text-yellow-400" />
                    <div>
                      <p className="font-medium text-sm">{pred.home_team} vs {pred.away_team}</p>
                      <p className="text-xs text-[var(--text-muted)]">{pred.league}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-sm">{pred.predicted_score}</p>
                    <p className="text-xs text-[var(--text-muted)]">{pred.confidence}% confidence</p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <Bookmark className="w-12 h-12 mx-auto mb-3 text-[var(--text-muted)] opacity-30" />
              <p className="text-[var(--text-muted)]">No saved predictions</p>
              <p className="text-xs text-[var(--text-muted)] mt-1">Save predictions from match pages</p>
              <Link href="/fixtures">
                <Button variant="secondary" size="sm" className="mt-3">
                  <Calendar className="w-4 h-4 mr-1" />
                  Browse Matches
                </Button>
              </Link>
            </div>
          )}
        </CardContent>
      </Card>

      <GuardianBadge quality="high" lastVerified={new Date().toISOString()} />
    </div>
  );
}

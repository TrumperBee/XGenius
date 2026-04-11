'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/AuthContext';
import { savePrediction, getSavedPredictions, removeSavedPrediction, getMatchPoll, voteOnMatch, getUserVote } from '@/lib/auth';
import { Bookmark, Check, Loader2, Users, TrendingUp, Trophy, Star } from 'lucide-react';
import styles from './MatchPoll.module.css';

interface MatchPollProps {
  matchId: number;
  homeTeam: string;
  awayTeam: string;
  homeShort: string;
  awayShort: string;
  homeLogo?: string;
  awayLogo?: string;
  league: string;
  prediction: {
    predictedWinner: 'home' | 'draw' | 'away';
    totalGoals: number;
    confidence: number;
    homeGoals: number;
    awayGoals: number;
    overUnder: 'over' | 'under';
    btts: 'yes' | 'no';
  };
}

interface PollData {
  home_votes: number;
  draw_votes: number;
  away_votes: number;
  total_votes: number;
  predicted_scores: { score: string; votes: number }[];
}

export function MatchPoll({
  matchId,
  homeTeam,
  awayTeam,
  homeShort,
  awayShort,
  homeLogo,
  awayLogo,
  league,
  prediction
}: MatchPollProps) {
  const { user, openAuthModal } = useAuth();
  const [poll, setPoll] = useState<PollData | null>(null);
  const [userVote, setUserVote] = useState<{ vote: string; predicted_score: string } | null>(null);
  const [isSaved, setIsSaved] = useState(false);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [selectedWinner, setSelectedWinner] = useState<'home' | 'draw' | 'away' | null>(null);
  const [selectedScore, setSelectedScore] = useState('2-1');
  const [showScoreInput, setShowScoreInput] = useState(false);

  useEffect(() => {
    loadData();
  }, [matchId, user]);

  async function loadData() {
    setLoading(true);
    
    try {
      const pollData = await getMatchPoll(matchId);
      if (pollData) {
        setPoll(pollData);
      } else {
        setPoll({ home_votes: 0, draw_votes: 0, away_votes: 0, total_votes: 0, predicted_scores: [] });
      }

      if (user) {
        const saved = await getSavedPredictions(user.id);
        const matchSaved = saved.find(p => p.match_id === matchId);
        setIsSaved(!!matchSaved);

        const vote = await getUserVote(user.id, matchId);
        if (vote) {
          setUserVote(vote);
          setSelectedWinner(vote.vote as 'home' | 'draw' | 'away');
          setSelectedScore(vote.predicted_score);
        }
      }
    } catch (e) {
      console.error('Error loading poll:', e);
    }
    setLoading(false);
  }

  async function handleSavePrediction() {
    if (!user) {
      openAuthModal('signup');
      return;
    }

    setSaving(true);
    try {
      await savePrediction({
        user_id: user.id,
        match_id: matchId,
        home_team: homeTeam,
        away_team: awayTeam,
        predicted_winner: prediction.predictedWinner,
        predicted_score: `${prediction.homeGoals}-${prediction.awayGoals}`,
        predicted_home_goals: prediction.homeGoals,
        predicted_away_goals: prediction.awayGoals,
        confidence: prediction.confidence,
        over_under: prediction.overUnder,
        btts: prediction.btts,
        league,
      });
      setIsSaved(true);
    } catch (e) {
      console.error('Error saving prediction:', e);
    }
    setSaving(false);
  }

  async function handleRemovePrediction() {
    if (!user) return;
    setSaving(true);
    try {
      await removeSavedPrediction(user.id, matchId);
      setIsSaved(false);
    } catch (e) {
      console.error('Error removing prediction:', e);
    }
    setSaving(false);
  }

  async function handleVote() {
    if (!user) {
      openAuthModal('signup');
      return;
    }

    if (!selectedWinner) return;

    setSaving(true);
    try {
      await voteOnMatch(user.id, matchId, selectedWinner, selectedScore);
      setUserVote({ vote: selectedWinner, predicted_score: selectedScore });
      await loadData();
    } catch (e) {
      console.error('Error voting:', e);
    }
    setSaving(false);
  }

  function getVotePercent(votes: number) {
    if (!poll || poll.total_votes === 0) return 0;
    return Math.round((votes / poll.total_votes) * 100);
  }

  if (loading) {
    return (
      <div className={styles.container}>
        <div className={styles.loading}>
          <Loader2 className="w-5 h-5 animate-spin" />
        </div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <div className={styles.section}>
        <div className={styles.sectionHeader}>
          <Trophy className="w-5 h-5 text-yellow-400" />
          <h3>Your Prediction</h3>
          {prediction.confidence >= 70 && (
            <span className={styles.confidenceBadge}>High Confidence</span>
          )}
        </div>
        
        <div className={styles.predictionCard}>
          <div className={styles.scorePrediction}>
            <span className={prediction.predictedWinner === 'home' ? styles.winner : ''}>{homeShort}</span>
            <span className={styles.vs}>
              {prediction.totalGoals ? (
                <>{Math.max(0, Math.floor(prediction.totalGoals - 0.8)).toFixed(0)}-{Math.ceil(prediction.totalGoals + 0.8).toFixed(0)} Goals</>
              ) : '--'}
            </span>
            <span className={prediction.predictedWinner === 'away' ? styles.winner : ''}>{awayShort}</span>
          </div>
          
          <div className={styles.predictionMeta}>
            <span>{prediction.confidence}% confidence</span>
            <span>•</span>
            <span>{prediction.overUnder === 'over' ? 'Over' : 'Under'} 2.5</span>
            <span>•</span>
            <span>BTTS: {prediction.btts === 'yes' ? 'Yes' : 'No'}</span>
          </div>
        </div>

        <button
          className={`${styles.saveBtn} ${isSaved ? styles.saved : ''}`}
          onClick={isSaved ? handleRemovePrediction : handleSavePrediction}
          disabled={saving}
        >
          {saving ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : isSaved ? (
            <>
              <Check className="w-4 h-4" />
              Saved
            </>
          ) : (
            <>
              <Bookmark className="w-4 h-4" />
              Save Prediction
            </>
          )}
        </button>
      </div>

      <div className={styles.section}>
        <div className={styles.sectionHeader}>
          <Users className="w-5 h-5 text-blue-400" />
          <h3>Community Poll</h3>
          {poll && poll.total_votes > 0 && (
            <span className={styles.voteCount}>{poll.total_votes} votes</span>
          )}
        </div>

        {!userVote ? (
          <div className={styles.voteForm}>
            <p className={styles.votePrompt}>What's your prediction?</p>
            
            <div className={styles.winnerButtons}>
              <button
                className={`${styles.voteBtn} ${styles.homeBtn} ${selectedWinner === 'home' ? styles.selected : ''}`}
                onClick={() => { setSelectedWinner('home'); setShowScoreInput(true); }}
              >
                <span>{homeShort}</span>
                {poll && poll.home_votes > 0 && (
                  <span className={styles.votePercent}>{getVotePercent(poll.home_votes)}%</span>
                )}
              </button>
              
              <button
                className={`${styles.voteBtn} ${styles.drawBtn} ${selectedWinner === 'draw' ? styles.selected : ''}`}
                onClick={() => { setSelectedWinner('draw'); setShowScoreInput(true); }}
              >
                <span>Draw</span>
                {poll && poll.draw_votes > 0 && (
                  <span className={styles.votePercent}>{getVotePercent(poll.draw_votes)}%</span>
                )}
              </button>
              
              <button
                className={`${styles.voteBtn} ${styles.awayBtn} ${selectedWinner === 'away' ? styles.selected : ''}`}
                onClick={() => { setSelectedWinner('away'); setShowScoreInput(true); }}
              >
                <span>{awayShort}</span>
                {poll && poll.away_votes > 0 && (
                  <span className={styles.votePercent}>{getVotePercent(poll.away_votes)}%</span>
                )}
              </button>
            </div>

            {showScoreInput && selectedWinner && (
              <div className={styles.scoreInput}>
                <label>Your predicted score:</label>
                <div className={styles.scoreSelectors}>
                  <select
                    value={selectedScore.split('-')[0]}
                    onChange={(e) => setSelectedScore(`${e.target.value}-${selectedScore.split('-')[1]}`)}
                  >
                    {[0, 1, 2, 3, 4, 5].map(n => (
                      <option key={n} value={n}>{n}</option>
                    ))}
                  </select>
                  <span>-</span>
                  <select
                    value={selectedScore.split('-')[1]}
                    onChange={(e) => setSelectedScore(`${selectedScore.split('-')[0]}-${e.target.value}`)}
                  >
                    {[0, 1, 2, 3, 4, 5].map(n => (
                      <option key={n} value={n}>{n}</option>
                    ))}
                  </select>
                </div>
                <button
                  className={styles.submitVoteBtn}
                  onClick={handleVote}
                  disabled={saving}
                >
                  {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Submit Vote'}
                </button>
              </div>
            )}
          </div>
        ) : (
          <div className={styles.votedSection}>
            <div className={styles.votedCard}>
              <Check className="w-5 h-5 text-green-400" />
              <div>
                <p className={styles.votedLabel}>Your vote:</p>
                <p className={styles.votedChoice}>
                  {userVote.vote === 'home' ? homeShort : userVote.vote === 'away' ? awayShort : 'Draw'}
                  <span className={styles.votedScore}> • {userVote.predicted_score}</span>
                </p>
              </div>
              <button
                className={styles.changeVoteBtn}
                onClick={() => { setUserVote(null); setSelectedWinner(null); setShowScoreInput(false); }}
              >
                Change
              </button>
            </div>

            <div className={styles.pollResults}>
              <div className={`${styles.resultBar} ${styles.homeBar}`} style={{ width: `${getVotePercent(poll?.home_votes || 0)}%` }}>
                <span>{homeShort}: {getVotePercent(poll?.home_votes || 0)}%</span>
              </div>
              <div className={`${styles.resultBar} ${styles.drawBar}`} style={{ width: `${getVotePercent(poll?.draw_votes || 0)}%` }}>
                <span>Draw: {getVotePercent(poll?.draw_votes || 0)}%</span>
              </div>
              <div className={`${styles.resultBar} ${styles.awayBar}`} style={{ width: `${getVotePercent(poll?.away_votes || 0)}%` }}>
                <span>{awayShort}: {getVotePercent(poll?.away_votes || 0)}%</span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

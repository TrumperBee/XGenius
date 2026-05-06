import { NextResponse } from 'next/server';
import { ALLOWED_LEAGUE_IDS } from '@/config/leagues';
import { generatePrediction } from '@/lib/predictionEngine';

const API_KEY = process.env.FOOTBALL_API_KEY;
const API_BASE = 'https://v3.football.api-sports.io';

async function fetchWithTimeout(url: string, options: any, timeout = 8000): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);
  try {
    const response = await fetch(url, { ...options, signal: controller.signal });
    clearTimeout(timeoutId);
    return response;
  } catch (error: any) {
    clearTimeout(timeoutId);
    throw error;
  }
}

async function fetchResultsForDays(days: number): Promise<any[]> {
  if (!API_KEY) return [];
  const results: any[] = [];
  for (let i = 1; i <= days; i++) {
    const date = new Date();
    date.setDate(date.getDate() - i);
    const dateStr = date.toISOString().split('T')[0];
    try {
      const response = await fetchWithTimeout(
        `${API_BASE}/fixtures?date=${dateStr}&status=FT&timezone=UTC`,
        { headers: { 'x-apisports-key': API_KEY } }
      );
      if (!response.ok) continue;
      const data = await response.json();
      const matches = (data.response || []).filter((f: any) => ALLOWED_LEAGUE_IDS.includes(f.league.id));
      results.push(...matches);
      await new Promise(r => setTimeout(r, 200));
    } catch {
      console.log(`Failed to fetch ${dateStr}`);
      continue;
    }
  }
  return results;
}

function calculateStats(results: any[]) {
  const predictions = results.map((f: any) => {
    const homeScore = f.score?.fulltime?.home ?? 0;
    const awayScore = f.score?.fulltime?.away ?? 0;
    
    const pred = generatePrediction({
      homeTeam: { id: f.teams.home.id, name: f.teams.home.name },
      awayTeam: { id: f.teams.away.id, name: f.teams.away.name },
      league: { id: f.league.id, name: f.league.name },
      homeStats: null,
      awayStats: null,
      homeForm: null,
      awayForm: null,
      h2hFixtures: [],
      h2hSummary: { total: 0, home_wins: 0, away_wins: 0, draws: 0, goals: { home: 0, away: 0 } }
    });
    
    const actualWinner = homeScore > awayScore ? 'home' : homeScore < awayScore ? 'away' : 'draw';
    const winnerCorrect = pred.predictedWinner === actualWinner;
    
    return {
      match_id: f.fixture.id,
      match_date: f.fixture.date.split('T')[0],
      league: f.league.name,
      home_team: f.teams.home.name,
      away_team: f.teams.away.name,
      confidence: pred.confidence,
      predicted_winner: pred.predictedWinner,
      winnerCorrect,
      prediction: pred,
    };
  });
  return predictions;
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action') || 'stats';
    
    if (action === 'high-confidence') {
      const minConfidence = parseInt(searchParams.get('minConfidence') || '70');
      const results = await fetchResultsForDays(7);
      const predictions = calculateStats(results);
      const highConf = predictions
        .filter((p: any) => p.confidence >= minConfidence)
        .sort((a: any, b: any) => b.confidence - a.confidence)
        .slice(0, 10);
      
      return NextResponse.json({
        success: true,
        data: highConf.map((p: any) => ({
          match_id: p.match_id,
          home_team: p.home_team,
          away_team: p.away_team,
          competition: p.league,
          predicted_winner: p.predicted_winner,
          confidence: p.confidence,
          correct_score: p.prediction.correctScore,
          match_date: p.match_date
        })),
        total: highConf.length,
        source: 'calculated'
      });
    }
    
    const results = await fetchResultsForDays(7);
    const predictions = calculateStats(results);
    
    const totalPredictions = predictions.length;
    const correctPredictions = predictions.filter((p: any) => p.winnerCorrect).length;
    const overallAccuracy = totalPredictions > 0 ? Math.round((correctPredictions / totalPredictions) * 100) : 0;
    
    const yesterday = predictions.filter((p: any) => {
      const y = new Date();
      y.setDate(y.getDate() - 1);
      return p.match_date === y.toISOString().split('T')[0];
    });
    const yesterdayCorrect = yesterday.filter((p: any) => p.winnerCorrect).length;
    const yesterdayAccuracy = yesterday.length > 0 ? Math.round((yesterdayCorrect / yesterday.length) * 100) : 0;
    
    const weekAccuracy = overallAccuracy;
    const weekCorrect = correctPredictions;
    
    const roi = totalPredictions > 0 ? Math.round((((correctPredictions * 0.9) - totalPredictions) / totalPredictions) * 1000) / 10 : 0;
    
    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const weeklyPerformance: { [key: string]: { accuracy: number; correct: number; total: number } } = {};
    for (const day of dayNames) {
      weeklyPerformance[day] = { accuracy: 0, correct: 0, total: 0 };
    }
    predictions.forEach((p: any) => {
      const date = new Date(p.match_date);
      const dayName = dayNames[date.getDay()];
      weeklyPerformance[dayName].total++;
      if (p.winnerCorrect) weeklyPerformance[dayName].correct++;
    });
    for (const day in weeklyPerformance) {
      weeklyPerformance[day].accuracy = weeklyPerformance[day].total > 0 ? Math.round((weeklyPerformance[day].correct / weeklyPerformance[day].total) * 100) : 0;
    }
    
    const leagueBreakdown: { [key: string]: { accuracy: number; correct: number; total: number } } = {};
    predictions.forEach((p: any) => {
      if (!leagueBreakdown[p.league]) {
        leagueBreakdown[p.league] = { accuracy: 0, correct: 0, total: 0 };
      }
      leagueBreakdown[p.league].total++;
      if (p.winnerCorrect) leagueBreakdown[p.league].correct++;
    });
    for (const league in leagueBreakdown) {
      leagueBreakdown[league].accuracy = leagueBreakdown[league].total >= 2 ? Math.round((leagueBreakdown[league].correct / leagueBreakdown[league].total) * 100) : 0;
    }
    
    const confidenceRanges = [
      { range: '90-100%', min: 90, max: 100 },
      { range: '75-89%', min: 75, max: 89 },
      { range: '60-74%', min: 60, max: 74 },
      { range: '50-59%', min: 50, max: 59 },
      { range: 'Below 50%', min: 0, max: 49 },
    ];
    
    const confidenceCalibration = {
      ranges: confidenceRanges.map(r => {
        const rangePredictions = predictions.filter((p: any) => p.confidence >= r.min && p.confidence <= r.max);
        const correct = rangePredictions.filter((p: any) => p.winnerCorrect).length;
        const total = rangePredictions.length;
        return {
          range: r.range,
          min: r.min,
          max: r.max,
          predicted: total,
          correct,
          accuracy: total > 0 ? Math.round((correct / total) * 100) : 0
        };
      })
    };
    
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const monthlyTrend = { months: [] as { month: string; accuracy: number; correct: number; total: number }[] };
    for (let i = 5; i >= 0; i--) {
      const date = new Date();
      date.setMonth(date.getMonth() - i);
      const monthStr = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      const monthData = predictions.filter((p: any) => p.match_date.startsWith(monthStr));
      const correct = monthData.filter((p: any) => p.winnerCorrect).length;
      monthlyTrend.months.push({
        month: monthNames[date.getMonth()],
        accuracy: monthData.length > 0 ? Math.round((correct / monthData.length) * 100) : 0,
        correct,
        total: monthData.length
      });
    }
    
    const highConfidence = predictions
      .filter((p: any) => p.confidence >= 70)
      .sort((a: any, b: any) => b.confidence - a.confidence)
      .slice(0, 10);
    
    return NextResponse.json({
      success: true,
      data: {
        total_predictions: totalPredictions,
        correct_predictions: correctPredictions,
        overall_accuracy: overallAccuracy,
        yesterday: { accuracy: yesterdayAccuracy, correct: yesterdayCorrect, total: yesterday.length, change: 0 },
        this_week: { accuracy: weekAccuracy, correct: weekCorrect, total: totalPredictions, change: 0 },
        this_month: { accuracy: overallAccuracy, correct: correctPredictions, total: totalPredictions },
        roi: { roi, unitsWon: Math.round(correctPredictions * 0.9 * 10) / 10, unitsStaked: totalPredictions, change: 0 },
        weekly_performance: weeklyPerformance,
        league_breakdown: leagueBreakdown,
        confidence_calibration: confidenceCalibration,
        monthly_trend: monthlyTrend,
        high_confidence_predictions: highConfidence.map((p: any) => ({
          match_id: p.match_id,
          home_team: p.home_team,
          away_team: p.away_team,
          competition: p.league,
          predicted_winner: p.predicted_winner,
          confidence: p.confidence,
          correct_score: p.prediction.correctScore,
          match_date: p.match_date
        })),
        last_updated: new Date().toISOString(),
        next_update: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
        source: 'calculated'
      }
    });
  } catch (error: any) {
    console.error('Stats API error:', error);
    return NextResponse.json({
      success: false,
      error: error.message || 'Internal server error',
      data: {
        total_predictions: 0,
        correct_predictions: 0,
        overall_accuracy: 0,
        yesterday: { accuracy: 0, correct: 0, total: 0, change: 0 },
        this_week: { accuracy: 0, correct: 0, total: 0, change: 0 },
        this_month: { accuracy: 0, correct: 0, total: 0 },
        roi: { roi: 0, unitsWon: 0, unitsStaked: 0, change: 0 },
        weekly_performance: {},
        league_breakdown: {},
        confidence_calibration: { ranges: [] },
        monthly_trend: { months: [] },
        high_confidence_predictions: [],
        last_updated: new Date().toISOString(),
        next_update: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
        source: 'error'
      }
    });
  }
}

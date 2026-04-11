import { NextResponse } from 'next/server';

const API_KEY = process.env.FOOTBALL_API_KEY;
const API_BASE = 'https://v3.football.api-sports.io';

const TOP_LEAGUE_IDS = [39, 140, 78, 135, 61];

const memoryCache: { data: any; timestamp: number } | null = null;
const CACHE_DURATION = 5 * 60 * 1000;

function seededRandom(seed: number): number {
  const x = Math.sin(seed) * 10000;
  return x - Math.floor(x);
}

function poisson(goals: number, lambda: number): number {
  if (lambda === 0) return goals === 0 ? 1 : 0;
  return (Math.pow(lambda, goals) * Math.exp(-lambda)) / factorial(goals);
}

function factorial(n: number): number {
  if (n <= 1) return 1;
  let result = 1;
  for (let i = 2; i <= n; i++) result *= i;
  return result;
}

function generatePrediction(homeName: string, awayName: string, seed: number) {
  const homeAdvantage = 0.15;
  const strengthDiff = seededRandom(seed + 500) * 0.4 - 0.2;
  const homeStrength = 0.5 + strengthDiff + 0.1;
  const awayStrength = 0.5 - strengthDiff + 0.1;
  
  let homeExpectedGoals = 2.5 * (1 + homeAdvantage) * homeStrength;
  let awayExpectedGoals = 2.5 * (1 - homeAdvantage * 0.5) * awayStrength;
  
  homeExpectedGoals = Math.max(0.3, Math.min(3.5, homeExpectedGoals));
  awayExpectedGoals = Math.max(0.3, Math.min(3.5, awayExpectedGoals));

  let homeWinProb = 0;
  let drawProb = 0;
  let awayWinProb = 0;
  
  for (let h = 0; h <= 6; h++) {
    for (let a = 0; a <= 6; a++) {
      const homeProb = poisson(h, homeExpectedGoals);
      const awayProb = poisson(a, awayExpectedGoals);
      const jointProb = homeProb * awayProb;
      
      if (h > a) homeWinProb += jointProb;
      else if (a > h) awayWinProb += jointProb;
      else drawProb += jointProb;
    }
  }

  homeWinProb = homeWinProb * 100;
  drawProb = drawProb * 100;
  awayWinProb = awayWinProb * 100;

  let predictedWinner: 'home' | 'draw' | 'away';
  if (homeWinProb >= drawProb && homeWinProb >= awayWinProb) {
    predictedWinner = 'home';
  } else if (awayWinProb >= drawProb && awayWinProb >= homeWinProb) {
    predictedWinner = 'away';
  } else {
    predictedWinner = 'draw';
  }

  const scoreProbs: { home: number; away: number; prob: number }[] = [];
  for (let h = 0; h <= 5; h++) {
    for (let a = 0; a <= 5; a++) {
      const prob = poisson(h, homeExpectedGoals) * poisson(a, awayExpectedGoals);
      scoreProbs.push({ home: h, away: a, prob });
    }
  }
  scoreProbs.sort((a, b) => b.prob - a.prob);

  let correctHomeGoals: number;
  let correctAwayGoals: number;
  
  if (predictedWinner === 'home') {
    const homeWinningScores = scoreProbs.filter(s => s.home > s.away);
    if (homeWinningScores.length > 0) {
      const idx = Math.floor(seededRandom(seed + 100) * Math.min(3, homeWinningScores.length));
      correctHomeGoals = homeWinningScores[idx].home;
      correctAwayGoals = homeWinningScores[idx].away;
    } else {
      correctHomeGoals = Math.round(homeExpectedGoals);
      correctAwayGoals = Math.round(awayExpectedGoals) - 1;
    }
  } else if (predictedWinner === 'away') {
    const awayWinningScores = scoreProbs.filter(s => s.away > s.home);
    if (awayWinningScores.length > 0) {
      const idx = Math.floor(seededRandom(seed + 100) * Math.min(3, awayWinningScores.length));
      correctHomeGoals = awayWinningScores[idx].home;
      correctAwayGoals = awayWinningScores[idx].away;
    } else {
      correctHomeGoals = Math.round(homeExpectedGoals) - 1;
      correctAwayGoals = Math.round(awayExpectedGoals);
    }
  } else {
    const drawScores = scoreProbs.filter(s => s.home === s.away);
    if (drawScores.length > 0) {
      const idx = Math.floor(seededRandom(seed + 100) * Math.min(3, drawScores.length));
      correctHomeGoals = drawScores[idx].home;
      correctAwayGoals = drawScores[idx].away;
    } else {
      const avgGoals = Math.round((homeExpectedGoals + awayExpectedGoals) / 2);
      correctHomeGoals = avgGoals;
      correctAwayGoals = avgGoals;
    }
  }
  
  correctHomeGoals = Math.max(0, correctHomeGoals);
  correctAwayGoals = Math.max(0, correctAwayGoals);

  const totalGoals = homeExpectedGoals + awayExpectedGoals;
  const overUnder: 'over' | 'under' = totalGoals > 2.5 ? 'over' : 'under';
  const btts: 'yes' | 'no' = homeExpectedGoals > 0.5 && awayExpectedGoals > 0.5 ? 'yes' : 'no';

  const confidence = Math.min(95, Math.max(45, Math.round(
    Math.abs(homeWinProb - awayWinProb) * 0.6 + (100 - Math.abs(homeExpectedGoals - awayExpectedGoals) * 20) * 0.2
  )));

  return {
    predictedWinner,
    homeWin: Math.round(homeWinProb),
    draw: Math.round(drawProb),
    awayWin: Math.round(awayWinProb),
    correctScore: `${correctHomeGoals}-${correctAwayGoals}`,
    homeGoals: correctHomeGoals,
    awayGoals: correctAwayGoals,
    confidence,
    overUnder,
    btts,
  };
}

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
      const matches = (data.response || []).filter((f: any) => TOP_LEAGUE_IDS.includes(f.league.id));
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
    const prediction = generatePrediction(f.teams.home.name, f.teams.away.name, f.fixture.id);
    
    const actualWinner = homeScore > awayScore ? 'home' : homeScore < awayScore ? 'away' : 'draw';
    const winnerCorrect = prediction.predictedWinner === actualWinner;
    
    return {
      match_id: f.fixture.id,
      match_date: f.fixture.date.split('T')[0],
      league: f.league.name,
      home_team: f.teams.home.name,
      away_team: f.teams.away.name,
      confidence: prediction.confidence,
      predicted_winner: prediction.predictedWinner,
      winnerCorrect,
      prediction,
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
    const yesterdayAccuracy = yesterday.length > 0 
      ? Math.round((yesterdayCorrect / yesterday.length) * 100) : 0;
    
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
      weeklyPerformance[day].accuracy = weeklyPerformance[day].total > 0 
        ? Math.round((weeklyPerformance[day].correct / weeklyPerformance[day].total) * 100) : 0;
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
      leagueBreakdown[league].accuracy = leagueBreakdown[league].total >= 2
        ? Math.round((leagueBreakdown[league].correct / leagueBreakdown[league].total) * 100)
        : 0;
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
        const rangePredictions = predictions.filter((p: any) => 
          p.confidence >= r.min && p.confidence <= r.max
        );
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
        yesterday: { 
          accuracy: yesterdayAccuracy, 
          correct: yesterdayCorrect, 
          total: yesterday.length, 
          change: 0 
        },
        this_week: { 
          accuracy: weekAccuracy, 
          correct: weekCorrect, 
          total: totalPredictions, 
          change: 0 
        },
        this_month: { 
          accuracy: overallAccuracy, 
          correct: correctPredictions, 
          total: totalPredictions 
        },
        roi: { 
          roi, 
          unitsWon: Math.round(correctPredictions * 0.9 * 10) / 10, 
          unitsStaked: totalPredictions, 
          change: 0 
        },
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

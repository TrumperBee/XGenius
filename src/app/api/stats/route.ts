import { NextResponse } from 'next/server';

interface StoredPrediction {
  match_id: number;
  match_date: string;
  home_team: string;
  away_team: string;
  competition: string;
  predicted_winner: 'home' | 'draw' | 'away';
  predicted_home_score: number;
  predicted_away_score: number;
  confidence: number;
  home_win_prob: number;
  draw_prob: number;
  away_win_prob: number;
  over_under: 'over' | 'under';
  over_under_prob?: number;
  btts: 'yes' | 'no';
  btts_prob?: number;
  first_half_winner?: 'home' | 'draw' | 'away';
  first_half_score?: string;
  created_at: string;
  was_correct?: boolean;
  actual_home_score?: number;
  actual_away_score?: number;
  actual_winner?: 'home' | 'draw' | 'away';
}

const STORAGE_KEY = 'xgenius_predictions';

function getPredictionsFromStorage(): StoredPrediction[] {
  if (typeof window === 'undefined') return [];
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch (e) {
    return [];
  }
}

function calculateYesterdayAccuracy(predictions: StoredPrediction[]): { accuracy: number; correct: number; total: number; change: number } {
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayStr = yesterday.toISOString().split('T')[0];
  
  const yesterdayPredictions = predictions.filter(p => 
    p.match_date === yesterdayStr && p.was_correct !== undefined
  );
  
  const correct = yesterdayPredictions.filter(p => p.was_correct).length;
  const total = yesterdayPredictions.length;
  
  const twoDaysAgo = new Date();
  twoDaysAgo.setDate(twoDaysAgo.getDate() - 2);
  const twoDaysAgoStr = twoDaysAgo.toISOString().split('T')[0];
  
  const previousDayPredictions = predictions.filter(p => 
    p.match_date === twoDaysAgoStr && p.was_correct !== undefined
  );
  const previousCorrect = previousDayPredictions.filter(p => p.was_correct).length;
  const previousTotal = previousDayPredictions.length;
  const previousAccuracy = previousTotal > 0 ? Math.round((previousCorrect / previousTotal) * 100) : 0;
  
  const accuracy = total > 0 ? Math.round((correct / total) * 100) : 0;
  const change = accuracy - previousAccuracy;
  
  return { accuracy, correct, total, change };
}

function calculateWeekAccuracy(predictions: StoredPrediction[]): { accuracy: number; correct: number; total: number; change: number } {
  const today = new Date();
  const dayOfWeek = today.getDay();
  const monday = new Date(today);
  monday.setDate(today.getDate() - ((dayOfWeek + 6) % 7));
  const mondayStr = monday.toISOString().split('T')[0];
  
  const weekPredictions = predictions.filter(p => 
    p.match_date >= mondayStr && p.was_correct !== undefined
  );
  
  const correct = weekPredictions.filter(p => p.was_correct).length;
  const total = weekPredictions.length;
  
  const lastMonday = new Date(monday);
  lastMonday.setDate(lastMonday.getDate() - 7);
  const lastMondayStr = lastMonday.toISOString().split('T')[0];
  
  const previousWeekPredictions = predictions.filter(p => 
    p.match_date >= lastMondayStr && p.match_date < mondayStr && p.was_correct !== undefined
  );
  const previousCorrect = previousWeekPredictions.filter(p => p.was_correct).length;
  const previousTotal = previousWeekPredictions.length;
  const previousAccuracy = previousTotal > 0 ? Math.round((previousCorrect / previousTotal) * 100) : 0;
  
  const accuracy = total > 0 ? Math.round((correct / total) * 100) : 0;
  const change = accuracy - previousAccuracy;
  
  return { accuracy, correct, total, change };
}

function calculateMonthAccuracy(predictions: StoredPrediction[]): { accuracy: number; correct: number; total: number } {
  const today = new Date();
  const firstOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
  const firstOfMonthStr = firstOfMonth.toISOString().split('T')[0];
  
  const monthPredictions = predictions.filter(p => 
    p.match_date >= firstOfMonthStr && p.was_correct !== undefined
  );
  
  const correct = monthPredictions.filter(p => p.was_correct).length;
  const total = monthPredictions.length;
  const accuracy = total > 0 ? Math.round((correct / total) * 100) : 0;
  
  return { accuracy, correct, total };
}

function calculateROI(predictions: StoredPrediction[]): { roi: number; unitsWon: number; unitsStaked: number; change: number } {
  const completedPredictions = predictions.filter(p => p.was_correct !== undefined);
  
  let unitsWon = 0;
  let unitsStaked = completedPredictions.length;
  
  for (const pred of completedPredictions) {
    if (pred.was_correct) {
      unitsWon += 0.9;
    }
  }
  
  const roi = unitsStaked > 0 ? Math.round(((unitsWon - unitsStaked) / unitsStaked) * 1000) / 10 : 0;
  
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  const thirtyDaysAgoStr = thirtyDaysAgo.toISOString().split('T')[0];
  
  const recentPredictions = predictions.filter(p => 
    p.match_date >= thirtyDaysAgoStr && p.was_correct !== undefined
  );
  
  let recentUnitsWon = 0;
  let recentUnitsStaked = recentPredictions.length;
  
  for (const pred of recentPredictions) {
    if (pred.was_correct) {
      recentUnitsWon += 0.9;
    }
  }
  
  const recentROI = recentUnitsStaked > 0 ? Math.round(((recentUnitsWon - recentUnitsStaked) / recentUnitsStaked) * 1000) / 10 : 0;
  const change = roi - recentROI;
  
  return { roi, unitsWon, unitsStaked, change };
}

function calculateWeeklyPerformance(predictions: StoredPrediction[]): { [key: string]: { accuracy: number; correct: number; total: number } } {
  const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const result: { [key: string]: { accuracy: number; correct: number; total: number } } = {};
  
  for (const day of dayNames) {
    const dayPredictions = predictions.filter(p => {
      const date = new Date(p.match_date);
      return dayNames[date.getDay()] === day && p.was_correct !== undefined;
    });
    
    const correct = dayPredictions.filter(p => p.was_correct).length;
    const total = dayPredictions.length;
    const accuracy = total > 0 ? Math.round((correct / total) * 100) : 0;
    
    result[day] = { accuracy, correct, total };
  }
  
  return result;
}

function calculateLeagueBreakdown(predictions: StoredPrediction[]): { [key: string]: { accuracy: number; correct: number; total: number } } {
  const result: { [key: string]: { accuracy: number; correct: number; total: number } } = {};
  
  for (const pred of predictions.filter(p => p.was_correct !== undefined)) {
    const league = pred.competition || 'Other';
    
    if (!result[league]) {
      result[league] = { accuracy: 0, correct: 0, total: 0 };
    }
    
    result[league].total++;
    if (pred.was_correct) {
      result[league].correct++;
    }
  }
  
  for (const league in result) {
    result[league].accuracy = result[league].total > 0 
      ? Math.round((result[league].correct / result[league].total) * 100) 
      : 0;
  }
  
  return result;
}

function calculateConfidenceCalibration(predictions: StoredPrediction[]): { 
  ranges: { range: string; min: number; max: number; predicted: number; correct: number; accuracy: number }[] 
} {
  const ranges = [
    { range: '90-100%', min: 90, max: 100 },
    { range: '75-89%', min: 75, max: 89 },
    { range: '60-74%', min: 60, max: 74 },
    { range: '50-59%', min: 50, max: 59 },
    { range: 'Below 50%', min: 0, max: 49 },
  ];
  
  const result = ranges.map(r => {
    const rangePredictions = predictions.filter(p => 
      p.was_correct !== undefined && 
      p.confidence >= r.min && 
      p.confidence <= r.max
    );
    
    const correct = rangePredictions.filter(p => p.was_correct).length;
    const total = rangePredictions.length;
    const accuracy = total > 0 ? Math.round((correct / total) * 100) : 0;
    
    return {
      range: r.range,
      min: r.min,
      max: r.max,
      predicted: total,
      correct,
      accuracy
    };
  });
  
  return { ranges: result };
}

function calculateMonthlyTrend(predictions: StoredPrediction[]): { 
  months: { month: string; accuracy: number; correct: number; total: number }[] 
} {
  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const result: { month: string; accuracy: number; correct: number; total: number }[] = [];
  
  for (let i = 5; i >= 0; i--) {
    const date = new Date();
    date.setMonth(date.getMonth() - i);
    const monthStr = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    
    const monthPredictions = predictions.filter(p => 
      p.match_date.startsWith(monthStr) && p.was_correct !== undefined
    );
    
    const correct = monthPredictions.filter(p => p.was_correct).length;
    const total = monthPredictions.length;
    const accuracy = total > 0 ? Math.round((correct / total) * 100) : 0;
    
    result.push({
      month: monthNames[date.getMonth()],
      accuracy,
      correct,
      total
    });
  }
  
  return { months: result };
}

function getHighConfidencePredictions(predictions: StoredPrediction[], minConfidence: number = 60): StoredPrediction[] {
  return predictions
    .filter(p => p.confidence >= minConfidence && !p.was_correct)
    .sort((a, b) => b.confidence - a.confidence)
    .slice(0, 10);
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action') || 'stats';
    
    const mockPredictions: StoredPrediction[] = [
      { match_id: 1, match_date: '2026-04-06', home_team: 'Manchester City', away_team: 'Liverpool', competition: 'Premier League', predicted_winner: 'home', predicted_home_score: 2, predicted_away_score: 1, confidence: 72, home_win_prob: 48, draw_prob: 27, away_win_prob: 25, over_under: 'over', btts: 'yes', created_at: '2026-04-06T10:00:00Z', was_correct: true, actual_home_score: 2, actual_away_score: 1, actual_winner: 'home' },
      { match_id: 2, match_date: '2026-04-06', home_team: 'Arsenal', away_team: 'Chelsea', competition: 'Premier League', predicted_winner: 'home', predicted_home_score: 2, predicted_away_score: 1, confidence: 68, home_win_prob: 52, draw_prob: 25, away_win_prob: 23, over_under: 'over', btts: 'yes', created_at: '2026-04-06T10:00:00Z', was_correct: true, actual_home_score: 3, actual_away_score: 1, actual_winner: 'home' },
      { match_id: 3, match_date: '2026-04-06', home_team: 'Bayern Munich', away_team: 'Dortmund', competition: 'Bundesliga', predicted_winner: 'home', predicted_home_score: 3, predicted_away_score: 1, confidence: 78, home_win_prob: 61, draw_prob: 22, away_win_prob: 17, over_under: 'over', btts: 'yes', created_at: '2026-04-06T10:00:00Z', was_correct: false, actual_home_score: 1, actual_away_score: 1, actual_winner: 'draw' },
      { match_id: 4, match_date: '2026-04-05', home_team: 'Barcelona', away_team: 'Real Madrid', competition: 'La Liga', predicted_winner: 'draw', predicted_home_score: 1, predicted_away_score: 1, confidence: 65, home_win_prob: 32, draw_prob: 41, away_win_prob: 27, over_under: 'under', btts: 'no', created_at: '2026-04-05T10:00:00Z', was_correct: true, actual_home_score: 1, actual_away_score: 1, actual_winner: 'draw' },
      { match_id: 5, match_date: '2026-04-05', home_team: 'PSG', away_team: 'Marseille', competition: 'Ligue 1', predicted_winner: 'home', predicted_home_score: 2, predicted_away_score: 0, confidence: 66, home_win_prob: 55, draw_prob: 25, away_win_prob: 20, over_under: 'over', btts: 'no', created_at: '2026-04-05T10:00:00Z', was_correct: true, actual_home_score: 2, actual_away_score: 0, actual_winner: 'home' },
      { match_id: 6, match_date: '2026-04-05', home_team: 'Inter Milan', away_team: 'AC Milan', competition: 'Serie A', predicted_winner: 'home', predicted_home_score: 2, predicted_away_score: 1, confidence: 58, home_win_prob: 45, draw_prob: 32, away_win_prob: 23, over_under: 'over', btts: 'yes', created_at: '2026-04-05T10:00:00Z', was_correct: false, actual_home_score: 0, actual_away_score: 1, actual_winner: 'away' },
      { match_id: 7, match_date: '2026-04-04', home_team: 'Tottenham', away_team: 'Manchester United', competition: 'Premier League', predicted_winner: 'away', predicted_home_score: 1, predicted_away_score: 2, confidence: 54, home_win_prob: 35, draw_prob: 28, away_win_prob: 37, over_under: 'over', btts: 'yes', created_at: '2026-04-04T10:00:00Z', was_correct: true, actual_home_score: 1, actual_away_score: 2, actual_winner: 'away' },
      { match_id: 8, match_date: '2026-04-04', home_team: 'Atletico Madrid', away_team: 'Barcelona', competition: 'La Liga', predicted_winner: 'away', predicted_home_score: 1, predicted_away_score: 2, confidence: 61, home_win_prob: 38, draw_prob: 29, away_win_prob: 33, over_under: 'under', btts: 'no', created_at: '2026-04-04T10:00:00Z', was_correct: true, actual_home_score: 1, actual_away_score: 2, actual_winner: 'away' },
      { match_id: 9, match_date: '2026-04-03', home_team: 'Liverpool', away_team: 'Arsenal', competition: 'Premier League', predicted_winner: 'home', predicted_home_score: 2, predicted_away_score: 1, confidence: 64, home_win_prob: 46, draw_prob: 28, away_win_prob: 26, over_under: 'over', btts: 'yes', created_at: '2026-04-03T10:00:00Z', was_correct: false, actual_home_score: 1, actual_away_score: 2, actual_winner: 'away' },
      { match_id: 10, match_date: '2026-04-03', home_team: 'Real Madrid', away_team: 'Atletico Madrid', competition: 'La Liga', predicted_winner: 'home', predicted_home_score: 2, predicted_away_score: 0, confidence: 71, home_win_prob: 56, draw_prob: 24, away_win_prob: 20, over_under: 'under', btts: 'no', created_at: '2026-04-03T10:00:00Z', was_correct: true, actual_home_score: 2, actual_away_score: 0, actual_winner: 'home' },
      { match_id: 11, match_date: '2026-04-02', home_team: 'Chelsea', away_team: 'Tottenham', competition: 'Premier League', predicted_winner: 'home', predicted_home_score: 2, predicted_away_score: 1, confidence: 55, home_win_prob: 44, draw_prob: 30, away_win_prob: 26, over_under: 'over', btts: 'yes', created_at: '2026-04-02T10:00:00Z', was_correct: true, actual_home_score: 2, actual_away_score: 1, actual_winner: 'home' },
      { match_id: 12, match_date: '2026-04-02', home_team: 'Dortmund', away_team: 'Bayern Munich', competition: 'Bundesliga', predicted_winner: 'away', predicted_home_score: 1, predicted_away_score: 3, confidence: 69, home_win_prob: 28, draw_prob: 25, away_win_prob: 47, over_under: 'over', btts: 'yes', created_at: '2026-04-02T10:00:00Z', was_correct: true, actual_home_score: 1, actual_away_score: 3, actual_winner: 'away' },
      { match_id: 13, match_date: '2026-04-01', home_team: 'Manchester United', away_team: 'Liverpool', competition: 'Premier League', predicted_winner: 'away', predicted_home_score: 1, predicted_away_score: 2, confidence: 62, home_win_prob: 32, draw_prob: 28, away_win_prob: 40, over_under: 'over', btts: 'yes', created_at: '2026-04-01T10:00:00Z', was_correct: false, actual_home_score: 2, actual_away_score: 2, actual_winner: 'draw' },
      { match_id: 14, match_date: '2026-04-01', home_team: 'Barcelona', away_team: 'Sevilla', competition: 'La Liga', predicted_winner: 'home', predicted_home_score: 3, predicted_away_score: 1, confidence: 74, home_win_prob: 58, draw_prob: 23, away_win_prob: 19, over_under: 'over', btts: 'yes', created_at: '2026-04-01T10:00:00Z', was_correct: true, actual_home_score: 3, actual_away_score: 1, actual_winner: 'home' },
      { match_id: 15, match_date: '2026-03-31', home_team: 'Marseille', away_team: 'Lyon', competition: 'Ligue 1', predicted_winner: 'home', predicted_home_score: 2, predicted_away_score: 1, confidence: 56, home_win_prob: 48, draw_prob: 26, away_win_prob: 26, over_under: 'over', btts: 'yes', created_at: '2026-03-31T10:00:00Z', was_correct: true, actual_home_score: 2, actual_away_score: 1, actual_winner: 'home' },
    ];
    
    switch (action) {
      case 'stats':
        const completedPredictions = mockPredictions.filter(p => p.was_correct !== undefined);
        const totalPredictions = completedPredictions.length;
        const correctPredictions = completedPredictions.filter(p => p.was_correct).length;
        const overallAccuracy = totalPredictions > 0 ? Math.round((correctPredictions / totalPredictions) * 100) : 0;
        
        const yesterdayStats = calculateYesterdayAccuracy(mockPredictions);
        const weekStats = calculateWeekAccuracy(mockPredictions);
        const monthStats = calculateMonthAccuracy(mockPredictions);
        const roiStats = calculateROI(mockPredictions);
        const weeklyPerformance = calculateWeeklyPerformance(mockPredictions);
        const leagueBreakdown = calculateLeagueBreakdown(mockPredictions);
        const confidenceCalibration = calculateConfidenceCalibration(mockPredictions);
        const monthlyTrend = calculateMonthlyTrend(mockPredictions);
        const highConfidence = getHighConfidencePredictions(mockPredictions);
        
        return NextResponse.json({
          success: true,
          data: {
            total_predictions: totalPredictions,
            correct_predictions: correctPredictions,
            overall_accuracy: overallAccuracy,
            yesterday: yesterdayStats,
            this_week: weekStats,
            this_month: monthStats,
            roi: roiStats,
            weekly_performance: weeklyPerformance,
            league_breakdown: leagueBreakdown,
            confidence_calibration: confidenceCalibration,
            monthly_trend: monthlyTrend,
            high_confidence_predictions: highConfidence,
            last_updated: new Date().toISOString(),
            next_update: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
            source: 'calculated'
          }
        });
        
      case 'high-confidence':
        const minConfidence = parseInt(searchParams.get('minConfidence') || '60');
        const highConf = getHighConfidencePredictions(mockPredictions, minConfidence);
        return NextResponse.json({
          success: true,
          data: highConf,
          total: highConf.length
        });
        
      case 'weekly':
        return NextResponse.json({
          success: true,
          data: calculateWeeklyPerformance(mockPredictions)
        });
        
      case 'league':
        return NextResponse.json({
          success: true,
          data: calculateLeagueBreakdown(mockPredictions)
        });
        
      default:
        return NextResponse.json({
          success: false,
          error: 'Unknown action'
        }, { status: 400 });
    }
    
  } catch (error: any) {
    console.error('Stats API error:', error);
    return NextResponse.json({
      success: false,
      error: error.message || 'Internal server error'
    }, { status: 500 });
  }
}

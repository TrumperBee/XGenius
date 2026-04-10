export interface H2HFixture {
  id: number;
  date: string;
  home_score: number;
  away_score: number;
  home_team: { name: string };
  away_team: { name: string };
  competition?: string;
}

export interface H2HSummary {
  total: number;
  home_wins: number;
  away_wins: number;
  draws: number;
  goals: { home: number; away: number };
}

export interface ConsistentPrediction {
  predictedWinner: 'home' | 'draw' | 'away';
  homeWin: number;
  draw: number;
  awayWin: number;
  correctScore: string;
  homeGoals: number;
  awayGoals: number;
  confidence: number;
  overUnder: 'over' | 'under';
  overUnderProb: number;
  btts: 'yes' | 'no';
  bttsProb: number;
  expectedHomeGoals: number;
  expectedAwayGoals: number;
  totalGoals: number;
  firstHalfWinner: 'home' | 'draw' | 'away' | null;
  firstHalfScore: string | null;
  firstHalfProb: number | null;
  insights: string[];
  validationPassed: boolean;
  validationErrors: string[];
}

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

function generateConsistentPrediction(
  homeName: string,
  awayName: string,
  h2hFixtures: H2HFixture[],
  h2hSummary: H2HSummary,
  homeStrength: number,
  awayStrength: number,
  seed: number
): ConsistentPrediction {
  const validationErrors: string[] = [];
  
  const avgGoalsPerGame = h2hFixtures.length > 0 
    ? (h2hSummary.goals.home + h2hSummary.goals.away) / h2hFixtures.length
    : 2.5;
  
  const homeAdvantage = 0.15;
  
  const homeAttack = homeStrength;
  const awayAttack = awayStrength;
  
  let homeExpectedGoals = avgGoalsPerGame * (1 + homeAdvantage) * (homeAttack / ((homeAttack + awayAttack) / 2));
  let awayExpectedGoals = avgGoalsPerGame * (1 - homeAdvantage * 0.5) * (awayAttack / ((homeAttack + awayAttack) / 2));
  
  const strengthDiff = Math.abs(homeStrength - awayStrength);
  if (strengthDiff > 0.3) {
    const stronger = homeStrength > awayStrength ? 'home' : 'away';
    if (stronger === 'home') {
      homeExpectedGoals *= 1.15;
      awayExpectedGoals *= 0.85;
    } else {
      awayExpectedGoals *= 1.15;
      homeExpectedGoals *= 0.85;
    }
  }
  
  homeExpectedGoals = Math.max(0.3, Math.min(3.5, homeExpectedGoals));
  awayExpectedGoals = Math.max(0.3, Math.min(3.5, awayExpectedGoals));
  
  const homeWinsFromH2H = h2hFixtures.filter(f => f.home_score > f.away_score).length;
  const awayWinsFromH2H = h2hFixtures.filter(f => f.away_score > f.home_score).length;
  const drawsFromH2H = h2hFixtures.filter(f => f.home_score === f.away_score).length;
  const totalH2H = h2hFixtures.length || 1;
  
  const h2hHomeWinRate = (homeWinsFromH2H + drawsFromH2H * 0.3) / totalH2H;
  const h2hAwayWinRate = (awayWinsFromH2H + drawsFromH2H * 0.3) / totalH2H;
  
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
  
  homeWinProb = homeWinProb * 0.7 + h2hHomeWinRate * 0.3;
  awayWinProb = awayWinProb * 0.7 + h2hAwayWinRate * 0.3;
  drawProb = drawProb * 0.7 + (1 - h2hHomeWinRate - h2hAwayWinRate) * 0.3;
  
  const totalProb = homeWinProb + drawProb + awayWinProb;
  homeWinProb = (homeWinProb / totalProb) * 100;
  drawProb = (drawProb / totalProb) * 100;
  awayWinProb = (awayWinProb / totalProb) * 100;
  
  let predictedWinner: 'home' | 'draw' | 'away';
  if (homeWinProb >= drawProb && homeWinProb >= awayWinProb) {
    predictedWinner = 'home';
  } else if (awayWinProb >= drawProb && awayWinProb >= homeWinProb) {
    predictedWinner = 'away';
  } else {
    predictedWinner = 'draw';
  }
  
  const scoreProbs: { score: string; home: number; away: number; prob: number }[] = [];
  for (let h = 0; h <= 5; h++) {
    for (let a = 0; a <= 5; a++) {
      const prob = poisson(h, homeExpectedGoals) * poisson(a, awayExpectedGoals);
      scoreProbs.push({ score: `${h}-${a}`, home: h, away: a, prob });
    }
  }
  scoreProbs.sort((a, b) => b.prob - a.prob);
  
  let correctHomeGoals: number;
  let correctAwayGoals: number;
  
  if (predictedWinner === 'home') {
    const homeWinningScores = scoreProbs.filter(s => s.home > s.away);
    if (homeWinningScores.length > 0) {
      const selected = homeWinningScores[Math.floor(seededRandom(seed + 100) * Math.min(3, homeWinningScores.length))];
      correctHomeGoals = selected.home;
      correctAwayGoals = selected.away;
    } else {
      correctHomeGoals = Math.round(homeExpectedGoals);
      correctAwayGoals = Math.round(awayExpectedGoals) - 1;
    }
  } else if (predictedWinner === 'away') {
    const awayWinningScores = scoreProbs.filter(s => s.away > s.home);
    if (awayWinningScores.length > 0) {
      const selected = awayWinningScores[Math.floor(seededRandom(seed + 100) * Math.min(3, awayWinningScores.length))];
      correctHomeGoals = selected.home;
      correctAwayGoals = selected.away;
    } else {
      correctHomeGoals = Math.round(homeExpectedGoals) - 1;
      correctAwayGoals = Math.round(awayExpectedGoals);
    }
  } else {
    const drawScores = scoreProbs.filter(s => s.home === s.away);
    if (drawScores.length > 0) {
      const selected = drawScores[Math.floor(seededRandom(seed + 100) * Math.min(3, drawScores.length))];
      correctHomeGoals = selected.home;
      correctAwayGoals = selected.away;
    } else {
      const avgGoals = Math.round((homeExpectedGoals + awayExpectedGoals) / 2);
      correctHomeGoals = avgGoals;
      correctAwayGoals = avgGoals;
    }
  }
  
  correctHomeGoals = Math.max(0, correctHomeGoals);
  correctAwayGoals = Math.max(0, correctAwayGoals);
  
  const totalExpectedGoals = homeExpectedGoals + awayExpectedGoals;
  const overUnder: 'over' | 'under' = totalExpectedGoals > 2.5 ? 'over' : 'under';
  
  let overUnderProb = 0;
  for (let h = 0; h <= 6; h++) {
    for (let a = 0; a <= 6; a++) {
      if (h + a > 2.5) {
        overUnderProb += poisson(h, homeExpectedGoals) * poisson(a, awayExpectedGoals);
      }
    }
  }
  if (overUnder === 'under') {
    overUnderProb = 100 - overUnderProb;
  }
  
  const btts: 'yes' | 'no' = homeExpectedGoals > 0.5 && awayExpectedGoals > 0.5 ? 'yes' : 'no';
  
  let bttsProb = 0;
  for (let h = 1; h <= 5; h++) {
    for (let a = 1; a <= 5; a++) {
      bttsProb += poisson(h, homeExpectedGoals) * poisson(a, awayExpectedGoals);
    }
  }
  if (btts === 'no') {
    bttsProb = 100 - bttsProb;
  }
  
  const firstHalfHomeGoals = homeExpectedGoals * 0.45;
  const firstHalfAwayGoals = awayExpectedGoals * 0.45;
  
  let firstHalfHomeWinProb = 0;
  let firstHalfDrawProb = 0;
  let firstHalfAwayWinProb = 0;
  
  for (let h = 0; h <= 4; h++) {
    for (let a = 0; a <= 4; a++) {
      const prob = poisson(h, firstHalfHomeGoals) * poisson(a, firstHalfAwayGoals);
      if (h > a) firstHalfHomeWinProb += prob;
      else if (a > h) firstHalfAwayWinProb += prob;
      else firstHalfDrawProb += prob;
    }
  }
  
  let firstHalfWinner: 'home' | 'draw' | 'away' | null = null;
  let firstHalfScore: string | null = null;
  let firstHalfProb: number | null = null;
  
  if (firstHalfHomeWinProb > firstHalfDrawProb && firstHalfHomeWinProb > firstHalfAwayWinProb) {
    firstHalfWinner = 'home';
    firstHalfProb = Math.round(firstHalfHomeWinProb * 100);
  } else if (firstHalfAwayWinProb > firstHalfDrawProb && firstHalfAwayWinProb > firstHalfHomeWinProb) {
    firstHalfWinner = 'away';
    firstHalfProb = Math.round(firstHalfAwayWinProb * 100);
  } else {
    firstHalfWinner = 'draw';
    firstHalfProb = Math.round(firstHalfDrawProb * 100);
  }
  
  const firstHalfScoreGoals = [Math.round(firstHalfHomeGoals), Math.round(firstHalfAwayGoals)];
  firstHalfScore = `${firstHalfScoreGoals[0]}-${firstHalfScoreGoals[1]}`;
  
  const confidence = Math.min(95, Math.max(45, Math.round(
    Math.abs(homeWinProb - awayWinProb) * 0.6 +
    Math.min(30, h2hFixtures.length * 3) * 0.2 +
    (100 - Math.abs(homeExpectedGoals - awayExpectedGoals) * 20) * 0.2
  )));
  
  const insights = generateInsights(
    homeName,
    awayName,
    homeExpectedGoals,
    awayExpectedGoals,
    h2hFixtures,
    h2hSummary,
    predictedWinner,
    homeWinProb,
    drawProb,
    awayWinProb
  );
  
  const validationPassed = validatePrediction(
    predictedWinner,
    homeWinProb,
    drawProb,
    awayWinProb,
    correctHomeGoals,
    correctAwayGoals,
    overUnder,
    btts,
    validationErrors
  );
  
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
    overUnderProb: Math.round(overUnderProb * 100),
    btts,
    bttsProb: Math.round(bttsProb * 100),
    expectedHomeGoals: Math.round(homeExpectedGoals * 10) / 10,
    expectedAwayGoals: Math.round(awayExpectedGoals * 10) / 10,
    totalGoals: Math.round(totalExpectedGoals * 10) / 10,
    firstHalfWinner,
    firstHalfScore,
    firstHalfProb,
    insights,
    validationPassed,
    validationErrors
  };
}

function generateInsights(
  homeName: string,
  awayName: string,
  homeExpectedGoals: number,
  awayExpectedGoals: number,
  h2hFixtures: H2HFixture[],
  h2hSummary: H2HSummary,
  predictedWinner: 'home' | 'draw' | 'away',
  homeWinProb: number,
  drawProb: number,
  awayWinProb: number
): string[] {
  const insights: string[] = [];
  
  if (h2hFixtures.length > 0) {
    const recentH2H = h2hFixtures.slice(0, 5);
    const overs = recentH2H.filter(m => m.home_score + m.away_score > 2.5).length;
    const bttsMatches = recentH2H.filter(m => m.home_score > 0 && m.away_score > 0).length;
    
    if (overs >= 3) {
      insights.push(`Last ${h2hFixtures.length} H2H meetings: ${overs}/${recentH2H.length} had 3+ goals`);
    }
    if (bttsMatches >= 3) {
      insights.push(`Both teams scored in ${bttsMatches}/${recentH2H.length} recent meetings`);
    }
    
    if (h2hSummary.home_wins > h2hSummary.away_wins) {
      insights.push(`${homeName} has historically dominated with ${h2hSummary.home_wins} wins in ${h2hFixtures.length} meetings`);
    } else if (h2hSummary.away_wins > h2hSummary.home_wins) {
      insights.push(`${awayName} has historically dominated with ${h2hSummary.away_wins} wins in ${h2hFixtures.length} meetings`);
    } else {
      insights.push(`Historically even: ${h2hFixtures.length} meetings split ${h2hSummary.home_wins}-${h2hSummary.draws}-${h2hSummary.away_wins}`);
    }
  } else {
    insights.push('No previous meetings between these teams');
  }
  
  if (homeExpectedGoals > awayExpectedGoals) {
    insights.push(`${homeName} expected to score ${homeExpectedGoals.toFixed(1)} goals based on attack strength`);
    insights.push(`${awayName} expected to score ${awayExpectedGoals.toFixed(1)} goals`);
  } else {
    insights.push(`${awayName} expected to score ${awayExpectedGoals.toFixed(1)} goals based on attack strength`);
    insights.push(`${homeName} expected to score ${homeExpectedGoals.toFixed(1)} goals`);
  }
  
  const probInsights: { label: string; prob: number }[] = [
    { label: homeName, prob: homeWinProb },
    { label: 'Draw', prob: drawProb },
    { label: awayName, prob: awayWinProb }
  ];
  probInsights.sort((a, b) => b.prob - a.prob);
  
  insights.push(`Most likely outcome: ${probInsights[0].label} win at ${probInsights[0].prob.toFixed(0)}%`);
  insights.push(`Expected total goals: ${(homeExpectedGoals + awayExpectedGoals).toFixed(1)}`);
  
  return insights.slice(0, 5);
}

function validatePrediction(
  predictedWinner: 'home' | 'draw' | 'away',
  homeWin: number,
  draw: number,
  awayWin: number,
  homeGoals: number,
  awayGoals: number,
  overUnder: 'over' | 'under',
  btts: 'yes' | 'no',
  errors: string[]
): boolean {
  let passed = true;
  
  const probTotal = homeWin + draw + awayWin;
  if (probTotal < 98 || probTotal > 102) {
    errors.push(`Probabilities sum to ${probTotal.toFixed(0)}%, expected ~100%`);
    passed = false;
  }
  
  if (predictedWinner === 'home' && homeGoals <= awayGoals) {
    errors.push('Winner is home but correct score shows home losing or draw');
    passed = false;
  } else if (predictedWinner === 'away' && awayGoals <= homeGoals) {
    errors.push('Winner is away but correct score shows away losing or draw');
    passed = false;
  } else if (predictedWinner === 'draw' && homeGoals !== awayGoals) {
    errors.push('Winner is draw but correct score shows different goals');
    passed = false;
  }
  
  const totalGoals = homeGoals + awayGoals;
  if (overUnder === 'over' && totalGoals <= 2) {
    errors.push('Over 2.5 predicted but correct score has <= 2 goals');
    passed = false;
  } else if (overUnder === 'under' && totalGoals > 2) {
    errors.push('Under 2.5 predicted but correct score has 3+ goals');
    passed = false;
  }
  
  if (btts === 'yes' && (homeGoals === 0 || awayGoals === 0)) {
    errors.push('BTTS Yes predicted but correct score has shutout');
    passed = false;
  } else if (btts === 'no' && homeGoals > 0 && awayGoals > 0) {
    errors.push('BTTS No predicted but correct score has goals for both teams');
    passed = false;
  }
  
  return passed;
}

export function generateMatchPrediction(
  homeName: string,
  awayName: string,
  h2hFixtures: H2HFixture[],
  h2hSummary: H2HSummary,
  homeStrength: number = 0.5,
  awayStrength: number = 0.5,
  matchId: number = 0
): ConsistentPrediction {
  const seed = matchId || Math.floor(Math.random() * 1000000);
  
  const prediction = generateConsistentPrediction(
    homeName,
    awayName,
    h2hFixtures,
    h2hSummary,
    homeStrength,
    awayStrength,
    seed
  );
  
  return prediction;
}

export interface StoredPrediction {
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
  btts: 'yes' | 'no';
  created_at: string;
  was_correct?: boolean;
  actual_home_score?: number;
  actual_away_score?: number;
  actual_winner?: 'home' | 'draw' | 'away';
}

export function savePredictionToStorage(prediction: ConsistentPrediction, matchData: {
  matchId: number;
  matchDate: string;
  homeTeam: string;
  awayTeam: string;
  competition: string;
}): void {
  try {
    const stored = localStorage.getItem('xgenius_predictions');
    const predictions: StoredPrediction[] = stored ? JSON.parse(stored) : [];
    
    const existingIndex = predictions.findIndex(p => p.match_id === matchData.matchId);
    
    const newPrediction: StoredPrediction = {
      match_id: matchData.matchId,
      match_date: matchData.matchDate,
      home_team: matchData.homeTeam,
      away_team: matchData.awayTeam,
      competition: matchData.competition,
      predicted_winner: prediction.predictedWinner,
      predicted_home_score: prediction.homeGoals,
      predicted_away_score: prediction.awayGoals,
      confidence: prediction.confidence,
      home_win_prob: prediction.homeWin,
      draw_prob: prediction.draw,
      away_win_prob: prediction.awayWin,
      over_under: prediction.overUnder,
      btts: prediction.btts,
      created_at: new Date().toISOString()
    };
    
    if (existingIndex >= 0) {
      predictions[existingIndex] = newPrediction;
    } else {
      predictions.push(newPrediction);
    }
    
    localStorage.setItem('xgenius_predictions', JSON.stringify(predictions));
  } catch (e) {
    console.error('Failed to save prediction:', e);
  }
}

export function getStoredPredictions(): StoredPrediction[] {
  try {
    const stored = localStorage.getItem('xgenius_predictions');
    return stored ? JSON.parse(stored) : [];
  } catch (e) {
    console.error('Failed to get predictions:', e);
    return [];
  }
}

export function updatePredictionResult(matchId: number, homeScore: number, awayScore: number): StoredPrediction | null {
  try {
    const stored = localStorage.getItem('xgenius_predictions');
    const predictions: StoredPrediction[] = stored ? JSON.parse(stored) : [];
    
    const predictionIndex = predictions.findIndex(p => p.match_id === matchId);
    if (predictionIndex < 0) return null;
    
    const prediction = predictions[predictionIndex];
    
    let actualWinner: 'home' | 'draw' | 'away';
    if (homeScore > awayScore) actualWinner = 'home';
    else if (awayScore > homeScore) actualWinner = 'away';
    else actualWinner = 'draw';
    
    const wasCorrect = prediction.predicted_winner === actualWinner;
    
    prediction.was_correct = wasCorrect;
    prediction.actual_home_score = homeScore;
    prediction.actual_away_score = awayScore;
    prediction.actual_winner = actualWinner;
    
    predictions[predictionIndex] = prediction;
    localStorage.setItem('xgenius_predictions', JSON.stringify(predictions));
    
    return prediction;
  } catch (e) {
    console.error('Failed to update prediction result:', e);
    return null;
  }
}

export interface DashboardStats {
  yesterdayAccuracy: number;
  thisWeekAccuracy: number;
  totalPredictions: number;
  roi: number;
  weeklyPerformance: { [key: string]: number };
  leagueBreakdown: { [key: string]: { accuracy: number; total: number; correct: number } };
  lastUpdated: string;
  highConfidenceMatches: StoredPrediction[];
}

export function calculateDashboardStats(): DashboardStats {
  const predictions = getStoredPredictions();
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayStr = yesterday.toISOString().split('T')[0];
  
  const today = new Date();
  const dayOfWeek = today.getDay();
  const monday = new Date(today);
  monday.setDate(today.getDate() - ((dayOfWeek + 6) % 7));
  const mondayStr = monday.toISOString().split('T')[0];
  
  const completedPredictions = predictions.filter(p => p.was_correct !== undefined);
  const yesterdayPredictions = predictions.filter(p => p.match_date === yesterdayStr && p.was_correct !== undefined);
  const weekPredictions = predictions.filter(p => p.match_date >= mondayStr && p.was_correct !== undefined);
  
  const yesterdayCorrect = yesterdayPredictions.filter(p => p.was_correct).length;
  const weekCorrect = weekPredictions.filter(p => p.was_correct).length;
  
  const yesterdayAccuracy = yesterdayPredictions.length > 0 
    ? Math.round((yesterdayCorrect / yesterdayPredictions.length) * 100) 
    : 0;
  
  const thisWeekAccuracy = weekPredictions.length > 0 
    ? Math.round((weekCorrect / weekPredictions.length) * 100) 
    : 0;
  
  const totalPredictions = completedPredictions.length;
  
  let roi = 0;
  if (completedPredictions.length > 0) {
    const correctCount = completedPredictions.filter(p => p.was_correct).length;
    const drawCount = completedPredictions.filter(p => 
      p.was_correct === false && 
      p.actual_home_score === p.actual_away_score
    ).length;
    const unitStake = completedPredictions.length;
    const unitsWon = correctCount * 0.9;
    roi = Math.round(((unitsWon - unitStake) / unitStake) * 1000) / 10;
  }
  
  const weeklyPerformance: { [key: string]: number } = {};
  const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  
  for (const pred of completedPredictions) {
    const date = new Date(pred.match_date);
    const dayName = dayNames[date.getDay()];
    
    if (!weeklyPerformance[dayName]) {
      weeklyPerformance[dayName] = { total: 0, correct: 0 }.total;
    }
  }
  
  for (const day of dayNames) {
    const dayPreds = completedPredictions.filter(p => {
      const date = new Date(p.match_date);
      return dayNames[date.getDay()] === day;
    });
    
    if (dayPreds.length > 0) {
      const correct = dayPreds.filter(p => p.was_correct).length;
      weeklyPerformance[day] = Math.round((correct / dayPreds.length) * 100);
    } else {
      weeklyPerformance[day] = 0;
    }
  }
  
  const leagueBreakdown: { [key: string]: { accuracy: number; total: number; correct: number } } = {};
  for (const pred of completedPredictions) {
    if (!leagueBreakdown[pred.competition]) {
      leagueBreakdown[pred.competition] = { accuracy: 0, total: 0, correct: 0 };
    }
    leagueBreakdown[pred.competition].total++;
    if (pred.was_correct) {
      leagueBreakdown[pred.competition].correct++;
    }
  }
  
  for (const league in leagueBreakdown) {
    const data = leagueBreakdown[league];
    data.accuracy = Math.round((data.correct / data.total) * 100);
  }
  
  const highConfidenceMatches = predictions
    .filter(p => p.confidence >= 60 && !p.was_correct)
    .sort((a, b) => b.confidence - a.confidence)
    .slice(0, 10);
  
  return {
    yesterdayAccuracy,
    thisWeekAccuracy,
    totalPredictions,
    roi,
    weeklyPerformance,
    leagueBreakdown,
    lastUpdated: new Date().toISOString(),
    highConfidenceMatches
  };
}

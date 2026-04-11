export interface Prediction {
  predictedWinner: 'home' | 'draw' | 'away';
  homeWin: number;
  draw: number;
  awayWin: number;
  correctScore: string;
  homeGoals: number;
  awayGoals: number;
  confidence: number;
  overUnder: 'over' | 'under';
  btts: 'yes' | 'no';
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

export function generatePrediction(homeName: string, awayName: string, seed: number): Prediction {
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

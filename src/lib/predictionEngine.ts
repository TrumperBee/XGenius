export interface TeamStats {
  teamId: number;
  teamName: string;
  leagueId: number;
  leagueName: string;
  gamesPlayed: number;
  wins: number;
  draws: number;
  losses: number;
  goalsFor: number;
  goalsAgainst: number;
  goalDifference: number;
  cleanSheets: number;
  homeRecord?: { played: number; wins: number; draws: number; losses: number; goalsFor: number; goalsAgainst: number };
  awayRecord?: { played: number; wins: number; draws: number; losses: number; goalsFor: number; goalsAgainst: number };
  form?: string[];
  position?: number;
}

export interface H2HFxture {
  id: number;
  date: string;
  competition: string;
  home_team: { name: string };
  away_team: { name: string };
  home_score: number;
  away_score: number;
}

export interface FormFixture {
  id: number;
  date: string;
  league: string;
  opponent: string;
  isHome: boolean;
  home_score: number;
  away_score: number;
  goalsFor: number;
  goalsAgainst: number;
  result: string;
}

export interface PredictionInput {
  homeTeam: { id: number; name: string };
  awayTeam: { id: number; name: string };
  league: { id: number; name: string };
  homeStats: TeamStats | null;
  awayStats: TeamStats | null;
  homeForm: FormFixture[] | null;
  awayForm: FormFixture[] | null;
  h2hFixtures: H2HFxture[];
  h2hSummary: { total: number; home_wins: number; away_wins: number; draws: number; goals: { home: number; away: number } };
  injuries?: { homeInjured: string[]; awayInjured: string[] };
}

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
  overUnderProb: number;
  btts: 'yes' | 'no';
  bttsProb: number;
  expectedHomeGoals: number;
  expectedAwayGoals: number;
  totalGoals: number;
  firstHalfWinner: 'home' | 'draw' | 'away';
  firstHalfScore: string;
  firstHalfProb: number;
  homeAttackStrength: number;
  awayAttackStrength: number;
  homeDefenseStrength: number;
  awayDefenseStrength: number;
  insights: string[];
  dataQuality: 'high' | 'medium' | 'low';
  missingData: string[];
}

function poisson(k: number, lambda: number): number {
  if (lambda <= 0) return k === 0 ? 1 : 0;
  if (lambda > 700) lambda = 700;
  let result = Math.exp(-lambda);
  for (let i = 1; i <= k; i++) {
    result *= lambda / i;
  }
  return result;
}

export function generatePrediction(input: PredictionInput): Prediction {
  const missingData: string[] = [];
  const insights: string[] = [];

  const avgLeagueGoals = 2.6;
  const avgLeagueHomeGoals = 1.45;
  const avgLeagueAwayGoals = 1.15;

  let homeAttack = 1.0;
  let homeDefense = 1.0;
  let awayAttack = 1.0;
  let awayDefense = 1.0;

  if (input.homeStats && input.homeStats.homeRecord && input.homeStats.homeRecord.played > 0) {
    homeAttack = (input.homeStats.homeRecord.goalsFor / input.homeStats.homeRecord.played) / avgLeagueHomeGoals;
    homeDefense = (input.homeStats.homeRecord.goalsAgainst / input.homeStats.homeRecord.played) / avgLeagueHomeGoals;
  } else if (input.homeStats && input.homeStats.gamesPlayed > 0) {
    homeAttack = (input.homeStats.goalsFor / input.homeStats.gamesPlayed) / avgLeagueGoals;
    homeDefense = (input.homeStats.goalsAgainst / input.homeStats.gamesPlayed) / avgLeagueGoals;
  } else {
    missingData.push(`${input.homeTeam.name} season stats`);
  }

  if (input.awayStats && input.awayStats.awayRecord && input.awayStats.awayRecord.played > 0) {
    awayAttack = (input.awayStats.awayRecord.goalsFor / input.awayStats.awayRecord.played) / avgLeagueAwayGoals;
    awayDefense = (input.awayStats.awayRecord.goalsAgainst / input.awayStats.awayRecord.played) / avgLeagueAwayGoals;
  } else if (input.awayStats && input.awayStats.gamesPlayed > 0) {
    awayAttack = (input.awayStats.goalsFor / input.awayStats.gamesPlayed) / avgLeagueGoals;
    awayDefense = (input.awayStats.goalsAgainst / input.awayStats.gamesPlayed) / avgLeagueGoals;
  } else {
    missingData.push(`${input.awayTeam.name} season stats`);
  }

  homeAttack = Math.max(0.3, Math.min(2.5, homeAttack));
  homeDefense = Math.max(0.3, Math.min(2.5, homeDefense));
  awayAttack = Math.max(0.3, Math.min(2.5, awayAttack));
  awayDefense = Math.max(0.3, Math.min(2.5, awayDefense));

  let expectedHomeGoals = homeAttack * awayDefense * avgLeagueHomeGoals;
  let expectedAwayGoals = awayAttack * homeDefense * avgLeagueAwayGoals;

  if (input.homeForm && input.homeForm.length >= 3) {
    const recentGoalsFor = input.homeForm.slice(0, 5).reduce((s, f) => s + f.goalsFor, 0) / Math.min(5, input.homeForm.length);
    const recentGoalsAgainst = input.homeForm.slice(0, 5).reduce((s, f) => s + f.goalsAgainst, 0) / Math.min(5, input.homeForm.length);
    const formAttack = recentGoalsFor / avgLeagueHomeGoals;
    const formDefense = recentGoalsAgainst / avgLeagueHomeGoals;
    expectedHomeGoals = expectedHomeGoals * 0.8 + (formAttack * awayDefense * avgLeagueHomeGoals) * 0.2;
  } else if (!input.homeForm) {
    missingData.push(`${input.homeTeam.name} recent form`);
  }

  if (input.awayForm && input.awayForm.length >= 3) {
    const recentGoalsFor = input.awayForm.slice(0, 5).reduce((s, f) => s + f.goalsFor, 0) / Math.min(5, input.awayForm.length);
    const recentGoalsAgainst = input.awayForm.slice(0, 5).reduce((s, f) => s + f.goalsAgainst, 0) / Math.min(5, input.awayForm.length);
    const formAttack = recentGoalsFor / avgLeagueAwayGoals;
    const formDefense = recentGoalsAgainst / avgLeagueAwayGoals;
    expectedAwayGoals = expectedAwayGoals * 0.8 + (formAttack * homeDefense * avgLeagueAwayGoals) * 0.2;
  } else if (!input.awayForm) {
    missingData.push(`${input.awayTeam.name} recent form`);
  }

  if (input.h2hSummary.total >= 2) {
    const h2hAvgHomeGoals = input.h2hFixtures.filter(f => f.home_team.name === input.homeTeam.name).length > 0
      ? input.h2hFixtures.filter(f => f.home_team.name === input.homeTeam.name).reduce((s, f) => s + f.home_score, 0) / input.h2hFixtures.filter(f => f.home_team.name === input.homeTeam.name).length
      : input.h2hSummary.goals.home / input.h2hSummary.total;

    const h2hAvgAwayGoals = input.h2hFixtures.filter(f => f.away_team.name === input.awayTeam.name).length > 0
      ? input.h2hFixtures.filter(f => f.away_team.name === input.awayTeam.name).reduce((s, f) => s + f.away_score, 0) / input.h2hFixtures.filter(f => f.away_team.name === input.awayTeam.name).length
      : input.h2hSummary.goals.away / input.h2hSummary.total;

    const h2hWeight = Math.min(0.15, input.h2hSummary.total * 0.02);
    expectedHomeGoals = expectedHomeGoals * (1 - h2hWeight) + h2hAvgHomeGoals * h2hWeight;
    expectedAwayGoals = expectedAwayGoals * (1 - h2hWeight) + h2hAvgAwayGoals * h2hWeight;
  }

  if (input.injuries?.homeInjured && input.injuries.homeInjured.length > 0) {
    const keyPlayers = input.injuries.homeInjured.length;
    expectedHomeGoals *= Math.max(0.7, 1 - keyPlayers * 0.1);
    insights.push(`${input.homeTeam.name} missing ${keyPlayers} key player(s)`);
  }
  if (input.injuries?.awayInjured && input.injuries.awayInjured.length > 0) {
    const keyPlayers = input.injuries.awayInjured.length;
    expectedAwayGoals *= Math.max(0.7, 1 - keyPlayers * 0.1);
    insights.push(`${input.awayTeam.name} missing ${keyPlayers} key player(s)`);
  }

  expectedHomeGoals = Math.max(0.2, Math.min(4.0, expectedHomeGoals));
  expectedAwayGoals = Math.max(0.2, Math.min(4.0, expectedAwayGoals));

  let homeWinProb = 0;
  let drawProb = 0;
  let awayWinProb = 0;

  for (let h = 0; h <= 8; h++) {
    for (let a = 0; a <= 8; a++) {
      const jointProb = poisson(h, expectedHomeGoals) * poisson(a, expectedAwayGoals);
      if (h > a) homeWinProb += jointProb;
      else if (a > h) awayWinProb += jointProb;
      else drawProb += jointProb;
    }
  }

  const totalProb = homeWinProb + drawProb + awayWinProb;
  homeWinProb = (homeWinProb / totalProb) * 100;
  drawProb = (drawProb / totalProb) * 100;
  awayWinProb = (awayWinProb / totalProb) * 100;

  let predictedWinner: 'home' | 'draw' | 'away';
  if (homeWinProb >= drawProb && homeWinProb >= awayWinProb) predictedWinner = 'home';
  else if (awayWinProb >= drawProb && awayWinProb >= homeWinProb) predictedWinner = 'away';
  else predictedWinner = 'draw';

  const scoreProbs: { home: number; away: number; prob: number }[] = [];
  for (let h = 0; h <= 6; h++) {
    for (let a = 0; a <= 6; a++) {
      scoreProbs.push({ home: h, away: a, prob: poisson(h, expectedHomeGoals) * poisson(a, expectedAwayGoals) });
    }
  }
  scoreProbs.sort((a, b) => b.prob - a.prob);

  let correctHomeGoals: number;
  let correctAwayGoals: number;

  if (predictedWinner === 'home') {
    const winning = scoreProbs.filter(s => s.home > s.away);
    if (winning.length > 0) {
      correctHomeGoals = winning[0].home;
      correctAwayGoals = winning[0].away;
    } else {
      correctHomeGoals = Math.round(expectedHomeGoals);
      correctAwayGoals = Math.max(0, Math.round(expectedAwayGoals) - 1);
    }
  } else if (predictedWinner === 'away') {
    const winning = scoreProbs.filter(s => s.away > s.home);
    if (winning.length > 0) {
      correctHomeGoals = winning[0].home;
      correctAwayGoals = winning[0].away;
    } else {
      correctHomeGoals = Math.max(0, Math.round(expectedHomeGoals) - 1);
      correctAwayGoals = Math.round(expectedAwayGoals);
    }
  } else {
    const draws = scoreProbs.filter(s => s.home === s.away);
    if (draws.length > 0) {
      correctHomeGoals = draws[0].home;
      correctAwayGoals = draws[0].away;
    } else {
      const avg = Math.round((expectedHomeGoals + expectedAwayGoals) / 2);
      correctHomeGoals = avg;
      correctAwayGoals = avg;
    }
  }

  let overUnderProb = 0;
  for (let h = 0; h <= 8; h++) {
    for (let a = 0; a <= 8; a++) {
      if (h + a > 2.5) {
        overUnderProb += poisson(h, expectedHomeGoals) * poisson(a, expectedAwayGoals);
      }
    }
  }

  const overUnder: 'over' | 'under' = overUnderProb > 0.5 ? 'over' : 'under';
  if (overUnder === 'under') overUnderProb = 1 - overUnderProb;

  let bttsProb = 0;
  for (let h = 1; h <= 8; h++) {
    for (let a = 1; a <= 8; a++) {
      bttsProb += poisson(h, expectedHomeGoals) * poisson(a, expectedAwayGoals);
    }
  }
  const btts: 'yes' | 'no' = bttsProb > 0.5 ? 'yes' : 'no';
  if (btts === 'no') bttsProb = 1 - bttsProb;

  const fhHome = expectedHomeGoals * 0.42;
  const fhAway = expectedAwayGoals * 0.42;
  let fhHomeWin = 0, fhDraw = 0, fhAwayWin = 0;
  for (let h = 0; h <= 3; h++) {
    for (let a = 0; a <= 3; a++) {
      const p = poisson(h, fhHome) * poisson(a, fhAway);
      if (h > a) fhHomeWin += p;
      else if (a > h) fhAwayWin += p;
      else fhDraw += p;
    }
  }
  const fhTotal = fhHomeWin + fhDraw + fhAwayWin;
  let firstHalfWinner: 'home' | 'draw' | 'away';
  let firstHalfProb: number;
  if (fhHomeWin > fhDraw && fhHomeWin > fhAwayWin) { firstHalfWinner = 'home'; firstHalfProb = fhHomeWin / fhTotal * 100; }
  else if (fhAwayWin > fhDraw && fhAwayWin > fhHomeWin) { firstHalfWinner = 'away'; firstHalfProb = fhAwayWin / fhTotal * 100; }
  else { firstHalfWinner = 'draw'; firstHalfProb = fhDraw / fhTotal * 100; }
  const firstHalfScore = `${Math.round(fhHome)}-${Math.round(fhAway)}`;

  let dataQuality: 'high' | 'medium' | 'low' = 'high';
  if (missingData.length > 2) dataQuality = 'low';
  else if (missingData.length > 0) dataQuality = 'medium';

  const probSpread = Math.max(homeWinProb, drawProb, awayWinProb) - Math.min(homeWinProb, drawProb, awayWinProb);
  const confidence = Math.min(95, Math.max(40, Math.round(
    probSpread * 0.5 +
    (dataQuality === 'high' ? 30 : dataQuality === 'medium' ? 20 : 10) +
    Math.min(10, Math.abs(expectedHomeGoals - expectedAwayGoals) * 5)
  )));

  if (input.homeStats?.position) insights.push(`${input.homeTeam.name} ${input.homeStats.position} in ${input.homeStats.leagueName}`);
  if (input.awayStats?.position) insights.push(`${input.awayTeam.name} ${input.awayStats.position} in ${input.awayStats.leagueName}`);

  if (input.homeForm && input.homeForm.length >= 3) {
    const last5 = input.homeForm.slice(0, 5);
    const pts = last5.reduce((s, f) => s + (f.result === 'W' ? 3 : f.result === 'D' ? 1 : 0), 0);
    insights.push(`${input.homeTeam.name} form: ${last5.map(f => f.result).join(' ')} (${pts}/15 pts)`);
  }
  if (input.awayForm && input.awayForm.length >= 3) {
    const last5 = input.awayForm.slice(0, 5);
    const pts = last5.reduce((s, f) => s + (f.result === 'W' ? 3 : f.result === 'D' ? 1 : 0), 0);
    insights.push(`${input.awayTeam.name} form: ${last5.map(f => f.result).join(' ')} (${pts}/15 pts)`);
  }

  if (input.h2hSummary.total >= 2) {
    const h2hHome = input.h2hFixtures.filter(f => f.home_team.name === input.homeTeam.name).length;
    const h2hAway = input.h2hFixtures.filter(f => f.away_team.name === input.awayTeam.name).length;
    if (h2hHome > 0 || h2hAway > 0) {
      insights.push(`H2H: ${input.homeTeam.name} ${input.h2hSummary.home_wins}W-${input.h2hSummary.draws}D-${input.h2hSummary.away_wins}L vs ${input.awayTeam.name}`);
    }
  }

  insights.push(`Expected goals: ${expectedHomeGoals.toFixed(1)} - ${expectedAwayGoals.toFixed(1)}`);

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
    expectedHomeGoals: Math.round(expectedHomeGoals * 10) / 10,
    expectedAwayGoals: Math.round(expectedAwayGoals * 10) / 10,
    totalGoals: Math.round((expectedHomeGoals + expectedAwayGoals) * 10) / 10,
    firstHalfWinner,
    firstHalfScore,
    firstHalfProb: Math.round(firstHalfProb),
    homeAttackStrength: Math.round(homeAttack * 100) / 100,
    awayAttackStrength: Math.round(awayAttack * 100) / 100,
    homeDefenseStrength: Math.round(homeDefense * 100) / 100,
    awayDefenseStrength: Math.round(awayDefense * 100) / 100,
    insights,
    dataQuality,
    missingData
  };
}

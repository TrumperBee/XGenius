import { Team, Match, Prediction, TeamForm, HeadToHead, Injury } from '@/types';
import { mockTeamForms, mockHeadToHeads, mockInjuries } from '@/data/mockData';

const WEIGHTS = {
  form: 0.25,
  h2h: 0.15,
  homeAway: 0.20,
  attack: 0.15,
  defense: 0.15,
  elo: 0.10,
};

function sigmoid(x: number): number {
  return 1 / (1 + Math.exp(-x));
}

function poisson(goals: number, lambda: number): number {
  return (Math.pow(lambda, goals) * Math.exp(-lambda)) / factorial(goals);
}

function factorial(n: number): number {
  if (n <= 1) return 1;
  let result = 1;
  for (let i = 2; i <= n; i++) result *= i;
  return result;
}

function calculateExpectedGoals(team: Team, opponent: Team, isHome: boolean, teamForms: TeamForm[], leagueAvgGoals: number): number {
  const form = teamForms.find(f => f.team_id === team.id);
  const attackStrength = form ? form.goals_scored / 5 : leagueAvgGoals;
  const defenseStrength = form ? form.goals_conceded / 5 : leagueAvgGoals;
  
  const baseLambda = isHome ? leagueAvgGoals * 1.1 : leagueAvgGoals * 0.9;
  const attackMultiplier = attackStrength / leagueAvgGoals;
  const defenseMultiplier = leagueAvgGoals / defenseStrength;
  
  return Math.max(0.3, Math.min(4, baseLambda * attackMultiplier * defenseMultiplier));
}

function calculateDrawProbability(expectedHomeGoals: number, expectedAwayGoals: number): number {
  let drawProb = 0;
  for (let i = 0; i <= 5; i++) {
    const homeProb = poisson(i, expectedHomeGoals);
    const awayProb = poisson(i, expectedAwayGoals);
    drawProb += homeProb * awayProb;
  }
  return Math.min(0.5, drawProb);
}

export function generatePrediction(
  match: Match,
  homeTeam: Team,
  awayTeam: Team,
  teamForms: TeamForm[] = mockTeamForms,
  h2hMatches: HeadToHead[] = mockHeadToHeads,
  injuries: Injury[] = mockInjuries
): Prediction {
  const leagueAvgGoals = 2.5;
  const homeAdvantage = 0.08;

  const homeForm = teamForms.find(f => f.team_id === homeTeam.id);
  const awayForm = teamForms.find(f => f.team_id === awayTeam.id);
  
  const formScoreHome = homeForm ? homeForm.form_score / 100 : 0.5;
  const formScoreAway = awayForm ? awayForm.form_score / 100 : 0.5;

  const relevantH2h = h2hMatches.filter(h => 
    (h.home_team_id === homeTeam.id && h.away_team_id === awayTeam.id) ||
    (h.home_team_id === awayTeam.id && h.away_team_id === homeTeam.id)
  );
  
  let h2hHomeWins = 0, h2hAwayWins = 0, h2hDraws = 0;
  relevantH2h.forEach(h => {
    if (h.home_score === h.away_score) h2hDraws++;
    else if (h.home_team_id === homeTeam.id) {
      h.home_score > h.away_score ? h2hHomeWins++ : h2hAwayWins++;
    } else {
      h.away_score > h.home_score ? h2hHomeWins++ : h2hAwayWins++;
    }
  });
  const totalH2h = h2hHomeWins + h2hAwayWins + h2hDraws || 1;
  const h2hHomeStrength = (h2hHomeWins + h2hDraws * 0.5) / totalH2h;
  const h2hAwayStrength = (h2hAwayWins + h2hDraws * 0.5) / totalH2h;

  const homeInjuries = injuries.filter(i => i.team_id === homeTeam.id);
  const awayInjuries = injuries.filter(i => i.team_id === awayTeam.id);
  const homeInjuryImpact = homeInjuries.reduce((sum, i) => sum + i.impact_score, 0) / 100;
  const awayInjuryImpact = awayInjuries.reduce((sum, i) => sum + i.impact_score, 0) / 100;

  const eloDiff = (homeTeam.elo_rating - awayTeam.elo_rating) / 100;
  const eloHomeStrength = sigmoid(eloDiff + homeAdvantage);

  const strengthHome = 
    WEIGHTS.form * formScoreHome +
    WEIGHTS.h2h * h2hHomeStrength +
    WEIGHTS.homeAway * 0.6 +
    WEIGHTS.elo * eloHomeStrength -
    WEIGHTS.defense * homeInjuryImpact;

  const strengthAway = 
    WEIGHTS.form * formScoreAway +
    WEIGHTS.h2h * h2hAwayStrength +
    WEIGHTS.homeAway * 0.4 +
    WEIGHTS.elo * (1 - eloHomeStrength) -
    WEIGHTS.defense * awayInjuryImpact;

  const totalStrength = strengthHome + strengthAway;
  const homeProb = (strengthHome / totalStrength) * 100;
  const awayProb = (strengthAway / totalStrength) * 100;
  const expectedHomeGoals = calculateExpectedGoals(homeTeam, awayTeam, true, teamForms, leagueAvgGoals);
  const expectedAwayGoals = calculateExpectedGoals(awayTeam, homeTeam, false, teamForms, leagueAvgGoals);
  const drawProb = calculateDrawProbability(expectedHomeGoals, expectedAwayGoals);

  const normalizedHome = homeProb / (homeProb + awayProb + drawProb * 100) * 100;
  const normalizedAway = awayProb / (homeProb + awayProb + drawProb * 100) * 100;
  const normalizedDraw = drawProb * 100 / (homeProb + awayProb + drawProb * 100) * 100;

  const confidenceScore = Math.round(
    Math.abs(normalizedHome - normalizedAway) * 0.6 +
    (homeForm?.form_score || 50) * 0.2 +
    (awayForm?.form_score || 50) * 0.2
  );

  let predictedWinner: 'home' | 'draw' | 'away' = 'home';
  if (normalizedDraw > normalizedHome && normalizedDraw > normalizedAway) {
    predictedWinner = 'draw';
  } else if (normalizedAway > normalizedHome) {
    predictedWinner = 'away';
  }

  let over2_5Prob = 0;
  for (let h = 0; h <= 6; h++) {
    for (let a = 0; a <= 6; a++) {
      if (h + a > 2.5) {
        over2_5Prob += poisson(h, expectedHomeGoals) * poisson(a, expectedAwayGoals);
      }
    }
  }

  const insights = generateInsights(
    homeTeam, awayTeam, homeForm, awayForm,
    relevantH2h, homeInjuries, awayInjuries,
    normalizedHome, normalizedAway, normalizedDraw
  );

  const valueBet = calculateValueBet(normalizedHome, normalizedAway, normalizedDraw);

  return {
    id: match.id,
    match_id: match.id,
    predicted_winner: predictedWinner,
    home_probability: Math.round(normalizedHome),
    draw_probability: Math.round(normalizedDraw),
    away_probability: Math.round(normalizedAway),
    expected_home_goals: Math.round(expectedHomeGoals * 10) / 10,
    expected_away_goals: Math.round(expectedAwayGoals * 10) / 10,
    confidence_score: Math.min(99, confidenceScore),
    over_2_5_probability: Math.round(over2_5Prob * 100),
    insights,
    value_bet: valueBet
  };
}

function generateInsights(
  homeTeam: Team,
  awayTeam: Team,
  homeForm: TeamForm | undefined,
  awayForm: TeamForm | undefined,
  h2h: HeadToHead[],
  homeInjuries: Injury[],
  awayInjuries: Injury[],
  homeProb: number,
  awayProb: number,
  drawProb: number
): string[] {
  const insights: string[] = [];

  if (homeForm && awayForm) {
    if (homeForm.wins / (homeForm.wins + homeForm.draws + homeForm.losses || 1) > 0.7) {
      insights.push(`${homeTeam.name} winning ${homeForm.wins}/5 recent home matches`);
    }
    if (awayForm.losses / (awayForm.wins + awayForm.draws + awayForm.losses || 1) > 0.5) {
      insights.push(`${awayTeam.name} struggling away (${awayForm.losses} losses in last 5)`);
    }
  }

  if (h2h.length > 0) {
    const recentH2h = h2h.slice(0, 5);
    let overs = 0;
    recentH2h.forEach(m => {
      if ((m.home_score + m.away_score) > 2.5) overs++;
    });
    if (overs >= 3) {
      insights.push(`Last ${h2h.length} H2H: ${overs} overs → goals likely`);
    }
  }

  if (homeInjuries.length > 0) {
    const keyInjuries = homeInjuries.filter(i => i.impact_score >= 10);
    if (keyInjuries.length > 0) {
      insights.push(`${homeTeam.name} missing ${keyInjuries.map(i => i.player_name).join(', ')} (injury impact)`);
    }
  }

  if (awayInjuries.length > 0) {
    const keyInjuries = awayInjuries.filter(i => i.impact_score >= 10);
    if (keyInjuries.length > 0) {
      insights.push(`${awayTeam.name} missing ${keyInjuries.map(i => i.player_name).join(', ')} (injury impact)`);
    }
  }

  if (homeProb > 55) {
    insights.push(`${homeTeam.name} favored at ${Math.round(homeProb)}% probability`);
  } else if (awayProb > 55) {
    insights.push(`${awayTeam.name} favored at ${Math.round(awayProb)}% probability`);
  }

  if (insights.length < 3) {
    insights.push(`${homeTeam.name} has ELO advantage of ${homeTeam.elo_rating - awayTeam.elo_rating} points`);
  }

  return insights;
}

function calculateValueBet(homeProb: number, awayProb: number, drawProb: number) {
  const bookmakerOdds = {
    home: 2.1,
    draw: 3.4,
    away: 3.2
  };

  const impliedHome = 100 / bookmakerOdds.home;
  const impliedDraw = 100 / bookmakerOdds.draw;
  const impliedAway = 100 / bookmakerOdds.away;

  const valueHome = homeProb - impliedHome;
  const valueDraw = drawProb - impliedDraw;
  const valueAway = awayProb - impliedAway;

  if (valueHome > 5) {
    return {
      exists: true,
      bet: 'Home Win',
      ev_percent: Math.round(valueHome * 10) / 10
    };
  } else if (valueAway > 5) {
    return {
      exists: true,
      bet: 'Away Win',
      ev_percent: Math.round(valueAway * 10) / 10
    };
  } else if (valueDraw > 5) {
    return {
      exists: true,
      bet: 'Draw',
      ev_percent: Math.round(valueDraw * 10) / 10
    };
  }

  return { exists: false, bet: '', ev_percent: 0 };
}

export function calculateAccuracy(predictions: Prediction[], matches: Match[]): number {
  let correct = 0;
  
  predictions.forEach(pred => {
    const match = matches.find(m => m.id === pred.match_id);
    if (!match || match.status !== 'finished') return;
    
    let actualWinner: 'home' | 'draw' | 'away';
    if (match.home_score > match.away_score) {
      actualWinner = 'home';
    } else if (match.away_score > match.home_score) {
      actualWinner = 'away';
    } else {
      actualWinner = 'draw';
    }
    
    if (pred.predicted_winner === actualWinner) {
      correct++;
    }
  });

  const finishedMatches = matches.filter(m => m.status === 'finished');
  return finishedMatches.length > 0 
    ? Math.round((correct / finishedMatches.length) * 100) 
    : 0;
}

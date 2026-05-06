import { db, collection, doc, getDocs, getDoc, setDoc, query, where, orderBy } from './firebase';

export interface League {
  id: number;
  name: string;
  country: string;
  logo?: string;
}

export interface Team {
  id: number;
  name: string;
  short_name: string;
  league_id: number;
  logo?: string;
  elo_rating: number;
}

export interface Match {
  id: number;
  league_id: number;
  home_team_id: number;
  away_team_id: number;
  home_score: number;
  away_score: number;
  status: string;
  start_time: string;
  venue?: string;
}

export interface Prediction {
  id: number;
  match_id: number;
  predicted_winner: string;
  home_probability: number;
  draw_probability: number;
  away_probability: number;
  expected_home_goals: number;
  expected_away_goals: number;
  confidence_score: number;
  over_2_5_probability: number;
  insights: string[];
  value_bet?: {
    exists: boolean;
    bet: string;
    ev_percent: number;
  };
}

async function getCollection<T>(collectionName: string, constraints?: { field: string; op: any; value: any }[]): Promise<T[]> {
  try {
    let q;
    if (constraints && constraints.length > 0) {
      const firestoreConstraints = constraints.map(c => where(c.field, c.op, c.value));
      q = query(collection(db, collectionName), ...firestoreConstraints);
    } else {
      q = collection(db, collectionName);
    }
    
    const snapshot = await getDocs(q);
    return snapshot.docs.map((d: any) => ({ id: d.id, ...d.data() } as T));
  } catch (e) {
    console.error(`Error fetching ${collectionName}:`, e);
    return [];
  }
}

export async function fetchLeagues(): Promise<League[]> {
  const leagues = await getCollection<League>('leagues');
  if (leagues.length === 0) {
    const mock = await import('@/data/mockData');
    return mock.mockLeagues;
  }
  return leagues;
}

export async function fetchTeams(): Promise<Team[]> {
  const teams = await getCollection<Team>('teams');
  if (teams.length === 0) {
    const mock = await import('@/data/mockData');
    return mock.mockTeams;
  }
  return teams;
}

export async function fetchMatches(date?: string): Promise<Match[]> {
  const constraints = date ? [{ field: 'start_time', op: '>=', value: date }] : undefined;
  const matches = await getCollection<Match>('matches', constraints);
  if (matches.length === 0) {
    const mock = await import('@/data/mockData');
    return mock.mockMatches;
  }
  return matches;
}

export async function fetchPredictions(matchIds: number[]): Promise<Prediction[]> {
  if (matchIds.length === 0) return [];
  
  const allPredictions = await getCollection<Prediction>('predictions');
  const filtered = allPredictions.filter(p => matchIds.includes(p.match_id));
  
  if (filtered.length === 0) {
    const mock = await import('@/data/mockData');
    return mock.mockPredictions;
  }
  return filtered;
}

export async function fetchPerformanceLogs(days: number = 7) {
  const logs = await getCollection('performance_logs');
  
  if (logs.length === 0) {
    const mock = await import('@/data/mockData');
    return mock.mockPerformanceLogs;
  }
  
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);
  
  return logs.filter((log: any) => {
    const logDate = new Date(log.date);
    return logDate >= startDate;
  }).sort((a: any, b: any) => new Date(a.date).getTime() - new Date(b.date).getTime());
}

export async function savePrediction(prediction: Omit<Prediction, 'id'>) {
  try {
    const docRef = doc(db, 'predictions', String(prediction.match_id));
    await setDoc(docRef, prediction);
    return { ...prediction, id: prediction.match_id };
  } catch (e) {
    console.error('Failed to save prediction:', e);
    return null;
  }
}

export async function saveMatchResult(matchId: number, homeScore: number, awayScore: number) {
  try {
    const docRef = doc(db, 'matches', String(matchId));
    await setDoc(docRef, {
      id: matchId,
      home_score: homeScore,
      away_score: awayScore,
      status: 'finished'
    }, { merge: true });
    return { id: matchId, home_score: homeScore, away_score: awayScore, status: 'finished' };
  } catch (e) {
    console.error('Failed to save match result:', e);
    return null;
  }
}

export async function logPerformance(total: number, correct: number, roi: number) {
  try {
    const date = new Date().toISOString().split('T')[0];
    const docRef = doc(db, 'performance_logs', date);
    const data = {
      date,
      total_predictions: total,
      correct_predictions: correct,
      accuracy_percentage: Math.round((correct / total) * 100),
      roi_percentage: roi
    };
    await setDoc(docRef, data);
    return data;
  } catch (e) {
    console.error('Failed to log performance:', e);
    return null;
  }
}

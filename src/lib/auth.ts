import { auth, db, signInWithPopup, signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut, onAuthStateChanged, googleProvider, collection, doc, setDoc, getDoc, getDocs, query, where, orderBy, serverTimestamp, updateDoc, deleteDoc } from './firebase';

export interface User {
  id: string;
  email: string;
  full_name?: string;
  avatar_url?: string;
}

export async function signOutUser() {
  try {
    await signOut(auth);
    return { error: null };
  } catch (e: any) {
    return { error: e };
  }
}

export { signOutUser as signOut };

export interface FavoriteTeam {
  id: string;
  user_id: string;
  team_id: number;
  team_name: string;
  team_short_name: string;
  logo?: string;
}

export interface SavedPrediction {
  id: string;
  user_id: string;
  match_id: number;
  home_team: string;
  away_team: string;
  predicted_winner: 'home' | 'draw' | 'away';
  predicted_score: string;
  predicted_home_goals: number;
  predicted_away_goals: number;
  confidence: number;
  over_under: 'over' | 'under';
  btts: 'yes' | 'no';
  league: string;
  created_at: string;
}

export async function signInWithEmail(email: string, password: string) {
  try {
    const result = await signInWithEmailAndPassword(auth, email, password);
    return { data: result.user, error: null };
  } catch (e: any) {
    return { data: null, error: e };
  }
}

export async function signUpWithEmail(email: string, password: string, fullName?: string) {
  try {
    const result = await createUserWithEmailAndPassword(auth, email, password);
    
    await setDoc(doc(db, 'profiles', result.user.uid), {
      id: result.user.uid,
      email: result.user.email,
      full_name: fullName || email.split('@')[0],
      avatar_url: result.user.photoURL || null,
      created_at: new Date().toISOString()
    });
    
    return { data: result.user, error: null };
  } catch (e: any) {
    return { data: null, error: e };
  }
}

export async function signInWithGoogle() {
  try {
    const result = await signInWithPopup(auth, googleProvider);
    
    await setDoc(doc(db, 'profiles', result.user.uid), {
      id: result.user.uid,
      email: result.user.email,
      full_name: result.user.displayName || result.user.email?.split('@')[0] || 'User',
      avatar_url: result.user.photoURL || null,
      created_at: new Date().toISOString()
    }, { merge: true });
    
    return { data: result.user, error: null };
  } catch (e: any) {
    return { data: null, error: e };
  }
}

export async function getCurrentUser(): Promise<User | null> {
  return new Promise((resolve) => {
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser: any) => {
      unsubscribe();
      
      if (!firebaseUser) {
        resolve(null);
        return;
      }
      
      let fullName = firebaseUser.displayName || firebaseUser.email?.split('@')[0] || 'User';
      let avatarUrl: string | undefined = firebaseUser.photoURL || undefined;
      
      getDoc(doc(db, 'profiles', firebaseUser.uid)).then((profileDoc: any) => {
        if (profileDoc.exists()) {
          const profile = profileDoc.data();
          fullName = profile.full_name || fullName;
          avatarUrl = profile.avatar_url || avatarUrl;
        }
        
        resolve({
          id: firebaseUser.uid,
          email: firebaseUser.email || '',
          full_name: fullName,
          avatar_url: avatarUrl
        });
      }).catch(() => {
        resolve({
          id: firebaseUser.uid,
          email: firebaseUser.email || '',
          full_name: fullName,
          avatar_url: avatarUrl
        });
      });
    });
  });
}

export async function ensureProfileExists(userId: string, email: string, fullName?: string): Promise<void> {
  try {
    const profileRef = doc(db, 'profiles', userId);
    const profileDoc = await getDoc(profileRef);
    
    if (!profileDoc.exists()) {
      await setDoc(profileRef, {
        id: userId,
        email,
        full_name: fullName,
        avatar_url: null,
        created_at: new Date().toISOString()
      });
    }
  } catch (e) {
    console.warn('Profile creation error:', e);
  }
}

export function onAuthStateChange(callback: (user: User | null) => void) {
  return onAuthStateChanged(auth, async (firebaseUser: any) => {
    if (firebaseUser) {
      const user = await getCurrentUser();
      callback(user);
    } else {
      callback(null);
    }
  });
}

export async function getFavorites(userId: string): Promise<FavoriteTeam[]> {
  try {
    const q = query(collection(db, 'user_favorites'), where('user_id', '==', userId));
    const snapshot = await getDocs(q);
    
    return snapshot.docs.map((d: any) => ({
      id: d.id,
      ...d.data()
    } as FavoriteTeam));
  } catch (e) {
    console.warn('Error fetching favorites:', e);
    return [];
  }
}

export async function addFavorite(userId: string, teamId: number, teamName: string, shortName: string, logo?: string) {
  try {
    const docRef = doc(collection(db, 'user_favorites'), `${userId}_${teamId}`);
    await setDoc(docRef, {
      user_id: userId,
      team_id: teamId,
      team_name: teamName,
      team_short_name: shortName,
      logo,
      created_at: new Date().toISOString()
    });
    return { data: { id: docRef.id }, error: null };
  } catch (e: any) {
    return { data: null, error: e };
  }
}

export async function removeFavorite(userId: string, teamId: number) {
  try {
    await deleteDoc(doc(db, 'user_favorites', `${userId}_${teamId}`));
    return { error: null };
  } catch (e: any) {
    return { error: e };
  }
}

export async function savePrediction(prediction: Omit<SavedPrediction, 'id' | 'created_at'>) {
  try {
    const docRef = doc(collection(db, 'saved_predictions'), `${prediction.user_id}_${prediction.match_id}`);
    await setDoc(docRef, {
      ...prediction,
      created_at: new Date().toISOString()
    });
    return { data: { id: docRef.id }, error: null };
  } catch (e: any) {
    return { data: null, error: e };
  }
}

export async function getSavedPredictions(userId: string): Promise<SavedPrediction[]> {
  try {
    const q = query(collection(db, 'saved_predictions'), where('user_id', '==', userId), orderBy('created_at', 'desc'));
    const snapshot = await getDocs(q);
    
    return snapshot.docs.map((d: any) => ({
      id: d.id,
      ...d.data()
    } as SavedPrediction));
  } catch (e) {
    console.warn('Error fetching predictions:', e);
    return [];
  }
}

export async function removeSavedPrediction(userId: string, matchId: number) {
  try {
    await deleteDoc(doc(db, 'saved_predictions', `${userId}_${matchId}`));
    return { error: null };
  } catch (e: any) {
    return { error: e };
  }
}

export interface MatchPoll {
  match_id: number;
  home_votes: number;
  draw_votes: number;
  away_votes: number;
  total_votes: number;
  predicted_scores: { score: string; votes: number }[];
}

export async function getMatchPoll(matchId: number): Promise<MatchPoll | null> {
  try {
    const docRef = doc(db, 'match_polls', String(matchId));
    const docSnap = await getDoc(docRef);
    
    if (docSnap.exists()) {
      return docSnap.data() as MatchPoll;
    }
    
    return {
      match_id: matchId,
      home_votes: 0,
      draw_votes: 0,
      away_votes: 0,
      total_votes: 0,
      predicted_scores: []
    };
  } catch (e) {
    return null;
  }
}

export async function voteOnMatch(userId: string, matchId: number, vote: 'home' | 'draw' | 'away', predictedScore: string) {
  try {
    const userVoteRef = doc(db, 'match_votes', `${userId}_${matchId}`);
    const pollRef = doc(db, 'match_polls', String(matchId));
    
    const existingVote = await getDoc(userVoteRef);
    const pollDoc = await getDoc(pollRef);
    
    const currentPoll = pollDoc.exists() ? pollDoc.data() : {
      match_id: matchId,
      home_votes: 0,
      draw_votes: 0,
      away_votes: 0,
      total_votes: 0,
      predicted_scores: []
    };
    
    if (existingVote.exists()) {
      const oldVote = existingVote.data().vote;
      
      if (oldVote !== vote) {
        const decrement = oldVote === 'home' ? { home_votes: Math.max(0, (currentPoll.home_votes || 0) - 1) } :
                          oldVote === 'draw' ? { draw_votes: Math.max(0, (currentPoll.draw_votes || 0) - 1) } :
                          { away_votes: Math.max(0, (currentPoll.away_votes || 0) - 1) };
        
        const increment = vote === 'home' ? { home_votes: (currentPoll.home_votes || 0) + 1 } :
                          vote === 'draw' ? { draw_votes: (currentPoll.draw_votes || 0) + 1 } :
                          { away_votes: (currentPoll.away_votes || 0) + 1 };
        
        await updateDoc(pollRef, {
          ...increment,
          ...decrement
        });
      }
      
      await updateDoc(userVoteRef, {
        vote,
        predicted_score: predictedScore
      });
    } else {
      const increment = vote === 'home' ? { home_votes: (currentPoll.home_votes || 0) + 1 } :
                        vote === 'draw' ? { draw_votes: (currentPoll.draw_votes || 0) + 1 } :
                        { away_votes: (currentPoll.away_votes || 0) + 1 };
      
      await setDoc(pollRef, {
        ...currentPoll,
        ...increment,
        total_votes: (currentPoll.total_votes || 0) + 1
      });
      
      await setDoc(userVoteRef, {
        user_id: userId,
        match_id: matchId,
        vote,
        predicted_score: predictedScore,
        created_at: new Date().toISOString()
      });
    }
    
    return { error: null };
  } catch (e: any) {
    return { error: e };
  }
}

export async function getUserVote(userId: string, matchId: number) {
  try {
    const docRef = doc(db, 'match_votes', `${userId}_${matchId}`);
    const docSnap = await getDoc(docRef);
    return docSnap.exists() ? docSnap.data() : null;
  } catch (e) {
    return null;
  }
}

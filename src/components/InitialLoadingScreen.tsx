'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { useLoading } from './LoadingContext';

const LOADING_MESSAGES = [
  'Analyzing match data...',
  'Processing team statistics...',
  'Calculating predictions...',
  'Checking H2H records...',
  'Evaluating form guides...',
  'Computing win probabilities...',
  'Generating insights...',
  'Loading fixtures...',
  'Preparing analysis...',
  'Fetching live scores...',
];

const STADIUM_BACKGROUNDS = [
  'https://images.unsplash.com/photo-1522778119026-d647f0596c20?w=1920&q=80',
  'https://images.unsplash.com/photo-1489944440615-453fc2b6a9a9?w=1920&q=80',
  'https://images.unsplash.com/photo-1459865264687-595d652de67e?w=1920&q=80',
];

function isMobile() {
  if (typeof window === 'undefined') return false;
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
}

function FootballBall({ size = 80 }: { size?: number }) {
  return (
    <div 
      className="relative animate-spin-slow"
      style={{ width: size, height: size }}
    >
      <div className="absolute inset-0 rounded-full bg-gradient-to-br from-gray-900 via-gray-800 to-black border-2 border-yellow-500/30 shadow-2xl" />
      
      <svg 
        viewBox="0 0 100 100" 
        className="absolute inset-0 w-full h-full"
      >
        <defs>
          <linearGradient id="pentagonGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#22c55e" />
            <stop offset="100%" stopColor="#16a34a" />
          </linearGradient>
          <filter id="glow">
            <feGaussianBlur stdDeviation="2" result="coloredBlur"/>
            <feMerge>
              <feMergeNode in="coloredBlur"/>
              <feMergeNode in="SourceGraphic"/>
            </feMerge>
          </filter>
        </defs>
        
        <g className="animate-pulse-subtle">
          <polygon 
            points="50,15 65,30 60,50 40,50 35,30" 
            fill="url(#pentagonGrad)" 
            filter="url(#glow)"
            opacity="0.9"
          />
        </g>
        
        <g className="animate-pulse-subtle" style={{ animationDelay: '0.5s' }}>
          <polygon 
            points="20,35 35,25 40,40 30,50 15,45" 
            fill="url(#pentagonGrad)" 
            filter="url(#glow)"
            opacity="0.8"
          />
        </g>
        
        <g className="animate-pulse-subtle" style={{ animationDelay: '1s' }}>
          <polygon 
            points="80,35 85,45 75,55 65,50 70,40" 
            fill="url(#pentagonGrad)" 
            filter="url(#glow)"
            opacity="0.85"
          />
        </g>
        
        <g className="animate-pulse-subtle" style={{ animationDelay: '1.5s' }}>
          <polygon 
            points="35,65 45,55 55,60 55,75 40,80" 
            fill="url(#pentagonGrad)" 
            filter="url(#glow)"
            opacity="0.75"
          />
        </g>
        
        <g className="animate-pulse-subtle" style={{ animationDelay: '0.3s' }}>
          <polygon 
            points="70,70 60,75 55,65 65,55 80,60" 
            fill="url(#pentagonGrad)" 
            filter="url(#glow)"
            opacity="0.8"
          />
        </g>
      </svg>
      
      <div className="absolute -inset-4 rounded-full border-2 border-yellow-500/20 animate-ping opacity-50" />
      <div className="absolute -inset-8 rounded-full border border-green-500/10 animate-pulse opacity-30" />
    </div>
  );
}

function LightRays() {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[200%] h-[200%]">
        {[...Array(8)].map((_, i) => (
          <div
            key={i}
            className="absolute top-1/2 left-1/2 w-1 h-[150%] bg-gradient-to-b from-yellow-500/30 via-transparent to-transparent origin-center"
            style={{
              transform: `translate(-50%, -50%) rotate(${i * 45}deg)`,
              animation: `lightSweep ${4 + i * 0.5}s ease-in-out infinite`,
              animationDelay: `${i * 0.5}s`,
            }}
          />
        ))}
      </div>
    </div>
  );
}

interface Particle {
  id: number;
  left: number;
  delay: number;
  duration: number;
  size: number;
  opacity: number;
}

function Particles({ count = 30 }: { count?: number }) {
  const [particles, setParticles] = React.useState<Particle[]>([]);

  React.useEffect(() => {
    const generated: Particle[] = [...Array(count)].map((_, i) => ({
      id: i,
      left: Math.random() * 100,
      delay: Math.random() * 5,
      duration: 3 + Math.random() * 4,
      size: 2 + Math.random() * 4,
      opacity: 0.3 + Math.random() * 0.5,
    }));
    setParticles(generated);
  }, [count]);

  if (particles.length === 0) return null;

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {particles.map((p) => (
        <div
          key={p.id}
          className="absolute rounded-full bg-gradient-to-r from-yellow-400 to-green-400"
          style={{
            left: `${p.left}%`,
            bottom: '-10px',
            width: p.size,
            height: p.size,
            opacity: p.opacity,
            animation: `particleFloat ${p.duration}s ease-in-out infinite`,
            animationDelay: `${p.delay}s`,
          }}
        />
      ))}
    </div>
  );
}

function ProgressBar({ progress }: { progress: number }) {
  return (
    <div className="w-72 mx-auto">
      <div className="relative h-3 bg-gray-800/80 rounded-full overflow-hidden backdrop-blur-sm border border-green-500/20">
        <div 
          className="absolute inset-y-0 left-0 bg-gradient-to-r from-green-600 via-green-400 to-emerald-400 rounded-full transition-all duration-500 ease-out"
          style={{ width: `${progress}%` }}
        >
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent animate-shimmer" />
        </div>
        <div 
          className="absolute inset-0 rounded-full shadow-[0_0_20px_rgba(34,197,94,0.5)] transition-all duration-300"
          style={{ 
            width: `${progress}%`,
            boxShadow: progress > 10 ? '0 0 20px rgba(34,197,94,0.5)' : 'none'
          }}
        />
      </div>
      <div className="flex justify-between mt-2 text-xs text-gray-400">
        <span>{Math.round(progress)}%</span>
        <span className="text-green-400">Loading...</span>
      </div>
    </div>
  );
}

function RotatingMessages() {
  const [index, setIndex] = useState(0);
  const [fade, setFade] = useState(true);

  useEffect(() => {
    const interval = setInterval(() => {
      setFade(false);
      setTimeout(() => {
        setIndex((prev) => (prev + 1) % LOADING_MESSAGES.length);
        setFade(true);
      }, 300);
    }, 2000);

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="h-6 overflow-hidden">
      <p 
        className={`text-sm text-gray-400 transition-opacity duration-300 ${fade ? 'opacity-100' : 'opacity-0'}`}
      >
        {LOADING_MESSAGES[index]}
      </p>
    </div>
  );
}

function XGeniusLogo() {
  return (
    <div className="relative">
      <h1 className="text-5xl md:text-6xl font-black bg-gradient-to-r from-yellow-400 via-green-400 to-emerald-500 bg-clip-text text-transparent animate-gradient bg-200">
        XGenius
      </h1>
      <div className="absolute -inset-4 bg-gradient-to-r from-yellow-400/20 via-green-400/20 to-emerald-500/20 blur-2xl rounded-full animate-pulse" />
      <p className="text-sm text-gray-400 mt-2 tracking-widest uppercase">AI-Powered Predictions</p>
    </div>
  );
}

function MobileLoader() {
  return (
    <div className="flex flex-col items-center justify-center">
      <div className="relative w-16 h-16 mb-6">
        <div className="absolute inset-0 border-4 border-green-500/30 rounded-full animate-ping" />
        <div className="absolute inset-2 border-4 border-green-500/50 rounded-full animate-ping" style={{ animationDelay: '0.3s' }} />
        <div className="absolute inset-4 border-4 border-green-500/70 rounded-full animate-ping" style={{ animationDelay: '0.6s' }} />
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="w-8 h-8 bg-gradient-to-br from-green-500 to-emerald-600 rounded-full animate-pulse" />
        </div>
      </div>
      <ProgressBar progress={50} />
      <p className="text-sm text-gray-400 mt-6 animate-pulse">Loading XGenius...</p>
    </div>
  );
}

function StadiumBackground() {
  const [bgIndex, setBgIndex] = useState<number | null>(null);

  useEffect(() => {
    setBgIndex(0);
    const interval = setInterval(() => {
      setBgIndex((prev) => ((prev ?? 0) + 1) % STADIUM_BACKGROUNDS.length);
    }, 10000);
    return () => clearInterval(interval);
  }, []);

  return (
    <>
      {bgIndex !== null && (
        <div 
          className="absolute inset-0 bg-cover bg-center transition-opacity duration-2000"
          style={{ 
            backgroundImage: `url('${STADIUM_BACKGROUNDS[bgIndex]}')`,
            opacity: 0.3,
          }}
        />
      )}
      <div className="absolute inset-0 bg-gradient-to-b from-black/80 via-black/70 to-black/90" />
    </>
  );
}

export function InitialLoadingScreen() {
  const { isInitialLoading, progress, message } = useLoading();
  const [isVisible, setIsVisible] = useState(true);
  const [isFading, setIsFading] = useState(false);
  const [minTimePassed, setMinTimePassed] = useState(false);
  const [mobile, setMobile] = useState(false);

  useEffect(() => {
    setMobile(isMobile());
    const timer = setTimeout(() => setMinTimePassed(true), 2000);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (!isInitialLoading && isVisible && minTimePassed) {
      setIsFading(true);
      const timer = setTimeout(() => setIsVisible(false), 600);
      return () => clearTimeout(timer);
    }
  }, [isInitialLoading, isVisible, minTimePassed]);

  if (!isVisible) return null;

  return (
    <div className={`fixed inset-0 z-[9999] transition-all duration-600 ${isFading ? 'opacity-0 scale-105' : 'opacity-100 scale-100'}`}>
      <div className="absolute inset-0 bg-gradient-to-br from-black via-gray-900 to-black">
        {!mobile && <StadiumBackground />}
        {!mobile && <LightRays />}
        {!mobile && <Particles count={30} />}
      </div>

      <div className="relative z-10 flex flex-col items-center justify-center min-h-screen px-4">
        <XGeniusLogo />
        
        <div className="mt-12 mb-8">
          {mobile ? <MobileLoader /> : <FootballBall size={100} />}
        </div>

        <div className="mb-6">
          <ProgressBar progress={progress} />
        </div>

        <RotatingMessages />

        <p className="absolute bottom-8 text-xs text-gray-500">
          {message}
        </p>
      </div>

      <style jsx global>{`
        @keyframes spin-slow {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        
        @keyframes lightSweep {
          0%, 100% { opacity: 0; transform: translate(-50%, -50%) rotate(0deg); }
          50% { opacity: 1; transform: translate(-50%, -50%) rotate(180deg); }
        }
        
        @keyframes particleFloat {
          0% { transform: translateY(0) translateX(0); opacity: 0; }
          10% { opacity: 0.6; }
          90% { opacity: 0.6; }
          100% { transform: translateY(-100vh) translateX(20px); opacity: 0; }
        }
        
        @keyframes shimmer {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(200%); }
        }
        
        @keyframes pulse-subtle {
          0%, 100% { opacity: 0.8; }
          50% { opacity: 1; }
        }
        
        .animate-spin-slow {
          animation: spin-slow 4s linear infinite;
        }
        
        .animate-shimmer {
          animation: shimmer 2s ease-in-out infinite;
        }
        
        .animate-pulse-subtle {
          animation: pulse-subtle 2s ease-in-out infinite;
        }
        
        .bg-200 {
          background-size: 200% 100%;
        }
        
        .animate-gradient {
          animation: gradientShift 3s ease infinite;
        }
        
        @keyframes gradientShift {
          0%, 100% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
        }
      `}</style>
    </div>
  );
}

export function TabLoadingOverlay() {
  const { isTabLoading, currentTab } = useLoading();
  const [fade, setFade] = useState(true);

  useEffect(() => {
    if (isTabLoading) {
      setFade(true);
    }
  }, [isTabLoading]);

  if (!isTabLoading) return null;

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-40 flex items-center justify-center">
      <div className="text-center">
        <div className="relative w-20 h-20 mx-auto mb-4">
          <div className="absolute inset-0 border-4 border-green-500/20 rounded-full animate-ping" />
          <div className="absolute inset-2 border-4 border-green-500/40 rounded-full animate-ping" style={{ animationDelay: '0.2s' }} />
          <div className="absolute inset-4 flex items-center justify-center">
            <FootballBall size={40} />
          </div>
        </div>
        <p className="text-sm text-gray-400 animate-pulse">Loading {currentTab}...</p>
        <div className="mt-4 w-48 mx-auto">
          <div className="h-1 bg-gray-800 rounded-full overflow-hidden">
            <div className="h-full bg-gradient-to-r from-green-600 to-emerald-400 rounded-full animate-shimmer" style={{ width: '60%' }} />
          </div>
        </div>
      </div>
    </div>
  );
}

export function PageBackground({ children, type = 'default' }: { children: React.ReactNode; type?: 'home' | 'today' | 'yesterday' | 'analyzer' | 'dashboard' | 'stats' | 'default' }) {
  const backgrounds: Record<string, string> = {
    home: 'https://images.unsplash.com/photo-1522778119026-d647f0596c20?w=1920&q=40',
    today: 'https://images.unsplash.com/photo-1574629810360-7efbbe195018?w=1920&q=40',
    yesterday: 'https://images.unsplash.com/photo-1489944440615-453fc2b6a9a9?w=1920&q=40',
    analyzer: 'https://images.unsplash.com/photo-1459865264687-595d652de67e?w=1920&q=40',
    dashboard: 'https://images.unsplash.com/photo-1508098682722-e99c43a406b2?w=1920&q=40',
    stats: 'https://images.unsplash.com/photo-1574629810360-7efbbe195018?w=1920&q=40',
    default: 'https://images.unsplash.com/photo-1508098682722-e99c43a406b2?w=1920&q=40',
  };

  const bgUrl = backgrounds[type] || backgrounds.default;

  return (
    <div className="relative min-h-screen">
      <div 
        className="fixed inset-0 bg-cover bg-center bg-fixed"
        style={{ backgroundImage: `url('${bgUrl}')` }}
      />
      <div className="fixed inset-0 bg-gradient-to-b from-black/70 via-black/60 to-black/80" />
      <div className="relative z-10">
        {children}
      </div>
    </div>
  );
}

export function SkeletonCard() {
  return (
    <div className="bg-gray-900/80 backdrop-blur-sm rounded-xl border border-gray-800 p-6 animate-pulse">
      <div className="flex items-center gap-4 mb-4">
        <div className="w-12 h-12 bg-gray-700 rounded-full" />
        <div className="flex-1">
          <div className="h-4 bg-gray-700 rounded w-3/4 mb-2" />
          <div className="h-3 bg-gray-700 rounded w-1/2" />
        </div>
      </div>
      <div className="space-y-2">
        <div className="h-3 bg-gray-700 rounded w-full" />
        <div className="h-3 bg-gray-700 rounded w-5/6" />
        <div className="h-3 bg-gray-700 rounded w-4/6" />
      </div>
    </div>
  );
}

export function ConnectionError({ onRetry }: { onRetry?: () => void }) {
  return (
    <div className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-4">
      <div className="bg-gray-900 border border-red-500/30 rounded-2xl p-8 max-w-md text-center">
        <div className="w-16 h-16 bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
          <svg className="w-8 h-8 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
        </div>
        <h3 className="text-xl font-bold text-white mb-2">Connection Error</h3>
        <p className="text-gray-400 mb-6">Unable to load data. Please check your connection and try again.</p>
        <button 
          onClick={onRetry}
          className="px-6 py-3 bg-gradient-to-r from-green-600 to-emerald-500 text-white font-semibold rounded-lg hover:from-green-500 hover:to-emerald-400 transition-all"
        >
          Retry Connection
        </button>
        <p className="text-xs text-gray-500 mt-4">Auto-retry in 30 seconds...</p>
      </div>
    </div>
  );
}

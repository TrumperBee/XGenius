'use client';

import { useLoading } from './LoadingContext';

export function InitialLoadingScreen() {
  const { isInitialLoading } = useLoading();

  if (!isInitialLoading) return null;

  return (
    <div className="fixed inset-0 z-[9999] bg-black flex items-center justify-center">
      <div className="flex flex-col items-center gap-4">
        <div className="w-10 h-10 border-3 border-green-500 border-t-transparent rounded-full animate-spin" />
        <p className="text-sm text-gray-400">Loading XGenius...</p>
      </div>
    </div>
  );
}

export function TabLoadingOverlay() {
  const { isTabLoading } = useLoading();
  
  if (!isTabLoading) return null;
  
  return (
    <div className="fixed inset-0 z-40 bg-black/50 flex items-center justify-center">
      <div className="w-8 h-8 border-2 border-green-500 border-t-transparent rounded-full animate-spin" />
    </div>
  );
}

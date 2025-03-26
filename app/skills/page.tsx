'use client';

import { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import { transformSkillsToGraph, initializeUserProgress } from '../../lib/skillTreeUtils';
import { UserProgress } from '../../types/skills';

// Dynamically import the SkillGraph component to avoid SSR issues with the Canvas
const SkillGraph = dynamic(
  () => import('../../components/SkillTree/SkillGraph'),
  { ssr: false }
);

export default function SkillsPage() {
  const [userProgress, setUserProgress] = useState<UserProgress>(initializeUserProgress());
  const [initialized, setInitialized] = useState(false);
  
  // Load saved progress from localStorage on client-side
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const savedProgress = localStorage.getItem('skillTreeProgress');
      if (savedProgress) {
        try {
          setUserProgress(JSON.parse(savedProgress));
        } catch (e) {
          console.error('Failed to parse saved progress:', e);
        }
      }
      setInitialized(true);
    }
  }, []);
  
  // Save progress to localStorage when it changes
  useEffect(() => {
    if (initialized && typeof window !== 'undefined') {
      localStorage.setItem('skillTreeProgress', JSON.stringify(userProgress));
    }
  }, [userProgress, initialized]);
  
  // Transform skills data for visualization
  const skillGraph = transformSkillsToGraph(userProgress);
  
  // Handle progress updates
  const handleProgressUpdate = (updatedProgress: UserProgress) => {
    setUserProgress(updatedProgress);
  };
  
  // Show loading state until client-side initialization is complete
  if (!initialized) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-900">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-teal-400 border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="mt-4 text-slate-300">Chargement de l'arbre de compétences...</p>
        </div>
      </div>
    );
  }
  
  return (
    <div className="min-h-screen bg-slate-900 text-slate-100">
      <header className="p-4 bg-slate-800 border-b border-slate-700">
        <div className="container mx-auto flex justify-between items-center">
          <h1 className="text-2xl font-bold text-teal-400">Arbre de Compétences</h1>
          <div className="flex items-center space-x-4">
            <div className="bg-slate-700 px-3 py-1 rounded-full text-sm">
              <span>Skills débloqués: {userProgress.unlockedSkills.length}</span>
            </div>
            <button 
              onClick={() => setUserProgress(initializeUserProgress())}
              className="bg-slate-700 hover:bg-slate-600 px-3 py-1 rounded-full text-sm transition-colors"
            >
              Réinitialiser
            </button>
          </div>
        </div>
      </header>
      
      <main className="relative w-full h-[calc(100vh-64px)]">
        <div className="absolute inset-0">
          <SkillGraph 
            data={skillGraph} 
            userProgress={userProgress}
            onProgressUpdate={handleProgressUpdate}
          />
        </div>
        
        <div className="absolute bottom-4 left-4 right-4 bg-slate-800/80 backdrop-blur-sm p-3 rounded-lg max-w-md text-sm">
          <p className="mb-2">
            <span className="text-teal-400 font-medium">Double-cliquez</span> sur un nœud disponible pour le débloquer.
            <span className="text-teal-400 font-medium ml-2">Glissez</span> pour explorer l'arbre.
          </p>
          <div className="flex items-center space-x-4 text-xs text-slate-400">
            <div className="flex items-center">
              <span className="inline-block w-3 h-3 rounded-full bg-teal-400 mr-1"></span>
              Débloqué
            </div>
            <div className="flex items-center">
              <span className="inline-block w-3 h-3 rounded-full bg-teal-600 mr-1"></span>
              Disponible
            </div>
            <div className="flex items-center">
              <span className="inline-block w-3 h-3 rounded-full bg-slate-600 mr-1"></span>
              Verrouillé
            </div>
          </div>
        </div>
      </main>
    </div>
  );
} 
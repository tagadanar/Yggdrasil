import { useState } from 'react';
import { UserProgress } from '../../types/skills';

interface PlayerPanelProps {
  userProgress: UserProgress;
  onNameChange: (name: string) => void;
}

export default function PlayerPanel({ userProgress, onNameChange }: PlayerPanelProps) {
  const [playerName, setPlayerName] = useState(userProgress.playerName || 'Conan le coder');
  
  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newName = e.target.value;
    setPlayerName(newName);
    onNameChange(newName);
  };
  
  // Calculate total points for each skill
  const skillTotals = Object.entries(userProgress.unlockedSkills).reduce((acc, [_, module]) => {
    Object.entries(module.skillPoints).forEach(([skill, value]) => {
      acc[skill] = (acc[skill] || 0) + value;
    });
    return acc;
  }, {} as Record<string, number>);
  
  // Get recently unlocked skills (last 5)
  const recentUnlocks = Object.entries(userProgress.unlockedSkills)
    .filter(([_, module]) => module.unlockedAt)
    .sort(([_, a], [__, b]) => (b.unlockedAt?.getTime() || 0) - (a.unlockedAt?.getTime() || 0))
    .slice(0, 5);
  
  return (
    <div className="player-panel" style={{
      position: 'fixed',
      right: 0,
      top: 0,
      width: '20%',
      height: '100vh',
      background: 'rgba(15, 23, 42, 0.95)',
      borderLeft: '1px solid #1E293B',
      padding: '20px',
      color: '#F8FAFC',
      overflowY: 'auto'
    }}>
      <div className="mb-6">
        <h2 className="text-xl font-bold mb-4">Profil</h2>
        <input
          type="text"
          value={playerName}
          onChange={handleNameChange}
          placeholder="Votre nom"
          className="w-full px-3 py-2 bg-slate-700 rounded border border-slate-600 text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-500"
        />
      </div>
      
      <div className="mb-6">
        <h2 className="text-xl font-bold mb-4">Compétences</h2>
        {Object.keys(skillTotals).length > 0 ? (
          <div className="space-y-3">
            {Object.entries(skillTotals).map(([skill, total]) => (
              <div key={skill} className="skill-bar">
                <div className="flex justify-between text-sm mb-1">
                  <span>{skill.replace('_', ' ')}</span>
                  <span>{total}/25</span>
                </div>
                <div className="bg-slate-700 rounded-full h-2 w-full">
                  <div 
                    className="bg-teal-500 h-2 rounded-full" 
                    style={{ width: `${(total / 25) * 100}%` }} 
                  />
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-slate-400 text-sm">
            Aucune compétence débloquée pour le moment. Explorez l'arbre pour progresser !
          </p>
        )}
      </div>
      
      <div>
        <h2 className="text-xl font-bold mb-4">Journal d'Apprentissage</h2>
        {recentUnlocks.length > 0 ? (
          <div className="space-y-3">
            {recentUnlocks.map(([id, module]) => (
              <div key={id} className="bg-slate-800 rounded p-3">
                <div className="font-medium">{module.logMessage}</div>
                <div className="text-sm text-slate-400 mt-1">
                  {module.formattedDate}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-slate-400 text-sm">
            Votre journal est vide. Débloquez des compétences pour commencer votre parcours !
          </p>
        )}
      </div>
    </div>
  );
} 
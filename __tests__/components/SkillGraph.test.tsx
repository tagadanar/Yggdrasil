import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import SkillGraph from '../../components/SkillTree/SkillGraph';
import { SkillGraph as SkillGraphType, UserProgress } from '../../types/skills';

// Mock ForceGraph2D
jest.mock('react-force-graph-2d', () => {
  return {
    __esModule: true,
    default: ({ graphData }) => <div data-testid="force-graph" />
  };
});

// Mock data
const mockData: SkillGraphType = {
  nodes: [
    {
      id: 'join_school',
      name: 'Rejoindre l\'école',
      description: 'Débloquez cette compétence pour accéder au reste du parcours.',
      isUnlocked: false,
      canUnlock: true,
      level: 0,
      group: 'root',
      skillPoints: {
        problem_solving: 0,
        coding_implementation: 0,
        systems_thinking: 0,
        collaboration_communication: 0,
        learning_adaptability: 0
      },
      actions_cles: ['Action 1', 'Action 2'],
      concepts_acquis: ['Concept 1', 'Concept 2']
    },
    {
      id: 'test_module',
      name: 'Test Module',
      description: 'Test module description',
      isUnlocked: false,
      canUnlock: false,
      level: 1,
      group: 'test',
      skillPoints: {
        problem_solving: 1,
        coding_implementation: 1,
        systems_thinking: 1,
        collaboration_communication: 1,
        learning_adaptability: 1
      },
      actions_cles: ['Action 1', 'Action 2'],
      concepts_acquis: ['Concept 1', 'Concept 2']
    }
  ],
  links: []
};

const mockUserProgress: UserProgress = {
  playerName: 'Test Player',
  unlockedSkills: {}
};

describe('SkillGraph Component', () => {
  const mockOnProgressUpdate = jest.fn();

  beforeEach(() => {
    // Reset mock function before each test
    mockOnProgressUpdate.mockClear();
  });

  it('should show only join_school node when no skills are unlocked', () => {
    render(
      <SkillGraph
        data={mockData}
        userProgress={mockUserProgress}
        onProgressUpdate={mockOnProgressUpdate}
      />
    );

    // Check that only one node is visible (join_school)
    const visibleNodes = screen.getByText('Compétences déverrouillées:').nextSibling;
    expect(visibleNodes).toHaveTextContent('1');
  });

  it('should show control panel when toggle button is clicked', () => {
    render(
      <SkillGraph
        data={mockData}
        userProgress={mockUserProgress}
        onProgressUpdate={mockOnProgressUpdate}
      />
    );

    // Find and click the toggle button
    const toggleButton = screen.getByText('→');
    fireEvent.click(toggleButton);

    // Check that the control panel is visible
    expect(screen.getByText('Force Simulation')).toBeVisible();
  });

  it('should reset progress when reset button is clicked', () => {
    render(
      <SkillGraph
        data={mockData}
        userProgress={{
          ...mockUserProgress,
          unlockedSkills: { 'test_module': mockData.nodes[1] }
        }}
        onProgressUpdate={mockOnProgressUpdate}
      />
    );

    // Open control panel
    const toggleButton = screen.getByText('→');
    fireEvent.click(toggleButton);

    // Find and click the reset button
    const resetButton = screen.getByText('Reset Progress');
    fireEvent.click(resetButton);

    // Check that onProgressUpdate was called with empty unlockedSkills
    expect(mockOnProgressUpdate).toHaveBeenCalledWith({
      playerName: 'Test Player',
      unlockedSkills: {}
    });
  });
}); 
import { useEffect } from 'react';
import { useGameStore } from './stores/gameStore';
import { useRoom } from './hooks/useRoom';
import { EntryScreen } from './components/game/EntryScreen';
import { RoomLobby } from './components/game/RoomLobby';
import { WaitingRoom } from './components/game/WaitingRoom';
import { PuzzleContainer } from './components/puzzles/PuzzleContainer';
import { VictoryScreen } from './components/game/VictoryScreen';
import { Loader2 } from 'lucide-react';

function App() {
  const phase = useGameStore((state) => state.phase);
  const { isRestoring } = useRoom();

  // Add beforeunload warning when in an active game
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      // Only show warning if user is in an active session (not on entry screen)
      if (phase !== 'entry' && phase !== 'lobby') {
        e.preventDefault();
        // Modern browsers ignore custom messages, but we still need to set returnValue
        e.returnValue = 'You have an active investigation in progress. Are you sure you want to leave?';
        return e.returnValue;
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [phase]);

  // Show loading screen only while actively restoring a previous session
  if (isRestoring) {
    return (
      <div className="dark min-h-screen bg-background text-foreground flex items-center justify-center">
        <div className="text-center space-y-4">
          <Loader2 className="w-8 h-8 animate-spin mx-auto text-primary" />
          <p className="text-muted-foreground font-mono text-sm">
            Reconnecting to investigation...
          </p>
        </div>
      </div>
    );
  }

  const renderPhase = () => {
    switch (phase) {
      case 'entry':
        return <EntryScreen />;
      case 'lobby':
        return <RoomLobby />;
      case 'waiting':
        return <WaitingRoom />;
      case 'playing':
        return <PuzzleContainer />;
      case 'victory':
        return <VictoryScreen />;
      default:
        return <EntryScreen />;
    }
  };

  return (
    <div className="dark min-h-screen bg-background text-foreground">
      {renderPhase()}
    </div>
  );
}

export default App;

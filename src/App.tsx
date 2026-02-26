import { useGameStore } from './stores/gameStore';
import { EntryScreen } from './components/game/EntryScreen';
import { RoomLobby } from './components/game/RoomLobby';
import { WaitingRoom } from './components/game/WaitingRoom';
import { PuzzleContainer } from './components/puzzles/PuzzleContainer';
import { VictoryScreen } from './components/game/VictoryScreen';

function App() {
  const phase = useGameStore((state) => state.phase);

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

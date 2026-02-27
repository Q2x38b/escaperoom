import { useState } from 'react';
import { useGameStore } from '../../stores/gameStore';
import { useRoom } from '../../hooks/useRoom';
import { AlertCircle, Loader2 } from 'lucide-react';
import { Input } from '../ui/input';
import { Button } from '../ui/button';

export function EntryScreen() {
  const [passcode, setPasscode] = useState('');
  const [error, setError] = useState('');
  const [isChecking, setIsChecking] = useState(false);
  const setPhase = useGameStore((state) => state.setPhase);
  const { validateEntry } = useRoom();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isChecking || !passcode.trim()) return;

    setIsChecking(true);
    setError('');

    const isValid = await validateEntry(passcode.trim());

    if (isValid) {
      setPhase('lobby');
    } else {
      setError('Access denied. Invalid passcode.');
      setPasscode('');
      setIsChecking(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            type="text"
            value={passcode}
            onChange={(e) => {
              setPasscode(e.target.value.toUpperCase());
              setError('');
            }}
            placeholder="ENTER PASSCODE"
            className="h-12 text-center font-mono text-lg uppercase bg-white/10 border-white/30 text-white placeholder:text-white/40"
            disabled={isChecking}
            autoFocus
          />

          <Button
            type="submit"
            disabled={!passcode.trim() || isChecking}
            className="w-full h-11 bg-white text-black hover:bg-white/90"
          >
            {isChecking ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Verifying...
              </>
            ) : (
              'Enter'
            )}
          </Button>

          {error && (
            <div role="alert" className="flex items-center justify-center gap-2 text-red-400 text-sm">
              <AlertCircle className="w-4 h-4" />
              <span>{error}</span>
            </div>
          )}
        </form>
      </div>
    </div>
  );
}

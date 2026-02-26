import { useState } from 'react';
import { Input } from '../ui/input';
import { Button } from '../ui/button';
import { useGameStore } from '../../stores/gameStore';
import { useRoom } from '../../hooks/useRoom';
import { Lock, AlertCircle } from 'lucide-react';

export function EntryScreen() {
  const [passcode, setPasscode] = useState('');
  const [error, setError] = useState('');
  const [isChecking, setIsChecking] = useState(false);
  const setPhase = useGameStore((state) => state.setPhase);
  const { validateEntry } = useRoom();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsChecking(true);
    setError('');

    const isValid = await validateEntry(passcode);

    if (isValid) {
      setPhase('lobby');
    } else {
      setError('Access denied. Invalid passcode.');
      setIsChecking(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSubmit(e);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full border-2 border-foreground/20 mb-4">
            <Lock className="w-8 h-8 text-foreground/70" />
          </div>
          <div className="font-mono text-sm text-foreground/80 tracking-widest mb-2">
            SECURE ACCESS TERMINAL
          </div>
          <div className="h-px bg-foreground/20 w-32 mx-auto" />
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="relative">
            <Input
              type="text"
              value={passcode}
              onChange={(e) => {
                setPasscode(e.target.value.toUpperCase());
                setError('');
              }}
              onKeyDown={handleKeyDown}
              placeholder="ENTER PASSCODE"
              className="font-mono text-center tracking-widest bg-card border-foreground/20 h-12 text-lg placeholder:text-foreground/40"
              autoFocus
              disabled={isChecking}
            />
            {isChecking && (
              <div className="absolute right-3 top-1/2 -translate-y-1/2">
                <div className="w-5 h-5 border-2 border-foreground/50 border-t-transparent rounded-full animate-spin" />
              </div>
            )}
          </div>

          {error && (
            <div className="flex items-center gap-2 text-destructive text-sm font-mono">
              <AlertCircle className="w-4 h-4" />
              <span>{error}</span>
            </div>
          )}

          <Button
            type="submit"
            className="w-full font-mono tracking-wider"
            disabled={!passcode.trim() || isChecking}
          >
            {isChecking ? 'VERIFYING...' : 'ACCESS'}
          </Button>
        </form>

        <div className="mt-8 text-center">
          <span className="font-mono text-xs text-foreground/40 cursor-blink">
            Awaiting input
          </span>
        </div>
      </div>
    </div>
  );
}

import { useState, useEffect, useRef } from 'react';
import { Input } from '../ui/input';
import { Button } from '../ui/button';
import { useGameStore } from '../../stores/gameStore';
import { useRoom } from '../../hooks/useRoom';
import { Lock, AlertCircle } from 'lucide-react';

// Check if device supports hover (not touch-only)
const supportsHover = () => window.matchMedia('(hover: hover)').matches;

export function EntryScreen() {
  const [passcode, setPasscode] = useState('');
  const [error, setError] = useState('');
  const [isChecking, setIsChecking] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const setPhase = useGameStore((state) => state.setPhase);
  const { validateEntry } = useRoom();

  // Only auto-focus on non-touch devices to avoid keyboard opening
  useEffect(() => {
    if (supportsHover() && inputRef.current) {
      inputRef.current.focus();
    }
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isChecking || !passcode.trim()) return;

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

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full border-2 border-white/30 mb-4">
            <Lock className="w-8 h-8 text-white" />
          </div>
          <div className="font-mono text-sm text-white tracking-widest mb-2">
            SECURE ACCESS TERMINAL
          </div>
          <div className="h-px bg-white/30 w-32 mx-auto" />
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="relative">
            <label htmlFor="passcode" className="sr-only">Passcode</label>
            <Input
              ref={inputRef}
              id="passcode"
              type="text"
              value={passcode}
              onChange={(e) => {
                setPasscode(e.target.value.toUpperCase());
                setError('');
              }}
              placeholder="ENTER PASSCODE"
              className="font-mono text-center tracking-widest bg-white/10 border-white/30 h-12 text-lg text-white placeholder:text-white/60"
              disabled={isChecking}
              required
              aria-describedby={error ? "passcode-error" : undefined}
            />
            {isChecking && (
              <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              </div>
            )}
          </div>

          {error && (
            <div id="passcode-error" role="alert" className="flex items-center gap-2 text-red-400 text-sm font-mono">
              <AlertCircle className="w-4 h-4" aria-hidden="true" />
              <span>{error}</span>
            </div>
          )}

          <Button
            type="submit"
            className="w-full font-mono tracking-wider bg-white text-black hover:bg-white/90"
            disabled={!passcode.trim() || isChecking}
          >
            {isChecking ? 'VERIFYING...' : 'ACCESS'}
          </Button>
        </form>

        <div className="mt-8 text-center">
          <span className="font-mono text-xs text-white/70 cursor-blink">
            Awaiting input
          </span>
        </div>
      </div>
    </div>
  );
}

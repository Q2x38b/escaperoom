import { useState } from 'react';
import { useGameStore } from '../../stores/gameStore';
import { useRoom } from '../../hooks/useRoom';
import { AlertCircle, Loader2, ArrowRight, X } from 'lucide-react';

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
      setError('Access denied');
      setPasscode('');
      setIsChecking(false);
    }
  };

  const handleClear = () => {
    setPasscode('');
    setError('');
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <form onSubmit={handleSubmit}>
          <div className="relative flex items-center">
            <input
              type="text"
              value={passcode}
              onChange={(e) => {
                setPasscode(e.target.value.toUpperCase());
                setError('');
              }}
              placeholder="Enter access code"
              className="w-full h-14 pl-5 pr-24 rounded-full bg-white/5 border border-white/20 text-white placeholder:text-white/40 font-mono text-base focus:outline-none focus:border-white/40 focus:bg-white/10 transition-all"
              disabled={isChecking}
              autoFocus
            />

            {/* Clear button */}
            {passcode && !isChecking && (
              <button
                type="button"
                onClick={handleClear}
                className="absolute right-16 p-1.5 rounded-full text-white/40 hover:text-white/70 hover:bg-white/10 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            )}

            {/* Submit button */}
            <button
              type="submit"
              disabled={!passcode.trim() || isChecking}
              className="absolute right-2 h-10 w-10 rounded-full bg-white text-black flex items-center justify-center disabled:opacity-30 disabled:cursor-not-allowed hover:bg-white/90 transition-all"
            >
              {isChecking ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <ArrowRight className="w-4 h-4" />
              )}
            </button>
          </div>

          {error && (
            <div role="alert" className="flex items-center justify-center gap-2 text-red-400 text-sm mt-4">
              <AlertCircle className="w-4 h-4" />
              <span>{error}</span>
            </div>
          )}
        </form>
      </div>
    </div>
  );
}

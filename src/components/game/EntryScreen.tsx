import { useState } from 'react';
import { useGameStore } from '../../stores/gameStore';
import { useRoom } from '../../hooks/useRoom';
import { AlertCircle, Loader2, X } from 'lucide-react';

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
      <div className="w-full max-w-sm">
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
              className="w-full h-11 pl-4 pr-12 rounded-lg bg-white/[0.03] border border-white/10 text-white text-sm placeholder:text-white/30 focus:outline-none focus:border-white/20 transition-colors"
              disabled={isChecking}
              autoFocus
            />

            {/* Clear/Submit button */}
            <button
              type={passcode.trim() ? 'submit' : 'button'}
              onClick={passcode.trim() ? undefined : handleClear}
              disabled={isChecking}
              className="absolute right-2 h-7 w-7 rounded-full border border-white/20 flex items-center justify-center text-white/40 hover:text-white/60 hover:border-white/30 disabled:opacity-50 transition-colors"
            >
              {isChecking ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <X className="w-3.5 h-3.5" />
              )}
            </button>
          </div>

          {error && (
            <div role="alert" className="flex items-center justify-center gap-2 text-red-400 text-xs mt-3">
              <AlertCircle className="w-3.5 h-3.5" />
              <span>{error}</span>
            </div>
          )}
        </form>
      </div>
    </div>
  );
}

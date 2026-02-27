import { useState, useEffect, useRef, useCallback } from 'react';
import { useGameStore } from '../../stores/gameStore';
import { useRoom } from '../../hooks/useRoom';
import { Lock, AlertCircle } from 'lucide-react';

const PASSCODE_LENGTH = 11; // Length of "INVESTIGATE"

// Check if device supports hover (not touch-only)
const supportsHover = () => window.matchMedia('(hover: hover)').matches;

export function EntryScreen() {
  const [passcode, setPasscode] = useState<string[]>(Array(PASSCODE_LENGTH).fill(''));
  const [activeIndex, setActiveIndex] = useState(0);
  const [error, setError] = useState('');
  const [isChecking, setIsChecking] = useState(false);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);
  const setPhase = useGameStore((state) => state.setPhase);
  const { validateEntry } = useRoom();

  // Focus first input on mount (non-touch devices)
  useEffect(() => {
    if (supportsHover() && inputRefs.current[0]) {
      inputRefs.current[0].focus();
    }
  }, []);

  const handleSubmit = useCallback(async () => {
    const fullPasscode = passcode.join('');
    if (isChecking || fullPasscode.length !== PASSCODE_LENGTH) return;

    setIsChecking(true);
    setError('');

    const isValid = await validateEntry(fullPasscode);

    if (isValid) {
      setPhase('lobby');
    } else {
      setError('Access denied. Invalid passcode.');
      setPasscode(Array(PASSCODE_LENGTH).fill(''));
      setActiveIndex(0);
      setTimeout(() => inputRefs.current[0]?.focus(), 50);
      setIsChecking(false);
    }
  }, [passcode, isChecking, validateEntry, setPhase]);

  // Auto-submit when all characters are entered
  useEffect(() => {
    const filledCount = passcode.filter(c => c !== '').length;
    if (filledCount === PASSCODE_LENGTH && !isChecking) {
      handleSubmit();
    }
  }, [passcode, isChecking, handleSubmit]);

  const handleInputChange = (index: number, value: string) => {
    const char = value.slice(-1).toUpperCase();
    if (!/^[A-Z]$/.test(char) && char !== '') return;

    setError('');
    const newPasscode = [...passcode];
    newPasscode[index] = char;
    setPasscode(newPasscode);

    // Move to next input if character was entered
    if (char && index < PASSCODE_LENGTH - 1) {
      setActiveIndex(index + 1);
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace') {
      e.preventDefault();
      const newPasscode = [...passcode];

      if (passcode[index]) {
        // Clear current character
        newPasscode[index] = '';
        setPasscode(newPasscode);
      } else if (index > 0) {
        // Move to previous and clear
        newPasscode[index - 1] = '';
        setPasscode(newPasscode);
        setActiveIndex(index - 1);
        inputRefs.current[index - 1]?.focus();
      }
    } else if (e.key === 'ArrowLeft' && index > 0) {
      setActiveIndex(index - 1);
      inputRefs.current[index - 1]?.focus();
    } else if (e.key === 'ArrowRight' && index < PASSCODE_LENGTH - 1) {
      setActiveIndex(index + 1);
      inputRefs.current[index + 1]?.focus();
    } else if (e.key === 'Enter') {
      handleSubmit();
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData('text').toUpperCase().replace(/[^A-Z]/g, '');
    const chars = pasted.slice(0, PASSCODE_LENGTH).split('');
    const newPasscode = [...passcode];

    chars.forEach((char, i) => {
      if (i < PASSCODE_LENGTH) {
        newPasscode[i] = char;
      }
    });

    setPasscode(newPasscode);
    const nextIndex = Math.min(chars.length, PASSCODE_LENGTH - 1);
    setActiveIndex(nextIndex);
    inputRefs.current[nextIndex]?.focus();
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-lg">
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full border-2 border-white/30 mb-6">
            <Lock className="w-8 h-8 text-white" />
          </div>
          <div className="font-mono text-sm text-white/80 tracking-widest">
            SECURE ACCESS TERMINAL
          </div>
        </div>

        {/* Character input boxes */}
        <div className="flex justify-center gap-1.5 sm:gap-2 mb-6">
          {passcode.map((char, index) => (
            <input
              key={index}
              ref={(el) => { inputRefs.current[index] = el; }}
              type="text"
              inputMode="text"
              autoComplete="off"
              autoCapitalize="characters"
              value={char}
              onChange={(e) => handleInputChange(index, e.target.value)}
              onKeyDown={(e) => handleKeyDown(index, e)}
              onPaste={handlePaste}
              onFocus={() => setActiveIndex(index)}
              disabled={isChecking}
              className={`
                w-7 h-10 sm:w-9 sm:h-12 text-center font-mono text-lg sm:text-xl font-bold
                bg-white/5 border-2 rounded-lg transition-all duration-150
                text-white placeholder:text-white/30
                focus:outline-none focus:ring-0
                disabled:opacity-50 disabled:cursor-not-allowed
                ${activeIndex === index ? 'border-white/60 bg-white/10' : 'border-white/20'}
                ${char ? 'border-green-500/50 bg-green-500/10' : ''}
                ${error && !char ? 'border-red-500/50' : ''}
              `}
              aria-label={`Passcode character ${index + 1}`}
            />
          ))}
        </div>

        {/* Status */}
        <div className="text-center">
          {isChecking ? (
            <div className="flex items-center justify-center gap-2 text-white/80">
              <div className="w-4 h-4 border-2 border-white/60 border-t-transparent rounded-full animate-spin" />
              <span className="font-mono text-sm">VERIFYING...</span>
            </div>
          ) : error ? (
            <div role="alert" className="flex items-center justify-center gap-2 text-red-400 text-sm font-mono">
              <AlertCircle className="w-4 h-4" aria-hidden="true" />
              <span>{error}</span>
            </div>
          ) : (
            <div className="font-mono text-xs text-white/50">
              {passcode.filter(c => c !== '').length} / {PASSCODE_LENGTH}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

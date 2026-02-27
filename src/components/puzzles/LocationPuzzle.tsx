import { useState, useEffect } from 'react';
import { useQuery, useMutation } from 'convex/react';
import { api } from '../../../convex/_generated/api';
import { Card, CardContent } from '../ui/card';
import { Input } from '../ui/input';
import { Button } from '../ui/button';
import { Alert, AlertDescription } from '../ui/alert';
import { Badge } from '../ui/badge';
import { useRoom } from '../../hooks/useRoom';
import {
  AlertCircle, Send, Loader2, MapPin, CheckCircle2,
  Lightbulb, FileText, Target, Users
} from 'lucide-react';

interface LocationProgress {
  odentifier: string;
  nickname: string;
  location: {
    id: string;
    name: string;
    icon: string;
  } | null;
  progress: {
    current: number;
    total: number;
    isComplete: boolean;
    percentage: number;
  };
}

export function LocationPuzzle() {
  const [answer, setAnswer] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showHint, setShowHint] = useState(false);

  const { roomId, currentPlayerId } = useRoom();

  // Query location puzzle data
  const locationData = useQuery(
    api.game.getLocationPuzzleData,
    roomId ? { roomId, odentifier: currentPlayerId } : "skip"
  );

  // Query team progress
  const teamProgress = useQuery(
    api.game.getTeamLocationProgress,
    roomId ? { roomId } : "skip"
  ) as LocationProgress[] | null | undefined;

  // Submit answer mutation
  const submitAnswer = useMutation(api.game.submitLocationAnswer);

  // Reset answer when puzzle changes
  useEffect(() => {
    setAnswer('');
    setError('');
    setShowHint(false);
  }, [locationData?.progress?.current]);

  const handleSubmit = async () => {
    if (!answer.trim() || !roomId) return;
    setIsSubmitting(true);
    setError('');

    try {
      const result = await submitAnswer({
        roomId,
        odentifier: currentPlayerId,
        answer: answer.trim(),
      });

      if (!result.correct) {
        setError('Incorrect answer. Try again.');
      } else {
        setAnswer('');
      }
    } catch (err) {
      setError('Failed to submit answer');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!locationData) {
    return (
      <Card className="bank-card">
        <CardContent className="py-8 text-center">
          <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2 text-white/60" />
          <p className="text-white/60 text-sm">Loading your location...</p>
        </CardContent>
      </Card>
    );
  }

  const { location, puzzle, progress } = locationData;

  return (
    <div className="space-y-4">
      {/* Team Progress Overview */}
      {teamProgress && teamProgress.length > 1 && (
        <Card className="bank-card border-white/20">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-3">
              <Users className="w-4 h-4 text-white/60" />
              <span className="text-xs font-medium text-white/80 uppercase tracking-wider">
                Team Progress
              </span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {teamProgress.map((player) => (
                <div
                  key={player.odentifier}
                  className={`p-2 rounded-lg border ${
                    player.odentifier === currentPlayerId
                      ? 'border-white/40 bg-white/10'
                      : 'border-white/10 bg-white/5'
                  }`}
                >
                  <div className="flex items-center gap-1.5 mb-1">
                    <span className="text-sm">{player.location?.icon || '📍'}</span>
                    <span className="text-xs text-white/80 truncate">
                      {player.nickname}
                      {player.odentifier === currentPlayerId && (
                        <span className="text-white/50"> (you)</span>
                      )}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="flex-1 h-1.5 bg-white/10 rounded-full overflow-hidden">
                      <div
                        className={`h-full transition-all duration-300 rounded-full ${
                          player.progress.isComplete
                            ? 'bg-green-500'
                            : 'bg-blue-500'
                        }`}
                        style={{ width: `${player.progress.percentage}%` }}
                      />
                    </div>
                    <span className="text-[10px] text-white/60 tabular-nums">
                      {player.progress.current}/{player.progress.total}
                    </span>
                    {player.progress.isComplete && (
                      <CheckCircle2 className="w-3 h-3 text-green-400" />
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Location Header */}
      <Card className="bank-card border-amber-500/30">
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <div className="w-12 h-12 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-2xl">
              {location.icon}
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <MapPin className="w-4 h-4 text-amber-400" />
                <span className="text-xs text-amber-400 uppercase tracking-wider font-medium">
                  Your Location
                </span>
              </div>
              <h2 className="text-lg font-medium text-white mb-0.5">{location.name}</h2>
              <p className="text-sm text-white/70">{location.description}</p>
            </div>
          </div>

          {/* Location Progress */}
          <div className="mt-4 pt-3 border-t border-white/10">
            <div className="flex items-center justify-between text-xs text-white/60 mb-2">
              <span>Puzzles Completed</span>
              <span className="tabular-nums">{progress.current} / {progress.total}</span>
            </div>
            <div className="h-2 bg-white/10 rounded-full overflow-hidden">
              <div
                className={`h-full transition-all duration-500 rounded-full ${
                  progress.isComplete
                    ? 'bg-gradient-to-r from-green-500 to-green-400'
                    : 'bg-gradient-to-r from-blue-500 to-blue-400'
                }`}
                style={{ width: `${(progress.current / progress.total) * 100}%` }}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Puzzle Card or Completion */}
      {progress.isComplete ? (
        <Card className="bank-card border-green-500/30">
          <CardContent className="p-6 text-center">
            <div className="w-16 h-16 rounded-full bg-green-500/20 border border-green-500/30 flex items-center justify-center mx-auto mb-4">
              <CheckCircle2 className="w-8 h-8 text-green-400" />
            </div>
            <h3 className="text-lg font-medium text-white mb-2">Location Complete!</h3>
            <p className="text-sm text-white/70 mb-4">
              You've decoded all intel at this location. Wait for your teammates to finish their locations.
            </p>
            <Badge variant="outline" className="text-green-400 border-green-500/30">
              All {progress.total} puzzles solved
            </Badge>
          </CardContent>
        </Card>
      ) : puzzle && (
        <Card className="bank-card">
          <CardContent className="p-4 space-y-4">
            {/* Puzzle Header */}
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <FileText className="w-4 h-4 text-blue-400" />
                  <span className="text-xs text-blue-400 uppercase tracking-wider">
                    Puzzle {puzzle.index + 1} of {progress.total}
                  </span>
                </div>
                <h3 className="text-lg font-medium text-white">{puzzle.title}</h3>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowHint(!showHint)}
                className="text-amber-400 hover:text-amber-300 hover:bg-amber-500/10"
              >
                <Lightbulb className="w-4 h-4 mr-1" />
                Hint
              </Button>
            </div>

            {/* Objective */}
            <div className="flex gap-2 p-3 rounded-lg bg-blue-500/5 border border-blue-500/20">
              <Target className="w-4 h-4 text-blue-400 shrink-0 mt-0.5" />
              <div>
                <span className="text-xs text-blue-400/80 uppercase tracking-wider">Objective:</span>
                <p className="text-sm text-white mt-0.5">{puzzle.objective}</p>
              </div>
            </div>

            {/* Context */}
            <p className="text-sm text-white/70">{puzzle.context}</p>

            {/* Puzzle Data */}
            <div className="rounded-xl border border-white/20 bg-white/5 overflow-hidden">
              <div className="px-4 py-2.5 border-b border-white/10 bg-white/5">
                <span className="text-xs font-medium text-white/80 uppercase tracking-wider">
                  Intel Data
                </span>
              </div>
              <div className="p-3 space-y-1.5">
                {puzzle.data.map((line, idx) => (
                  <div
                    key={idx}
                    className={`font-mono text-sm py-1.5 px-3 rounded ${
                      line.startsWith('━') ? 'text-white/50 text-xs' : 'text-white bg-white/5'
                    }`}
                  >
                    {line}
                  </div>
                ))}
              </div>
            </div>

            {/* Hint */}
            {showHint && (
              <div className="flex items-start gap-2 p-3 rounded-lg bg-amber-500/10 border border-amber-500/20">
                <Lightbulb className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                <p className="text-sm text-amber-200">{puzzle.hint}</p>
              </div>
            )}

            {/* Answer Input */}
            <form onSubmit={(e) => { e.preventDefault(); handleSubmit(); }} className="space-y-3 pt-2 border-t border-white/10">
              <label className="text-sm font-medium text-white">
                Submit Answer
              </label>
              <div className="flex gap-2">
                <Input
                  type="text"
                  value={answer}
                  onChange={(e) => {
                    setAnswer(e.target.value.toUpperCase());
                    setError('');
                  }}
                  placeholder="ENTER ANSWER"
                  className="font-mono uppercase h-11 bg-white/10 border-white/40 text-white placeholder:text-white/50"
                  disabled={isSubmitting}
                />
                <Button
                  type="submit"
                  disabled={!answer.trim() || isSubmitting}
                  className="h-11 px-5"
                >
                  {isSubmitting ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Send className="w-4 h-4" />
                  )}
                </Button>
              </div>

              {error && (
                <Alert variant="destructive" className="py-2">
                  <AlertCircle className="w-4 h-4" />
                  <AlertDescription className="text-sm">{error}</AlertDescription>
                </Alert>
              )}
            </form>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

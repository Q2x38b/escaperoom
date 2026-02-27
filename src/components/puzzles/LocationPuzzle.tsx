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
  FileText, Target, Users, Landmark, Hotel, Warehouse,
  Building2, Ship, Plane, Database
} from 'lucide-react';

// Types for table data
interface TableCell {
  value: string;
  badge?: 'active' | 'inactive' | 'warning' | 'flag';
  flag?: string;
  hint?: string;
}

interface TableData {
  type: 'table';
  header: string;
  columns: string[];
  rows: (string | TableCell)[][];
  footer?: { label: string; value: string };
  encodedField: { row: number; col: number; hint: string };
}

interface RecordData {
  type: 'record';
  header: string;
  fields: { label: string; value: string; highlight?: boolean }[];
  encodedField: { label: string; value: string; hint: string };
}

// Render a table cell with proper styling
function TableCellRenderer({ cell, isEncoded }: { cell: string | TableCell; isEncoded: boolean }) {
  if (typeof cell === 'string') {
    return <span className={isEncoded ? 'font-mono text-amber-400 font-medium' : ''}>{cell}</span>;
  }

  const { value, badge, flag, hint } = cell;

  // Badge rendering
  if (badge) {
    const badgeStyles: Record<string, string> = {
      active: 'bg-green-500/20 text-green-400 border-green-500/30',
      inactive: 'bg-white/10 text-white/50 border-white/20',
      warning: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
      flag: 'bg-red-500/20 text-red-400 border-red-500/30',
    };
    return (
      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${badgeStyles[badge]}`}>
        {value}
      </span>
    );
  }

  // Flag with location
  if (flag) {
    return (
      <span className="flex items-center gap-1.5">
        <span>{flag}</span>
        <span>{value}</span>
      </span>
    );
  }

  // Encoded/hint field
  if (hint) {
    return (
      <span className="font-mono text-amber-400 font-medium bg-amber-500/10 px-1.5 py-0.5 rounded">
        {value}
      </span>
    );
  }

  return <span className={isEncoded ? 'font-mono text-amber-400 font-medium' : ''}>{value}</span>;
}

// Render the puzzle table
function PuzzleTable({ data }: { data: TableData }) {
  return (
    <div className="rounded-xl border border-white/20 bg-black/40 overflow-hidden">
      {/* Table Header */}
      <div className="px-4 py-3 border-b border-white/10 bg-white/5">
        <div className="flex items-center gap-2">
          <Database className="w-4 h-4 text-blue-400" />
          <span className="text-sm font-medium text-white tracking-wide">{data.header}</span>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-white/10">
              {data.columns.map((col, idx) => (
                <th
                  key={idx}
                  className="px-4 py-3 text-left text-xs font-medium text-white/60 uppercase tracking-wider whitespace-nowrap"
                >
                  {col}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {data.rows.map((row, rowIdx) => (
              <tr
                key={rowIdx}
                className={`hover:bg-white/5 transition-colors ${
                  rowIdx === data.encodedField.row ? 'bg-amber-500/5' : ''
                }`}
              >
                {row.map((cell, colIdx) => (
                  <td
                    key={colIdx}
                    className="px-4 py-3 text-sm text-white whitespace-nowrap"
                  >
                    <TableCellRenderer
                      cell={cell}
                      isEncoded={rowIdx === data.encodedField.row && colIdx === data.encodedField.col}
                    />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Footer */}
      {data.footer && (
        <div className="px-4 py-3 border-t border-white/10 bg-white/5 flex justify-between items-center">
          <span className="text-sm text-white/60">{data.footer.label}</span>
          <span className="text-sm font-medium text-white tabular-nums">{data.footer.value}</span>
        </div>
      )}
    </div>
  );
}

// Render record-style data (fallback)
function PuzzleRecord({ data }: { data: RecordData }) {
  return (
    <div className="rounded-xl border border-white/20 bg-black/40 overflow-hidden">
      <div className="px-4 py-3 border-b border-white/10 bg-white/5">
        <span className="text-sm font-medium text-white tracking-wide">{data.header}</span>
      </div>
      <div className="p-4 space-y-2">
        {data.fields.map((field, idx) => (
          <div key={idx} className="flex justify-between items-center py-2 border-b border-white/5 last:border-0">
            <span className="text-sm text-white/60">{field.label}</span>
            <span className={`text-sm ${field.highlight ? 'font-mono text-amber-400' : 'text-white'}`}>
              {field.value}
            </span>
          </div>
        ))}
        <div className="mt-4 p-3 rounded-lg bg-amber-500/10 border border-amber-500/20">
          <div className="text-xs text-amber-400 uppercase tracking-wider mb-1">{data.encodedField.hint}</div>
          <div className="font-mono text-amber-400 font-medium">{data.encodedField.value}</div>
        </div>
      </div>
    </div>
  );
}

// Map icon names to Lucide components
const LOCATION_ICONS: Record<string, React.ElementType> = {
  landmark: Landmark,
  hotel: Hotel,
  warehouse: Warehouse,
  'building-2': Building2,
  ship: Ship,
  plane: Plane,
};

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
    } catch {
      setError('Failed to submit answer');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Get the icon component for a location
  const getLocationIcon = (iconName: string) => {
    const IconComponent = LOCATION_ICONS[iconName];
    return IconComponent || MapPin;
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
  const LocationIcon = getLocationIcon(location.icon);

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
              {teamProgress.map((player) => {
                const PlayerIcon = player.location?.icon ? getLocationIcon(player.location.icon) : MapPin;
                return (
                  <div
                    key={player.odentifier}
                    className={`p-2 rounded-lg border ${
                      player.odentifier === currentPlayerId
                        ? 'border-white/40 bg-white/10'
                        : 'border-white/10 bg-white/5'
                    }`}
                  >
                    <div className="flex items-center gap-1.5 mb-1">
                      <PlayerIcon className="w-3.5 h-3.5 text-amber-400" />
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
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Location Header */}
      <Card className="bank-card border-amber-500/30">
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <div className="w-12 h-12 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center">
              <LocationIcon className="w-6 h-6 text-amber-400" />
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
            <div>
              <div className="flex items-center gap-2 mb-1">
                <FileText className="w-4 h-4 text-blue-400" />
                <span className="text-xs text-blue-400 uppercase tracking-wider">
                  Puzzle {puzzle.index + 1} of {progress.total}
                </span>
              </div>
              <h3 className="text-lg font-medium text-white">{puzzle.title}</h3>
            </div>

            {/* Objective */}
            <div className="flex gap-2 p-3 rounded-lg bg-blue-500/5 border border-blue-500/20">
              <Target className="w-4 h-4 text-blue-400 shrink-0 mt-0.5" />
              <p className="text-sm text-white">{puzzle.objective}</p>
            </div>

            {/* Puzzle Data Table */}
            {puzzle.data.type === 'table' ? (
              <PuzzleTable data={puzzle.data as TableData} />
            ) : (
              <PuzzleRecord data={puzzle.data as RecordData} />
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

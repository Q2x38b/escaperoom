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
  Building2, Ship, Plane, Database, Terminal, Mail, ScrollText, Paperclip
} from 'lucide-react';

// Types for puzzle data
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

interface TerminalData {
  type: 'terminal';
  prompt: string;
  lines: { prefix?: string; content: string; encoded?: boolean; style?: 'success' | 'error' | 'warning' | 'info' }[];
  encodedHint: string;
}

interface DocumentData {
  type: 'document';
  letterhead: string;
  date: string;
  reference: string;
  body: string[];
  encodedLine: { index: number; hint: string };
  signature?: { name: string; title: string };
}

interface EmailData {
  type: 'email';
  from: string;
  to: string;
  subject: string;
  date: string;
  body: string[];
  encodedLine: { index: number; hint: string };
  attachments?: string[];
}

interface LogData {
  type: 'log';
  header: string;
  entries: { timestamp: string; level: 'info' | 'warn' | 'error' | 'debug'; message: string; encoded?: boolean }[];
  encodedHint: string;
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

// Render terminal-style display
function PuzzleTerminal({ data }: { data: TerminalData }) {
  const lineStyles: Record<string, string> = {
    success: 'text-green-400',
    error: 'text-red-400',
    warning: 'text-amber-400',
    info: 'text-blue-400',
  };

  return (
    <div className="rounded-xl border border-green-500/30 bg-black overflow-hidden font-mono">
      {/* Terminal Header */}
      <div className="px-4 py-2 border-b border-green-500/20 bg-green-500/5 flex items-center gap-2">
        <Terminal className="w-4 h-4 text-green-400" />
        <span className="text-sm text-green-400">{data.prompt}</span>
        <div className="ml-auto flex gap-1.5">
          <div className="w-3 h-3 rounded-full bg-red-500/60" />
          <div className="w-3 h-3 rounded-full bg-yellow-500/60" />
          <div className="w-3 h-3 rounded-full bg-green-500/60" />
        </div>
      </div>

      {/* Terminal Content */}
      <div className="p-4 space-y-1 text-sm max-h-64 overflow-y-auto">
        {data.lines.map((line, idx) => (
          <div key={idx} className={`${line.encoded ? 'bg-amber-500/10 px-2 py-1 rounded' : ''}`}>
            {line.prefix && (
              <span className="text-white/50">{line.prefix} </span>
            )}
            <span className={line.encoded ? 'text-amber-400 font-medium' : (line.style ? lineStyles[line.style] : 'text-green-300')}>
              {line.content}
            </span>
          </div>
        ))}
      </div>

      {/* Hint Footer */}
      <div className="px-4 py-2 border-t border-green-500/20 bg-green-500/5">
        <span className="text-xs text-amber-400">HINT: {data.encodedHint}</span>
      </div>
    </div>
  );
}

// Render official document
function PuzzleDocument({ data }: { data: DocumentData }) {
  return (
    <div className="rounded-xl border border-white/20 bg-white/[0.02] overflow-hidden">
      {/* Letterhead */}
      <div className="px-5 py-4 border-b border-white/10 bg-white/5">
        <div className="flex items-center gap-2 mb-2">
          <ScrollText className="w-4 h-4 text-blue-400" />
          <span className="text-sm font-semibold text-white tracking-wide">{data.letterhead}</span>
        </div>
        <div className="flex gap-6 text-xs text-white/50">
          <span>Date: {data.date}</span>
          <span>Ref: {data.reference}</span>
        </div>
      </div>

      {/* Document Body */}
      <div className="p-5 space-y-2 text-sm">
        {data.body.map((line, idx) => (
          <p
            key={idx}
            className={`${
              line === '' ? 'h-3' :
              idx === data.encodedLine.index
                ? 'font-mono text-amber-400 bg-amber-500/10 px-2 py-1 rounded'
                : 'text-white/80'
            }`}
          >
            {line}
          </p>
        ))}
      </div>

      {/* Signature */}
      {data.signature && (
        <div className="px-5 py-3 border-t border-white/10">
          <p className="text-sm text-white/80 italic">{data.signature.name}</p>
          <p className="text-xs text-white/50">{data.signature.title}</p>
        </div>
      )}

      {/* Hint */}
      <div className="px-5 py-2 bg-amber-500/5 border-t border-amber-500/20">
        <span className="text-xs text-amber-400">DECODE: {data.encodedLine.hint}</span>
      </div>
    </div>
  );
}

// Render email display
function PuzzleEmail({ data }: { data: EmailData }) {
  return (
    <div className="rounded-xl border border-white/20 bg-white/[0.02] overflow-hidden">
      {/* Email Header */}
      <div className="px-4 py-3 border-b border-white/10 bg-white/5 space-y-2">
        <div className="flex items-center gap-2">
          <Mail className="w-4 h-4 text-blue-400" />
          <span className="text-sm font-medium text-white">{data.subject}</span>
        </div>
        <div className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-xs">
          <span className="text-white/40">From:</span>
          <span className="text-white/70">{data.from}</span>
          <span className="text-white/40">To:</span>
          <span className="text-white/70">{data.to}</span>
          <span className="text-white/40">Date:</span>
          <span className="text-white/70">{data.date}</span>
        </div>
      </div>

      {/* Email Body */}
      <div className="p-4 space-y-2 text-sm">
        {data.body.map((line, idx) => (
          <p
            key={idx}
            className={`${
              line === '' ? 'h-3' :
              idx === data.encodedLine.index
                ? 'font-mono text-amber-400 bg-amber-500/10 px-2 py-1 rounded'
                : 'text-white/80'
            }`}
          >
            {line}
          </p>
        ))}
      </div>

      {/* Attachments */}
      {data.attachments && data.attachments.length > 0 && (
        <div className="px-4 py-2 border-t border-white/10 bg-white/5">
          <div className="flex items-center gap-2 text-xs text-white/50 mb-1">
            <Paperclip className="w-3 h-3" />
            <span>Attachments ({data.attachments.length})</span>
          </div>
          <div className="flex flex-wrap gap-2">
            {data.attachments.map((att, idx) => (
              <span key={idx} className="text-xs px-2 py-1 bg-white/10 rounded text-white/70">
                {att}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Hint */}
      <div className="px-4 py-2 bg-amber-500/5 border-t border-amber-500/20">
        <span className="text-xs text-amber-400">DECODE: {data.encodedLine.hint}</span>
      </div>
    </div>
  );
}

// Render log display
function PuzzleLog({ data }: { data: LogData }) {
  const levelStyles: Record<string, { bg: string; text: string; label: string }> = {
    info: { bg: 'bg-blue-500/20', text: 'text-blue-400', label: 'INFO' },
    warn: { bg: 'bg-amber-500/20', text: 'text-amber-400', label: 'WARN' },
    error: { bg: 'bg-red-500/20', text: 'text-red-400', label: 'ERR' },
    debug: { bg: 'bg-white/10', text: 'text-white/50', label: 'DBG' },
  };

  return (
    <div className="rounded-xl border border-white/20 bg-black/60 overflow-hidden font-mono">
      {/* Log Header */}
      <div className="px-4 py-2 border-b border-white/10 bg-white/5 flex items-center gap-2">
        <FileText className="w-4 h-4 text-white/60" />
        <span className="text-sm text-white/80">{data.header}</span>
      </div>

      {/* Log Entries */}
      <div className="p-3 space-y-1.5 text-xs max-h-72 overflow-y-auto">
        {data.entries.map((entry, idx) => {
          const style = levelStyles[entry.level];
          return (
            <div
              key={idx}
              className={`flex items-start gap-2 p-2 rounded ${entry.encoded ? 'bg-amber-500/10 border border-amber-500/30' : 'bg-white/[0.02]'}`}
            >
              <span className="text-white/40 shrink-0">{entry.timestamp}</span>
              <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${style.bg} ${style.text}`}>
                {style.label}
              </span>
              <span className={entry.encoded ? 'text-amber-400 font-medium' : 'text-white/70 flex-1'}>
                {entry.message}
              </span>
            </div>
          );
        })}
      </div>

      {/* Hint */}
      <div className="px-4 py-2 border-t border-white/10 bg-white/5">
        <span className="text-xs text-amber-400">HINT: {data.encodedHint}</span>
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

            {/* Puzzle Data Display */}
            {puzzle.data.type === 'table' && <PuzzleTable data={puzzle.data as TableData} />}
            {puzzle.data.type === 'terminal' && <PuzzleTerminal data={puzzle.data as TerminalData} />}
            {puzzle.data.type === 'document' && <PuzzleDocument data={puzzle.data as DocumentData} />}
            {puzzle.data.type === 'email' && <PuzzleEmail data={puzzle.data as EmailData} />}
            {puzzle.data.type === 'log' && <PuzzleLog data={puzzle.data as LogData} />}

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

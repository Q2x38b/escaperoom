import { useGameStore } from '../../stores/gameStore';
import { useRoom } from '../../hooks/useRoom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Separator } from '../ui/separator';
import { Users, Copy, Check, Play, Crown, Loader2, X, DoorClosed, MapPin, UserCheck } from 'lucide-react';
import { useState } from 'react';

type GameMode = 'classic' | 'locations';

export function WaitingRoom() {
  const { roomId, players, isHost, playerId } = useGameStore();
  const { startGame, startGameWithLocations, roomCode, kickPlayer, closeRoom } = useRoom();
  const [copied, setCopied] = useState(false);
  const [isStarting, setIsStarting] = useState(false);
  const [showCloseConfirm, setShowCloseConfirm] = useState(false);
  const [kickingPlayer, setKickingPlayer] = useState<string | null>(null);
  const [gameMode, setGameMode] = useState<GameMode>('classic');

  const canStart = players.length >= 2;
  const displayCode = roomCode || roomId;

  const handleKickPlayer = async (targetId: string) => {
    setKickingPlayer(targetId);
    await kickPlayer(targetId);
    setKickingPlayer(null);
  };

  const handleCloseRoom = async () => {
    await closeRoom();
  };

  const handleCopyCode = async () => {
    if (displayCode) {
      await navigator.clipboard.writeText(displayCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleStartGame = async () => {
    setIsStarting(true);
    if (gameMode === 'locations') {
      await startGameWithLocations();
    } else {
      await startGame();
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <Card className="bank-card">
          <CardHeader className="text-center">
            <CardTitle className="text-xl">Investigation Briefing Room</CardTitle>
            <CardDescription>
              Share the room code with your team to join
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-4 sm:space-y-6">
            {/* Room Code */}
            <div className="bg-white/5 border border-white/20 rounded-lg p-4 sm:p-6 text-center">
              <div className="text-xs text-white/80 mb-2 font-mono" aria-hidden="true">ROOM CODE</div>
              <div className="flex items-center justify-center gap-2 sm:gap-3">
                <span className="text-2xl sm:text-3xl font-mono tracking-[0.2em] sm:tracking-[0.3em] text-white tabular-nums">
                  {displayCode}
                </span>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={handleCopyCode}
                  aria-label={copied ? "Room code copied" : `Copy room code ${displayCode}`}
                  className="h-8 w-8"
                >
                  {copied ? (
                    <Check className="w-4 h-4 text-green-400" aria-hidden="true" />
                  ) : (
                    <Copy className="w-4 h-4" aria-hidden="true" />
                  )}
                </Button>
              </div>
            </div>

            <Separator />

            {/* Connected Players */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-white">
                  Investigation Team
                </span>
                <Badge variant={canStart ? 'success' : 'warning'} className="tabular-nums">
                  <Users className="w-3 h-3 mr-1" aria-hidden="true" />
                  <span aria-label={`${players.length} of 6 players`}>{players.length}/6</span>
                </Badge>
              </div>

              <div className="space-y-2">
                {players.map((player) => (
                  <div
                    key={player.id}
                    className="flex items-center justify-between bg-white/10 rounded-lg px-4 py-3"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center text-sm font-medium text-white">
                        {player.nickname.charAt(0).toUpperCase()}
                      </div>
                      <span className="font-medium text-white">
                        {player.nickname}
                        {player.id === playerId && (
                          <span className="text-xs text-white/70 ml-2">(you)</span>
                        )}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      {player.isHost && (
                        <Crown className="w-4 h-4 text-amber-400" aria-label="Host" />
                      )}
                      {isHost && !player.isHost && (
                        <Button
                          variant="ghost"
                          size="icon"
                          aria-label={`Remove ${player.nickname} from room`}
                          className="h-7 w-7 text-white/70 hover:text-red-400 hover:bg-red-500/10"
                          onClick={() => handleKickPlayer(player.id)}
                          disabled={kickingPlayer === player.id}
                        >
                          {kickingPlayer === player.id ? (
                            <Loader2 className="w-3 h-3 animate-spin" aria-hidden="true" />
                          ) : (
                            <X className="w-3 h-3" aria-hidden="true" />
                          )}
                        </Button>
                      )}
                    </div>
                  </div>
                ))}

                {/* Empty slots - show up to 6 */}
                {players.length < 6 && (
                  <div className="flex items-center justify-center bg-white/5 border border-dashed border-white/30 rounded-lg px-4 py-3 text-white/60">
                    <span className="text-sm">+ {6 - players.length} more can join...</span>
                  </div>
                )}
              </div>
            </div>

            <Separator />

            {/* Game Mode Selection & Start */}
            {isHost ? (
              <div className="space-y-3">
                {/* Game Mode Selector */}
                <div className="space-y-2">
                  <span className="text-xs text-white/60 font-medium">Game Mode</span>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={() => setGameMode('classic')}
                      className={`p-3 rounded-lg border transition-all text-left ${
                        gameMode === 'classic'
                          ? 'border-white/50 bg-white/10'
                          : 'border-white/20 bg-white/5 hover:bg-white/10'
                      }`}
                    >
                      <div className="flex items-center gap-2 mb-1">
                        <UserCheck className={`w-4 h-4 ${gameMode === 'classic' ? 'text-green-400' : 'text-white/60'}`} />
                        <span className={`text-sm font-medium ${gameMode === 'classic' ? 'text-white' : 'text-white/80'}`}>
                          Classic
                        </span>
                      </div>
                      <p className="text-[10px] text-white/60">
                        Team roles, shared puzzles
                      </p>
                    </button>
                    <button
                      onClick={() => setGameMode('locations')}
                      className={`p-3 rounded-lg border transition-all text-left ${
                        gameMode === 'locations'
                          ? 'border-amber-500/50 bg-amber-500/10'
                          : 'border-white/20 bg-white/5 hover:bg-white/10'
                      }`}
                    >
                      <div className="flex items-center gap-2 mb-1">
                        <MapPin className={`w-4 h-4 ${gameMode === 'locations' ? 'text-amber-400' : 'text-white/60'}`} />
                        <span className={`text-sm font-medium ${gameMode === 'locations' ? 'text-white' : 'text-white/80'}`}>
                          Split Ops
                        </span>
                      </div>
                      <p className="text-[10px] text-white/60">
                        Each player, own location
                      </p>
                    </button>
                  </div>
                </div>

                <Button
                  onClick={handleStartGame}
                  disabled={!canStart || isStarting}
                  className="w-full bg-white text-black hover:bg-white/90"
                  size="lg"
                >
                  {isStarting ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" aria-hidden="true" />
                      Starting...
                    </>
                  ) : (
                    <>
                      <Play className="w-4 h-4 mr-2" aria-hidden="true" />
                      Begin {gameMode === 'locations' ? 'Split Operations' : 'Investigation'}
                    </>
                  )}
                </Button>
                {!canStart && (
                  <p className="text-xs text-center text-white/70">
                    Need at least 2 investigators to begin
                  </p>
                )}

                {/* Close Room Button */}
                {showCloseConfirm ? (
                  <div className="flex gap-2">
                    <Button
                      variant="destructive"
                      size="sm"
                      className="flex-1"
                      onClick={handleCloseRoom}
                    >
                      Confirm Close
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1 border-white/30 text-white hover:bg-white/10"
                      onClick={() => setShowCloseConfirm(false)}
                    >
                      Cancel
                    </Button>
                  </div>
                ) : (
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full text-white/80 border-white/30 hover:bg-white/10"
                    onClick={() => setShowCloseConfirm(true)}
                  >
                    <DoorClosed className="w-4 h-4 mr-2" aria-hidden="true" />
                    Close Room
                  </Button>
                )}
              </div>
            ) : (
              <div className="text-center py-4" aria-live="polite">
                <Loader2 className="w-6 h-6 mx-auto mb-2 animate-spin text-white/80" aria-hidden="true" />
                <p className="text-sm text-white/80">
                  Waiting for host to start the investigation...
                </p>
              </div>
            )}

            {/* Mission Briefing */}
            <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-4">
              <div className="text-xs text-amber-400 font-mono mb-2">MISSION BRIEFING</div>
              <p className="text-sm text-white/90">
                Intelligence suggests the Vance family has been moving large sums through
                offshore accounts. Your team must trace the money trail and uncover their
                secrets. Work together to decode encrypted financial records.
              </p>
            </div>

            {/* How to Play Instructions */}
            <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-4">
              <div className="font-medium text-blue-400 mb-2 text-sm">How to Play</div>
              <ul className="space-y-1.5 text-white/90 text-xs">
                <li className="flex items-start gap-2">
                  <span className="text-blue-400">1.</span>
                  <span>Work together to solve 3 decoding puzzles (hex, base64, binary)</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-blue-400">2.</span>
                  <span>Only one person can type an answer at a time - coordinate with your team</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-blue-400">3.</span>
                  <span>Use the chat button in the top bar to communicate with teammates</span>
                </li>
              </ul>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

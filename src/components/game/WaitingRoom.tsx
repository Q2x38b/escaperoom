import { useGameStore } from '../../stores/gameStore';
import { useRoom } from '../../hooks/useRoom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Separator } from '../ui/separator';
import { Alert, AlertDescription } from '../ui/alert';
import { Users, Copy, Check, Play, Crown, Loader2, X, DoorClosed, Info } from 'lucide-react';
import { useState } from 'react';

export function WaitingRoom() {
  const { roomId, players, isHost, playerId } = useGameStore();
  const { startGame, roomCode, kickPlayer, closeRoom } = useRoom();
  const [copied, setCopied] = useState(false);
  const [isStarting, setIsStarting] = useState(false);
  const [showCloseConfirm, setShowCloseConfirm] = useState(false);
  const [kickingPlayer, setKickingPlayer] = useState<string | null>(null);

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
    await startGame();
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

          <CardContent className="space-y-6">
            {/* Room Code */}
            <div className="bg-black/30 rounded-lg p-6 text-center">
              <div className="text-xs text-muted-foreground mb-2 font-mono">ROOM CODE</div>
              <div className="flex items-center justify-center gap-3">
                <span className="text-3xl font-mono tracking-[0.3em] text-primary">
                  {displayCode}
                </span>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={handleCopyCode}
                  className="h-8 w-8"
                >
                  {copied ? (
                    <Check className="w-4 h-4 text-green-400" />
                  ) : (
                    <Copy className="w-4 h-4" />
                  )}
                </Button>
              </div>
            </div>

            <Separator />

            {/* Connected Players */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-muted-foreground">
                  Investigation Team
                </span>
                <Badge variant={canStart ? 'success' : 'warning'}>
                  <Users className="w-3 h-3 mr-1" />
                  {players.length}/4
                </Badge>
              </div>

              <div className="space-y-2">
                {players.map((player) => (
                  <div
                    key={player.id}
                    className="flex items-center justify-between bg-muted/30 rounded-lg px-4 py-3"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-sm font-medium">
                        {player.nickname.charAt(0).toUpperCase()}
                      </div>
                      <span className="font-medium">
                        {player.nickname}
                        {player.id === playerId && (
                          <span className="text-xs text-muted-foreground ml-2">(you)</span>
                        )}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      {player.isHost && (
                        <Crown className="w-4 h-4 text-amber-400" />
                      )}
                      {isHost && !player.isHost && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                          onClick={() => handleKickPlayer(player.id)}
                          disabled={kickingPlayer === player.id}
                        >
                          {kickingPlayer === player.id ? (
                            <Loader2 className="w-3 h-3 animate-spin" />
                          ) : (
                            <X className="w-3 h-3" />
                          )}
                        </Button>
                      )}
                    </div>
                  </div>
                ))}

                {/* Empty slots */}
                {Array.from({ length: 4 - players.length }).map((_, i) => (
                  <div
                    key={`empty-${i}`}
                    className="flex items-center justify-center bg-muted/10 border border-dashed border-border/50 rounded-lg px-4 py-3 text-muted-foreground/50"
                  >
                    <span className="text-sm">Waiting for investigator...</span>
                  </div>
                ))}
              </div>
            </div>

            <Separator />

            {/* Start Game Button */}
            {isHost ? (
              <div className="space-y-3">
                <Button
                  onClick={handleStartGame}
                  disabled={!canStart || isStarting}
                  className="w-full"
                  size="lg"
                >
                  {isStarting ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Starting...
                    </>
                  ) : (
                    <>
                      <Play className="w-4 h-4 mr-2" />
                      Begin Investigation
                    </>
                  )}
                </Button>
                {!canStart && (
                  <p className="text-xs text-center text-muted-foreground">
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
                      className="flex-1"
                      onClick={() => setShowCloseConfirm(false)}
                    >
                      Cancel
                    </Button>
                  </div>
                ) : (
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full text-muted-foreground"
                    onClick={() => setShowCloseConfirm(true)}
                  >
                    <DoorClosed className="w-4 h-4 mr-2" />
                    Close Room
                  </Button>
                )}
              </div>
            ) : (
              <div className="text-center py-4">
                <Loader2 className="w-6 h-6 mx-auto mb-2 animate-spin text-muted-foreground" />
                <p className="text-sm text-muted-foreground">
                  Waiting for host to start the investigation...
                </p>
              </div>
            )}

            {/* Mission Briefing */}
            <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-4">
              <div className="text-xs text-amber-400 font-mono mb-2">MISSION BRIEFING</div>
              <p className="text-sm text-muted-foreground">
                Intelligence suggests the Vance family has been moving large sums through
                offshore accounts. Your team must trace the money trail and uncover their
                secrets. Work together to decode encrypted financial records.
              </p>
            </div>

            {/* How to Play Instructions */}
            <Alert className="bg-blue-500/10 border-blue-500/30">
              <Info className="w-4 h-4 text-blue-400" />
              <AlertDescription className="text-sm">
                <div className="font-medium text-blue-400 mb-2">How to Play</div>
                <ul className="space-y-1 text-muted-foreground text-xs">
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
                    <span>Use the chat panel (bottom right) to communicate with teammates</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-blue-400">4.</span>
                    <span>Request hints if you get stuck, but try to solve puzzles together first</span>
                  </li>
                </ul>
              </AlertDescription>
            </Alert>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

import { useGameStore } from '../../stores/gameStore';
import { useRoom } from '../../hooks/useRoom';
import { Card, CardContent } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Separator } from '../ui/separator';
import { Trophy, Clock, Users, Copy, Check, Plane, ArrowRight, Trash2 } from 'lucide-react';
import { useState, useEffect } from 'react';
import { formatTime } from '../../lib/utils';

export function VictoryScreen() {
  const { finalPasscode, completionTime, players, reset } = useGameStore();
  const { deleteRoomData } = useRoom();
  const [copied, setCopied] = useState(false);
  const [showPasscode, setShowPasscode] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    // Dramatic reveal delay
    const timer = setTimeout(() => setShowPasscode(true), 1500);
    return () => clearTimeout(timer);
  }, []);

  const handleCloseInvestigation = async () => {
    setIsDeleting(true);
    await deleteRoomData();
    reset();
    // The store reset will take the user back to entry screen
  };

  const handleCopyPasscode = async () => {
    if (finalPasscode) {
      await navigator.clipboard.writeText(finalPasscode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-lg">
        <Card className="bank-card overflow-hidden">
          {/* Success Header */}
          <div className="bg-green-500/10 border-b border-green-500/30 p-6 text-center">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-green-500/20 mb-4">
              <Trophy className="w-8 h-8 text-green-400" />
            </div>
            <h2 className="text-2xl font-bold text-green-400 mb-2">
              INVESTIGATION COMPLETE
            </h2>
            <p className="text-muted-foreground">
              You've successfully traced the money trail
            </p>
          </div>

          <CardContent className="p-6 space-y-6">
            {/* Stats */}
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-muted/30 rounded-lg p-4 text-center">
                <Clock className="w-5 h-5 mx-auto mb-2 text-muted-foreground" />
                <div className="text-2xl font-mono font-bold">
                  {completionTime ? formatTime(completionTime) : '--:--'}
                </div>
                <div className="text-xs text-muted-foreground">Total Time</div>
              </div>
              <div className="bg-muted/30 rounded-lg p-4 text-center">
                <Users className="w-5 h-5 mx-auto mb-2 text-muted-foreground" />
                <div className="text-2xl font-mono font-bold">{players.length}</div>
                <div className="text-xs text-muted-foreground">Investigators</div>
              </div>
            </div>

            <Separator />

            {/* Investigation Summary */}
            <div className="space-y-3">
              <h3 className="text-sm font-medium text-muted-foreground">
                Investigation Summary
              </h3>
              <div className="bg-muted/20 rounded-lg p-4 space-y-2 text-sm">
                <div className="flex items-start gap-2">
                  <Badge variant="success" className="mt-0.5">1</Badge>
                  <span>Decoded account holder: <span className="text-amber-400 font-mono">VANCE</span></span>
                </div>
                <div className="flex items-start gap-2">
                  <Badge variant="success" className="mt-0.5">2</Badge>
                  <span>Found transaction: <span className="text-amber-400 font-mono">DONATION-50000-AIRCRAFT</span></span>
                </div>
                <div className="flex items-start gap-2">
                  <Badge variant="success" className="mt-0.5">3</Badge>
                  <span>Traced funds to: <span className="text-amber-400 font-mono">CAYMAN</span></span>
                </div>
                <div className="flex items-start gap-2">
                  <Badge variant="success" className="mt-0.5">4</Badge>
                  <span>Identified asset: <span className="text-amber-400 font-mono">PLANE</span></span>
                </div>
                <div className="flex items-start gap-2">
                  <Badge variant="success" className="mt-0.5">5</Badge>
                  <span>Retrieved aircraft registry</span>
                </div>
              </div>
            </div>

            <Separator />

            {/* Final Passcode Reveal */}
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                <Plane className="w-4 h-4" />
                <span>Aircraft Registration Number</span>
              </div>

              <div className="bg-black/50 border border-green-500/30 rounded-lg p-6 text-center">
                {showPasscode ? (
                  <>
                    <div className="text-xs text-green-400 font-mono mb-2">
                      FLIGHT LOGS ACCESS CODE
                    </div>
                    <div className="flex items-center justify-center gap-3">
                      <span className="text-4xl font-mono tracking-[0.2em] text-green-400 font-bold">
                        {finalPasscode}
                      </span>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={handleCopyPasscode}
                        className="h-8 w-8"
                      >
                        {copied ? (
                          <Check className="w-4 h-4 text-green-400" />
                        ) : (
                          <Copy className="w-4 h-4" />
                        )}
                      </Button>
                    </div>
                  </>
                ) : (
                  <div className="h-16 flex items-center justify-center">
                    <div className="shimmer h-10 w-48 rounded" />
                  </div>
                )}
              </div>

              <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <ArrowRight className="w-5 h-5 text-amber-400 mt-0.5" />
                  <div>
                    <div className="font-medium text-amber-400 mb-1">Next Step: Flight Logs</div>
                    <p className="text-sm text-muted-foreground">
                      Use this aircraft registration number to access the flight logs
                      and discover where the Vance family's plane has been traveling.
                    </p>
                  </div>
                </div>
              </div>

              <Button
                variant="outline"
                onClick={handleCloseInvestigation}
                disabled={isDeleting}
                className="w-full mt-4"
              >
                <Trash2 className="w-4 h-4 mr-2" />
                {isDeleting ? 'Closing Investigation...' : 'Close Investigation & Clear Room Data'}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

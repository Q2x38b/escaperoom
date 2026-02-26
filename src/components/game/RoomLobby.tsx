import { useState, useEffect } from 'react';
import { Input } from '../ui/input';
import { Button } from '../ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Separator } from '../ui/separator';
import { useRoom } from '../../hooks/useRoom';
import { Users, Plus, ArrowRight, AlertCircle, Wifi, Loader2 } from 'lucide-react';

export function RoomLobby() {
  const [nickname, setNickname] = useState('');
  const [roomCode, setRoomCode] = useState('');
  const [validationError, setValidationError] = useState('');

  const { isConnected, isConnecting, connectionError, createRoom, joinRoom, clearError } = useRoom();

  // Clear validation error when connection error appears
  useEffect(() => {
    if (connectionError) {
      setValidationError('');
    }
  }, [connectionError]);

  const handleCreateRoom = async () => {
    if (!nickname.trim()) {
      setValidationError('Please enter a nickname');
      return;
    }
    setValidationError('');
    clearError();
    await createRoom(nickname.trim());
  };

  const handleJoinRoom = async () => {
    if (!nickname.trim()) {
      setValidationError('Please enter a nickname');
      return;
    }
    if (!roomCode.trim()) {
      setValidationError('Please enter a room code');
      return;
    }
    setValidationError('');
    clearError();
    await joinRoom(roomCode.trim().toUpperCase(), nickname.trim());
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Connection status */}
        <div className="flex items-center justify-center gap-2 mb-6">
          {isConnecting ? (
            <>
              <Loader2 className="w-4 h-4 text-amber-400 animate-spin" />
              <span className="text-sm font-mono text-amber-400">Connecting...</span>
            </>
          ) : (
            <>
              <Wifi className={`w-4 h-4 ${isConnected ? 'text-green-400' : 'text-white/80'}`} />
              <span className={`text-sm font-mono ${isConnected ? 'text-green-400' : 'text-white/80'}`}>
                {isConnected ? 'Ready' : 'Ready to connect'}
              </span>
            </>
          )}
        </div>

        <Card className="bank-card">
          <CardHeader className="text-center">
            <CardTitle className="text-xl">Investigation Portal</CardTitle>
            <CardDescription>
              Create or join an investigation room to begin
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-6">
            {/* Nickname input */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-white">
                Your Codename
              </label>
              <Input
                type="text"
                value={nickname}
                onChange={(e) => setNickname(e.target.value)}
                placeholder="Enter your codename"
                maxLength={20}
                disabled={isConnecting}
                className="bg-white/10 border-white/40 text-white placeholder:text-white/60"
              />
            </div>

            {(validationError || connectionError) && (
              <div className="flex items-start gap-2 text-destructive text-sm bg-destructive/10 p-3 rounded-lg">
                <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                <span>{validationError || connectionError}</span>
              </div>
            )}

            {/* Create Room */}
            <div className="space-y-3">
              <Button
                onClick={handleCreateRoom}
                disabled={isConnecting || !nickname.trim()}
                className="w-full bg-white text-black hover:bg-white/90"
              >
                {isConnecting ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Plus className="w-4 h-4 mr-2" />
                )}
                {isConnecting ? 'Creating...' : 'Create Investigation Room'}
              </Button>
            </div>

            <div className="relative">
              <Separator className="bg-white/20" />
              <span className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 bg-card px-3 text-xs text-white/80">
                OR
              </span>
            </div>

            {/* Join Room */}
            <div className="space-y-3">
              <label className="text-sm font-medium text-white">
                Room Code
              </label>
              <div className="flex gap-2">
                <Input
                  type="text"
                  value={roomCode}
                  onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
                  onKeyDown={(e) => e.key === 'Enter' && !isConnecting && nickname.trim() && roomCode.trim() && handleJoinRoom()}
                  placeholder="XXXXXXXX"
                  maxLength={8}
                  disabled={isConnecting}
                  className="font-mono tracking-widest bg-white/10 border-white/40 text-white text-center placeholder:text-white/60"
                />
                <Button
                  onClick={handleJoinRoom}
                  disabled={isConnecting || !nickname.trim() || !roomCode.trim()}
                  variant="secondary"
                >
                  {isConnecting ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <ArrowRight className="w-4 h-4" />
                  )}
                </Button>
              </div>
              {!nickname.trim() && roomCode.trim() && (
                <p className="text-xs text-amber-400">Enter your codename above first</p>
              )}
            </div>

            {/* Info */}
            <div className="bg-white/5 rounded-lg p-4 space-y-2 border border-white/20">
              <div className="flex items-center gap-2 text-sm text-white/90">
                <Users className="w-4 h-4" />
                <span>Requires 2+ investigators to begin</span>
              </div>
              <p className="text-xs text-white/70 mt-2">
                Don't have a codename? Pick any alias to identify yourself during the investigation.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

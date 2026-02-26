import { useState } from 'react';
import { Input } from '../ui/input';
import { Button } from '../ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Separator } from '../ui/separator';
import { usePeer } from '../../hooks/usePeer';
import { Users, Plus, ArrowRight, AlertCircle, Wifi } from 'lucide-react';

export function RoomLobby() {
  const [nickname, setNickname] = useState('');
  const [roomCode, setRoomCode] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const { isConnected, createRoom, joinRoom } = usePeer();

  const handleCreateRoom = () => {
    if (!nickname.trim()) {
      setError('Please enter a nickname');
      return;
    }
    setError('');
    setIsLoading(true);
    createRoom(nickname.trim());
  };

  const handleJoinRoom = () => {
    if (!nickname.trim()) {
      setError('Please enter a nickname');
      return;
    }
    if (!roomCode.trim()) {
      setError('Please enter a room code');
      return;
    }
    setError('');
    setIsLoading(true);
    joinRoom(roomCode.trim().toUpperCase(), nickname.trim());
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Connection status */}
        <div className="flex items-center justify-center gap-2 mb-6">
          <Wifi className={`w-4 h-4 ${isConnected ? 'text-green-400' : 'text-muted-foreground'}`} />
          <span className={`text-sm font-mono ${isConnected ? 'text-green-400' : 'text-muted-foreground'}`}>
            {isConnected ? 'Ready' : 'Initializing...'}
          </span>
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
              <label className="text-sm font-medium text-muted-foreground">
                Your Codename
              </label>
              <Input
                type="text"
                value={nickname}
                onChange={(e) => setNickname(e.target.value)}
                placeholder="Enter your codename"
                maxLength={20}
                className="bg-black/30"
              />
            </div>

            {error && (
              <div className="flex items-center gap-2 text-destructive text-sm">
                <AlertCircle className="w-4 h-4" />
                <span>{error}</span>
              </div>
            )}

            {/* Create Room */}
            <div className="space-y-3">
              <Button
                onClick={handleCreateRoom}
                disabled={isLoading || !nickname.trim()}
                className="w-full"
              >
                <Plus className="w-4 h-4 mr-2" />
                Create Investigation Room
              </Button>
            </div>

            <div className="relative">
              <Separator />
              <span className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 bg-card px-3 text-xs text-muted-foreground">
                OR
              </span>
            </div>

            {/* Join Room */}
            <div className="space-y-3">
              <label className="text-sm font-medium text-muted-foreground">
                Room Code
              </label>
              <div className="flex gap-2">
                <Input
                  type="text"
                  value={roomCode}
                  onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
                  onKeyDown={(e) => e.key === 'Enter' && nickname.trim() && roomCode.trim() && handleJoinRoom()}
                  placeholder="XXXXXXXX"
                  maxLength={8}
                  className="font-mono tracking-widest bg-black/30 text-center"
                />
                <Button
                  onClick={handleJoinRoom}
                  disabled={isLoading || !nickname.trim() || !roomCode.trim()}
                  variant="secondary"
                >
                  <ArrowRight className="w-4 h-4" />
                </Button>
              </div>
              {!nickname.trim() && roomCode.trim() && (
                <p className="text-xs text-amber-400">Enter your codename above first</p>
              )}
            </div>

            {/* Info */}
            <div className="bg-muted/50 rounded-lg p-4 space-y-2">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Users className="w-4 h-4" />
                <span>Requires 2+ investigators to begin</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

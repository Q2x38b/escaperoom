import { useState, useRef, useEffect } from 'react';
import { useRoom } from '../../hooks/useRoom';
import { useGameStore } from '../../stores/gameStore';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Badge } from '../ui/badge';
import { MessageSquare, Send, X } from 'lucide-react';

export function ChatPanel() {
  const [isOpen, setIsOpen] = useState(false);
  const [message, setMessage] = useState('');
  const [unreadCount, setUnreadCount] = useState(0);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const lastReadCountRef = useRef(0);

  const { sendChatMessage, currentPlayerId } = useRoom();
  const chatMessages = useGameStore((state) => state.chatMessages);
  const players = useGameStore((state) => state.players);

  // Get player color based on index
  const getPlayerColor = (playerId: string) => {
    const colors = ['text-blue-400', 'text-green-400', 'text-purple-400', 'text-pink-400'];
    const playerIndex = players.findIndex(p => p.id === playerId);
    return colors[playerIndex % colors.length];
  };

  // Scroll to bottom when new messages arrive
  useEffect(() => {
    if (isOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
      lastReadCountRef.current = chatMessages.length;
      setUnreadCount(0);
    } else {
      const newMessages = chatMessages.length - lastReadCountRef.current;
      if (newMessages > 0) {
        setUnreadCount(newMessages);
      }
    }
  }, [chatMessages, isOpen]);

  const handleSend = () => {
    if (message.trim()) {
      sendChatMessage(message.trim());
      setMessage('');
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <>
      {/* Toggle Button */}
      <Button
        variant="outline"
        size="icon"
        onClick={() => setIsOpen(!isOpen)}
        className="fixed bottom-4 right-4 z-50 h-10 w-10 sm:h-12 sm:w-12 sm:bottom-6 sm:right-6 rounded-full shadow-lg bg-white/10 border-white/30 hover:bg-white/20 text-white"
      >
        {isOpen ? (
          <X className="h-4 w-4 sm:h-5 sm:w-5" />
        ) : (
          <div className="relative">
            <MessageSquare className="h-4 w-4 sm:h-5 sm:w-5" />
            {unreadCount > 0 && (
              <Badge
                variant="destructive"
                className="absolute -top-2 -right-2 sm:-top-3 sm:-right-3 h-4 w-4 sm:h-5 sm:w-5 p-0 flex items-center justify-center text-[10px] sm:text-xs"
              >
                {unreadCount}
              </Badge>
            )}
          </div>
        )}
      </Button>

      {/* Chat Panel */}
      <div
        className={`fixed bottom-16 right-4 sm:bottom-24 sm:right-6 z-40 w-[calc(100vw-2rem)] sm:w-80 max-w-80 transition-all duration-300 ${
          isOpen
            ? 'opacity-100 translate-y-0 pointer-events-auto'
            : 'opacity-0 translate-y-4 pointer-events-none'
        }`}
      >
        <div className="glass-card rounded-xl overflow-hidden shadow-2xl">
          {/* Header */}
          <div className="px-4 py-3 border-b border-white/20 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <MessageSquare className="h-4 w-4 text-white" />
              <span className="font-medium text-sm text-white">Team Chat</span>
            </div>
            <Badge variant="outline" className="text-xs border-white/30 text-white/80">
              {players.length} online
            </Badge>
          </div>

          {/* Messages */}
          <div className="h-48 sm:h-64 overflow-y-auto p-3 space-y-3">
            {chatMessages.length === 0 ? (
              <div className="h-full flex items-center justify-center text-white/70 text-sm">
                <p>No messages yet. Start the conversation!</p>
              </div>
            ) : (
              chatMessages.map((msg) => (
                <div
                  key={msg.id}
                  className={`flex flex-col ${
                    msg.playerId === currentPlayerId ? 'items-end' : 'items-start'
                  }`}
                >
                  <div
                    className={`max-w-[85%] rounded-lg px-3 py-2 ${
                      msg.playerId === currentPlayerId
                        ? 'bg-white/20 text-white'
                        : 'bg-white/10 text-white'
                    }`}
                  >
                    {msg.playerId !== currentPlayerId && (
                      <div className={`text-xs font-medium mb-1 ${getPlayerColor(msg.playerId)}`}>
                        {msg.playerName}
                      </div>
                    )}
                    <p className="text-sm break-words">{msg.message}</p>
                  </div>
                  <span className="text-[10px] text-white/60 mt-1 px-1">
                    {new Date(msg.timestamp).toLocaleTimeString([], {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </span>
                </div>
              ))
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <div className="p-3 border-t border-white/20">
            <div className="flex gap-2">
              <Input
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Type a message..."
                className="flex-1 h-9 text-sm bg-white/10 border-white/40 text-white placeholder:text-white/60"
              />
              <Button
                size="icon"
                onClick={handleSend}
                disabled={!message.trim()}
                className="h-9 w-9"
              >
                <Send className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

import { useState, useRef, useEffect, useCallback } from 'react';
import { useRoom } from '../../hooks/useRoom';
import { useGameStore } from '../../stores/gameStore';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Badge } from '../ui/badge';
import { MessageSquare, Send, X, GripHorizontal } from 'lucide-react';

interface ChatPanelProps {
  isOpen: boolean;
  onClose: () => void;
  onUnreadCountChange?: (count: number) => void;
}

export function ChatPanel({ isOpen, onClose, onUnreadCountChange }: ChatPanelProps) {
  const [message, setMessage] = useState('');
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const dragStart = useRef({ mouseX: 0, mouseY: 0, posX: 0, posY: 0 });
  const panelRef = useRef<HTMLDivElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const lastReadCountRef = useRef(0);
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const { sendChatMessage, currentPlayerId, chatTypingPlayer, setChatTyping, clearChatTyping } = useRoom();
  const chatMessages = useGameStore((state) => state.chatMessages);
  const players = useGameStore((state) => state.players);

  // Check if typing indicator is still valid (within 3 seconds)
  const isTypingValid = chatTypingPlayer &&
    chatTypingPlayer.odentifier !== currentPlayerId &&
    Date.now() - chatTypingPlayer.timestamp < 3000;

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
      onUnreadCountChange?.(0);
    } else {
      const newMessages = chatMessages.length - lastReadCountRef.current;
      if (newMessages > 0) {
        onUnreadCountChange?.(newMessages);
      }
    }
  }, [chatMessages, isOpen, onUnreadCountChange]);

  // Drag handlers - simple delta-based approach
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    dragStart.current = {
      mouseX: e.clientX,
      mouseY: e.clientY,
      posX: position.x,
      posY: position.y,
    };
    setIsDragging(true);
  }, [position]);

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!isDragging) return;

    const deltaX = e.clientX - dragStart.current.mouseX;
    const deltaY = e.clientY - dragStart.current.mouseY;

    const newX = dragStart.current.posX + deltaX;
    const newY = dragStart.current.posY + deltaY;

    // Constrain to viewport
    const maxX = window.innerWidth - 100;
    const maxY = window.innerHeight - 100;
    const minX = -(window.innerWidth - 100);
    const minY = -50;

    setPosition({
      x: Math.max(minX, Math.min(maxX, newX)),
      y: Math.max(minY, Math.min(maxY, newY)),
    });
  }, [isDragging]);

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  useEffect(() => {
    if (isDragging) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
      return () => {
        window.removeEventListener('mousemove', handleMouseMove);
        window.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isDragging, handleMouseMove, handleMouseUp]);

  // Touch handlers for mobile
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    if (e.touches.length === 1) {
      const touch = e.touches[0];
      dragStart.current = {
        mouseX: touch.clientX,
        mouseY: touch.clientY,
        posX: position.x,
        posY: position.y,
      };
      setIsDragging(true);
    }
  }, [position]);

  const handleTouchMove = useCallback((e: TouchEvent) => {
    if (!isDragging || e.touches.length !== 1) return;
    e.preventDefault();

    const touch = e.touches[0];
    const deltaX = touch.clientX - dragStart.current.mouseX;
    const deltaY = touch.clientY - dragStart.current.mouseY;

    const newX = dragStart.current.posX + deltaX;
    const newY = dragStart.current.posY + deltaY;

    // Constrain to viewport
    const maxX = window.innerWidth - 100;
    const maxY = window.innerHeight - 100;
    const minX = -(window.innerWidth - 100);
    const minY = -50;

    setPosition({
      x: Math.max(minX, Math.min(maxX, newX)),
      y: Math.max(minY, Math.min(maxY, newY)),
    });
  }, [isDragging]);

  const handleTouchEnd = useCallback(() => {
    setIsDragging(false);
  }, []);

  useEffect(() => {
    if (isDragging) {
      window.addEventListener('touchmove', handleTouchMove, { passive: false });
      window.addEventListener('touchend', handleTouchEnd);
      return () => {
        window.removeEventListener('touchmove', handleTouchMove);
        window.removeEventListener('touchend', handleTouchEnd);
      };
    }
  }, [isDragging, handleTouchMove, handleTouchEnd]);

  const handleSend = () => {
    if (message.trim()) {
      sendChatMessage(message.trim());
      setMessage('');
      // Clear typing status when message is sent
      clearChatTyping();
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
        typingTimeoutRef.current = null;
      }
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setMessage(newValue);

    // Set typing status
    if (newValue.trim()) {
      setChatTyping();
      // Clear typing status after 2 seconds of inactivity
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
      typingTimeoutRef.current = setTimeout(() => {
        clearChatTyping();
      }, 2000);
    } else {
      clearChatTyping();
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
        typingTimeoutRef.current = null;
      }
    }
  };

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
    };
  }, []);

  return (
    <div
      ref={panelRef}
      style={{
        transform: `translate(${position.x}px, ${position.y}px)`,
      }}
      className={`fixed top-16 right-4 sm:top-20 sm:right-6 z-40 w-[calc(100vw-2rem)] sm:w-80 max-w-80 transition-opacity duration-300 ${
        isDragging ? '' : 'transition-transform'
      } ${
        isOpen
          ? 'opacity-100 pointer-events-auto'
          : 'opacity-0 pointer-events-none'
      }`}
    >
      <div className="glass-card rounded-xl overflow-hidden shadow-2xl">
        {/* Drag Handle */}
        <div
          onMouseDown={handleMouseDown}
          onTouchStart={handleTouchStart}
          className="px-4 py-1.5 border-b border-white/10 flex items-center justify-center cursor-grab active:cursor-grabbing bg-white/5 select-none"
        >
          <GripHorizontal className="w-5 h-5 text-white/30" />
        </div>

        {/* Header */}
        <div className="px-4 py-2.5 border-b border-white/20 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <MessageSquare className="h-4 w-4 text-white" aria-hidden="true" />
            <span className="font-medium text-sm text-white">Team Chat</span>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="text-xs border-white/30 text-white/80 tabular-nums">
              {players.length} online
            </Badge>
            <Button
              variant="ghost"
              size="icon"
              onClick={onClose}
              aria-label="Close chat"
              className="h-6 w-6 text-white/70 hover:text-white hover:bg-white/10"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
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

        {/* Typing indicator */}
        {isTypingValid && (
          <div className="px-3 py-1.5 border-t border-white/10 bg-white/5">
            <div className="flex items-center gap-2 text-xs text-white/60">
              <span className={getPlayerColor(chatTypingPlayer.odentifier)}>
                {chatTypingPlayer.nickname}
              </span>
              <span>is typing</span>
              <span className="flex gap-0.5">
                <span className="w-1 h-1 bg-white/60 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                <span className="w-1 h-1 bg-white/60 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                <span className="w-1 h-1 bg-white/60 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
              </span>
            </div>
          </div>
        )}

        {/* Input */}
        <form onSubmit={(e) => { e.preventDefault(); handleSend(); }} className="p-3 border-t border-white/20">
          <div className="flex gap-2">
            <label htmlFor="chat-input" className="sr-only">Type a message</label>
            <Input
              id="chat-input"
              value={message}
              onChange={handleInputChange}
              placeholder="Type a message..."
              className="flex-1 h-9 text-sm bg-white/10 border-white/40 text-white placeholder:text-white/60"
            />
            <Button
              type="submit"
              size="icon"
              disabled={!message.trim()}
              aria-label="Send message"
              className="h-9 w-9"
            >
              <Send className="h-4 w-4" aria-hidden="true" />
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

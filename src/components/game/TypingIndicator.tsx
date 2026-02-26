import { User } from 'lucide-react';

interface TypingIndicatorProps {
  nickname: string;
}

export function TypingIndicator({ nickname }: TypingIndicatorProps) {
  return (
    <div className="flex items-center gap-2 text-amber-400 text-sm animate-pulse">
      <User className="w-4 h-4" />
      <span className="font-medium">{nickname}</span>
      <span className="text-muted-foreground">is typing</span>
      <span className="flex gap-0.5">
        <span className="w-1.5 h-1.5 bg-amber-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
        <span className="w-1.5 h-1.5 bg-amber-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
        <span className="w-1.5 h-1.5 bg-amber-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
      </span>
    </div>
  );
}

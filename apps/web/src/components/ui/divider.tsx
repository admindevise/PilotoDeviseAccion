import * as React from 'react';
import { cn } from '@/lib/utils';

interface DividerProps extends React.HTMLAttributes<HTMLDivElement> {
  alignment?: 'left' | 'center' | 'right';
}

export function Divider({ className, alignment = 'center', ...props }: DividerProps) {
  return (
    <div
      className={cn(
        'h-[3px] w-[60px] bg-accent',
        alignment === 'center' && 'mx-auto',
        alignment === 'right' && 'ml-auto',
        className
      )}
      {...props}
    />
  );
}

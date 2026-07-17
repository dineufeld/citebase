'use client';
import Link from 'next/link';
import { Button } from '@/components/ui/primitives';
import { ThemeToggle } from '@/components/ui/ThemeToggle';

export function AboutHeaderActions() {
  return (
    <div className="flex items-center gap-2">
      <ThemeToggle />
      <Link href="/">
        <Button>Start chatting</Button>
      </Link>
    </div>
  );
}

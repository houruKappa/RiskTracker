'use client';

import { useLanguage } from '@/lib/language-context';
import { Button } from '@/components/ui/button';
import { Languages } from 'lucide-react';

export function LanguageToggle({ className = '' }: { className?: string }) {
  const { locale, toggleLocale } = useLanguage();

  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={toggleLocale}
      className={`gap-1 ${className}`}
    >
      <Languages className="h-4 w-4" />
      {locale === 'ru' ? 'EN' : 'RU'}
    </Button>
  );
}

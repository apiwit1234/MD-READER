import type { ITheme } from '@xterm/xterm';
import type { Theme } from './themes';

export const terminalThemes: Record<Theme, ITheme> = {
  light: {
    background: '#FFFFFF', foreground: '#0F172A', cursor: '#2563EB', cursorAccent: '#FFFFFF', selectionBackground: '#BFDBFE',
    black: '#0F172A', red: '#DC2626', green: '#16A34A', yellow: '#CA8A04', blue: '#2563EB', magenta: '#9333EA', cyan: '#0891B2', white: '#E2E8F0',
    brightBlack: '#64748B', brightRed: '#EF4444', brightGreen: '#22C55E', brightYellow: '#EAB308', brightBlue: '#3B82F6', brightMagenta: '#A855F7', brightCyan: '#06B6D4', brightWhite: '#F8FAFC',
  },
  dark: {
    background: '#0F172A', foreground: '#E2E8F0', cursor: '#3B82F6', cursorAccent: '#0F172A', selectionBackground: '#334155',
    black: '#475569', red: '#F87171', green: '#4ADE80', yellow: '#FBBF24', blue: '#60A5FA', magenta: '#C084FC', cyan: '#22D3EE', white: '#E2E8F0',
    brightBlack: '#94A3B8', brightRed: '#FCA5A5', brightGreen: '#86EFAC', brightYellow: '#FDE68A', brightBlue: '#93C5FD', brightMagenta: '#D8B4FE', brightCyan: '#67E8F9', brightWhite: '#F8FAFC',
  },
  cartoon: {
    // Light background: ANSI "white"/"brightWhite" must stay readable (many
    // CLIs use them as foreground), so they map to grays — not cream-on-cream.
    background: '#FFF4DA', foreground: '#111827', cursor: '#FE4A60', cursorAccent: '#FFF4DA', selectionBackground: '#FFC480',
    black: '#111827', red: '#DC2626', green: '#15803D', yellow: '#B45309', blue: '#1D4ED8', magenta: '#7E22CE', cyan: '#0E7490', white: '#6B7280',
    brightBlack: '#4B5563', brightRed: '#FE4A60', brightGreen: '#16A34A', brightYellow: '#D97706', brightBlue: '#2563EB', brightMagenta: '#9333EA', brightCyan: '#0891B2', brightWhite: '#374151',
  },
};

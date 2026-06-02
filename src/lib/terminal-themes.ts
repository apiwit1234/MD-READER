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
  retro: {
    background: '#2B2622', foreground: '#F2E8D8', cursor: '#81D8D0', cursorAccent: '#2B2622', selectionBackground: '#4A4138',
    black: '#8A7B68', red: '#E5A98C', green: '#C2D488', yellow: '#E3E68F', blue: '#9AE0D9', magenta: '#C29BE6', cyan: '#9AE0D9', white: '#F2E8D8',
    brightBlack: '#B6A892', brightRed: '#F0BFA3', brightGreen: '#D4E59A', brightYellow: '#EFF0A0', brightBlue: '#ADEAE3', brightMagenta: '#D4B0F0', brightCyan: '#ADEAE3', brightWhite: '#FFFDF8',
  },
  space: {
    background: '#0A0E1F', foreground: '#C7D0FF', cursor: '#8B7CF6', cursorAccent: '#0A0E1F', selectionBackground: '#22285A',
    black: '#4A5388', red: '#FB7185', green: '#5EEAD4', yellow: '#FCD34D', blue: '#A79BFA', magenta: '#F0ABFC', cyan: '#5EEAD4', white: '#C7D0FF',
    brightBlack: '#8B95C9', brightRed: '#FDA4AF', brightGreen: '#99F6E4', brightYellow: '#FDE68A', brightBlue: '#C4B5FD', brightMagenta: '#F5D0FE', brightCyan: '#A5F3FC', brightWhite: '#E7EAF6',
  },
  moneh: {
    background: '#14151F', foreground: '#E6E8EC', cursor: '#5B4BDB', cursorAccent: '#14151F', selectionBackground: '#2A2C3D',
    black: '#4C4F66', red: '#FF6B6B', green: '#00C896', yellow: '#FFB454', blue: '#A99CF9', magenta: '#C084FC', cyan: '#22D3EE', white: '#E6E8EC',
    brightBlack: '#8B8FA8', brightRed: '#FF8787', brightGreen: '#34E0B0', brightYellow: '#FFC97A', brightBlue: '#A99CF9', brightMagenta: '#D8B4FE', brightCyan: '#67E8F9', brightWhite: '#FFFFFF',
  },
};

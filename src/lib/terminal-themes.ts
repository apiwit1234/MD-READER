import type { ITheme } from '@xterm/xterm';
import type { Theme } from './themes';

export const terminalThemes: Record<Theme, ITheme> = {
  light: {
    background: '#FFFFFF', foreground: '#16161D', cursor: '#6D5DF6', cursorAccent: '#FFFFFF', selectionBackground: '#DCD8FD',
    black: '#16161D', red: '#DC2626', green: '#16A34A', yellow: '#CA8A04', blue: '#4F46E5', magenta: '#9333EA', cyan: '#0891B2', white: '#E4E4EE',
    brightBlack: '#6E7080', brightRed: '#EF4444', brightGreen: '#22C55E', brightYellow: '#EAB308', brightBlue: '#6D5DF6', brightMagenta: '#A855F7', brightCyan: '#06B6D4', brightWhite: '#F7F7FB',
  },
  dark: {
    background: '#101117', foreground: '#E8E9F0', cursor: '#8B7CFF', cursorAccent: '#101117', selectionBackground: '#33344A',
    black: '#3F4154', red: '#FB7185', green: '#34D399', yellow: '#FBBF24', blue: '#7C9BFF', magenta: '#C084FC', cyan: '#22D3EE', white: '#E8E9F0',
    brightBlack: '#9295A8', brightRed: '#FDA4AF', brightGreen: '#6EE7B7', brightYellow: '#FDE68A', brightBlue: '#A5B8FF', brightMagenta: '#D8B4FE', brightCyan: '#67E8F9', brightWhite: '#F8F8FC',
  },
  aurora: {
    background: '#0E0B1E', foreground: '#EEEAFB', cursor: '#A78BFA', cursorAccent: '#0E0B1E', selectionBackground: '#3B2D72',
    black: '#352B60', red: '#FB7185', green: '#6EE7B7', yellow: '#FCD34D', blue: '#7DD3FC', magenta: '#C4B5FD', cyan: '#67E8F9', white: '#EEEAFB',
    brightBlack: '#9E95C3', brightRed: '#FDA4AF', brightGreen: '#A7F3D0', brightYellow: '#FDE68A', brightBlue: '#BAE6FD', brightMagenta: '#DDD6FE', brightCyan: '#A5F3FC', brightWhite: '#FAF8FF',
  },
  nord: {
    // Official Nord terminal palette (nord0-15).
    background: '#2E3440', foreground: '#D8DEE9', cursor: '#88C0D0', cursorAccent: '#2E3440', selectionBackground: '#4C566A',
    black: '#3B4252', red: '#BF616A', green: '#A3BE8C', yellow: '#EBCB8B', blue: '#81A1C1', magenta: '#B48EAD', cyan: '#88C0D0', white: '#E5E9F0',
    brightBlack: '#4C566A', brightRed: '#BF616A', brightGreen: '#A3BE8C', brightYellow: '#EBCB8B', brightBlue: '#81A1C1', brightMagenta: '#B48EAD', brightCyan: '#8FBCBB', brightWhite: '#ECEFF4',
  },
  sepia: {
    // Light paper background: ANSI "white"/"brightWhite" map to grays so
    // CLIs that use them as foreground stay readable (not cream-on-cream).
    background: '#F7F1E3', foreground: '#3D3427', cursor: '#B5803C', cursorAccent: '#F7F1E3', selectionBackground: '#E8DCC2',
    black: '#3D3427', red: '#B23A48', green: '#527C46', yellow: '#AA6E14', blue: '#3E5F8A', magenta: '#7E5A8C', cyan: '#3A7575', white: '#82745F',
    brightBlack: '#5C5142', brightRed: '#C25260', brightGreen: '#6A955C', brightYellow: '#C28530', brightBlue: '#54779F', brightMagenta: '#96719F', brightCyan: '#4E8C8C', brightWhite: '#4A4234',
  },
  dracula: {
    // Official Dracula terminal palette.
    background: '#282A36', foreground: '#F8F8F2', cursor: '#BD93F9', cursorAccent: '#282A36', selectionBackground: '#44475A',
    black: '#21222C', red: '#FF5555', green: '#50FA7B', yellow: '#F1FA8C', blue: '#BD93F9', magenta: '#FF79C6', cyan: '#8BE9FD', white: '#F8F8F2',
    brightBlack: '#6272A4', brightRed: '#FF6E6E', brightGreen: '#69FF94', brightYellow: '#FFFFA5', brightBlue: '#D6ACFF', brightMagenta: '#FF92DF', brightCyan: '#A4FFFF', brightWhite: '#FFFFFF',
  },
  christmas: {
    // Festive night: cream text on pine, red + green + gold accents.
    background: '#0B1F16', foreground: '#FEEFD0', cursor: '#E03A3E', cursorAccent: '#0B1F16', selectionBackground: '#244A30',
    black: '#103024', red: '#E03A3E', green: '#1FA85A', yellow: '#F8B229', blue: '#5FAE8C', magenta: '#D46A8C', cyan: '#7FD1B9', white: '#E7DCC2',
    brightBlack: '#3C6B50', brightRed: '#FF6B6E', brightGreen: '#4ADE80', brightYellow: '#FFD45E', brightBlue: '#8FD0B8', brightMagenta: '#F093B0', brightCyan: '#A8E8D6', brightWhite: '#FEEFD0',
  },
};

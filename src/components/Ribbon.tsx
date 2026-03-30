import React from 'react';
import { FilePlus, Search, Network, SunMoon, TerminalSquare } from 'lucide-react';

interface RibbonProps {
  onNewNote: () => void;
  onSearch: () => void;
  onGraph: () => void;
  onCommandPalette: () => void;
  onSettings: () => void;
}

export function Ribbon({ onNewNote, onSearch, onGraph, onCommandPalette, onSettings }: RibbonProps) {
  return (
    <div className="app-ribbon">
      <div className="ribbon-top">
        <button className="ribbon-btn" onClick={onCommandPalette} title="Command Palette (Ctrl+P)">
          <TerminalSquare size={20} strokeWidth={1.5} />
        </button>
        <button className="ribbon-btn" onClick={onSearch} title="Search (Ctrl+F)">
          <Search size={20} strokeWidth={1.5} />
        </button>
        <button className="ribbon-btn" onClick={onNewNote} title="New Note (Ctrl+N)">
          <FilePlus size={20} strokeWidth={1.5} />
        </button>
        <button className="ribbon-btn" onClick={onGraph} title="Graph View (Ctrl+G)">
          <Network size={20} strokeWidth={1.5} />
        </button>
      </div>
      <div className="ribbon-bottom">
        <button className="ribbon-btn" onClick={onSettings} title="Toggle Theme">
          <SunMoon size={20} strokeWidth={1.5} />
        </button>
      </div>
    </div>
  );
}

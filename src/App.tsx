/**
 * App - Root Application Component
 * 
 * Manages the global application state including vault selection,
 * theme, active notes, and layout. Coordinates between all major
 * components via prop drilling (simple and predictable for this scale).
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { TitleBar } from './components/TitleBar';
import { Sidebar } from './components/Sidebar';
import { Editor } from './components/editor/Editor';
import { GraphView } from './components/graph/GraphView';
import { SearchModal } from './components/SearchModal';
import { CommandPalette } from './components/CommandPalette';
import { BacklinksPanel } from './components/BacklinksPanel';
import { StatusBar } from './components/StatusBar';
import { WelcomeScreen } from './components/WelcomeScreen';
import { Modal } from './components/Modal';
import { Tab, ViewMode, Theme, Command, FileEntry } from './types';
import { getNoteName, generateId, debounce } from './utils/helpers';
import { getAPI } from './utils/api';

const api = getAPI();

export default function App() {
  // ── Global State ────────────────────────────────────
  const [vaultPath, setVaultPath] = useState<string | null>(null);
  const [theme, setTheme] = useState<Theme>('dark');
  const [showSidebar, setShowSidebar] = useState(true);
  const [showGraph, setShowGraph] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const [showCommandPalette, setShowCommandPalette] = useState(false);
  const [showBacklinks, setShowBacklinks] = useState(true);

  // ── File & Editor State ─────────────────────────────
  const [fileTree, setFileTree] = useState<FileEntry[]>([]);
  const [tabs, setTabs] = useState<Tab[]>([]);
  const [activeTabId, setActiveTabId] = useState<string | null>(null);
  const [currentContent, setCurrentContent] = useState<string>('');
  const [viewMode, setViewMode] = useState<ViewMode>('editor');
  const [backlinks, setBacklinks] = useState<string[]>([]);

  // ── Modal State ─────────────────────────────────────
  const [modal, setModal] = useState<{
    type: 'prompt' | 'confirm';
    title: string;
    message: string;
    defaultValue?: string;
    onConfirm?: (result: string | boolean) => void;
  } | null>(null);

  const autoSaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Apply theme
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  // ── Initialize Vault ────────────────────────────────
  useEffect(() => {
    const init = async () => {
      try {
        const savedPath = await api.getVaultPath();
        if (savedPath) {
          setVaultPath(savedPath);
          await refreshFileTree();
        }
      } catch (e) {
        console.log('No saved vault path');
      }
    };
    init();
  }, []);

  // ── Menu Event Handlers ─────────────────────────────
  useEffect(() => {
    api.onMenuEvent('menu:open-vault', handleOpenVault);
    api.onMenuEvent('menu:new-note', handleNewNote);
    api.onMenuEvent('menu:save', handleSave);
    api.onMenuEvent('menu:toggle-graph', () => setShowGraph(g => !g));
    api.onMenuEvent('menu:command-palette', () => setShowCommandPalette(true));
    api.onMenuEvent('menu:toggle-sidebar', () => setShowSidebar(s => !s));

    return () => {
      ['menu:open-vault', 'menu:new-note', 'menu:save',
       'menu:toggle-graph', 'menu:command-palette', 'menu:toggle-sidebar'
      ].forEach(ch => api.removeMenuListener(ch));
    };
  }, [tabs, activeTabId, currentContent]);

  // ── Keyboard Shortcuts ──────────────────────────────
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const ctrl = e.ctrlKey || e.metaKey;

      if (ctrl && e.key === 'p') {
        e.preventDefault();
        setShowCommandPalette(true);
      } else if (ctrl && e.key === 'f') {
        e.preventDefault();
        setShowSearch(true);
      } else if (ctrl && e.key === 'n') {
        e.preventDefault();
        handleNewNote();
      } else if (ctrl && e.key === 's') {
        e.preventDefault();
        handleSave();
      } else if (ctrl && e.key === 'g') {
        e.preventDefault();
        setShowGraph(g => !g);
      } else if (ctrl && e.key === 'b') {
        e.preventDefault();
        setShowSidebar(s => !s);
      } else if (ctrl && e.key === 'w') {
        e.preventDefault();
        if (activeTabId) closeTab(activeTabId);
      } else if (e.key === 'Escape') {
        setShowSearch(false);
        setShowCommandPalette(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeTabId, tabs, currentContent]);

  // ── Vault Operations ────────────────────────────────
  const handleOpenVault = async () => {
    try {
      const path = await api.openVaultDialog();
      if (path) {
        await api.setVaultPath(path);
        setVaultPath(path);
        setTabs([]);
        setActiveTabId(null);
        setCurrentContent('');
        await refreshFileTree();
      }
    } catch (e) {
      console.error('Failed to open vault:', e);
      alert('Failed to open vault. It may be too large or inaccessible.');
    }
  };

  const refreshFileTree = async () => {
    try {
      const tree = await api.getFileTree();
      setFileTree(tree);
    } catch (e) {
      console.error('Failed to refresh file tree:', e);
    }
  };

  // ── File Operations ─────────────────────────────────
  const openFile = async (filePath: string) => {
    // Check if tab already exists
    const existingTab = tabs.find(t => t.path === filePath);
    if (existingTab) {
      setActiveTabId(existingTab.id);
      const content = await api.readFile(filePath);
      setCurrentContent(content);
      loadBacklinks(filePath);
      return;
    }

    // Open new tab
    const content = await api.readFile(filePath);
    const newTab: Tab = {
      id: generateId(),
      path: filePath,
      name: getNoteName(filePath),
      isModified: false,
    };

    setTabs(prev => [...prev, newTab]);
    setActiveTabId(newTab.id);
    setCurrentContent(content);
    setShowGraph(false);
    loadBacklinks(filePath);
  };

  const handleNewNote = async () => {
    if (!vaultPath) return;

    setModal({
      type: 'prompt',
      title: 'New Note',
      message: 'Enter note name:',
      onConfirm: async (name) => {
        if (!name) return;

        const fileName = name.endsWith('.md') ? name : `${name}.md`;
        const content = `# ${name.replace('.md', '')}\n\n`;

        await api.createFile(fileName, content);
        await refreshFileTree();
        await openFile(fileName);
      },
    });
  };

  const handleSave = async () => {
    if (!activeTabId) return;
    const tab = tabs.find(t => t.id === activeTabId);
    if (!tab) return;

    await api.writeFile(tab.path, currentContent);
    setTabs(prev =>
      prev.map(t => t.id === activeTabId ? { ...t, isModified: false } : t)
    );
    await refreshFileTree();
  };

  // Auto-save with debounce
  const handleContentChange = useCallback((content: string) => {
    setCurrentContent(content);
    
    // Mark tab as modified
    setTabs(prev =>
      prev.map(t => t.id === activeTabId ? { ...t, isModified: true } : t)
    );

    // Auto-save after 2 seconds of no typing
    if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current);
    autoSaveTimer.current = setTimeout(async () => {
      const tab = tabs.find(t => t.id === activeTabId);
      if (tab) {
        await api.writeFile(tab.path, content);
        setTabs(prev =>
          prev.map(t => t.id === activeTabId ? { ...t, isModified: false } : t)
        );
      }
    }, 2000);
  }, [activeTabId, tabs]);

  const closeTab = async (tabId: string) => {
    const tab = tabs.find(t => t.id === tabId);
    if (!tab) return;

    // Auto-save before closing
    if (tab.isModified && tab.id === activeTabId) {
      await api.writeFile(tab.path, currentContent);
    }

    const newTabs = tabs.filter(t => t.id !== tabId);
    setTabs(newTabs);

    if (activeTabId === tabId) {
      if (newTabs.length > 0) {
        const lastTab = newTabs[newTabs.length - 1];
        setActiveTabId(lastTab.id);
        const content = await api.readFile(lastTab.path);
        setCurrentContent(content);
        loadBacklinks(lastTab.path);
      } else {
        setActiveTabId(null);
        setCurrentContent('');
        setBacklinks([]);
      }
    }
  };

  // ── Link Navigation ─────────────────────────────────
  const handleLinkClick = async (linkName: string) => {
    // Find the note by name
    const findNote = (entries: FileEntry[], name: string): string | null => {
      for (const entry of entries) {
        if (!entry.isDirectory) {
          const noteName = getNoteName(entry.path);
          if (noteName.toLowerCase() === name.toLowerCase()) {
            return entry.path;
          }
        }
        if (entry.children) {
          const found = findNote(entry.children, name);
          if (found) return found;
        }
      }
      return null;
    };

    const filePath = findNote(fileTree, linkName);
    if (filePath) {
      await openFile(filePath);
    } else {
      // Auto-create note if it doesn't exist
      const newPath = `${linkName}.md`;
      const content = `# ${linkName}\n\n`;
      await api.createFile(newPath, content);
      await refreshFileTree();
      await openFile(newPath);
    }
  };

  // ── Backlinks ───────────────────────────────────────
  const loadBacklinks = async (filePath: string) => {
    try {
      const links = await api.getBacklinks(filePath);
      setBacklinks(links);
    } catch {
      setBacklinks([]);
    }
  };

  // ── File Management ─────────────────────────────────
  const handleDeleteFile = async (filePath: string) => {
    setModal({
      type: 'confirm',
      title: 'Delete File',
      message: `Delete "${getNoteName(filePath)}"?`,
      onConfirm: async (confirmed) => {
        if (!confirmed) return;
        await api.deleteFile(filePath);
        
        // Close tab if open
        const tab = tabs.find(t => t.path === filePath);
        if (tab) closeTab(tab.id);
        
        await refreshFileTree();
      },
    });
  };

  const handleRenameFile = async (oldPath: string, newName: string) => {
    const dir = oldPath.includes('/') ? oldPath.substring(0, oldPath.lastIndexOf('/') + 1) : '';
    const newPath = dir + (newName.endsWith('.md') ? newName : `${newName}.md`);
    
    await api.renameFile(oldPath, newPath);
    
    // Update tab if open
    setTabs(prev =>
      prev.map(t => t.path === oldPath ? { ...t, path: newPath, name: getNoteName(newPath) } : t)
    );
    
    await refreshFileTree();
  };

  const handleCreateFolder = async (parentPath: string) => {
    setModal({
      type: 'prompt',
      title: 'New Folder',
      message: 'Enter folder name:',
      onConfirm: async (name) => {
        if (!name) return;
        
        const folderPath = parentPath ? `${parentPath}/${name}` : name;
        await api.createDirectory(folderPath);
        await refreshFileTree();
      },
    });
  };

  const handleCreateDailyNote = async () => {
    const filePath = await api.createDailyNote();
    await refreshFileTree();
    await openFile(filePath);
  };

  // ── Commands (for Command Palette) ──────────────────
  const commands: Command[] = [
    { id: 'new-note', label: 'New Note', shortcut: 'Ctrl+N', action: handleNewNote, category: 'File' },
    { id: 'open-vault', label: 'Open Vault', shortcut: 'Ctrl+O', action: handleOpenVault, category: 'File' },
    { id: 'save', label: 'Save Current Note', shortcut: 'Ctrl+S', action: handleSave, category: 'File' },
    { id: 'search', label: 'Search Notes', shortcut: 'Ctrl+F', action: () => setShowSearch(true), category: 'Search' },
    { id: 'graph', label: 'Toggle Graph View', shortcut: 'Ctrl+G', action: () => setShowGraph(g => !g), category: 'View' },
    { id: 'sidebar', label: 'Toggle Sidebar', shortcut: 'Ctrl+B', action: () => setShowSidebar(s => !s), category: 'View' },
    { id: 'backlinks', label: 'Toggle Backlinks', action: () => setShowBacklinks(b => !b), category: 'View' },
    { id: 'daily-note', label: 'Create Daily Note', action: handleCreateDailyNote, category: 'Notes' },
    { id: 'theme', label: 'Toggle Theme', action: () => setTheme(t => t === 'dark' ? 'light' : 'dark'), category: 'Settings' },
    { id: 'editor-mode', label: 'Editor View', action: () => setViewMode('editor'), category: 'View' },
    { id: 'preview-mode', label: 'Preview View', action: () => setViewMode('preview'), category: 'View' },
    { id: 'split-mode', label: 'Split View', action: () => setViewMode('split'), category: 'View' },
  ];

  // Get active tab info
  const activeTab = tabs.find(t => t.id === activeTabId);

  return (
    <div className="app">
      <TitleBar theme={theme} />
      
      <div className="app-body">
        <Sidebar
          visible={showSidebar}
          fileTree={fileTree}
          activeFilePath={activeTab?.path || null}
          onFileSelect={openFile}
          onNewNote={handleNewNote}
          onNewFolder={handleCreateFolder}
          onDeleteFile={handleDeleteFile}
          onRenameFile={handleRenameFile}
          onRefresh={refreshFileTree}
        />

        <div className="main-content">
          {!vaultPath ? (
            <WelcomeScreen onOpenVault={handleOpenVault} />
          ) : showGraph ? (
            <GraphView
              onNodeClick={handleLinkClick}
              onClose={() => setShowGraph(false)}
            />
          ) : activeTab ? (
            <Editor
              tabs={tabs}
              activeTabId={activeTabId!}
              content={currentContent}
              viewMode={viewMode}
              onTabSelect={async (id) => {
                setActiveTabId(id);
                const tab = tabs.find(t => t.id === id);
                if (tab) {
                  const content = await api.readFile(tab.path);
                  setCurrentContent(content);
                  loadBacklinks(tab.path);
                }
              }}
              onTabClose={closeTab}
              onContentChange={handleContentChange}
              onViewModeChange={setViewMode}
              onLinkClick={handleLinkClick}
            />
          ) : (
            <div className="empty-state">
              <div className="empty-icon">📝</div>
              <div className="empty-text">Select a note or create a new one</div>
            </div>
          )}
        </div>

        {activeTab && showBacklinks && !showGraph && (
          <BacklinksPanel
            backlinks={backlinks}
            onBacklinkClick={openFile}
          />
        )}
      </div>

      <StatusBar
        activeTab={activeTab || null}
        content={currentContent}
        theme={theme}
        viewMode={viewMode}
      />

      {showSearch && (
        <SearchModal
          onClose={() => setShowSearch(false)}
          onSelect={(path) => {
            setShowSearch(false);
            openFile(path);
          }}
        />
      )}

      {showCommandPalette && (
        <CommandPalette
          commands={commands}
          onClose={() => setShowCommandPalette(false)}
        />
      )}

      {modal && (
        <Modal
          type={modal.type}
          title={modal.title}
          message={modal.message}
          defaultValue={modal.defaultValue}
          onClose={(result) => {
            setModal(null);
            modal.onConfirm?.(result);
          }}
        />
      )}
    </div>
  );
}

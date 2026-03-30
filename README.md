# Notework

<div align="center">

**A local-first knowledge management tool**

Create, edit, and link Markdown notes stored locally, forming a graph-based knowledge system.

*Inspired by Obsidian. Built with Electron + React + TypeScript.*

</div>

---

## ✨ Features

### Core
- 📝 **Markdown Editor** — CodeMirror 6 with syntax highlighting, line wrapping, and keyboard shortcuts
- 🔗 **Wiki Links** — `[[note-name]]` style linking with auto-creation of missing notes
- 🕸️ **Graph View** — Interactive D3.js force-directed graph visualization
- 📁 **File Explorer** — Sidebar with tree view, drag-and-drop, context menus
- 🔍 **Full-Text Search** — Fuzzy search across all notes using Fuse.js
- 💾 **Auto-Save** — Changes saved automatically after 2 seconds of inactivity

### Advanced
- 🏷️ **Tags** — `#tag` syntax for categorization
- 📅 **Daily Notes** — One-click daily note generation
- ⌨️ **Command Palette** — VS Code-style command launcher (`Ctrl+P`)
- 🔙 **Backlinks** — Panel showing which notes link to the current note
- 🌙 **Dark/Light Theme** — Toggle between themes
- 📑 **Tabs** — Multiple notes open simultaneously
- ✂️ **Split View** — Edit and preview side by side
- 🖱️ **Drag & Drop** — Reorganize files between folders

## 🚀 Quick Start

### Prerequisites
- **Node.js** >= 18.x
- **npm** >= 9.x

### Setup

```bash
# Clone/navigate to the project
cd notework

# Install dependencies
npm install

# Compile Electron main process
npx tsc -p tsconfig.electron.json

# Start the app in development mode
npm run dev
```

### Production Build

```bash
# Build everything
npm run build

# Package as distributable
npm run package
```

## 🗂️ Project Structure

```
notework/
├── electron/                   # Electron main process
│   ├── main.ts                 # App entry, window creation, menu
│   ├── preload.ts              # Secure bridge (contextBridge)
│   ├── fileSystem.ts           # Vault filesystem operations
│   ├── search.ts               # Fuse.js search engine
│   └── ipc.ts                  # IPC handler registration
│
├── src/                        # React renderer (frontend)
│   ├── main.tsx                # React entry point
│   ├── App.tsx                 # Root component (state management)
│   ├── types/
│   │   └── index.ts            # TypeScript interfaces
│   ├── utils/
│   │   └── helpers.ts          # Utility functions
│   ├── styles/
│   │   └── index.css           # Design system & all styles
│   └── components/
│       ├── TitleBar.tsx         # Custom window title bar
│       ├── Sidebar.tsx          # File explorer panel
│       ├── WelcomeScreen.tsx    # First-time user screen
│       ├── SearchModal.tsx      # Full-text search modal
│       ├── CommandPalette.tsx   # Command launcher
│       ├── BacklinksPanel.tsx   # Backlinks sidebar
│       ├── StatusBar.tsx        # Bottom status bar
│       ├── editor/
│       │   ├── Editor.tsx       # CodeMirror markdown editor
│       │   └── MarkdownPreview.tsx  # Rendered markdown view
│       └── graph/
│           └── GraphView.tsx    # D3.js knowledge graph
│
├── sample-vault/               # Demo notes
│   ├── Welcome.md
│   ├── Getting Started.md
│   ├── Markdown Guide.md
│   ├── Knowledge Management.md
│   └── Project Ideas.md
│
├── dist-electron/              # Compiled Electron code
├── dist/                       # Built frontend
├── package.json
├── tsconfig.json               # Frontend TypeScript config
├── tsconfig.electron.json      # Electron TypeScript config
└── vite.config.ts              # Vite configuration
```

## 🏗️ Architecture

### Layer Separation

```
┌─────────────────────────────────────────┐
│           Renderer (React)              │
│  ┌──────────────────────────────────┐   │
│  │ Components (UI Layer)            │   │
│  │  ├── Editor (CodeMirror)         │   │
│  │  ├── GraphView (D3.js)           │   │
│  │  ├── Sidebar (File Explorer)     │   │
│  │  └── Search / CommandPalette     │   │
│  └──────────┬───────────────────────┘   │
│             │ window.electronAPI         │
│  ┌──────────▼───────────────────────┐   │
│  │ Preload (contextBridge)          │   │
│  │  Secure IPC channel proxy        │   │
│  └──────────┬───────────────────────┘   │
├─────────────┼───────────────────────────┤
│  ┌──────────▼───────────────────────┐   │
│  │ Main Process (Node.js)           │   │
│  │  ├── FileSystemManager           │   │
│  │  ├── SearchEngine (Fuse.js)      │   │
│  │  └── IPC Handlers                │   │
│  └──────────────────────────────────┘   │
│           Main (Electron)               │
└─────────────────────────────────────────┘
          │
          ▼
    Local File System (.md files)
```

### Key Design Decisions

1. **Context Isolation**: The renderer never has direct access to Node.js APIs. All operations go through the preload script's `contextBridge`.

2. **Async Everything**: All filesystem operations are async to avoid blocking the main thread.

3. **In-Memory Search**: Fuse.js maintains an in-memory index rebuilt on file changes, providing instant search results.

4. **No Database**: All data is stored as plain `.md` files. The graph structure is computed dynamically from `[[wiki-links]]`.

5. **Auto-Save**: Changes are automatically persisted after 2 seconds of inactivity, preventing data loss.

## ⌨️ Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `Ctrl+N` | New Note |
| `Ctrl+S` | Save |
| `Ctrl+F` | Search |
| `Ctrl+G` | Toggle Graph View |
| `Ctrl+P` | Command Palette |
| `Ctrl+B` | Toggle Sidebar |
| `Ctrl+W` | Close Tab |
| `Ctrl+O` | Open Vault |
| `Escape` | Close modals |

## 🔌 Plugin System Architecture

Notework is designed with extensibility in mind. Here's how to extend it:

### Adding a New Command

1. Define your command in `App.tsx`'s `commands` array:

```typescript
{
  id: 'my-command',
  label: 'My Custom Command',
  shortcut: 'Ctrl+Shift+M',
  action: () => { /* your logic */ },
  category: 'Custom'
}
```

### Adding a New IPC Channel

1. **Main process** (`electron/ipc.ts`): Register a new handler

```typescript
ipcMain.handle('custom:action', async (_event, arg: string) => {
  // Your logic here
  return result;
});
```

2. **Preload** (`electron/preload.ts`): Expose to renderer

```typescript
customAction: (arg: string): Promise<any> =>
  ipcRenderer.invoke('custom:action', arg),
```

3. **Renderer**: Call via `window.electronAPI.customAction(arg)`

### Adding a New View Component

1. Create component in `src/components/`
2. Add state management in `App.tsx`
3. Add toggle command to the command palette
4. Wire up keyboard shortcut if needed

### Future Plugin API Design

A full plugin system would involve:
- Plugin manifest files (`plugin.json`)
- Sandboxed execution environment
- Hooks system for lifecycle events
- API surface for reading/writing notes
- UI extension points (sidebar panels, editor toolbars)

## 📋 Sample Vault

The `sample-vault/` directory contains demo notes showcasing:
- Wiki links between notes
- Tags and categorization
- Task lists
- Code blocks
- Tables
- Markdown formatting

Open it as your vault to explore all features.

## 🔒 Privacy & Security

- **Fully offline**: No internet connection required
- **Local storage**: All data stays on your device as `.md` files
- **No telemetry**: Zero data collection
- **Context isolation**: Renderer process is sandboxed
- **Path traversal protection**: Filesystem operations are vault-scoped

## License

MIT

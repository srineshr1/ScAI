# ScAI — Developer Guide

## Commands

| Command | Purpose |
|---------|---------|
| `npm run dev` | Run in development mode |
| `npm run build` | Build for production |
| `npm run typecheck` | TypeScript type checking |

## Stack

- **electron-vite** with three-entrypoint config: `main`, `preload`, `renderer`
- Main process: `src/main/index.ts` — window management, IPC, Anthropic API calls
- Preload: `src/preload/index.ts` — context-bridge API exposed as `window.api`
- Renderer: React 18 app in `src/renderer/src/`

## Key Behaviors

- **Global shortcut**: `Ctrl+Shift+Space` toggles the overlay window
- **Mouse passthrough**: The window ignores mouse events by default; `setInteractive(true)` re-enables them (e.g., during streaming output)
- **API key**: Requires `GROQ_API_KEY` in `.env` (see `.env.example`)

## Window Config

- Frameless, transparent, always-on-top, non-resizable
- Positioned bottom-right of primary display
- Background: `#00000000` (fully transparent)

## Architecture Notes

- Context isolation enabled, node integration disabled in renderer
- Streaming via `client.messages.stream()` with `AbortController` for cancellation
- Renderer communicates via IPC (`ask`, `cancel`, `toggle`, `close`, `set-interactive`)

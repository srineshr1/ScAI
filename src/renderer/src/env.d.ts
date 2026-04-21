/// <reference types="vite/client" />

declare global {
  interface Window {
    api: {
      ask: (question: string) => Promise<void>
      cancel: () => Promise<void>
      toggle: () => Promise<void>
      close: () => Promise<void>
      setInteractive: (interactive: boolean) => Promise<void>
      onChunk: (cb: (text: string) => void) => () => void
      onDone: (cb: () => void) => () => void
      onError: (cb: (message: string) => void) => () => void
    }
  }
}

export {}

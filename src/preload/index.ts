import { contextBridge, ipcRenderer } from 'electron'

const api = {
  ask: (question: string) => ipcRenderer.invoke('ask', question),
  cancel: () => ipcRenderer.invoke('cancel'),
  toggle: () => ipcRenderer.invoke('toggle'),
  close: () => ipcRenderer.invoke('close'),
  setInteractive: (interactive: boolean) =>
    ipcRenderer.invoke('set-interactive', interactive),
  onChunk: (cb: (text: string) => void) => {
    const listener = (_: unknown, text: string) => cb(text)
    ipcRenderer.on('ask:chunk', listener)
    return () => ipcRenderer.removeListener('ask:chunk', listener)
  },
  onDone: (cb: () => void) => {
    const listener = () => cb()
    ipcRenderer.on('ask:done', listener)
    return () => ipcRenderer.removeListener('ask:done', listener)
  },
  onError: (cb: (message: string) => void) => {
    const listener = (_: unknown, message: string) => cb(message)
    ipcRenderer.on('ask:error', listener)
    return () => ipcRenderer.removeListener('ask:error', listener)
  }
}

contextBridge.exposeInMainWorld('api', api)

export type Api = typeof api

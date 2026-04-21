import { config } from 'dotenv'
import { app, BrowserWindow, globalShortcut, ipcMain, screen } from 'electron'
import { join, resolve } from 'node:path'
import Groq from 'groq-sdk'

config({ path: resolve(__dirname, '../../.env') })

console.log('[DEBUG] CWD:', process.cwd())
console.log('[DEBUG] __dirname:', __dirname)
console.log('[DEBUG] .env path:', resolve(__dirname, '../../.env'))
console.log('[DEBUG] GROQ_API_KEY:', process.env.GROQ_API_KEY)

const client = new Groq({
  apiKey: process.env.GROQ_API_KEY ?? ''
})

const MODEL = 'llama-3.3-70b-versatile'
const SYSTEM_PROMPT =
  'You are a concise desktop assistant. When the user asks how to do something, give clear step-by-step instructions. Be brief and practical. Use markdown formatting.'

let mainWindow: BrowserWindow | null = null
let currentAbort: AbortController | null = null

function createWindow(): void {
  const { width, height } = screen.getPrimaryDisplay().workAreaSize
  const winWidth = 600
  const winHeight = 500
  const margin = 24

  mainWindow = new BrowserWindow({
    width: winWidth,
    height: winHeight,
    x: width - winWidth - margin,
    y: height - winHeight - margin,
    show: false,
    frame: false,
    transparent: true,
    resizable: false,
    skipTaskbar: true,
    alwaysOnTop: true,
    backgroundColor: '#00000000',
    hasShadow: false,
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false
    }
  })

  mainWindow.setAlwaysOnTop(true, 'screen-saver')
  mainWindow.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true })
  mainWindow.setIgnoreMouseEvents(true, { forward: true })

  if (process.env.ELECTRON_RENDERER_URL) {
    mainWindow.loadURL(process.env.ELECTRON_RENDERER_URL)
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }
}

function toggleWindow(): void {
  if (!mainWindow) return
  if (mainWindow.isVisible()) {
    mainWindow.hide()
  } else {
    mainWindow.show()
    mainWindow.focus()
  }
}

app.whenReady().then(() => {
  createWindow()

  const registered = globalShortcut.register('CommandOrControl+Shift+Space', toggleWindow)
  if (!registered) {
    console.error('Failed to register global shortcut Ctrl+Shift+Space')
  }

  ipcMain.handle('toggle', () => toggleWindow())
  ipcMain.handle('close', () => mainWindow?.hide())

  ipcMain.handle('set-interactive', (_e, interactive: boolean) => {
    if (!mainWindow) return
    if (interactive) {
      mainWindow.setIgnoreMouseEvents(false)
    } else {
      mainWindow.setIgnoreMouseEvents(true, { forward: true })
    }
  })

  ipcMain.handle('cancel', () => {
    currentAbort?.abort()
    currentAbort = null
  })

  ipcMain.handle('ask', async (e, question: string) => {
    const sender = e.sender

    currentAbort?.abort()
    const abort = new AbortController()
    currentAbort = abort

    try {
      if (!process.env.GROQ_API_KEY) {
        throw new Error('GROQ_API_KEY is not set. Add it to your .env file.')
      }

      const stream = await client.chat.completions.create({
        model: MODEL,
        max_tokens: 1024,
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user', content: question }
        ],
        stream: true
      }, { signal: abort.signal })

      for await (const chunk of stream) {
        const text = chunk.choices[0]?.delta?.content
        if (text && !sender.isDestroyed()) sender.send('ask:chunk', text)
      }
      if (!sender.isDestroyed()) sender.send('ask:done')
    } catch (err) {
      if (abort.signal.aborted) return
      const msg = err instanceof Error ? err.message : 'Unknown error'
      if (!sender.isDestroyed()) sender.send('ask:error', msg)
    } finally {
      if (currentAbort === abort) currentAbort = null
    }
  })
})

app.on('will-quit', () => {
  globalShortcut.unregisterAll()
})

app.on('window-all-closed', () => {
  // Keep process alive; user toggles window via hotkey.
})

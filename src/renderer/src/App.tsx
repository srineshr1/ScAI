import { useCallback, useEffect, useRef, useState } from 'react'
import type { FormEvent } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import rehypeHighlight from 'rehype-highlight'

export default function App() {
  const [question, setQuestion] = useState('')
  const [answer, setAnswer] = useState('')
  const [streaming, setStreaming] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const inputRef = useRef<HTMLInputElement>(null)
  const responseRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const offChunk = window.api.onChunk((text) => {
      setAnswer((a) => a + text)
    })
    const offDone = window.api.onDone(() => {
      setStreaming(false)
    })
    const offError = window.api.onError((msg) => {
      setError(`Something went wrong: ${msg}`)
      setStreaming(false)
    })
    return () => {
      offChunk()
      offDone()
      offError()
    }
  }, [])

  useEffect(() => {
    if (responseRef.current) {
      responseRef.current.scrollTop = responseRef.current.scrollHeight
    }
  }, [answer])

  const submit = useCallback(
    (e: FormEvent) => {
      e.preventDefault()
      const q = question.trim()
      if (!q || streaming) return
      setAnswer('')
      setError(null)
      setStreaming(true)
      window.api.ask(q)
      setQuestion('')
    },
    [question, streaming]
  )

  const clear = useCallback(() => {
    window.api.cancel()
    setAnswer('')
    setError(null)
    setStreaming(false)
    inputRef.current?.focus()
  }, [])

  const setInteractive = (on: boolean) => window.api.setInteractive(on)

  return (
    <div
      className="card"
      onPointerEnter={() => setInteractive(true)}
      onPointerLeave={() => {
        if (document.activeElement !== inputRef.current) setInteractive(false)
      }}
    >
      <div className="dragbar">
        <span className="title">ScAI</span>
        <button
          className="iconbtn"
          onClick={() => window.api.close()}
          aria-label="Close"
        >
          ×
        </button>
      </div>

      <div className="response" ref={responseRef}>
        {streaming && answer === '' && !error && <div className="pulse" />}
        {error && <div className="error">{error}</div>}
        {answer && (
          <ReactMarkdown
            remarkPlugins={[remarkGfm]}
            rehypePlugins={[rehypeHighlight]}
          >
            {answer}
          </ReactMarkdown>
        )}
        {!streaming && !answer && !error && (
          <div className="hint">Ask me how to do anything. Press Enter to send.</div>
        )}
      </div>

      <form className="inputrow" onSubmit={submit}>
        <input
          ref={inputRef}
          type="text"
          placeholder="Ask me how to do anything..."
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          onFocus={() => setInteractive(true)}
          autoFocus
        />
        <button
          type="button"
          className="clearbtn"
          onClick={clear}
          disabled={!answer && !streaming && !error}
        >
          Clear
        </button>
      </form>
    </div>
  )
}

'use client'

import { useChat } from '@ai-sdk/react'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Textarea } from '@/components/ui/textarea'
import { Input } from '@/components/ui/input'
import { ArrowUp, ArrowLeft, Lock } from 'lucide-react'
import { useEffect, useRef, useMemo, useState } from 'react'
import { useScrollToBottom } from '@/hooks/use-scroll-to-bottom'
import MarkdownIt from 'markdown-it'

type QuickQuestion = {
  text: string
  message: string
}

export default function ChatBot() {
  const id = 'chatbot'
  const [showSplashScreen, setShowSplashScreen] = useState(true)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  // Auth State
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [sessionId, setSessionId] = useState<string | null>(null)
  const [authError, setAuthError] = useState<string | null>(null)
  const [accessCodeInput, setAccessCodeInput] = useState('')
  const [isVerifying, setIsVerifying] = useState(true)

  const md = useMemo(() => {
    return new MarkdownIt({
      html: false,
      breaks: true,
      linkify: true,
    })
  }, [])

  const quickQuestions = useMemo<QuickQuestion[]>(
    () => [
      { text: 'Agenda', message: "Qual è il programma dell'evento?" },
      { text: 'Logistica', message: "Dove si svolgerà l'evento?" },
    ],
    []
  )

  const { containerRef, endRef, scrollToBottom } = useScrollToBottom()

  // Authentication Logic
  useEffect(() => {
    const verifyCode = async (code: string) => {
      try {
        const res = await fetch('/api/auth', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ code }),
        })

        if (res.ok) {
          const data = await res.json()
          setSessionId(data.sessionId)
          sessionStorage.setItem('chat_session_id', data.sessionId)
          setIsAuthenticated(true)
          // Keep URL for sharing
          // window.history.replaceState({}, document.title, '/')
        } else {
          setAuthError('Codice non valido')
        }
      } catch {
        setAuthError('Errore di connessione')
      } finally {
        setIsVerifying(false)
      }
    }

    // Check URL code
    const urlParams = new URLSearchParams(window.location.search)
    const urlCode = urlParams.get('code')

    // Check stored session
    const storedSession = sessionStorage.getItem('chat_session_id')

    if (urlCode) {
      verifyCode(urlCode)
    } else if (storedSession) {
      setSessionId(storedSession)
      setIsAuthenticated(true)
      setIsVerifying(false)
    } else {
      setIsVerifying(false)
    }
  }, [])

  const handleManualLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setAuthError(null)
    setIsVerifying(true)

    try {
      const res = await fetch('/api/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: accessCodeInput }),
      })

      if (res.ok) {
        const data = await res.json()
        setSessionId(data.sessionId)
        sessionStorage.setItem('chat_session_id', data.sessionId)
        setIsAuthenticated(true)
        // Update URL with code for sharing
        const newUrl = new URL(window.location.href)
        newUrl.searchParams.set('code', accessCodeInput)
        window.history.replaceState({}, '', newUrl.toString())
      } else {
        setAuthError('Codice di accesso non valido')
      }
    } catch {
      setAuthError('Si è verificato un errore. Riprova.')
    } finally {
      setIsVerifying(false)
    }
  }

  const {
    messages,
    input,
    handleInputChange,
    handleSubmit,
    isLoading,
    error,
    append,
    setMessages,
  } = useChat({
    id,
    streamProtocol: 'data',
    headers: sessionId ? { 'X-Session-ID': sessionId } : {},
  })

  const isAtBottomRef = useRef(true)

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        isAtBottomRef.current = entry.isIntersecting
      },
      {
        root: null, // viewport
        threshold: 0, // trigger as soon as even 1px is visible
      }
    )

    if (endRef.current) {
      observer.observe(endRef.current)
    }

    return () => {
      observer.disconnect()
    }
  }, [endRef])

  useEffect(() => {
    const lastMessage = messages[messages.length - 1]

    // Always scroll to bottom for user messages to confirm action
    if (lastMessage?.role === 'user') {
      scrollToBottom('auto')
      return
    }

    // For assistant messages (streaming or complete), only scroll if we were already at the bottom
    // This allows the user to scroll up and read history without being yanked back down
    if (isAtBottomRef.current) {
      scrollToBottom('auto')
    }
  }, [messages, scrollToBottom])

  const updateTextareaHeight = () => {
    const textarea = textareaRef.current
    if (!textarea) return

    const scrollTop = textarea.scrollTop
    textarea.style.height = 'auto'

    const minHeight = 56
    const maxHeight = 112
    const scrollHeight = textarea.scrollHeight
    const newHeight = Math.max(minHeight, Math.min(scrollHeight, maxHeight))

    textarea.style.height = `${newHeight}px`
    textarea.scrollTop = scrollTop
  }

  const resetChat = () => {
    setMessages([])
    setShowSplashScreen(true)
    if (textareaRef.current) {
      textareaRef.current.style.height = '56px'
    }
  }

  const handleInputChangeWithResize = (
    e: React.ChangeEvent<HTMLTextAreaElement>
  ) => {
    handleInputChange(e)
    setTimeout(updateTextareaHeight, 0)
  }

  useEffect(() => {
    if (input === '' && textareaRef.current) {
      textareaRef.current.style.height = '56px'
    }
  }, [input])

  const handleQuickQuestion = (questionObj: QuickQuestion) => {
    setShowSplashScreen(false)
    append({
      role: 'user',
      content: questionObj.message,
    })
  }

  const handleFormSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    setShowSplashScreen(false)
    handleSubmit(e)
  }

  if (isVerifying) {
    return (
      <main className="flex min-h-dvh items-center justify-center bg-white">
        <div className="animate-pulse flex flex-col items-center gap-4">
          <div className="h-12 w-12 rounded-full bg-slate-200"></div>
          <div className="h-4 w-32 rounded bg-slate-200"></div>
        </div>
      </main>
    )
  }

  if (!isAuthenticated) {
    return (
      <main className="flex min-h-dvh items-center justify-center bg-slate-50 px-4">
        <div className="w-full max-w-md space-y-8 rounded-2xl bg-white p-6 md:p-8 shadow-lg">
          <div className="text-center">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-[#006d77]/10">
              <Lock className="h-6 w-6 text-[#006d77]" />
            </div>
            <h2 className="text-2xl font-bold text-slate-900">
              Accesso Richiesto
            </h2>
            <p className="mt-2 text-sm text-slate-600">
              Inserisci il codice di accesso per utilizzare l&apos;assistente.
            </p>
          </div>

          <form onSubmit={handleManualLogin} className="mt-8 space-y-6">
            <div>
              <Input
                type="password"
                required
                placeholder="Codice di accesso"
                value={accessCodeInput}
                onChange={e => setAccessCodeInput(e.target.value)}
                className="block w-full rounded-lg border-slate-300 px-4 py-3 focus:border-[#006d77] focus:ring-[#006d77]"
              />
              {authError && (
                <p className="mt-2 text-sm text-red-600">{authError}</p>
              )}
            </div>

            <Button
              type="submit"
              className="w-full rounded-lg bg-[#006d77] py-3 font-semibold text-white hover:bg-[#005660]"
            >
              Accedi
            </Button>
          </form>
        </div>
      </main>
    )
  }

  return (
    <main className="relative min-h-dvh bg-white text-slate-900 flex justify-center items-center">
      <section className="relative z-10 flex h-dvh w-full flex-col overflow-hidden bg-white text-slate-900">
        {error && (
          <div className="px-6 py-3 text-sm text-red-600 bg-red-100 border-b border-red-200">
            {error.message?.includes('429') ||
            error.message?.includes('Too Many Requests')
              ? '⏱️ Troppi messaggi inviati. Riprova tra un minuto.'
              : '⚠️ Si è verificato un errore durante la comunicazione'}
          </div>
        )}

        <div className="flex-1 overflow-hidden">
          {showSplashScreen ? (
            <div className="flex h-full flex-col items-center justify-center gap-6 md:gap-8 px-4 md:px-8 text-center">
              <div className="space-y-3 flex flex-col items-center">
                <h1 className="text-2xl md:text-3xl font-bold text-slate-900">
                  Ciao sono l&apos;AI Concierge
                </h1>
                <p className="text-sm md:text-base text-slate-600 max-w-[300px]">
                  chiedimi quello che vuoi sull&apos;evento o clicca uno dei box
                  sotto
                </p>
              </div>
              <div className="flex flex-col w-full max-w-xs gap-3">
                {quickQuestions.map((question, index) => (
                  <Button
                    key={index}
                    onClick={() => handleQuickQuestion(question)}
                    className="w-full rounded-lg bg-[#006d77] px-4 py-4 md:px-5 md:py-6 text-center text-white transition hover:bg-[#005660] shadow-md"
                    disabled={isLoading}
                  >
                    <span className="text-base md:text-lg font-medium">
                      {question.text}
                    </span>
                  </Button>
                ))}
              </div>

              <p className="text-xs text-slate-400 mt-8">
                Sono un sistema di Intelligenza artificiale, posso commettere
                errori
              </p>
            </div>
          ) : (
            <div className="flex flex-col h-full min-h-0">
              <div className="flex items-center justify-start px-4 py-3 md:px-6 md:py-4">
                <Button
                  onClick={resetChat}
                  variant="ghost"
                  size="icon"
                  className="h-10 w-10 rounded-full border border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                  title="Torna all'inizio"
                >
                  <ArrowLeft size={20} />
                </Button>
              </div>
              <ScrollArea
                className="flex-1 px-4 md:px-6 pb-4"
                ref={containerRef}
              >
                <div className="space-y-6 pb-6">
                  {messages.map(message => (
                    <div
                      key={message.id}
                      className={`flex w-full ${
                        message.role === 'user'
                          ? 'justify-end'
                          : 'justify-start'
                      }`}
                    >
                      <div
                        className={`max-w-[85%] rounded-2xl px-5 py-4 text-xs! md:text-base! leading-relaxed shadow-sm ${
                          message.role === 'user'
                            ? 'bg-[#006d77] text-white'
                            : 'bg-white border border-slate-200 text-slate-800'
                        }`}
                      >
                        <div
                          className={
                            message.role === 'assistant'
                              ? 'markdown-content text-slate-800'
                              : 'whitespace-pre-wrap'
                          }
                          suppressHydrationWarning
                        >
                          {message.parts.map((part, i) => {
                            switch (part.type) {
                              case 'text':
                                return (
                                  <div
                                    key={`${message.id}-${i}`}
                                    {...(message.role === 'assistant'
                                      ? {
                                          dangerouslySetInnerHTML: {
                                            __html: md.render(part.text),
                                          },
                                        }
                                      : { children: part.text })}
                                  />
                                )
                              default:
                                return null
                            }
                          })}
                        </div>
                      </div>
                    </div>
                  ))}

                  {isLoading &&
                    (() => {
                      const lastMessage = messages[messages.length - 1]
                      const isAssistantStreaming =
                        lastMessage &&
                        lastMessage.role === 'assistant' &&
                        lastMessage.parts.some(
                          part => part.type === 'text' && part.text.trim()
                        )

                      if (isAssistantStreaming) return null

                      return (
                        <div className="flex justify-start">
                          <div className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-500 shadow-sm">
                            <div className="flex gap-1.5">
                              <span className="h-2 w-2 animate-bounce rounded-full bg-slate-400"></span>
                              <span
                                className="h-2 w-2 animate-bounce rounded-full bg-slate-400"
                                style={{ animationDelay: '0.12s' }}
                              ></span>
                              <span
                                className="h-2 w-2 animate-bounce rounded-full bg-slate-400"
                                style={{ animationDelay: '0.24s' }}
                              ></span>
                            </div>
                          </div>
                        </div>
                      )
                    })()}
                </div>
                <div ref={endRef} className="h-6" />
              </ScrollArea>
            </div>
          )}
        </div>

        <div className="border-t border-slate-100 bg-white px-4 pb-4 pt-3 md:px-6 md:pb-6 md:pt-4">
          <form onSubmit={handleFormSubmit} className="flex items-end">
            <div className="relative flex-1">
              <Textarea
                ref={textareaRef}
                value={input}
                onChange={handleInputChangeWithResize}
                placeholder="Scrivi un messaggio..."
                className="w-full min-h-14 max-h-32 resize-none rounded-2xl border border-slate-200 bg-white px-4 md:px-6 pr-14 pt-4 pb-4 text-base text-slate-900 placeholder:text-slate-400 focus-visible:border-[#006d77] focus-visible:ring-1 focus-visible:ring-[#006d77]"
                rows={1}
                onKeyDown={e => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault()
                    if (input.trim()) {
                      setShowSplashScreen(false)
                      handleSubmit(
                        e as unknown as React.FormEvent<HTMLFormElement>
                      )
                    }
                  }
                }}
                style={{
                  scrollbarWidth: 'none',
                  msOverflowStyle: 'none',
                }}
              />

              <Button
                type="submit"
                disabled={isLoading || !input.trim()}
                className="absolute right-2 top-1/2 h-10 w-10 -translate-y-1/2 rounded-full bg-[#006d77] text-white shadow-sm hover:bg-[#005660] disabled:opacity-50 disabled:bg-slate-300"
              >
                <ArrowUp className="text-white" size={20} strokeWidth={2.5} />
              </Button>
            </div>
          </form>
          <div className="flex justify-center mt-4">
            <img
              src="/logo-full.png"
              alt="Decentral - Impact by Design"
              className="h-12 md:h-16 object-contain"
            />
          </div>
        </div>
      </section>
    </main>
  )
}

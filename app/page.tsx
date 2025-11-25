'use client'

import { useChat } from '@ai-sdk/react'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Textarea } from '@/components/ui/textarea'
import { ArrowUp, ArrowLeft } from 'lucide-react'
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
      { text: 'Contatti', message: 'Chi posso contattare per informazioni?' },
    ],
    []
  )

  const { containerRef, endRef, scrollToBottom } = useScrollToBottom()

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
    body: {
      code:
        typeof window !== 'undefined'
          ? new URLSearchParams(window.location.search).get('code')
          : null,
    },
  })

  useEffect(() => {
    scrollToBottom('auto')
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

  return (
    <main className="relative min-h-dvh bg-white text-slate-900 flex justify-center items-center">
      <section className="relative z-10 flex h-dvh w-full flex-col overflow-hidden bg-white text-slate-900">
        {error && (
          <div className="px-6 py-3 text-sm text-red-600 bg-red-100 border-b border-red-200">
            ⚠️ Si è verificato un errore durante la comunicazione
          </div>
        )}

        <div className="flex-1 overflow-hidden">
          {showSplashScreen ? (
            <div className="flex h-full flex-col items-center justify-center gap-8 px-8 text-center">
              <div className="space-y-3 flex flex-col items-center">
                <h1 className="text-3xl font-bold text-slate-900">
                  Ciao sono l&apos;AI Concierge
                </h1>
                <p className="text-base text-slate-600 max-w-[300px]">
                  chiedimi quello che vuoi sull&apos;evento o clicca uno dei box
                  sotto
                </p>
              </div>
              <div className="flex flex-col w-full max-w-xs gap-3">
                {quickQuestions.map((question, index) => (
                  <Button
                    key={index}
                    onClick={() => handleQuickQuestion(question)}
                    className="w-full rounded-lg bg-[#006d77] px-5 py-6 text-center text-white transition hover:bg-[#005660] shadow-md"
                    disabled={isLoading}
                  >
                    <span className="text-lg font-medium">{question.text}</span>
                  </Button>
                ))}
              </div>

              <p className="text-xs text-slate-400 mt-8">
                Sono un sistema di Intelligenza artificiale, posso commettere
                errori
              </p>
            </div>
          ) : (
            <div className="flex flex-col h-full">
              <div className="flex items-center justify-start px-6 py-4">
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
              <ScrollArea className="flex-1 px-6 pb-4" ref={containerRef}>
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
                        className={`max-w-[85%] rounded-2xl px-5 py-4 text-base leading-relaxed shadow-sm ${
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

        <div className="border-t border-slate-100 bg-white px-6 pb-6 pt-4">
          <form onSubmit={handleFormSubmit} className="flex items-end">
            <div className="relative flex-1">
              <Textarea
                ref={textareaRef}
                value={input}
                onChange={handleInputChangeWithResize}
                placeholder="Scrivi un messaggio..."
                className="w-full min-h-14 max-h-32 resize-none rounded-2xl border border-slate-200 bg-white px-6 pr-14 pt-4 pb-4 text-base text-slate-900 placeholder:text-slate-400 focus-visible:border-[#006d77] focus-visible:ring-1 focus-visible:ring-[#006d77]"
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
              className="h-16 object-contain"
            />
          </div>
        </div>
      </section>
    </main>
  )
}

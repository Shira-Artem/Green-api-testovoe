import { useState, type FormEvent } from 'react'
import { Brand } from '../components/Brand'
import { PlusIcon, SendIcon, SettingsIcon } from '../components/Icons'
import type { useMessenger } from '../hooks/useMessenger'

type ChatPageProps = ReturnType<typeof useMessenger> & {
  onDisconnect: () => void
}

function formatTime(timestamp: number) {
  return new Date(timestamp * 1000).toLocaleTimeString('ru-RU', {
    hour: '2-digit', minute: '2-digit',
  })
}

export function ChatPage({
  state, createChatByPhone, isCheckingAccount, createError, chooseChat, sendText, isSending, sendError, pollError, onDisconnect,
}: ChatPageProps) {
  const [creating, setCreating] = useState(false)
  const [phoneInput, setPhoneInput] = useState('')
  const [drafts, setDrafts] = useState<Record<string, string>>({})

  const activeChat = state.chats.find((chat) => chat.id === state.activeChatId)
  const messages = activeChat ? state.messagesByChat[activeChat.id] ?? [] : []
  const draft = activeChat ? drafts[activeChat.id] ?? '' : ''

  async function handleCreate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (await createChatByPhone(phoneInput)) {
      setPhoneInput('')
      setCreating(false)
    }
  }

  async function handleSend(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!activeChat) return
    const chatId = activeChat.id
    if (await sendText(chatId, draft)) {
      setDrafts((current) => ({ ...current, [chatId]: '' }))
    }
  }

  return (
    <main className="chat-page">
      <div className="chat-app">
        <aside className="sidebar" aria-label="Список чатов">
          <div className="sidebar-top">
            <Brand />
            <button className="icon-button" type="button" onClick={onDisconnect} aria-label="Выйти из аккаунта" title="Выйти из аккаунта">
              <SettingsIcon />
            </button>
          </div>

          <div className="sidebar-heading">
            <div>
              <span className="eyebrow">Сообщения</span>
              <h1>Чаты</h1>
            </div>
            <button className="new-chat-button" type="button" onClick={() => setCreating((value) => !value)} aria-expanded={creating} disabled={isCheckingAccount}>
              <PlusIcon size={18} /> <span>Новый чат</span>
            </button>
          </div>

          {creating && (
            <form className="new-chat-form" onSubmit={(event) => void handleCreate(event)}>
              <label htmlFor="new-phone">Номер телефона</label>
              <div>
                <input id="new-phone" type="tel" value={phoneInput} onChange={(event) => setPhoneInput(event.target.value)} placeholder="+79991234567" disabled={isCheckingAccount} autoFocus />
                <button type="submit" disabled={isCheckingAccount}>{isCheckingAccount ? 'Проверяем…' : 'Создать'}</button>
              </div>
              {createError && <p role="alert">{createError}</p>}
            </form>
          )}

          <nav className="chat-list" aria-label="Чаты">
            {state.chats.map((chat, index) => {
              const chatMessages = state.messagesByChat[chat.id] ?? []
              const last = chatMessages.at(-1)
              const name = chat.displayName || chat.id
              const color = ['blue', 'violet', 'peach'][index % 3]
              return (
                <button className={`chat-list-item ${chat.id === state.activeChatId ? 'is-active' : ''}`} type="button" onClick={() => chooseChat(chat.id)} key={chat.id} aria-current={chat.id === state.activeChatId ? 'page' : undefined}>
                  <span className={`avatar avatar-${color}`} aria-hidden="true">{name[0].toUpperCase()}</span>
                  <span className="chat-list-copy">
                    <span className="chat-list-line"><strong>{name}</strong><small>{last ? formatTime(last.timestamp) : ''}</small></span>
                    <span className="chat-preview">{last?.text ?? 'Сообщений пока нет'}</span>
                  </span>
                </button>
              )
            })}
          </nav>
          {state.chats.length === 0 && <p className="empty-list">Создайте чат по номеру телефона.</p>}
          <p className="sidebar-note">GREEN-API · Telegram</p>
        </aside>

        <section className="conversation" aria-labelledby="conversation-title">
          <header className="conversation-header">
            {activeChat && <span className="avatar avatar-blue" aria-hidden="true">{(activeChat.displayName || activeChat.id)[0].toUpperCase()}</span>}
            <div className="conversation-person">
              <h2 id="conversation-title">{activeChat?.displayName || activeChat?.id || 'Выберите чат'}</h2>
              {activeChat && <span>ID чата: {activeChat.id}</span>}
            </div>
            <span className="demo-badge">Telegram</span>
          </header>

          {pollError && <div className="poll-error" role="alert">Приём сообщений остановлен. {pollError} Выйдите и подключитесь повторно.</div>}

          <div className="message-area">
            <div className="message-content">
              {activeChat ? (
                messages.length ? messages.map((message) => (
                  <div className={`message-row message-${message.direction}`} key={message.idMessage}>
                    <div className="message-bubble">
                      <p>{message.text}</p>
                      <time dateTime={new Date(message.timestamp * 1000).toISOString()}>{formatTime(message.timestamp)}</time>
                    </div>
                  </div>
                )) : <div className="conversation-empty">Сообщений пока нет. Напишите первым.</div>
              ) : <div className="conversation-empty">Создайте или выберите чат, чтобы начать переписку.</div>}
            </div>
          </div>

          <div className="composer-wrap">
            <form className="composer" onSubmit={(event) => void handleSend(event)}>
              <input type="text" aria-label="Сообщение" placeholder={activeChat ? 'Написать сообщение...' : 'Сначала выберите чат'} value={draft} onChange={(event) => activeChat && setDrafts((current) => ({ ...current, [activeChat.id]: event.target.value }))} disabled={!activeChat || isSending || Boolean(pollError)} />
              <button type="submit" disabled={!activeChat || !draft.trim() || isSending || Boolean(pollError)} aria-label="Отправить сообщение" title="Отправить сообщение">
                <SendIcon />
              </button>
            </form>
            {sendError && <p className="send-error" role="alert">{sendError}</p>}
            {activeChat && <p className="composer-hint">{Array.from(draft).length} / 4096 символов</p>}
          </div>
        </section>
      </div>
    </main>
  )
}

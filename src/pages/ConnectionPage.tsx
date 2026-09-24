import type { FormEvent } from 'react'
import { Brand } from '../components/Brand'
import type { GreenApiCredentials } from '../types/greenApi'

type ConnectionPageProps = {
  connect: (credentials: GreenApiCredentials) => Promise<void>
  loading: boolean
  error: string | null
}

export function ConnectionPage({ connect, loading, error }: ConnectionPageProps) {
  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const data = new FormData(event.currentTarget)
    void connect({
      apiUrl: String(data.get('apiUrl') ?? '').trim(),
      idInstance: String(data.get('idInstance') ?? '').trim(),
      apiTokenInstance: String(data.get('apiTokenInstance') ?? '').trim(),
    })
  }

  return (
    <main className="connection-page">
      <div className="connection-shell">
        <header className="connection-header">
          <Brand />
          <span className="header-caption">Чаты через GREEN-API</span>
        </header>

        <section className="connection-card" aria-labelledby="connection-title">
          <div className="connection-intro">
            <span className="eyebrow">Начало работы</span>
            <h1 id="connection-title">Подключение к GREEN-API</h1>
            <p>Укажите параметры инстанса, чтобы открыть интерфейс чатов.</p>
          </div>

          <form className="connection-form" onSubmit={handleSubmit} autoComplete="off">
            <label className="field">
              <span>apiUrl</span>
              <input name="apiUrl" type="url" placeholder="https://api.green-api.com" required />
            </label>
            <label className="field">
              <span>idInstance</span>
              <input name="idInstance" type="text" inputMode="numeric" placeholder="Номер инстанса" required />
            </label>
            <label className="field">
              <span>apiTokenInstance</span>
              <input name="apiTokenInstance" type="password" placeholder="Токен инстанса" required />
            </label>
            <button className="primary-button" type="submit" disabled={loading}>
              {loading ? 'Подключаемся…' : 'Подключиться'}
            </button>
            {error && <p className="form-error" role="alert">{error}</p>}
          </form>

          <p className="preview-note">Параметры хранятся только до закрытия или обновления страницы.</p>
        </section>

        <p className="connection-footer">Telegram · GREEN-API</p>
      </div>
    </main>
  )
}

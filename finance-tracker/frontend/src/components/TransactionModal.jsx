import { useEffect, useState } from 'react'
import { format } from 'date-fns'
import api from '../api'

export default function TransactionModal({ initial, onSave, onClose }) {
  const today = format(new Date(), 'yyyy-MM-dd')

  const [categories, setCategories] = useState({ income: [], expense: [] })
  const [form, setForm] = useState({
    type: initial?.type ?? 'expense',
    category: initial?.category ?? '',
    amount: initial?.amount?.toString() ?? '',
    description: initial?.description ?? '',
    date: initial?.date ?? today,
  })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    api.get('/categories').then(({ data }) => {
      setCategories(data)
      // Use functional update so we don't need form.category as a dep (avoids re-running on every keystroke)
      setForm((f) => ({ ...f, category: f.category || data[f.type]?.[0] || '' }))
    })
  }, []) // intentionally runs once on mount to load categories

  function changeType(type) {
    setForm((f) => ({ ...f, type, category: categories[type]?.[0] ?? '' }))
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setSaving(true)
    try {
      await onSave({ ...form, amount: parseFloat(form.amount) })
    } catch (err) {
      setError(err.response?.data?.error || 'Something went wrong')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="card w-full max-w-md">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-semibold">{initial ? 'Edit' : 'Add'} Transaction</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-200 text-xl">✕</button>
        </div>

        {error && (
          <div className="bg-red-500/10 border border-red-500/30 text-red-400 text-sm rounded-lg px-4 py-3 mb-4">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Type toggle */}
          <div className="flex rounded-lg overflow-hidden border border-slate-600">
            {['expense', 'income'].map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => changeType(t)}
                className={`flex-1 py-2 text-sm font-medium capitalize transition-colors ${
                  form.type === t
                    ? t === 'income' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-red-500/20 text-red-400'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {t}
              </button>
            ))}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Amount ($)</label>
              <input
                type="number"
                step="0.01"
                min="0.01"
                className="input"
                placeholder="0.00"
                value={form.amount}
                onChange={(e) => setForm({ ...form, amount: e.target.value })}
                required
              />
            </div>
            <div>
              <label className="label">Date</label>
              <input
                type="date"
                className="input"
                value={form.date}
                onChange={(e) => setForm({ ...form, date: e.target.value })}
                required
              />
            </div>
          </div>

          <div>
            <label className="label">Category</label>
            <select
              className="input"
              value={form.category}
              onChange={(e) => setForm({ ...form, category: e.target.value })}
            >
              {(categories[form.type] ?? []).map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="label">Description (optional)</label>
            <input
              type="text"
              className="input"
              placeholder="e.g. Grocery run"
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
            />
          </div>

          <div className="flex gap-3 pt-1">
            <button type="button" onClick={onClose} className="btn-secondary flex-1">Cancel</button>
            <button type="submit" className="btn-primary flex-1" disabled={saving}>
              {saving ? 'Saving…' : (initial ? 'Update' : 'Add')}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

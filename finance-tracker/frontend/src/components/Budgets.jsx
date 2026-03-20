import { useEffect, useState, useCallback } from 'react'
import api from '../api'

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

function fmt(n) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(n)
}

function ProgressBar({ spent, limit }) {
  const pct = Math.min((spent / limit) * 100, 100)
  const over = spent > limit
  return (
    <div className="mt-2">
      <div className="flex justify-between text-xs text-slate-400 mb-1">
        <span>{fmt(spent)} spent</span>
        <span className={over ? 'text-red-400 font-medium' : ''}>{fmt(limit)} limit</span>
      </div>
      <div className="h-2 bg-slate-700 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all ${over ? 'bg-red-500' : pct > 80 ? 'bg-amber-400' : 'bg-cyan-500'}`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  )
}

export default function Budgets() {
  const now = new Date()
  const [month, setMonth] = useState(now.getMonth() + 1)
  const [year, setYear] = useState(now.getFullYear())
  const [budgets, setBudgets] = useState([])
  const [expenseCategories, setExpenseCategories] = useState([])
  const [form, setForm] = useState({ category: '', limit: '' })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [b, cats] = await Promise.all([
        api.get('/budgets', { params: { month, year } }),
        api.get('/categories'),
      ])
      setBudgets(b.data)
      setExpenseCategories(cats.data.expense ?? [])
      setForm((f) => ({ ...f, category: cats.data.expense?.[0] ?? '' }))
    } finally {
      setLoading(false)
    }
  }, [month, year])

  useEffect(() => { load() }, [load])

  async function handleAdd(e) {
    e.preventDefault()
    setError('')
    setSaving(true)
    try {
      const { data } = await api.post('/budgets', {
        category: form.category,
        limit: parseFloat(form.limit),
        month,
        year,
      })
      setBudgets((prev) => {
        const exists = prev.findIndex((b) => b.id === data.id)
        if (exists >= 0) {
          const copy = [...prev]
          copy[exists] = data
          return copy
        }
        return [...prev, data]
      })
      setForm((f) => ({ ...f, limit: '' }))
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to save budget')
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(id) {
    if (!confirm('Delete this budget?')) return
    await api.delete(`/budgets/${id}`)
    setBudgets((prev) => prev.filter((b) => b.id !== id))
  }

  const totalLimit = budgets.reduce((s, b) => s + b.limit, 0)
  const totalSpent = budgets.reduce((s, b) => s + (b.spent ?? 0), 0)

  return (
    <div className="space-y-5 pb-20 md:pb-0">
      <div>
        <h1 className="text-2xl font-bold">Budgets</h1>
        <p className="text-slate-400 text-sm">Set monthly spending limits per category</p>
      </div>

      {/* Month selector */}
      <div className="flex gap-2">
        <select value={month} onChange={(e) => setMonth(Number(e.target.value))} className="input !w-auto py-1.5 text-sm">
          {MONTHS.map((m, i) => <option key={m} value={i + 1}>{m}</option>)}
        </select>
        <select value={year} onChange={(e) => setYear(Number(e.target.value))} className="input !w-auto py-1.5 text-sm">
          {[year - 1, year, year + 1].map((y) => <option key={y} value={y}>{y}</option>)}
        </select>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Add form */}
        <div className="card">
          <h2 className="text-sm font-semibold text-slate-300 mb-4">Set a Budget</h2>

          {error && (
            <div className="bg-red-500/10 border border-red-500/30 text-red-400 text-sm rounded-lg px-3 py-2 mb-3">
              {error}
            </div>
          )}

          <form onSubmit={handleAdd} className="space-y-3">
            <div>
              <label className="label">Category</label>
              <select
                className="input"
                value={form.category}
                onChange={(e) => setForm({ ...form, category: e.target.value })}
              >
                {expenseCategories.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Monthly limit ($)</label>
              <input
                type="number"
                step="1"
                min="1"
                className="input"
                placeholder="e.g. 500"
                value={form.limit}
                onChange={(e) => setForm({ ...form, limit: e.target.value })}
                required
              />
            </div>
            <button type="submit" className="btn-primary w-full" disabled={saving}>
              {saving ? 'Saving…' : 'Save Budget'}
            </button>
          </form>
        </div>

        {/* Budget list */}
        <div className="card lg:col-span-2">
          {/* Summary */}
          {budgets.length > 0 && (
            <div className="flex gap-6 mb-5 pb-4 border-b border-slate-700">
              <div>
                <p className="text-xs text-slate-400">Total Budget</p>
                <p className="text-lg font-bold text-cyan-400">{fmt(totalLimit)}</p>
              </div>
              <div>
                <p className="text-xs text-slate-400">Total Spent</p>
                <p className={`text-lg font-bold ${totalSpent > totalLimit ? 'text-red-400' : 'text-slate-100'}`}>{fmt(totalSpent)}</p>
              </div>
              <div>
                <p className="text-xs text-slate-400">Remaining</p>
                <p className={`text-lg font-bold ${totalLimit - totalSpent < 0 ? 'text-red-400' : 'text-emerald-400'}`}>
                  {fmt(totalLimit - totalSpent)}
                </p>
              </div>
            </div>
          )}

          {loading ? (
            <p className="text-slate-500 text-sm text-center py-10">Loading…</p>
          ) : budgets.length === 0 ? (
            <p className="text-slate-500 text-sm text-center py-10">No budgets set for this month</p>
          ) : (
            <div className="space-y-5">
              {budgets.map((b) => (
                <div key={b.id}>
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">{b.category}</span>
                    <button onClick={() => handleDelete(b.id)} className="text-slate-500 hover:text-red-400 transition-colors text-xs">
                      Remove
                    </button>
                  </div>
                  <ProgressBar spent={b.spent ?? 0} limit={b.limit} />
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

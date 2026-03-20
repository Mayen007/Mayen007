import { useEffect, useState, useCallback } from 'react'
import { format } from 'date-fns'
import api from '../api'
import TransactionModal from './TransactionModal'

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

function fmt(n) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(n)
}

function categoryEmoji(cat) {
  const map = {
    Food: '🍔', Transport: '🚗', Housing: '🏠', Entertainment: '🎮',
    Health: '💊', Shopping: '🛍️', Education: '📚', Utilities: '💡',
    Salary: '💼', Freelance: '💻', Investment: '📈', Gift: '🎁', Other: '💰',
  }
  return map[cat] ?? '💰'
}

export default function Transactions() {
  const now = new Date()
  const [month, setMonth] = useState(now.getMonth() + 1)
  const [year, setYear] = useState(now.getFullYear())
  const [typeFilter, setTypeFilter] = useState('')
  const [transactions, setTransactions] = useState([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editing, setEditing] = useState(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const params = { month, year }
      if (typeFilter) params.type = typeFilter
      const { data } = await api.get('/transactions', { params })
      setTransactions(data)
    } finally {
      setLoading(false)
    }
  }, [month, year, typeFilter])

  useEffect(() => { load() }, [load])

  async function handleDelete(id) {
    if (!confirm('Delete this transaction?')) return
    await api.delete(`/transactions/${id}`)
    setTransactions((prev) => prev.filter((t) => t.id !== id))
  }

  function openAdd() {
    setEditing(null)
    setShowModal(true)
  }

  function openEdit(t) {
    setEditing(t)
    setShowModal(true)
  }

  async function handleSave(data) {
    if (editing) {
      const { data: updated } = await api.put(`/transactions/${editing.id}`, data)
      setTransactions((prev) => prev.map((t) => (t.id === editing.id ? updated : t)))
    } else {
      const { data: created } = await api.post('/transactions', data)
      setTransactions((prev) => [created, ...prev])
    }
    setShowModal(false)
  }

  const total = transactions.reduce((s, t) => s + (t.type === 'income' ? t.amount : -t.amount), 0)

  return (
    <div className="space-y-5 pb-20 md:pb-0">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Transactions</h1>
          <p className="text-slate-400 text-sm">
            {transactions.length} entries · net{' '}
            <span className={total >= 0 ? 'text-emerald-400' : 'text-red-400'}>{fmt(total)}</span>
          </p>
        </div>
        <button onClick={openAdd} className="btn-primary">+ Add</button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2">
        <select value={month} onChange={(e) => setMonth(Number(e.target.value))} className="input !w-auto py-1.5 text-sm">
          {MONTHS.map((m, i) => <option key={m} value={i + 1}>{m}</option>)}
        </select>
        <select value={year} onChange={(e) => setYear(Number(e.target.value))} className="input !w-auto py-1.5 text-sm">
          {[year - 1, year, year + 1].map((y) => <option key={y} value={y}>{y}</option>)}
        </select>
        <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)} className="input !w-auto py-1.5 text-sm">
          <option value="">All types</option>
          <option value="income">Income</option>
          <option value="expense">Expense</option>
        </select>
      </div>

      {/* Table */}
      <div className="card p-0 overflow-hidden">
        {loading ? (
          <p className="text-center text-slate-500 py-12">Loading…</p>
        ) : transactions.length === 0 ? (
          <p className="text-center text-slate-500 py-12">No transactions found</p>
        ) : (
          <div className="divide-y divide-slate-700">
            {transactions.map((t) => (
              <div key={t.id} className="flex items-center gap-4 px-5 py-3.5 hover:bg-slate-700/30 transition-colors">
                <div className="w-9 h-9 rounded-xl bg-slate-700 flex items-center justify-center text-lg shrink-0">
                  {categoryEmoji(t.category)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{t.description || t.category}</p>
                  <p className="text-xs text-slate-500">
                    <span className={t.type === 'income' ? 'text-emerald-500' : 'text-red-500'}>{t.type}</span>
                    {' · '}{t.category}{' · '}{format(new Date(t.date + 'T00:00:00'), 'MMM d, yyyy')}
                  </p>
                </div>
                <span className={`text-sm font-semibold shrink-0 ${t.type === 'income' ? 'text-emerald-400' : 'text-red-400'}`}>
                  {t.type === 'income' ? '+' : '-'}{fmt(t.amount)}
                </span>
                <div className="flex gap-2 shrink-0">
                  <button onClick={() => openEdit(t)} className="text-slate-400 hover:text-cyan-400 transition-colors text-sm" title="Edit">✏️</button>
                  <button onClick={() => handleDelete(t.id)} className="text-slate-400 hover:text-red-400 transition-colors text-sm" title="Delete">🗑️</button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {showModal && (
        <TransactionModal
          initial={editing}
          onSave={handleSave}
          onClose={() => setShowModal(false)}
        />
      )}
    </div>
  )
}

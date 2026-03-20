import { useEffect, useState } from 'react'
import { format } from 'date-fns'
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, Tooltip, ResponsiveContainer, Legend,
} from 'recharts'
import api from '../api'
import { Link } from 'react-router-dom'

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
const COLORS = ['#06b6d4', '#8b5cf6', '#f59e0b', '#10b981', '#f43f5e', '#3b82f6', '#ec4899', '#14b8a6', '#a855f7']

function StatCard({ label, value, sub, accent }) {
  const accentClass = {
    cyan: 'text-cyan-400',
    emerald: 'text-emerald-400',
    red: 'text-red-400',
  }[accent] || 'text-slate-100'

  return (
    <div className="card flex flex-col gap-1">
      <p className="text-xs text-slate-400 font-medium uppercase tracking-wide">{label}</p>
      <p className={`text-2xl font-bold ${accentClass}`}>{value}</p>
      {sub && <p className="text-xs text-slate-500">{sub}</p>}
    </div>
  )
}

function fmt(n) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(n)
}

export default function Dashboard() {
  const now = new Date()
  const [month, setMonth] = useState(now.getMonth() + 1)
  const [year, setYear] = useState(now.getFullYear())
  const [summary, setSummary] = useState(null)
  const [recent, setRecent] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    async function load() {
      setLoading(true)
      try {
        const [s, r] = await Promise.all([
          api.get('/summary', { params: { month, year } }),
          api.get('/transactions', { params: { month, year } }),
        ])
        if (!cancelled) {
          setSummary(s.data)
          setRecent(r.data.slice(0, 6))
        }
      } catch {
        // handled by auth interceptor
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => { cancelled = true }
  }, [month, year])

  const trendData = summary?.trend?.map((t) => ({
    name: `${MONTHS[t.month - 1]} ${t.year !== year ? t.year : ''}`.trim(),
    Income: t.income,
    Expenses: t.expenses,
  })) ?? []

  const pieData = summary
    ? Object.entries(summary.by_category)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 8)
        .map(([name, value]) => ({ name, value }))
    : []

  return (
    <div className="space-y-6 pb-20 md:pb-0">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Dashboard</h1>
          <p className="text-slate-400 text-sm">Track your income and expenses</p>
        </div>
        <div className="flex gap-2">
          <select
            value={month}
            onChange={(e) => setMonth(Number(e.target.value))}
            className="input !w-auto py-1.5 text-sm"
          >
            {MONTHS.map((m, i) => <option key={m} value={i + 1}>{m}</option>)}
          </select>
          <select
            value={year}
            onChange={(e) => setYear(Number(e.target.value))}
            className="input !w-auto py-1.5 text-sm"
          >
            {[year - 1, year, year + 1].map((y) => <option key={y} value={y}>{y}</option>)}
          </select>
        </div>
      </div>

      {loading ? (
        <div className="text-center text-slate-500 py-20">Loading…</div>
      ) : (
        <>
          {/* Stat cards */}
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
            <StatCard
              label="Balance"
              value={fmt(summary?.balance ?? 0)}
              sub={`${MONTHS[month - 1]} ${year}`}
              accent={summary?.balance >= 0 ? 'cyan' : 'red'}
            />
            <StatCard
              label="Income"
              value={fmt(summary?.income ?? 0)}
              sub="this month"
              accent="emerald"
            />
            <StatCard
              label="Expenses"
              value={fmt(summary?.expenses ?? 0)}
              sub="this month"
              accent="red"
            />
          </div>

          {/* Charts row */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {/* Trend area chart */}
            <div className="card lg:col-span-2">
              <h2 className="text-sm font-semibold text-slate-300 mb-4">6-Month Trend</h2>
              <ResponsiveContainer width="100%" height={200}>
                <AreaChart data={trendData}>
                  <defs>
                    <linearGradient id="incomeGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="expenseGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#f43f5e" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#f43f5e" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="name" tick={{ fill: '#94a3b8', fontSize: 11 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fill: '#94a3b8', fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={(v) => `$${v / 1000}k`} />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '8px' }}
                    formatter={(v) => [fmt(v)]}
                  />
                  <Area type="monotone" dataKey="Income" stroke="#10b981" fill="url(#incomeGrad)" strokeWidth={2} />
                  <Area type="monotone" dataKey="Expenses" stroke="#f43f5e" fill="url(#expenseGrad)" strokeWidth={2} />
                  <Legend wrapperStyle={{ fontSize: 12, color: '#94a3b8' }} />
                </AreaChart>
              </ResponsiveContainer>
            </div>

            {/* Pie chart */}
            <div className="card">
              <h2 className="text-sm font-semibold text-slate-300 mb-4">By Category</h2>
              {pieData.length === 0 ? (
                <p className="text-slate-500 text-sm text-center py-16">No data yet</p>
              ) : (
                <ResponsiveContainer width="100%" height={200}>
                  <PieChart>
                    <Pie data={pieData} cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={3} dataKey="value">
                      {pieData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                    </Pie>
                    <Tooltip
                      contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '8px' }}
                      formatter={(v, name) => [fmt(v), name]}
                    />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>

          {/* Recent transactions */}
          <div className="card">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-semibold text-slate-300">Recent Transactions</h2>
              <Link to="/transactions" className="text-xs text-cyan-400 hover:text-cyan-300">View all →</Link>
            </div>

            {recent.length === 0 ? (
              <p className="text-slate-500 text-sm text-center py-8">No transactions this month</p>
            ) : (
              <div className="divide-y divide-slate-700">
                {recent.map((t) => (
                  <div key={t.id} className="flex items-center justify-between py-3 gap-4">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-8 h-8 rounded-lg bg-slate-700 flex items-center justify-center text-base shrink-0">
                        {categoryEmoji(t.category)}
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-medium truncate">{t.description || t.category}</p>
                        <p className="text-xs text-slate-500">{t.category} · {format(new Date(t.date + 'T00:00:00'), 'MMM d')}</p>
                      </div>
                    </div>
                    <span className={`text-sm font-semibold shrink-0 ${t.type === 'income' ? 'text-emerald-400' : 'text-red-400'}`}>
                      {t.type === 'income' ? '+' : '-'}{fmt(t.amount)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  )
}

function categoryEmoji(cat) {
  const map = {
    Food: '🍔', Transport: '🚗', Housing: '🏠', Entertainment: '🎮',
    Health: '💊', Shopping: '🛍️', Education: '📚', Utilities: '💡',
    Salary: '💼', Freelance: '💻', Investment: '📈', Gift: '🎁',
    Other: '💰',
  }
  return map[cat] ?? '💰'
}

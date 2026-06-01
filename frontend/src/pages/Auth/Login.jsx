import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useMutation } from '@tanstack/react-query'
import { login } from '../../api'
import { useAuthStore } from '../../store'
import { motion } from 'framer-motion'
import toast from 'react-hot-toast'

export default function Login() {
  const [form, setForm] = useState({ email: '', password: '' })
  const [showPass, setShowPass] = useState(false)
  const { setAuth } = useAuthStore()
  const navigate = useNavigate()

  const mutation = useMutation({
    mutationFn: (data) => login(data),
    onSuccess: (res) => {
      setAuth(res.data.user, res.data.token)
      toast.success(`Welcome back, ${res.data.user.name}! ☕`)
      navigate('/dashboard')
    },
    onError: () => {},
  })

  const handleSubmit = (e) => {
    e.preventDefault()
    if (!form.email || !form.password) return toast.error('Please fill in all fields')
    mutation.mutate(form)
  }

  const quickLogin = (role) => {
    const creds = {
      admin:   { email: 'admin@coffeemaster.tn',   password: 'password123' },
      manager: { email: 'manager@coffeemaster.tn', password: 'password123' },
      cashier: { email: 'cashier@coffeemaster.tn', password: 'password123' },
      barista: { email: 'barista@coffeemaster.tn', password: 'password123' },
    }
    setForm(creds[role])
    mutation.mutate(creds[role])
  }

  return (
    <div className="min-h-screen bg-dark-gradient flex items-center justify-center p-4 relative overflow-hidden">
      {/* Background decorations */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {[...Array(6)].map((_, i) => (
          <motion.div key={i}
            animate={{ y: [0, -20, 0], opacity: [0.3, 0.6, 0.3] }}
            transition={{ duration: 4 + i, repeat: Infinity, delay: i * 0.8 }}
            className="absolute text-6xl"
            style={{ left: `${10 + i * 16}%`, top: `${20 + (i % 3) * 25}%` }}>
            {['☕', '🫘', '☕', '🌿', '☕', '🫘'][i]}
          </motion.div>
        ))}
      </div>

      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md relative z-10"
      >
        {/* Card */}
        <div className="bg-white/10 backdrop-blur-xl rounded-3xl p-8 shadow-2xl border border-white/20">
          {/* Logo */}
          <div className="text-center mb-8">
            <motion.div
              animate={{ rotate: [0, 5, -5, 0] }}
              transition={{ duration: 3, repeat: Infinity }}
              className="text-6xl mb-4 inline-block">☕</motion.div>
            <h1 className="font-display font-bold text-white text-3xl">CoffeeMaster</h1>
            <p className="text-coffee-200 mt-1 text-sm">Coffee Shop Management System</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="label text-coffee-200">Email Address</label>
              <input
                type="email"
                value={form.email}
                onChange={e => setForm({ ...form, email: e.target.value })}
                placeholder="you@coffeemaster.tn"
                className="input bg-white/10 border-white/20 text-white placeholder-coffee-400 focus:ring-latte"
              />
            </div>
            <div>
              <label className="label text-coffee-200">Password</label>
              <div className="relative">
                <input
                  type={showPass ? 'text' : 'password'}
                  value={form.password}
                  onChange={e => setForm({ ...form, password: e.target.value })}
                  placeholder="••••••••"
                  className="input bg-white/10 border-white/20 text-white placeholder-coffee-400 focus:ring-latte pr-12"
                />
                <button type="button" onClick={() => setShowPass(!showPass)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-coffee-300 hover:text-white transition-colors text-sm">
                  {showPass ? '🙈' : '👁️'}
                </button>
              </div>
            </div>

            <button type="submit" disabled={mutation.isPending}
              className="w-full py-3 rounded-xl bg-coffee-gradient text-white font-semibold
                         hover:shadow-coffee-lg transition-all duration-200 mt-2 text-sm
                         disabled:opacity-60 disabled:cursor-not-allowed active:scale-98">
              {mutation.isPending ? '☕ Logging in...' : 'Sign In →'}
            </button>
          </form>

          {/* Quick login */}
          <div className="mt-6">
            <p className="text-center text-coffee-400 text-xs mb-3">Quick Demo Login</p>
            <div className="grid grid-cols-2 gap-2">
              {['admin', 'manager', 'cashier', 'barista'].map(role => (
                <button key={role} onClick={() => quickLogin(role)}
                  disabled={mutation.isPending}
                  className="py-1.5 px-3 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs
                             font-medium capitalize transition-all border border-white/10 hover:border-white/30
                             disabled:opacity-50">
                  {role === 'admin' ? '👑' : role === 'manager' ? '📊' : role === 'cashier' ? '💰' : '☕'} {role}
                </button>
              ))}
            </div>
          </div>
        </div>

        <p className="text-center text-coffee-500 text-xs mt-4">
          © 2024 CoffeeMaster · All rights reserved
        </p>
      </motion.div>
    </div>
  )
}

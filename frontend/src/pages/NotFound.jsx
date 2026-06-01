import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { FiArrowLeft, FiCoffee } from 'react-icons/fi'

export default function NotFound() {
  const navigate = useNavigate()

  return (
    <div className="min-h-screen bg-coffee-50 dark:bg-coffee-950 flex items-center justify-center p-6">
      <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }}
        className="text-center max-w-md">

        {/* Coffee cup icon */}
        <motion.div
          animate={{ rotate: [0, -10, 10, -10, 0] }}
          transition={{ repeat: Infinity, repeatDelay: 3, duration: 0.6 }}
          className="text-8xl mb-6 inline-block">
          <FiCoffee className="text-amber-500" />
        </motion.div>

        {/* 404 */}
        <h1 className="text-8xl font-black text-transparent bg-clip-text bg-gradient-to-br from-amber-500 to-orange-600 mb-2">404</h1>
        <h2 className="text-2xl font-bold text-coffee-900 dark:text-coffee-50 mb-3">Page Not Found</h2>
        <p className="text-coffee-500 dark:text-coffee-400 mb-8">
          Looks like this page was left out in the cold. Let's get you back to something warm.
        </p>

        <div className="flex gap-3 justify-center">
          <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
            onClick={() => navigate(-1)}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl border border-coffee-200 dark:border-coffee-700 text-coffee-700 dark:text-coffee-300 hover:bg-coffee-100 dark:hover:bg-coffee-800 transition-colors text-sm font-medium">
            <FiArrowLeft /> Go Back
          </motion.button>
          <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
            onClick={() => navigate('/dashboard')}
            className="btn-primary flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-medium">
            <FiCoffee /> Dashboard
          </motion.button>
        </div>
      </motion.div>
    </div>
  )
}

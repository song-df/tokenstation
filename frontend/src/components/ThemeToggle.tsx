import { Sun, Moon, Monitor } from 'lucide-react'
import { useTheme } from '../lib/theme'

export default function ThemeToggle() {
  const { theme, setTheme } = useTheme()

  const base = "p-1 rounded transition-colors"
  const active = (t: string) => theme === t ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400' : 'text-gray-400 hover:text-gray-600 dark:hover:text-gray-300'

  return (
    <div className="flex items-center gap-0.5">
      <button onClick={() => setTheme('light')} className={`${base} ${active('light')}`} title="浅色">
        <Sun size={14} />
      </button>
      <button onClick={() => setTheme('dark')} className={`${base} ${active('dark')}`} title="深色">
        <Moon size={14} />
      </button>
      <button onClick={() => setTheme('system')} className={`${base} ${active('system')}`} title="跟随系统">
        <Monitor size={14} />
      </button>
    </div>
  )
}

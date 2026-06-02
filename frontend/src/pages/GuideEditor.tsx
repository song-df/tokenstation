import { useEffect, useState, FormEvent } from 'react'
import { api } from '../lib/api'
import { Save, Eye } from 'lucide-react'

export default function GuideEditor() {
  const [sections, setSections] = useState<any[]>([])
  const [msg, setMsg] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    api.getGuideSections().then(setSections)
  }, [])

  const save = async (e: FormEvent) => {
    e.preventDefault(); setSaving(true)
    try {
      await api.saveGuideSections(sections)
      setMsg('保存成功')
      setTimeout(() => setMsg(''), 2000)
    } catch (e: any) { setMsg(e.message) }
    finally { setSaving(false) }
  }

  const updateSection = (i: number, field: string, value: string) => {
    const updated = [...sections]
    updated[i] = { ...updated[i], [field]: value }
    setSections(updated)
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-semibold text-white">使用指南编辑</h2>
        <div className="flex items-center gap-3">
          {msg && <span className="text-sm text-green-400">{msg}</span>}
          <a href="/guide" target="_blank" className="flex items-center gap-1 px-3 py-2 rounded-lg bg-gray-700 hover:bg-gray-600 text-gray-300 text-sm"><Eye size={14} />预览</a>
          <button onClick={save} disabled={saving} className="flex items-center gap-1 px-4 py-2 rounded-lg bg-green-600 hover:bg-green-500 text-white text-sm"><Save size={14} />{saving ? '保存中' : '保存'}</button>
        </div>
      </div>

      <div className="space-y-4">
        {sections.map((s, i) => (
          <div key={s.section_key} className="p-4 rounded-xl bg-gray-900 border border-gray-800">
            <input
              className="w-full px-3 py-2 rounded-lg bg-gray-800 border border-gray-700 text-gray-100 text-sm mb-3 focus:outline-none focus:border-blue-500"
              value={s.title}
              onChange={e => updateSection(i, 'title', e.target.value)}
              placeholder="标题"
            />
            <textarea
              className="w-full px-3 py-2 rounded-lg bg-gray-800 border border-gray-700 text-gray-100 text-sm focus:outline-none focus:border-blue-500 font-mono"
              rows={6}
              value={s.content}
              onChange={e => updateSection(i, 'content', e.target.value)}
              placeholder="内容 (支持 HTML)"
            />
          </div>
        ))}
      </div>
    </div>
  )
}

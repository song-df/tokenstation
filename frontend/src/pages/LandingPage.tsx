import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowRight, BadgeCheck, BookOpen, Check, Code2, Coins, Copy, KeyRound, Layers3, ReceiptText, Terminal } from 'lucide-react'
import PublicLayout from '../components/PublicLayout'

const advantages = [
  { icon: KeyRound, title: '一套 Key 统一管理', desc: '不必在不同工具里维护多套账户，创建、启停和删除都在学生端完成。' },
  { icon: Code2, title: '兼容常用开发工具', desc: '提供 Claude Code、Codex、VSCode 和 OpenAI 兼容接口的实用接入说明。' },
  { icon: Coins, title: 'T粒按实际用量计费', desc: '不同模型按实际调用消耗 T粒，余额、用量和充值记录随时可查。' },
]

const steps = [
  { number: '01', title: '注册账号', desc: '使用邮箱、用户名和密码完成注册。' },
  { number: '02', title: '创建 API Key', desc: '登录后创建自己的 Key，并妥善保存。' },
  { number: '03', title: '选择教程接入', desc: '按照对应工具的说明完成配置并开始调用。' },
]

function LiveModelPreview() {
  const [models, setModels] = useState<{ name: string; price: number }[]>([])

  useEffect(() => {
    fetch('/api/public/model-prices')
      .then(response => response.ok ? response.json() : Promise.reject())
      .then((prices: Record<string, number>) => {
        const list = Object.entries(prices)
          .filter(([, price]) => price > 0)
          .sort((a, b) => a[1] - b[1])
          .slice(0, 8)
          .map(([name, price]) => ({ name, price }))
        setModels(list)
      })
      .catch(() => setModels([]))
  }, [])

  return (
    <section className="border-y border-slate-800 bg-slate-900/45 py-20">
      <div className="mx-auto max-w-6xl px-6">
        <div className="flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-sm font-semibold text-blue-400">实时模型价格</p>
            <h2 className="mt-3 text-3xl font-bold text-white">按当前服务数据展示</h2>
            <p className="mt-3 max-w-2xl text-slate-400">模型会随服务配置动态调整，具体名称和价格以模型价格页为准。</p>
          </div>
          <Link to="/models" className="inline-flex items-center gap-2 font-semibold text-blue-400 hover:text-blue-300">
            查看全部模型 <ArrowRight size={16} />
          </Link>
        </div>

        {models.length > 0 ? (
          <div className="mt-10 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {models.map(model => (
              <div key={model.name} className="rounded-2xl border border-slate-700 bg-slate-800/70 p-5">
                <code className="block truncate text-sm text-slate-100" title={model.name}>{model.name}</code>
                <p className="mt-3 text-xs text-slate-500">输出参考价</p>
                <p className="mt-1 font-semibold text-blue-300">{model.price.toFixed(2)} T粒 / 千 token</p>
              </div>
            ))}
          </div>
        ) : (
          <div className="mt-10 rounded-2xl border border-slate-700 bg-slate-800/60 p-6 text-slate-400">
            当前模型数据暂未加载，请前往模型价格页查看。
          </div>
        )}
      </div>
    </section>
  )
}

export default function LandingPage() {
  const [copied, setCopied] = useState(false)
  const endpoint = 'https://api.wiselink.cc/v1'

  const copyEndpoint = () => {
    navigator.clipboard.writeText(endpoint)
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }

  return (
    <PublicLayout>
      <main>
        <section className="relative overflow-hidden px-6 py-24 md:py-32">
          <div className="absolute inset-x-0 top-0 mx-auto h-[440px] max-w-5xl rounded-full bg-blue-600/10 blur-3xl" />
          <div className="relative mx-auto max-w-4xl text-center">
            <span className="inline-flex items-center gap-2 rounded-full border border-blue-500/30 bg-blue-500/10 px-4 py-1.5 text-sm font-semibold text-blue-300">
              <Layers3 size={15} /> 多模型统一接入
            </span>
            <h1 className="mt-7 text-4xl font-extrabold leading-tight tracking-tight text-white md:text-6xl">
              一个账号，连接多种 AI 模型
            </h1>
            <p className="mx-auto mt-6 max-w-2xl text-lg leading-8 text-slate-400">
              提供统一 API、T粒按量计费和配套接入说明，支持 Claude Code、Codex、VSCode 等常用工具。
            </p>
            <div className="mt-9 flex flex-wrap justify-center gap-3">
              <Link to="/register" className="inline-flex min-h-12 items-center gap-2 rounded-xl bg-blue-600 px-6 font-semibold text-white hover:bg-blue-500">
                注册账号 <ArrowRight size={17} />
              </Link>
              <Link to="/guide" className="inline-flex min-h-12 items-center gap-2 rounded-xl border border-slate-600 bg-slate-800/70 px-6 font-semibold text-slate-100 hover:border-slate-500 hover:bg-slate-800">
                <BookOpen size={17} /> 查看使用说明
              </Link>
            </div>

          </div>
        </section>

        <section className="border-t border-slate-800 bg-slate-900/30 py-16">
          <div className="mx-auto max-w-6xl px-6">
            <div className="text-center">
              <p className="inline-flex items-center gap-2 text-sm font-semibold text-blue-400"><BadgeCheck size={16} /> 服务承诺</p>
              <h2 className="mt-3 text-3xl font-bold text-white">模型能力如实提供，绝不以次充好</h2>
              <p className="mt-3 text-slate-400">用户选择什么模型，平台就按实际配置提供什么模型。</p>
            </div>
            <div className="mt-9 grid gap-4 md:grid-cols-3">
              {[
                ['名称一致', '页面名称与实际接入一致'],
                ['不降级冒充', '不用低规格或其他模型替代'],
                ['不擅自替换', '模型变更会提前明确说明'],
              ].map(([title, description]) => (
                <div key={title} className="rounded-2xl border border-slate-700 bg-slate-800/65 p-5">
                  <p className="flex items-center gap-2 font-bold text-white"><Check size={17} className="text-blue-400" /> {title}</p>
                  <p className="mt-2 pl-6 text-sm text-slate-400">{description}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="border-y border-slate-800 bg-slate-900/50 py-16">
          <div className="mx-auto max-w-6xl px-6 text-center">
            <p className="text-sm font-semibold text-blue-400">核心能力</p>
            <h2 className="mt-3 text-3xl font-bold text-white">从接入到用量，一处完成</h2>
          </div>
          <div className="mx-auto mt-9 grid max-w-6xl gap-px overflow-hidden rounded-2xl border border-slate-800 bg-slate-800 sm:grid-cols-2 lg:grid-cols-4">
            {[
              ['统一 API', '一个接口调用多种模型'],
              ['按量计费', '不同模型按实际用量扣费'],
              ['Key 管理', '创建、启停和删除均可操作'],
              ['记录可查', '用量和充值明细集中查看'],
            ].map(([title, desc]) => (
              <div key={title} className="bg-slate-900 px-6 py-7">
                <p className="text-xl font-bold text-blue-300">{title}</p>
                <p className="mt-2 text-sm text-slate-500">{desc}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="mx-auto max-w-6xl px-6 py-20 md:py-24">
          <div className="text-center">
            <p className="text-sm font-semibold text-blue-400">现有服务能力</p>
            <h2 className="mt-3 text-3xl font-bold text-white">围绕真实使用流程设计</h2>
            <p className="mx-auto mt-4 max-w-2xl text-slate-400">不增加不存在的套餐或团队功能，只呈现当前已经提供的账户、模型、计费和教程能力。</p>
          </div>
          <div className="mt-12 grid gap-5 md:grid-cols-3">
            {advantages.map(item => (
              <article key={item.title} className="rounded-2xl border border-slate-700 bg-slate-800/70 p-7">
                <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-600/15 text-blue-400"><item.icon size={22} /></span>
                <h3 className="mt-5 text-xl font-bold text-white">{item.title}</h3>
                <p className="mt-3 text-sm leading-6 text-slate-400">{item.desc}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="border-y border-slate-800 bg-slate-900/45 py-20">
          <div className="mx-auto grid max-w-6xl gap-10 px-6 lg:grid-cols-[1fr_0.9fr] lg:items-center">
            <div>
              <p className="text-sm font-semibold text-blue-400">统一接口地址</p>
              <h2 className="mt-3 text-3xl font-bold text-white">从一个明确入口开始</h2>
              <p className="mt-4 max-w-xl leading-7 text-slate-400">注册并创建 API Key 后，根据使用说明选择适合自己的工具。模型名称和具体配置以对应教程为准。</p>
              <Link to="/guide" className="mt-7 inline-flex items-center gap-2 font-semibold text-blue-400 hover:text-blue-300">
                选择接入教程 <ArrowRight size={16} />
              </Link>
            </div>
            <div className="rounded-2xl border border-slate-700 bg-[#0b1120] p-5 shadow-2xl shadow-black/20">
              <div className="flex items-center justify-between gap-3 border-b border-slate-800 pb-4">
                <span className="flex items-center gap-2 text-sm text-slate-400"><Terminal size={17} /> API Endpoint</span>
                <button onClick={copyEndpoint} className="rounded-lg p-2 text-slate-500 hover:bg-slate-800 hover:text-blue-300" aria-label="复制接口地址">
                  {copied ? <Check size={16} /> : <Copy size={16} />}
                </button>
              </div>
              <code className="mt-5 block overflow-x-auto text-blue-300">{endpoint}</code>
            </div>
          </div>
        </section>

        <LiveModelPreview />

        <section className="mx-auto max-w-6xl px-6 py-20 md:py-24">
          <div className="text-center">
            <p className="text-sm font-semibold text-blue-400">开始使用</p>
            <h2 className="mt-3 text-3xl font-bold text-white">三步完成基础接入</h2>
          </div>
          <div className="mt-12 grid gap-5 md:grid-cols-3">
            {steps.map(step => (
              <div key={step.number} className="rounded-2xl border border-slate-700 bg-slate-800/60 p-6">
                <span className="text-sm font-bold text-blue-400">{step.number}</span>
                <h3 className="mt-4 text-lg font-bold text-white">{step.title}</h3>
                <p className="mt-2 text-sm leading-6 text-slate-400">{step.desc}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="border-t border-slate-800 bg-slate-900/55 px-6 py-20">
          <div className="mx-auto max-w-3xl text-center">
            <ReceiptText size={36} className="mx-auto text-blue-400" />
            <h2 className="mt-5 text-3xl font-bold text-white">按量使用，不设置虚构套餐</h2>
            <p className="mx-auto mt-4 max-w-xl leading-7 text-slate-400">1 T粒 = 0.01 元。可使用兑换码或登录后选择当前开放的在线充值套餐，模型消耗以价格页为准。</p>
            <div className="mt-8 flex flex-wrap justify-center gap-3">
              <Link to="/models" className="rounded-xl border border-slate-600 bg-slate-800 px-6 py-3 font-semibold text-white hover:border-slate-500">查看模型价格</Link>
              <Link to="/register" className="rounded-xl bg-blue-600 px-6 py-3 font-semibold text-white hover:bg-blue-500">注册开始使用</Link>
            </div>
          </div>
        </section>
      </main>
    </PublicLayout>
  )
}

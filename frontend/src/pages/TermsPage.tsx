export default function TermsPage() {
  return (
    <div className="min-h-screen bg-gray-950 text-gray-100">
      <header className="border-b border-gray-800 bg-gray-900/80 backdrop-blur sticky top-0 z-50">
        <div className="max-w-3xl mx-auto px-6 py-4 flex items-center justify-between">
          <span className="text-lg font-semibold text-white">T粒加油站</span>
          <a href="/" className="text-sm text-gray-400 hover:text-gray-200 transition-colors">← 返回首页</a>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-6 py-12 space-y-8 text-sm leading-relaxed text-gray-300">
        <h1 className="text-2xl font-bold text-white">用户服务协议</h1>
        <p className="text-gray-500">最后更新：2026年6月27日</p>

        <section className="space-y-3">
          <h2 className="text-lg font-semibold text-white">一、服务说明</h2>
          <p>T粒加油站（以下简称"本平台"，域名 t.wiselink.cc）是一个 AI 大模型 API 中转服务平台。用户通过本平台获取的 API 额度（以下简称"T粒"），可用于调用本平台代理的各类大语言模型。</p>
          <p>本平台仅为技术中转服务提供方，不生产、不拥有、不控制任何上游 AI 模型。模型响应内容由上游供应商生成，本平台不对其准确性、合法性、适当性承担责任。</p>
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-semibold text-white">二、账户注册</h2>
          <p>用户注册时须提供真实、准确的个人信息。用户应对其账户下的所有活动负责，包括但不限于 API Key 的使用。用户不得将账户转借、出租或转让给他人使用。如发现账户被盗用或存在安全漏洞，应立即通知本平台。</p>
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-semibold text-white">三、T粒 充值及消费</h2>
          <ol className="list-decimal list-inside space-y-2">
            <li>T粒 为本平台虚拟点数，1 T粒 = 人民币 0.01 元。T粒 仅限在本平台内使用，不可提现、不可转让、不可兑换为法定货币。</li>
            <li>用户可通过支付宝等支付渠道购买 T粒。购买价格以支付页面展示的金额为准。</li>
            <li>用户调用 API 时，系统根据模型定价自动从账户中扣除相应 T粒。不同模型的 T粒 消耗标准以平台公示为准。</li>
          </ol>
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-semibold text-white">四、退款政策</h2>
          <div className="p-4 rounded-lg bg-red-500/10 border border-red-500/20">
            <p className="font-semibold text-red-400">重要提示：T粒 一经购买，不支持退款。</p>
          </div>
          <p>鉴于 T粒 为虚拟数字产品，具有即时交付、即时消费的特性，且本平台在用户购买后即向上游服务商支付相应成本，因此：</p>
          <ol className="list-decimal list-inside space-y-2">
            <li>用户完成支付后，T粒 即充入账户，本平台不接受任何形式的退款申请。</li>
            <li>用户在下单前应仔细确认购买数量及金额，一旦支付成功即视为同意本退款政策。</li>
            <li>如因本平台系统故障导致重复扣款或多扣款，经核实后将在 7 个工作日内原路退回。</li>
          </ol>
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-semibold text-white">五、使用规范</h2>
          <p>用户在使用本平台 API 时，不得从事以下行为：</p>
          <ol className="list-decimal list-inside space-y-2">
            <li>生成或传播违法、淫秽、暴力、恐怖主义、仇恨言论等违反中国法律法规的内容；</li>
            <li>侵犯他人知识产权、隐私权或其他合法权益；</li>
            <li>利用 API 进行自动化攻击、爬虫、欺诈、垃圾信息发送等恶意行为；</li>
            <li>绕过本平台的计费系统或安全机制；</li>
            <li>将 API Key 公开分享或用于商业转售（除非获得本平台书面授权）。</li>
          </ol>
          <p>本平台有权对违反上述规定的账户采取警告、暂停服务或永久封禁等措施，已充值的 T粒 不予退还。</p>
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-semibold text-white">六、服务可用性</h2>
          <p>本平台将尽力保证服务的连续性和稳定性，但不对因以下原因导致的服务中断承担责任：</p>
          <ol className="list-decimal list-inside space-y-2">
            <li>上游 AI 模型供应商的服务中断、限流或关停；</li>
            <li>不可抗力因素，包括但不限于自然灾害、战争、网络攻击、电力故障等；</li>
            <li>因系统维护、升级所需的计划内停机（本平台将尽量提前公告）；</li>
            <li>用户自身网络环境或设备问题导致的无法访问。</li>
          </ol>
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-semibold text-white">七、知识产权</h2>
          <p>本平台的名称、标识、网站界面设计、代码等知识产权归本平台所有。用户通过 API 获取的模型输出内容，其知识产权归属依据上游模型供应商的条款确定，本平台不对输出内容的版权状态作任何保证。</p>
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-semibold text-white">八、隐私保护</h2>
          <p>本平台重视用户隐私。用户注册信息仅用于提供服务及必要的安全验证，不会出售或分享给第三方。API 调用的请求内容仅在技术必要时（如错误排查）被访问，且不会用于其他目的。具体隐私保护措施详见相关法律法规要求。</p>
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-semibold text-white">九、免责声明</h2>
          <p>本平台按"现状"提供服务，不对服务作任何明示或默示的保证，包括但不限于适销性、特定用途适用性、不侵权等。在任何情况下，本平台对用户的赔偿责任总额不超过用户在事件发生前 30 天内向本平台支付的金额。</p>
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-semibold text-white">十、协议修改</h2>
          <p>本平台有权根据需要修改本协议。修改后的协议将在平台上公布，重大变更将通过站内通知或邮件告知。用户继续使用本平台服务即视为同意修改后的协议。</p>
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-semibold text-white">十一、法律适用及争议解决</h2>
          <p>本协议适用中华人民共和国法律。因本协议引起的争议，双方应友好协商解决；协商不成的，任何一方可向本平台所在地有管辖权的人民法院提起诉讼。</p>
        </section>

        <div className="pt-8 text-center text-gray-600 text-xs">
          T粒加油站 · t.wiselink.cc
        </div>
      </main>
    </div>
  )
}

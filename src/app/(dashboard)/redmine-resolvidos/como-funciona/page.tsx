export default function ComoFuncionaRedmineResolvidosPage() {
  return (
    <div style={{ fontFamily: "'Inter', system-ui, sans-serif", maxWidth: 760, margin: "0 auto", padding: "32px 16px 60px", color: "#1e293b" }}>

      <div style={{ background: "#065f46", color: "#fff", borderRadius: 16, padding: "36px 40px", marginBottom: 36 }}>
        <div style={{ display: "inline-block", background: "rgba(255,255,255,0.15)", color: "rgba(255,255,255,0.85)", fontSize: 11, fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase", padding: "4px 12px", borderRadius: 100, marginBottom: 14 }}>
          Redmine Resolvidos — Guia
        </div>
        <h1 style={{ fontSize: 26, fontWeight: 800, lineHeight: 1.25, margin: "0 0 10px" }}>Como funciona a tela de Redmine Resolvidos</h1>
        <p style={{ fontSize: 14, color: "rgba(255,255,255,0.65)", margin: 0 }}>Entenda os 4 indicadores, as abas e o que significa cada número</p>
      </div>

      <Section label="Visão Geral" title="O que é essa tela?">
        <Pergunta>Dos chamados que constam no Redmine, quantos foram de fato resolvidos?</Pergunta>
        <p style={p}>Essa tela faz um <strong>comparativo entre dois grupos de dados</strong>: os chamados que existem no Redmine e os chamados que foram efetivamente resolvidos e registrados no sistema de produtividade.</p>
        <p style={p}>É como uma conferência: você importa a lista do Redmine e o sistema verifica quais desses números existem no registro de resolvidos — e quais estão faltando.</p>
        <Destaque>Pense como uma lista de presença: o Redmine é a chamada, e os resolvidos são quem assinou. Quem não está na lista de assinados ainda não foi registrado como resolvido.</Destaque>
      </Section>

      <Section label="Indicadores no topo" title="O que significam os 4 números?">
        <p style={p}>No topo da tela há 4 cards com os números mais importantes:</p>
        {[
          { label: "Total Redmine", cor: "#3b82f6", num: "120", desc: "Quantos chamados foram importados da planilha do Redmine. É o total da lista que você enviou." },
          { label: "Aguardando Encerramento", cor: "#b45309", num: "38", desc: "Chamados que foram resolvidos mas ainda não foram formalmente encerrados no Redmine. Estão na lista de resolvidos, mas o sistema ainda os mostra como pendentes." },
          { label: "Não Resolvidos", cor: "#dc2626", num: "14", desc: "Chamados do Redmine que não foram encontrados no registro de resolvidos. Podem estar realmente em aberto ou sem registro de resolução no sistema." },
          { label: "Encontrados nos Resolvidos", cor: "#065f46", num: "68", desc: "Chamados que existem tanto no Redmine quanto nos resolvidos. São os chamados confirmados como encerrados." },
        ].map(({ label, cor, num, desc }) => (
          <div key={label} style={{ border: "1px solid #e2e8f0", borderRadius: 12, padding: "18px 20px", marginBottom: 12 }}>
            <div style={{ fontSize: 12, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", color: "#64748b", marginBottom: 4 }}>{label}</div>
            <div style={{ fontSize: 28, fontWeight: 800, color: cor, lineHeight: 1, marginBottom: 4 }}>{num}</div>
            <div style={{ fontSize: 14, color: "#334155" }}>{desc}</div>
          </div>
        ))}
      </Section>

      <Section label="Abas da Tabela" title="Quais são as abas e o que cada uma mostra?">
        <p style={p}>A tabela abaixo dos indicadores tem duas abas:</p>
        <div style={{ marginBottom: 16 }}>
          <div style={{ display: "inline-flex", alignItems: "center", gap: 6, background: "#d1fae5", borderRadius: 8, padding: "8px 14px", fontSize: 13, fontWeight: 600, color: "#065f46", marginBottom: 8 }}>
            ✓ Encontrados
          </div>
          <p style={{ ...p, marginTop: 8 }}>Lista os chamados que estão presentes <strong>tanto no Redmine quanto nos resolvidos</strong>. São os chamados que foram concluídos com sucesso.</p>
        </div>
        <div>
          <div style={{ display: "inline-flex", alignItems: "center", gap: 6, background: "#fee2e2", borderRadius: 8, padding: "8px 14px", fontSize: 13, fontWeight: 600, color: "#dc2626", marginBottom: 8 }}>
            ✗ Não Encontrados
          </div>
          <p style={{ ...p, marginTop: 8 }}>Lista os chamados do Redmine que <strong>não aparecem nos resolvidos</strong>. Esses chamados merecem investigação: pode ser que estejam realmente em andamento, ou que foram resolvidos mas sem registro adequado no sistema.</p>
        </div>
        <Aviso>Um chamado na aba "Não Encontrados" não necessariamente está errado — pode simplesmente estar em andamento ainda. O importante é investigar cada um para entender a situação real.</Aviso>
      </Section>

      <Section label="Como Funciona" title="Como o sistema faz a comparação?">
        <p style={p}>O processo é simples:</p>
        <Item emoji="1️⃣"><><strong>Você importa a planilha do Redmine</strong> — lista de dados do Power BI referente aos Redmines que foram abertos pela nossa equipe e estão no repositório <strong>3N SUPJUD PJE REDMINES</strong>.</></Item>
        <Item emoji="2️⃣"><><strong>O sistema pega o número de cada chamado</strong> dessa lista.</></Item>
        <Item emoji="3️⃣"><><strong>Para cada número, o sistema verifica</strong> se existe algum registro com esse mesmo número na tabela de produtividade (resolvidos).</></Item>
        <Item emoji="4️⃣"><><strong>Encontrou? → vai para "Encontrados".</strong> Não encontrou? → vai para "Não Encontrados".</></Item>
        <div style={{ background: "#f8fafc", border: "1.5px dashed #cbd5e1", borderRadius: 10, padding: "16px 20px", margin: "18px 0", fontFamily: "Courier New, monospace", fontSize: 14, color: "#065f46", fontWeight: 600, whiteSpace: "pre-line" }}>
          {`Encontrados = Redmine ∩ Resolvidos\n(chamados que aparecem nos dois lados)\n\nNão Encontrados = Redmine − Resolvidos\n(chamados no Redmine que não estão nos resolvidos)`}
        </div>
      </Section>

      <Section label="Na Prática" title="Como usar essa tela no dia a dia?">
        <Item emoji="📤"><><strong>Toda semana (ou mês)</strong>, exporte do Redmine a lista dos chamados que deveriam estar resolvidos e importe aqui.</></Item>
        <Item emoji="🔍"><><strong>Olhe a aba "Não Encontrados"</strong> — chamados reportados no Redmine que não aparecem como resolvidos. Precisam de atenção.</></Item>
        <Item emoji="📋"><><strong>Verifique os "Aguardando Encerramento"</strong> — foram resolvidos mas ainda constam em aberto. Alguém precisa fechar formalmente no Redmine.</></Item>
        <Item emoji="✅"><><strong>"Encontrados"</strong> são os que estão ok — concluídos e registrados corretamente.</></Item>
      </Section>

      <Section label="Resumo" title="Em uma frase cada">
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginTop: 8 }}>
          {[
            ["Encontrados", "Chamados confirmados em ambos os sistemas — está tudo certo com eles."],
            ["Não Encontrados", "Chamados no Redmine sem registro de resolução — precisam ser investigados."],
            ["Aguardando Encerramento", "Resolvidos mas ainda abertos formalmente — precisa encerrar no Redmine."],
            ["A comparação", "O sistema cruza os dois lados pelo número do chamado e separa os que batem dos que não batem."],
          ].map(([t, d]) => (
            <div key={t} style={{ border: "1px solid #e2e8f0", borderRadius: 12, padding: 20 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: "#065f46", marginBottom: 6 }}>{t}</div>
              <div style={{ fontSize: 13.5, color: "#64748b", lineHeight: 1.5 }}>{d}</div>
            </div>
          ))}
        </div>
      </Section>
    </div>
  );
}

const p: React.CSSProperties = { fontSize: 14.5, color: "#334155", marginBottom: 14 };
const td: React.CSSProperties = { padding: "11px 14px", borderBottom: "1px solid #e2e8f0", verticalAlign: "top", color: "#334155" };

function Section({ label, title, children }: { label: string; title: string; children: React.ReactNode }) {
  return (
    <div style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: 14, padding: "32px 36px", marginBottom: 24 }}>
      <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: "#64748b", marginBottom: 6 }}>{label}</div>
      <h2 style={{ fontSize: 20, fontWeight: 800, color: "#1e293b", marginBottom: 14, marginTop: 0 }}>{title}</h2>
      {children}
    </div>
  );
}

function Pergunta({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ background: "#f1f5f9", borderLeft: "4px solid #065f46", borderRadius: "0 10px 10px 0", padding: "14px 18px", fontSize: 15, fontWeight: 600, color: "#065f46", margin: "18px 0" }}>
      &ldquo;{children}&rdquo;
    </div>
  );
}

function Item({ emoji, children }: { emoji: string; children: React.ReactNode }) {
  return (
    <div style={{ display: "flex", alignItems: "flex-start", gap: 10, fontSize: 14, color: "#334155", marginBottom: 10 }}>
      <span style={{ fontSize: 16, flexShrink: 0, lineHeight: 1.5 }}>{emoji}</span>
      <span>{children}</span>
    </div>
  );
}

function Destaque({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ background: "#d1fae5", borderRadius: 10, padding: "14px 18px", fontSize: 14, color: "#065f46", margin: "16px 0" }}>
      {children}
    </div>
  );
}

function Aviso({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ background: "#fffbeb", border: "1px solid #fde68a", borderRadius: 10, padding: "14px 18px", fontSize: 13.5, color: "#92400e", margin: "16px 0" }}>
      {children}
    </div>
  );
}

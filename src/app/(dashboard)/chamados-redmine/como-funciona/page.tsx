export default function ComoFuncionaChamadosRedminePage() {
  return (
    <div style={{ fontFamily: "'Inter', system-ui, sans-serif", maxWidth: 760, margin: "0 auto", padding: "32px 16px 60px", color: "#1e293b" }}>

      <div style={{ background: "#0f172a", color: "#fff", borderRadius: 16, padding: "36px 40px", marginBottom: 36 }}>
        <div style={{ display: "inline-block", background: "rgba(255,255,255,0.15)", color: "rgba(255,255,255,0.85)", fontSize: 11, fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase", padding: "4px 12px", borderRadius: 100, marginBottom: 14 }}>
          Chamados Redmine — Guia
        </div>
        <h1 style={{ fontSize: 26, fontWeight: 800, lineHeight: 1.25, margin: "0 0 10px" }}>Como funciona a tela de Chamados Redmine</h1>
        <p style={{ fontSize: 14, color: "rgba(255,255,255,0.65)", margin: 0 }}>Entenda o que cada coluna, badge e filtro significa</p>
      </div>

      <Section label="Visão Geral" title="O que é essa tela?">
        <Pergunta>Quais chamados do Redmine ainda estão em aberto e há quanto tempo?</Pergunta>
        <p style={p}>Essa tela lista todos os chamados importados do Redmine que ainda não foram encerrados. O objetivo é dar visibilidade sobre chamados que estão demorando mais do que o esperado para serem resolvidos.</p>
        <p style={p}>Os dados vêm de uma planilha exportada do sistema Redmine e importada aqui. A cada nova importação, você pode substituir os dados antigos ou acumular com os existentes.</p>
      </Section>

      <Section label="Tabela" title="O que significa cada coluna?">
        <table style={tbl}>
          <thead><tr>
            {["Coluna", "O que mostra"].map(h => <th key={h} style={th}>{h}</th>)}
          </tr></thead>
          <tbody>
            <tr><td style={td}><strong>Nº Chamado (Assyst)</strong></td><td style={td}>Número do chamado. Clicando nele, abre diretamente o chamado no sistema Assyst.</td></tr>
            <tr><td style={td}><strong>Dias em aberto</strong></td><td style={td}>Quantos dias se passaram desde a data de abertura até hoje. Aparece como badge colorido quando está em prazo crítico.</td></tr>
            <tr><td style={td}><strong>Abertura</strong></td><td style={td}>Data e hora em que o chamado foi aberto no sistema.</td></tr>
            <tr><td style={td}><strong>Equipe Atribuída</strong></td><td style={td}>Qual equipe está responsável por esse chamado no momento.</td></tr>
            <tr><td style={td}><strong>Movimentação</strong></td><td style={td}>Data da última ação registrada no chamado.</td></tr>
            <tr><td style={{ ...td, borderBottom: "none" }}><strong>Situação</strong></td><td style={{ ...td, borderBottom: "none" }}>Status atual do chamado conforme a regra do sistema.</td></tr>
          </tbody>
        </table>
      </Section>

      <Section label="Alertas Visuais" title="O que significam os badges coloridos?">
        <p style={p}>Os badges aparecem automaticamente conforme o número de dias que o chamado está aberto. Eles servem para chamar atenção para os casos mais críticos sem precisar ler número por número.</p>
        <Item emoji="🔴"><><Badge cor="vermelho">⚠ 52d</Badge> &nbsp;<strong>Vermelho piscando — 50 dias ou mais.</strong> Chamado em situação crítica de atraso. Precisa de atenção imediata.</></Item>
        <div style={{ marginBottom: 8 }} />
        <Item emoji="🟡"><><Badge cor="amarelo">38d</Badge> &nbsp;<strong>Amarelo — entre 30 e 49 dias.</strong> Chamado em zona de atenção. Está acumulando tempo mas ainda não é crítico.</></Item>
        <div style={{ marginBottom: 8 }} />
        <Item emoji="⚪"><strong>Sem badge — menos de 30 dias.</strong> Dentro do prazo normal, sem alerta.</Item>
        <Destaque>Chamados com badge vermelho aparecem com animação piscando para serem vistos rapidamente mesmo ao rolar a lista.</Destaque>
      </Section>

      <Section label="Filtros" title="Como usar os filtros?">
        <p style={p}>No topo da tela há dois cards clicáveis além da busca:</p>
        <table style={tbl}>
          <thead><tr>{["Filtro", "O que faz"].map(h => <th key={h} style={th}>{h}</th>)}</tr></thead>
          <tbody>
            <tr><td style={td}><strong>Em Atraso</strong></td><td style={td}>Mostra só os chamados com 50 dias ou mais abertos. Útil para focar no que é mais urgente.</td></tr>
            <tr><td style={td}><strong>Em Atenção</strong></td><td style={td}>Mostra só os chamados com 30 a 49 dias. Chamados que estão chegando no prazo crítico.</td></tr>
            <tr><td style={{ ...td, borderBottom: "none" }}><strong>Pesquisar</strong></td><td style={{ ...td, borderBottom: "none" }}>Busca por número do chamado ou qualquer texto da lista.</td></tr>
          </tbody>
        </table>
        <p style={p}>Clicar no mesmo filtro novamente <strong>desativa</strong> o filtro e volta a mostrar todos.</p>
      </Section>

      <Section label="Resumo" title="Em uma frase cada">
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginTop: 8 }}>
          {[
            ["Badge Vermelho", "Chamado parado há 50 dias ou mais — precisa de ação imediata."],
            ["Badge Amarelo", "Chamado entre 30 e 49 dias — está chegando no limite, merece atenção."],
            ["Filtro Em Atraso", "Foca só nos casos críticos para não perder tempo rolando a lista inteira."],
            ["Movimentação", "Mostra quando houve a última ação no chamado — útil para ver se alguém está tocando o caso."],
          ].map(([t, d]) => (
            <div key={t} style={{ border: "1px solid #e2e8f0", borderRadius: 12, padding: 20 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: "#0f172a", marginBottom: 6 }}>{t}</div>
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
const th: React.CSSProperties = { background: "#f1f5f9", padding: "10px 14px", textAlign: "left", fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", color: "#64748b", borderBottom: "1px solid #e2e8f0" };
const tbl: React.CSSProperties = { width: "100%", borderCollapse: "collapse", margin: "14px 0", fontSize: 14 };

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
    <div style={{ background: "#f1f5f9", borderLeft: "4px solid #0f172a", borderRadius: "0 10px 10px 0", padding: "14px 18px", fontSize: 15, fontWeight: 600, color: "#0f172a", margin: "18px 0" }}>
      &ldquo;{children}&rdquo;
    </div>
  );
}

function Item({ emoji, children }: { emoji: string; children: React.ReactNode }) {
  return (
    <div style={{ display: "flex", alignItems: "flex-start", gap: 10, fontSize: 14, color: "#334155", marginBottom: 8 }}>
      <span style={{ fontSize: 16, flexShrink: 0, lineHeight: 1.5 }}>{emoji}</span>
      <span>{children}</span>
    </div>
  );
}

function Destaque({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ background: "#dbeafe", borderRadius: 10, padding: "14px 18px", fontSize: 14, color: "#1e40af", margin: "16px 0" }}>
      {children}
    </div>
  );
}

function Badge({ cor, children }: { cor: "vermelho" | "amarelo"; children: React.ReactNode }) {
  const styles = { vermelho: { background: "#fee2e2", color: "#dc2626" }, amarelo: { background: "#fef9c3", color: "#b45309" } };
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 4, padding: "3px 10px", borderRadius: 100, fontSize: 12, fontWeight: 700, ...styles[cor] }}>
      {children}
    </span>
  );
}

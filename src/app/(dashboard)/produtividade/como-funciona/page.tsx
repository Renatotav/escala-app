export default function ComoFuncionaPage() {
  return (
    <div style={{ fontFamily: "'Inter', system-ui, sans-serif", maxWidth: 760, margin: "0 auto", padding: "32px 16px 60px", color: "#1e293b" }}>

      {/* Cabeçalho */}
      <div style={{ background: "#0f172a", color: "#fff", borderRadius: 16, padding: "36px 40px", marginBottom: 36 }}>
        <div style={{ display: "inline-block", background: "rgba(255,255,255,0.15)", color: "rgba(255,255,255,0.85)", fontSize: 11, fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase", padding: "4px 12px", borderRadius: 100, marginBottom: 14 }}>
          Produtividade — Guia de Indicadores
        </div>
        <h1 style={{ fontSize: 26, fontWeight: 800, lineHeight: 1.25, margin: 0 }}>Como ler a Taxa de Resolução e o TMR</h1>
        <p style={{ marginTop: 10, fontSize: 14, color: "rgba(255,255,255,0.65)", margin: "10px 0 0" }}>Explicação simples e direta para entender o que cada número significa</p>
      </div>

      {/* Taxa de Resolução */}
      <Section label="Indicador 1" title="Taxa de Resolução">
        <Pergunta>De tudo que está no meu nome, quanto eu já resolvi?</Pergunta>
        <p style={p}>Imagine que chegaram 10 chamados para você. Você resolveu 8 e ainda tem 2 abertos. Isso significa que você resolveu <strong>80% do que era seu</strong> — essa é a sua taxa.</p>
        <p style={p}>O sistema soma tudo que está relacionado ao atendente e calcula quanto foi finalizado:</p>
        <div style={{ display: "flex", flexDirection: "column", gap: 8, margin: "16px 0" }}>
          <Item emoji="✅"><strong>Resolvidos</strong> — chamados que você já fechou (vêm da planilha importada)</Item>
          <Item emoji="🟡"><strong>Em Aberto</strong> — chamados ainda ativos no seu nome no Assyst</Item>
          <Item emoji="🔴"><strong>Pausados</strong> — chamados travados, aguardando alguma resposta</Item>
        </div>
        <Formula>Taxa = Resolvidos ÷ (Resolvidos + Em Aberto + Pausados) × 100</Formula>
        <Exemplo label="Exemplo — Amanda">
          <p style={{ fontSize: 13.5, marginBottom: 6, color: "#334155" }}>Resolvidos: <strong>131</strong> &nbsp;|&nbsp; Em Aberto: <strong>83</strong> &nbsp;|&nbsp; Pausados: <strong>0</strong></p>
          <div style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: 8, padding: "12px 16px", marginTop: 10, fontFamily: "Courier New, monospace", fontSize: 13, color: "#0f172a", lineHeight: 2 }}>
            Taxa = 131 ÷ (131 + 83 + 0) × 100<br/>
            Taxa = 131 ÷ 214 × 100<br/>
            <span style={{ fontWeight: 700, color: "#dc2626" }}>Taxa = 61,2% → Vermelho</span>
          </div>
        </Exemplo>
        <Divider />
        <p style={{ ...p, fontWeight: 600 }}>Como as cores funcionam:</p>
        <table style={{ width: "100%", borderCollapse: "collapse", margin: "12px 0", fontSize: 14 }}>
          <thead><tr>
            {["Cor","Faixa","O que significa"].map(h => <th key={h} style={{ background: "#f1f5f9", padding: "10px 14px", textAlign: "left", fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", color: "#64748b", borderBottom: "1px solid #e2e8f0" }}>{h}</th>)}
          </tr></thead>
          <tbody>
            <tr><td style={td}><Badge cor="verde">Verde</Badge></td><td style={td}>85% ou mais</td><td style={td}>Ótimo — a fila está limpa e o trabalho está fluindo bem</td></tr>
            <tr><td style={td}><Badge cor="amarelo">Amarelo</Badge></td><td style={td}>Entre 80% e 84%</td><td style={td}>Atenção — pendências estão acumulando, precisa de acompanhamento</td></tr>
            <tr><td style={{ ...td, borderBottom: "none" }}><Badge cor="vermelho">Vermelho</Badge></td><td style={{ ...td, borderBottom: "none" }}>Abaixo de 80%</td><td style={{ ...td, borderBottom: "none" }}>Crítico — muita coisa parada no nome do atendente</td></tr>
          </tbody>
        </table>
        <Destaque>A taxa não premia quem resolve mais chamados no total. Ela premia quem tem menos acumulado em aberto. Um atendente com 500 resolvidos mas 200 em aberto pode ter uma taxa pior do que outro com 100 resolvidos e nenhum em aberto.</Destaque>
      </Section>

      {/* TMR */}
      <Section label="Indicador 2" title="TMR — Tempo Médio de Resolução">
        <Pergunta>Quanto tempo o chamado ficou comigo, do momento em que recebi até fechar?</Pergunta>
        <p style={p}>O TMR mede <strong>apenas o tempo em que o chamado estava nas mãos do atendente</strong> — excluindo o tempo que ficou no REDMINES, com outro operador ou aguardando outra equipe.</p>
        <p style={p}>Para cada chamado resolvido, o sistema percorre o histórico de movimentações e soma os períodos em que o atendente estava responsável:</p>
        <div style={{ display: "flex", flexDirection: "column", gap: 8, margin: "16px 0" }}>
          <Item emoji="▶️"><strong>Início do período</strong> — quando o chamado foi atribuído ao atendente</Item>
          <Item emoji="⏸️"><strong>Pausa do período</strong> — quando o chamado saiu das mãos dele (foi para o REDMINES, para outro operador etc.)</Item>
          <Item emoji="🔁"><strong>Pode haver mais de um período</strong> — se o chamado voltou para o atendente depois de um tempo com outra pessoa, conta um novo período</Item>
          <Item emoji="⏹️"><strong>Fim do último período</strong> — quando o chamado foi fechado (Data de Resolução)</Item>
        </div>
        <Formula>{`TMR Horas = soma de todos os períodos em que o chamado estava com o atendente\nTMR Dias  = TMR Horas ÷ 24\nTMR exibido = média de todos os chamados resolvidos`}</Formula>
        <Exemplo label="Exemplo — Amanda e o chamado #2021425">
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13.5 }}>
            <thead><tr>{["Quem tinha o chamado","De","Até","Conta no TMR?"].map(h => <th key={h} style={{ background: "#f1f5f9", padding: "9px 14px", textAlign: "left", fontSize: 11, fontWeight: 700, textTransform: "uppercase", color: "#64748b", borderBottom: "1px solid #e2e8f0" }}>{h}</th>)}</tr></thead>
            <tbody>
              {[
                ["Amanda","07/04 08h","12/04 14h","Sim — 126h"],
                ["REDMINES","12/04 14h","28/04 10h","Não (fora do controle dela)"],
                ["Amanda","28/04 10h","Fechamento","Sim — contado até fechar"],
              ].map((r, i, arr) => (
                <tr key={i}>{r.map((c, j) => (
                  <td key={j} style={{ padding: "10px 14px", borderBottom: i < arr.length - 1 ? "1px solid #e2e8f0" : "none", color: c === "Não (fora do controle dela)" ? "#94a3b8" : "#334155", fontStyle: c.startsWith("Não") ? "italic" : "normal" }}>{c}</td>
                ))}</tr>
              ))}
            </tbody>
          </table>
          <p style={{ marginTop: 10, fontSize: 13.5, color: "#334155" }}>O tempo no REDMINES (16 dias) <strong>não entra na conta</strong>. O TMR reflete só o que estava sob responsabilidade da Amanda.</p>
        </Exemplo>
        <Aviso>Chamados sem Data de Resolução preenchida na planilha não entram no cálculo do TMR — mas ainda são contados em Recebidos e Resolvidos.</Aviso>
        <Divider />
        <p style={{ ...p, fontWeight: 600 }}>Como interpretar o resultado:</p>
        <div style={{ display: "flex", flexDirection: "column", gap: 8, margin: "12px 0" }}>
          <Item emoji="⚡"><strong>TMR baixo</strong> — quando o chamado está com o atendente, ele resolve rápido</Item>
          <Item emoji="🐢"><strong>TMR alto</strong> — o chamado fica muito tempo parado nas mãos do atendente antes de fechar</Item>
        </div>
        <Destaque><strong>Por que esse cálculo é mais justo?</strong> Se um chamado ficou 30 dias no REDMINES e 2 dias com Amanda, o TMR dela é de 2 dias — não 32. Cada pessoa responde pelo tempo que o chamado ficou com ela.</Destaque>
      </Section>

      {/* Filtros */}
      <Section label="Filtros" title="Como funcionam os filtros de data">
        <p style={p}>A tela de Produtividade tem dois filtros de data independentes. Cada um responde a uma pergunta diferente:</p>
        <Divider />

        <div style={{ marginBottom: 8 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 16, fontWeight: 800, color: "#0f172a", marginBottom: 12 }}>
            <span style={{ width: 34, height: 34, borderRadius: 8, background: "#dbeafe", color: "#1d4ed8", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16, flexShrink: 0 }}>📥</span>
            Data de Recebimento
          </div>
          <Pergunta>Dos chamados que chegaram para mim nesse período, como foi o desempenho?</Pergunta>
          <p style={p}>Filtra pelo momento em que o chamado foi <strong>atribuído ao atendente pela primeira vez</strong> — não a data de abertura do chamado no sistema.</p>
          <Exemplo label="Exemplo prático">
            <p style={{ fontSize: 13.5, marginBottom: 6, color: "#334155" }}>Você seleciona <strong>14/09 → 18/09</strong> em Data Recebimento.</p>
            <p style={{ fontSize: 13.5, color: "#334155" }}>O sistema mostra só os chamados que chegaram nas mãos do atendente nessa semana — e quanto deles foi resolvido, está em aberto ou pausado.</p>
            <p style={{ marginTop: 8, color: "#64748b", fontStyle: "italic", fontSize: 13 }}>Útil para: "de tudo que entrou para mim essa semana, o que foi dado conta?"</p>
          </Exemplo>
        </div>

        <Divider />

        <div style={{ marginBottom: 8 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 16, fontWeight: 800, color: "#0f172a", marginBottom: 12 }}>
            <span style={{ width: 34, height: 34, borderRadius: 8, background: "#dcfce7", color: "#15803d", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16, flexShrink: 0 }}>✅</span>
            Data de Resolução
          </div>
          <Pergunta>O que foi fechado nesse período — independente de quando chegou?</Pergunta>
          <p style={p}>Filtra pela <strong>data em que o chamado foi fechado</strong>. Um chamado que chegou há 3 semanas mas foi resolvido essa semana aparece aqui.</p>
          <Exemplo label="Exemplo prático">
            <p style={{ fontSize: 13.5, marginBottom: 6, color: "#334155" }}>Você seleciona <strong>14/09 → 18/09</strong> em Data Resolução.</p>
            <p style={{ fontSize: 13.5, color: "#334155" }}>O sistema mostra todos os chamados fechados nessa semana — mesmo que alguns tenham chegado meses antes.</p>
            <p style={{ marginTop: 8, color: "#64748b", fontStyle: "italic", fontSize: 13 }}>Útil para: "quanta coisa o atendente realmente fechou nessa semana?"</p>
          </Exemplo>
        </div>

        <Divider />

        <div style={{ marginBottom: 8 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 16, fontWeight: 800, color: "#0f172a", marginBottom: 12 }}>
            <span style={{ width: 34, height: 34, borderRadius: 8, background: "#fef3c7", color: "#b45309", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16, flexShrink: 0 }}>🔀</span>
            Usando os dois filtros juntos
          </div>
          <Pergunta>Dos chamados que recebi em agosto, quantos foram fechados em setembro?</Pergunta>
          <p style={p}>Quando os dois filtros estão ativos ao mesmo tempo, eles se combinam: o sistema busca chamados que foram <strong>recebidos</strong> no período de recebimento <strong>e fechados</strong> no período de resolução.</p>
          <Exemplo label="Exemplo prático">
            <p style={{ fontSize: 13.5, marginBottom: 6, color: "#334155" }}>Data Recebimento: <strong>01/08 → 16/08</strong> &nbsp;+&nbsp; Data Resolução: <strong>01/09 → 30/09</strong></p>
            <p style={{ fontSize: 13.5, color: "#334155" }}>Mostra só os chamados que chegaram para o atendente na primeira quinzena de agosto <em>e</em> foram fechados ao longo de setembro.</p>
            <p style={{ marginTop: 8, color: "#64748b", fontStyle: "italic", fontSize: 13 }}>Útil para: "o que ficou pendente do mês passado e foi resolvido este mês?"</p>
          </Exemplo>
        </div>

        <Divider />

        <p style={{ ...p, fontWeight: 600 }}>Qual usar?</p>
        <table style={{ width: "100%", borderCollapse: "collapse", margin: "12px 0", fontSize: 14 }}>
          <thead><tr>
            {["Filtro","Melhor usar quando..."].map(h => <th key={h} style={{ background: "#f1f5f9", padding: "10px 14px", textAlign: "left", fontSize: 11, fontWeight: 700, textTransform: "uppercase", color: "#64748b", borderBottom: "1px solid #e2e8f0" }}>{h}</th>)}
          </tr></thead>
          <tbody>
            <tr><td style={td}><strong>Data Recebimento</strong></td><td style={td}>Quero ver o volume que chegou e se a fila daquele período foi zerada</td></tr>
            <tr><td style={td}><strong>Data Resolução</strong></td><td style={td}>Quero ver a produção de fechamentos — o que foi efetivamente finalizado</td></tr>
            <tr><td style={{ ...td, borderBottom: "none" }}><strong>Ambos juntos</strong></td><td style={{ ...td, borderBottom: "none" }}>Quero cruzar: do que recebi em X, o que foi fechado em Y</td></tr>
          </tbody>
        </table>
      </Section>

      {/* Resumo */}
      <Section label="Resumo" title="Em uma frase cada">
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginTop: 8 }}>
          {[
            ["Taxa de Resolução", "Você está limpando sua fila ou deixando chamados acumularem?"],
            ["TMR (Tempo com o atendente)", "Quando o chamado está com você, você resolve rápido ou deixa parado?"],
            ["Data Recebimento", "O que chegou para mim nesse período e como foi tratado?"],
            ["Data Resolução", "O que foi efetivamente fechado nesse período?"],
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

// ── Componentes auxiliares ──────────────────────────────────────

const p: React.CSSProperties = { fontSize: 14.5, color: "#334155", marginBottom: 14 };
const td: React.CSSProperties = { padding: "11px 14px", borderBottom: "1px solid #e2e8f0", verticalAlign: "middle", color: "#334155" };

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
    <div style={{ display: "flex", alignItems: "flex-start", gap: 10, fontSize: 14, color: "#334155" }}>
      <span style={{ fontSize: 16, flexShrink: 0, lineHeight: 1.5 }}>{emoji}</span>
      <span>{children}</span>
    </div>
  );
}

function Formula({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ background: "#f8fafc", border: "1.5px dashed #cbd5e1", borderRadius: 10, padding: "16px 20px", margin: "18px 0", fontFamily: "Courier New, monospace", fontSize: 14, color: "#0f172a", fontWeight: 600, whiteSpace: "pre-line" }}>
      {children}
    </div>
  );
}

function Exemplo({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ background: "#f1f5f9", borderRadius: 10, padding: "20px 22px", margin: "18px 0" }}>
      <div style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", color: "#64748b", marginBottom: 10 }}>{label}</div>
      {children}
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

function Aviso({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ background: "#fffbeb", border: "1px solid #fde68a", borderRadius: 10, padding: "14px 18px", fontSize: 13.5, color: "#92400e", margin: "16px 0" }}>
      {children}
    </div>
  );
}

function Badge({ cor, children }: { cor: "verde" | "amarelo" | "vermelho"; children: React.ReactNode }) {
  const styles = {
    verde:    { background: "#dcfce7", color: "#16a34a" },
    amarelo:  { background: "#fef9c3", color: "#b45309" },
    vermelho: { background: "#fee2e2", color: "#dc2626" },
  };
  return (
    <span style={{ display: "inline-block", padding: "3px 12px", borderRadius: 100, fontSize: 12, fontWeight: 700, ...styles[cor] }}>
      {children}
    </span>
  );
}

function Divider() {
  return <hr style={{ border: "none", borderTop: "1px solid #e2e8f0", margin: "22px 0" }} />;
}

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
          <p style={{ fontSize: 13.5, marginBottom: 6, color: "#334155" }}>Resolvidos: <strong>333</strong> &nbsp;|&nbsp; Em Aberto: <strong>54</strong> &nbsp;|&nbsp; Pausados: <strong>0</strong></p>
          <div style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: 8, padding: "12px 16px", marginTop: 10, fontFamily: "Courier New, monospace", fontSize: 13, color: "#0f172a", lineHeight: 2 }}>
            Taxa = 333 ÷ (333 + 54 + 0) × 100<br/>
            Taxa = 333 ÷ 387 × 100<br/>
            <span style={{ fontWeight: 700, color: "#16a34a" }}>Taxa = 86,0% → Verde</span>
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
        <Pergunta>Quanto tempo eu levo, em média, para resolver um chamado do começo ao fim?</Pergunta>
        <p style={p}>Para cada chamado resolvido, o sistema registra dois momentos:</p>
        <div style={{ display: "flex", flexDirection: "column", gap: 8, margin: "16px 0" }}>
          <Item emoji="🕐"><strong>Data de Abertura</strong> — quando o chamado chegou</Item>
          <Item emoji="🕔"><strong>Data de Resolução</strong> — quando foi fechado</Item>
        </div>
        <p style={p}>A diferença entre essas duas datas em horas é calculada para cada chamado. No final, o sistema faz a <strong>média de todos</strong> para chegar ao TMR do atendente.</p>
        <Formula>{`Horas de cada chamado = Data Resolução − Data Abertura\nTMR Horas = soma das horas de todos ÷ quantidade de chamados\nTMR Dias  = TMR Horas ÷ 24`}</Formula>
        <Exemplo label="Exemplo — Anderson resolveu 3 chamados na semana">
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13.5 }}>
            <thead><tr>{["Chamado","Abertura","Resolução","Tempo"].map(h => <th key={h} style={{ background: "#f1f5f9", padding: "9px 14px", textAlign: "left", fontSize: 11, fontWeight: 700, textTransform: "uppercase", color: "#64748b", borderBottom: "1px solid #e2e8f0" }}>{h}</th>)}</tr></thead>
            <tbody>
              {[["#1","01/09 às 08h","03/09 às 08h","48 horas"],["#2","05/09 às 10h","06/09 às 10h","24 horas"],["#3","10/09 às 14h","10/09 às 18h","4 horas"]].map(r => (
                <tr key={r[0]}>{r.map((c,i) => <td key={i} style={{ padding: "10px 14px", borderBottom: "1px solid #e2e8f0", color: "#334155" }}>{c}</td>)}</tr>
              ))}
              <tr><td colSpan={3} style={{ padding: "10px 14px", fontWeight: 700, color: "#0f172a", background: "#f1f5f9" }}>Média (TMR Horas)</td><td style={{ padding: "10px 14px", fontWeight: 700, color: "#16a34a", background: "#f1f5f9" }}>(48 + 24 + 4) ÷ 3 = ~25 horas</td></tr>
            </tbody>
          </table>
          <p style={{ marginTop: 8, fontSize: 13.5, color: "#334155" }}>TMR em dias: 25 ÷ 24 ≈ <strong>1 dia</strong></p>
        </Exemplo>
        <Aviso>Só entram no cálculo os chamados que têm <em>ambas</em> as datas preenchidas. Se a data de abertura ou resolução estiver em branco na planilha, aquele chamado é ignorado no TMR — mas ainda é contado em Recebidos e Resolvidos.</Aviso>
        <Divider />
        <p style={{ ...p, fontWeight: 600 }}>Como interpretar o resultado:</p>
        <div style={{ display: "flex", flexDirection: "column", gap: 8, margin: "12px 0" }}>
          <Item emoji="⚡"><strong>TMR baixo</strong> — o atendente resolve rápido, chamados não ficam parados por muito tempo</Item>
          <Item emoji="🐢"><strong>TMR alto</strong> — os chamados demoram muito para ser fechados, pode indicar complexidade ou acúmulo</Item>
        </div>
      </Section>

      {/* Filtros */}
      <Section label="Filtros" title="Como funcionam os filtros de data">
        <p style={p}>A tela de Produtividade tem dois filtros de data diferentes. Cada um responde a uma pergunta diferente:</p>
        <Divider />

        <div style={{ marginBottom: 8 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 16, fontWeight: 800, color: "#0f172a", marginBottom: 12 }}>
            <span style={{ width: 34, height: 34, borderRadius: 8, background: "#dbeafe", color: "#1d4ed8", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16, flexShrink: 0 }}>📥</span>
            Data de Recebimento
          </div>
          <Pergunta>Dos chamados que chegaram nessa semana, como foi o desempenho?</Pergunta>
          <p style={p}>Esse filtro olha para a <strong>data em que o chamado foi aberto</strong> — quando ele entrou na fila. Ao selecionar um período aqui, o sistema mostra apenas os chamados recebidos naquele intervalo.</p>
          <Exemplo label="Exemplo prático">
            <p style={{ fontSize: 13.5, marginBottom: 6, color: "#334155" }}>Você seleciona <strong>14/09 → 18/09</strong> em Data Recebimento.</p>
            <p style={{ fontSize: 13.5, color: "#334155" }}>O sistema mostra só os chamados que <em>chegaram</em> nessa semana — e quanto deles foi resolvido, está em aberto ou pausado.</p>
            <p style={{ marginTop: 8, color: "#64748b", fontStyle: "italic", fontSize: 13 }}>Útil para saber: "de tudo que entrou essa semana, o que foi dado conta?"</p>
          </Exemplo>
        </div>

        <Divider />

        <div style={{ marginBottom: 8 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 16, fontWeight: 800, color: "#0f172a", marginBottom: 12 }}>
            <span style={{ width: 34, height: 34, borderRadius: 8, background: "#dcfce7", color: "#15803d", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16, flexShrink: 0 }}>✅</span>
            Data de Resolução
          </div>
          <Pergunta>O que foi resolvido e fechado nessa semana?</Pergunta>
          <p style={p}>Esse filtro olha para a <strong>data em que o chamado foi fechado</strong> — independente de quando foi aberto. Um chamado que chegou há 3 semanas mas foi resolvido essa semana aparece aqui.</p>
          <Exemplo label="Exemplo prático">
            <p style={{ fontSize: 13.5, marginBottom: 6, color: "#334155" }}>Você seleciona <strong>14/09 → 18/09</strong> em Data Resolução.</p>
            <p style={{ fontSize: 13.5, color: "#334155" }}>O sistema mostra todos os chamados que foram <em>fechados</em> nessa semana — mesmo que alguns tenham chegado semanas antes.</p>
            <p style={{ marginTop: 8, color: "#64748b", fontStyle: "italic", fontSize: 13 }}>Útil para saber: "quanta coisa o atendente realmente fechou nessa semana?"</p>
          </Exemplo>
        </div>

        <Divider />

        <p style={{ ...p, fontWeight: 600 }}>Qual usar?</p>
        <table style={{ width: "100%", borderCollapse: "collapse", margin: "12px 0", fontSize: 14 }}>
          <thead><tr>
            {["Filtro","Melhor usar quando..."].map(h => <th key={h} style={{ background: "#f1f5f9", padding: "10px 14px", textAlign: "left", fontSize: 11, fontWeight: 700, textTransform: "uppercase", color: "#64748b", borderBottom: "1px solid #e2e8f0" }}>{h}</th>)}
          </tr></thead>
          <tbody>
            <tr><td style={td}><strong>Data Recebimento</strong></td><td style={td}>Quero ver o volume que chegou e se a fila foi zerada no período</td></tr>
            <tr><td style={{ ...td, borderBottom: "none" }}><strong>Data Resolução</strong></td><td style={{ ...td, borderBottom: "none" }}>Quero ver a produção da semana — o que foi efetivamente fechado</td></tr>
          </tbody>
        </table>

        <Aviso><strong>Quando os dois filtros estão ativos ao mesmo tempo:</strong> o filtro de Data Resolução prevalece para calcular o Em Aberto.</Aviso>

        <Divider />

        <div style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 16, fontWeight: 800, color: "#0f172a", marginBottom: 12 }}>
          <span style={{ width: 34, height: 34, borderRadius: 8, background: "#fef3c7", color: "#b45309", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16, flexShrink: 0 }}>⚠</span>
          Por que o Em Aberto muda quando filtro por data?
        </div>
        <p style={p}>Quando você aplica um filtro de data, o sistema ajusta automaticamente o <strong>Em Aberto</strong> para mostrar apenas os chamados em aberto <em>daquele mesmo período</em>. Isso é necessário para que a Taxa de Resolução seja justa.</p>
        <Exemplo label="Exemplo — sem filtro vs. com filtro">
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13.5 }}>
            <thead><tr>{["Situação","Resolvidos","Em Aberto","Taxa"].map(h => <th key={h} style={{ background: "#f1f5f9", padding: "9px 14px", textAlign: "left", fontSize: 11, fontWeight: 700, textTransform: "uppercase", color: "#64748b", borderBottom: "1px solid #e2e8f0" }}>{h}</th>)}</tr></thead>
            <tbody>
              <tr><td style={td}><strong>Sem filtro</strong> (período total)</td><td style={td}>330</td><td style={td}>54</td><td style={{ ...td, fontWeight: 700, color: "#16a34a" }}>85.9%</td></tr>
              <tr><td style={{ ...td, borderBottom: "none" }}><strong>Com filtro</strong> (semana 14/09 → 18/09)</td><td style={{ ...td, borderBottom: "none" }}>20</td><td style={{ ...td, borderBottom: "none" }}>27</td><td style={{ ...td, borderBottom: "none", fontWeight: 700, color: "#dc2626" }}>42.6%</td></tr>
            </tbody>
          </table>
          <p style={{ marginTop: 10, fontSize: 13.5, color: "#64748b" }}>O Em Aberto mudou de 54 para 27 porque o sistema passou a contar só os chamados em aberto que chegaram <em>naquela semana específica</em> — não todos os chamados do histórico inteiro.</p>
        </Exemplo>
        <Destaque><strong>Por que isso é importante?</strong> Sem esse ajuste, uma taxa de uma semana pequena (ex: 20 resolvidos) seria comparada com todo o acúmulo histórico de abertos (ex: 500), resultando numa taxa injustamente baixa. Com o ajuste, os dois lados da conta pertencem ao mesmo período.</Destaque>
      </Section>

      {/* Resumo */}
      <Section label="Resumo" title="Em uma frase cada">
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginTop: 8 }}>
          {[
            ["Taxa de Resolução", "Você está limpando sua fila ou deixando chamados acumularem?"],
            ["TMR (Tempo Médio)", "Você resolve rápido ou os chamados ficam parados por muito tempo?"],
            ["Data Recebimento", "O que chegou nesse período e como foi tratado?"],
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

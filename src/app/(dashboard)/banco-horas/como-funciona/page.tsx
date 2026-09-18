export default function ComoFuncionaBancoHorasPage() {
  return (
    <div style={{ fontFamily: "'Inter', system-ui, sans-serif", maxWidth: 760, margin: "0 auto", padding: "32px 16px 60px", color: "#1e293b" }}>

      <div style={{ background: "linear-gradient(135deg,#3b0764 0%,#5b21b6 55%,#7c3aed 100%)", color: "#fff", borderRadius: 16, padding: "36px 40px", marginBottom: 36 }}>
        <div style={{ display: "inline-block", background: "rgba(255,255,255,0.15)", color: "rgba(255,255,255,0.85)", fontSize: 11, fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase", padding: "4px 12px", borderRadius: 100, marginBottom: 14 }}>
          Banco de Horas — Guia Completo
        </div>
        <h1 style={{ fontSize: 26, fontWeight: 800, lineHeight: 1.25, margin: "0 0 10px" }}>Como usar o Banco de Horas</h1>
        <p style={{ fontSize: 14, color: "rgba(255,255,255,0.65)", margin: 0 }}>Entenda créditos, débitos, como lançar, compensar e usar folgas para abater dívidas</p>
      </div>

      <Section label="O que é essa tela" title="Para que serve?">
        <Pergunta>Quem tem saldo positivo? Quem está devendo horas?</Pergunta>
        <p style={p}>O Banco de Horas registra e monitora o saldo de horas de cada colaborador. Horas extras ou trabalhadas fora do horário geram <strong>crédito</strong>; horas devidas ou compensações usam esse crédito como <strong>débito</strong>.</p>
        <Destaque><strong>Horas positivas = crédito</strong> (saldo verde) · <strong>Horas negativas = débito</strong> (saldo vermelho, aparece a tag "devendo").</Destaque>
      </Section>

      <Section label="Painel de Resumo" title="O que os 3 cartões mostram?">
        <table style={tbl}>
          <thead><tr>{["Cartão", "O que mostra"].map(h => <th key={h} style={th}>{h}</th>)}</tr></thead>
          <tbody>
            <tr><td style={td}><strong>Total colaboradores</strong></td><td style={td}>Todos na lista, com ou sem saldo.</td></tr>
            <tr><td style={td}><strong style={{ color: "#15803d" }}>Com crédito</strong></td><td style={td}>Colaboradores com saldo positivo — têm horas a compensar.</td></tr>
            <tr><td style={{ ...td, borderBottom: "none" }}><strong style={{ color: "#b91c1c" }}>Devendo horas</strong></td><td style={{ ...td, borderBottom: "none" }}>Colaboradores com saldo negativo — precisam quitar a dívida.</td></tr>
          </tbody>
        </table>
      </Section>

      <Section label="Tabela Principal" title="O que cada coluna mostra?">
        <table style={tbl}>
          <thead><tr>{["Coluna", "O que mostra"].map(h => <th key={h} style={th}>{h}</th>)}</tr></thead>
          <tbody>
            <tr><td style={td}><strong>Colaborador</strong></td><td style={td}>Nome clicável — abre o modal de histórico completo. Devedores têm a tag <strong style={{ color: "#b91c1c" }}>devendo</strong> ao lado do nome.</td></tr>
            <tr><td style={td}><strong>Equipe</strong></td><td style={td}>Equipe do colaborador (badge cinza).</td></tr>
            <tr><td style={td}><strong>Lançamentos</strong></td><td style={td}>Quantidade total de lançamentos registrados.</td></tr>
            <tr><td style={td}><strong>Saldo</strong></td><td style={td}>Saldo atual em horas e minutos. Verde se positivo, vermelho se negativo. Formato <code>+3h40m</code> ou <code>-1h15m</code>.</td></tr>
            <tr><td style={td}><strong>Compensar / Lançar horas</strong></td><td style={td}><strong>Compensar</strong> (laranja) aparece para quem tem crédito. <strong>Lançar horas</strong> (azul) aparece para devedores.</td></tr>
            <tr><td style={{ ...td, borderBottom: "none" }}><strong>✎ / ✕ / ▼</strong></td><td style={{ ...td, borderBottom: "none" }}>Se há 1 lançamento: botões de editar e excluir direto. Se há mais de 1: botão ▼ para expandir o histórico.</td></tr>
          </tbody>
        </table>
      </Section>

      <Section label="Linha Expandida (▼)" title="O que aparece ao expandir com ▼?">
        <p style={p}>Clique em <strong>▼</strong> na última coluna (quando há mais de 1 lançamento) para ver o histórico detalhado.</p>
        <Item emoji="📊"><strong>Barra de progresso de quitação</strong> (só para devedores) — mostra o % já pago da dívida total, com os valores de "Pago" e "Dívida".</Item>
        <Item emoji="📅"><strong>Folgas disponíveis para abater dívida</strong> (só para devedores) — lista plantões com folgas pendentes (Sábado, Domingo, Feriado, Ponto Facultativo). Clique em <strong>"Usar folga +Nh"</strong> para converter a folga em crédito e reduzir a dívida. Ajuste as horas por dia no campo <strong>h/dia</strong>.</Item>
        <Item emoji="📋"><strong>Tabela de lançamentos</strong> — Data, Horas, Tipo (Extra, Quitação ou Débito), Descrição e botões editar (✎) e excluir (✕).</Item>
        <Aviso>Os tipos de lançamento são: <strong>Extra</strong> = horas positivas de quem tem crédito; <strong>Quitação</strong> = horas positivas lançadas para quitar uma dívida; <strong>Débito</strong> = horas negativas (dívida registrada).</Aviso>
      </Section>

      <Section label="Lançar Horas" title="Como lançar horas para um colaborador?">
        <div style={{ background: "#f8fafc", border: "1.5px dashed #cbd5e1", borderRadius: 10, padding: "15px 20px", fontSize: 13.5, color: "#334155", lineHeight: 1.9, marginBottom: 14 }}>
          1. Clique em <strong>+ Lançar horas</strong> no canto superior direito<br />
          2. Selecione o <strong>Colaborador</strong><br />
          3. Confirme a <strong>Data</strong><br />
          4. Escolha o sinal: <strong>+</strong> (crédito) ou <strong>−</strong> (débito)<br />
          5. Informe as <strong>horas</strong> e os <strong>minutos</strong><br />
          6. Adicione uma <strong>Descrição</strong> opcional (ex: "Horas extras segunda-feira")<br />
          7. Clique em <strong>Salvar</strong>
        </div>
        <Destaque>Para lançar uma dívida por dias completos (ex: faltou 3 dias × 8h), com o sinal <strong>−</strong> ativo, clique em <strong>"Calcular por dias"</strong>. Informe o número de dias e as horas por dia — o sistema calcula o total automaticamente.</Destaque>
      </Section>

      <Section label="Compensar" title="Como registrar uma compensação de horas?">
        <p style={p}>Clique em <strong>Compensar</strong> na linha do colaborador com saldo positivo.</p>
        <div style={{ background: "#f8fafc", border: "1.5px dashed #cbd5e1", borderRadius: 10, padding: "15px 20px", fontSize: 13.5, color: "#334155", lineHeight: 1.9, marginBottom: 14 }}>
          1. O modal mostra o <strong>nome</strong> e o <strong>saldo disponível</strong><br />
          2. Confirme a <strong>Data da compensação</strong><br />
          3. Informe as <strong>horas</strong> e <strong>minutos</strong> a compensar<br />
          4. Adicione uma <strong>Descrição</strong> (pré-preenchida com "Compensação de horas")<br />
          5. Clique em <strong>Registrar compensação</strong>
        </div>
        <p style={p}>O sistema mostra uma prévia <strong>"Saldo após:"</strong> em tempo real. Se o valor exceder o saldo disponível, aparece o aviso <strong>⚠ excede o saldo disponível</strong>.</p>
      </Section>

      <Section label="Quitar Dívida" title="Como lançar horas para quitar a dívida de alguém?">
        <p style={p}>Clique em <strong>Lançar horas</strong> na linha de um colaborador com saldo negativo.</p>
        <div style={{ background: "#f8fafc", border: "1.5px dashed #cbd5e1", borderRadius: 10, padding: "15px 20px", fontSize: 13.5, color: "#334155", lineHeight: 1.9, marginBottom: 14 }}>
          1. O modal mostra o <strong>nome</strong> e o <strong>débito atual</strong><br />
          2. Confirme a <strong>Data de registro</strong><br />
          3. Informe as <strong>horas trabalhadas</strong> e os <strong>minutos</strong><br />
          4. Adicione uma <strong>Descrição</strong><br />
          5. Clique em <strong>Registrar horas</strong>
        </div>
        <Destaque>A prévia <strong>"Saldo após:"</strong> aparece em tempo real. Quando o lançamento zerar a dívida, aparece <strong>✓ débito quitado</strong>.</Destaque>
      </Section>

      <Section label="Histórico pelo Nome" title="O que abre ao clicar no nome?">
        <Item emoji="📋">Um modal com o <strong>histórico completo</strong> de todos os lançamentos daquela pessoa — com data, descrição e valor de cada entrada.</Item>
        <Item emoji="💚">Horas positivas em <strong>verde</strong>; negativas em <strong>vermelho</strong>.</Item>
      </Section>

      <Section label="Exportar" title="Como exportar o banco de horas?">
        <p style={p}>Clique em <strong>Exportar CSV</strong>. O arquivo inclui todos os colaboradores da visualização atual (respeitando o filtro de equipe), com as colunas:</p>
        <div style={{ fontFamily: "monospace", fontSize: 13, background: "#f1f5f9", padding: "10px 14px", borderRadius: 8, color: "#64748b" }}>
          Nome · Equipe · Lançamentos · Saldo
        </div>
        <p style={{ ...p, marginTop: 10 }}>O arquivo é nomeado <code>banco-horas-YYYY-MM.csv</code> com o mês atual.</p>
      </Section>

      <Section label="Resumo" title="Em uma frase cada">
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginTop: 8 }}>
          {[
            ["+ Lançar horas", "Registra crédito (+) ou débito (−) para qualquer colaborador. Pode calcular por número de dias."],
            ["Compensar", "Usa o saldo positivo de quem tem crédito — reduz o saldo disponível."],
            ["Lançar horas (devedor)", "Registra horas trabalhadas para abater a dívida de quem está no negativo."],
            ["▼ Expandir linha", "Mostra histórico detalhado, barra de quitação e folgas disponíveis para abate."],
            ["Usar folga", "Converte um plantão com folga pendente (Sábado, Domingo, Feriado) em crédito para quitar dívida."],
            ["Clicar no nome", "Abre o histórico completo de lançamentos daquela pessoa."],
            ["✎ / ✕", "Edita ou exclui um lançamento — aparece direto na linha (1 lançamento) ou na linha expandida."],
            ["Exportar CSV", "Baixa planilha com saldo atual de todos — nomeada com o mês."],
          ].map(([t, d]) => (
            <div key={t} style={{ border: "1px solid #e2e8f0", borderRadius: 12, padding: 20 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: "#7c3aed", marginBottom: 6 }}>{t}</div>
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
    <div style={{ background: "#ede9fe", borderLeft: "4px solid #7c3aed", borderRadius: "0 10px 10px 0", padding: "14px 18px", fontSize: 15, fontWeight: 600, color: "#4c1d95", margin: "18px 0" }}>
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
    <div style={{ background: "#ede9fe", borderRadius: 10, padding: "14px 18px", fontSize: 14, color: "#4c1d95", margin: "16px 0" }}>
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

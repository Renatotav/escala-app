export default function ComoFuncionaRedmineAtribuidosPage() {
  return (
    <div style={{ fontFamily: "'Inter', system-ui, sans-serif", maxWidth: 760, margin: "0 auto", padding: "32px 16px 60px", color: "#1e293b" }}>

      <div style={{ background: "#4c1d95", color: "#fff", borderRadius: 16, padding: "36px 40px", marginBottom: 36 }}>
        <div style={{ display: "inline-block", background: "rgba(255,255,255,0.15)", color: "rgba(255,255,255,0.85)", fontSize: 11, fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase", padding: "4px 12px", borderRadius: 100, marginBottom: 14 }}>
          Redmine Atribuídos — Guia
        </div>
        <h1 style={{ fontSize: 26, fontWeight: 800, lineHeight: 1.25, margin: "0 0 10px" }}>Como funciona a tela de Redmine Atribuídos</h1>
        <p style={{ fontSize: 14, color: "rgba(255,255,255,0.65)", margin: 0 }}>Entenda os 5 contadores, o pin de acompanhamento e o alerta "Devolver à TI"</p>
      </div>

      <Section label="Visão Geral" title="O que é essa tela?">
        <Pergunta>Quais Redmines estão atribuídos à Coordenadoria de Atendimento e há quanto tempo não foram movimentados?</Pergunta>
        <p style={p}>Essa tela lista os chamados do Redmine que foram atribuídos à equipe de atendimento. O objetivo é monitorar o tempo sem movimentação e identificar quais chamados precisam de ação — seja cobrar quem está com o chamado, seja fechar um Redmine cujo Assyst correspondente já foi encerrado.</p>
        <p style={p}>Os dados chegam via importação de arquivo CSV exportado diretamente do Redmine.</p>
        <Destaque>O alerta de prazo aqui é baseado na data da última alteração do Redmine — ou seja, quantos dias se passaram sem nenhuma movimentação nele.</Destaque>
      </Section>

      <Section label="Tabela" title="O que significa cada coluna?">
        <table style={tbl}>
          <thead><tr>{["Coluna", "O que mostra"].map(h => <th key={h} style={th}>{h}</th>)}</tr></thead>
          <tbody>
            <tr><td style={td}><strong>Acomp. 📌</strong></td><td style={td}>Pin de acompanhamento. Clique para marcar que alguém está acompanhando esse chamado. Registra operador, data e observação. Fica laranja quando ativo.</td></tr>
            <tr><td style={td}><strong>Redmine #</strong></td><td style={td}>Número do chamado no Redmine. Clique para abrir diretamente no sistema Redmine.</td></tr>
            <tr><td style={td}><strong>Nº Assyst</strong></td><td style={td}>Número do chamado correspondente no Assyst/CATI. Um mesmo Redmine pode ter mais de um número Assyst.</td></tr>
            <tr><td style={td}><strong>Criado em</strong></td><td style={td}>Data em que o Redmine foi criado/aberto.</td></tr>
            <tr><td style={td}><strong>Alterado em</strong></td><td style={td}>Data da última movimentação registrada no Redmine. O badge de atraso aparece nessa coluna: vermelho (≥5 dias) ou amarelo (≥3 dias).</td></tr>
            <tr><td style={td}><strong>Tipo</strong></td><td style={td}>Categoria do chamado conforme classificado no Redmine.</td></tr>
            <tr><td style={td}><strong>Situação</strong></td><td style={td}>Status atual no Redmine: verde para situações ativas, cinza para cancelados.</td></tr>
            <tr><td style={{ ...td, borderBottom: "none" }}><strong>Atribuído para</strong></td><td style={{ ...td, borderBottom: "none" }}>Nome de quem está com o chamado atribuído.</td></tr>
          </tbody>
        </table>
      </Section>

      <Section label="Contadores no topo" title="O que significam os 5 números?">
        {[
          { label: "Total importados", cor: "#3b82f6", num: "48", desc: "Total de Redmines carregados pelo último CSV importado." },
          { label: "Em atraso (≥5 dias)", cor: "#dc2626", num: "6", desc: "Chamados cuja data 'Alterado em' está há 5 dias ou mais sem mudança. Badge vermelho piscando aparece na linha. Clique no card para filtrar só esses." },
          { label: "Em atenção (≥3 dias)", cor: "#b45309", num: "11", desc: "Chamados sem movimentação há 3 ou 4 dias. Badge amarelo aparece na linha. Clique para filtrar." },
          { label: "Devolver à TI", cor: "#b45309", num: "3", desc: "Redmines cujo Assyst correspondente saiu da fila de chamados ativos. Significa que o Assyst pode ter sido encerrado, mas o Redmine ainda está aberto. Clique para ver a lista." },
          { label: "Em acompanhamento", cor: "#c2410c", num: "5", desc: "Chamados que foram marcados com 📌. Alguém da equipe está acompanhando ativamente esses casos." },
        ].map(({ label, cor, num, desc }) => (
          <div key={label} style={{ border: "1px solid #e2e8f0", borderRadius: 12, padding: "18px 20px", marginBottom: 12 }}>
            <div style={{ fontSize: 12, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", color: "#64748b", marginBottom: 4 }}>{label}</div>
            <div style={{ fontSize: 28, fontWeight: 800, color: cor, lineHeight: 1, marginBottom: 4 }}>{num}</div>
            <div style={{ fontSize: 14, color: "#334155" }}>{desc}</div>
          </div>
        ))}
      </Section>

      <Section label="Funcionalidade Principal" title="Como funciona o pin de acompanhamento 📌?">
        <p style={p}>O pin serve para registrar que alguém da equipe está ativamente acompanhando um chamado — seja cobrando o responsável, aguardando retorno, verificando com o usuário etc.</p>
        <Item emoji="1️⃣"><>Clique no ícone 📌 cinza na coluna "Acomp." da linha do chamado.</>  </Item>
        <Item emoji="2️⃣"><>Um painel aparece pedindo: <strong>Operador</strong> (quem está acompanhando) e <strong>Observação</strong> (o que foi feito ou o que está sendo aguardado).</></>  </Item>
        <Item emoji="3️⃣"><>Ao salvar, o pin fica laranja mostrando quantos dias fazem desde o primeiro registro.</>  </Item>
        <Item emoji="4️⃣"><>Cada nova cobrança é acumulada no histórico. Se foi cobrado mais de uma vez, aparece <strong>"🔁 3× cobrado"</strong> — clique para ver todo o histórico.</>  </Item>
        <Item emoji="5️⃣"><>Para remover o acompanhamento, clique no pin laranja e depois em "✕ limpar".</>  </Item>
        <Destaque><strong>Importante:</strong> quando você faz uma nova importação do CSV (Sincronizar fila), os chamados com 📌 nunca são removidos automaticamente — o pin protege o registro mesmo se o chamado sair do CSV.</Destaque>
      </Section>

      <Section label="Alerta Especial" title='O que é "Devolver à TI"?'>
        <p style={p}>Esse alerta aparece quando o sistema detecta que o número Assyst vinculado a um Redmine não está mais na fila de chamados ativos do CATI.</p>
        <p style={p}>Isso pode significar que o chamado no Assyst foi encerrado pelo operador — mas o Redmine ainda está aberto. Clicando no card, abre uma lista dividida em dois grupos:</p>
        <Item emoji="✅"><><strong>Assyst encerrado — pode fechar o Redmine:</strong> o chamado no CATI foi fechado. Basta encerrar o Redmine correspondente.</></>  </Item>
        <Item emoji="⚠️"><><strong>Ainda aberto em Chamados — cobrar operador:</strong> o Assyst ainda aparece como ativo. O operador precisa finalizar antes de fechar o Redmine.</></>  </Item>
      </Section>

      <Section label="Filtros" title="Filtros disponíveis">
        <table style={tbl}>
          <thead><tr>{["Filtro", "O que faz"].map(h => <th key={h} style={th}>{h}</th>)}</tr></thead>
          <tbody>
            <tr><td style={td}><strong>Por responsável</strong></td><td style={td}>Chips com o nome de cada pessoa e quantos Redmines estão com ela. Clique para ver só os chamados daquela pessoa.</td></tr>
            <tr><td style={td}><strong>Em atraso / Em atenção</strong></td><td style={td}>Clique nos cards do topo para filtrar pelos que estão sem movimentação há mais tempo.</td></tr>
            <tr><td style={td}><strong>Em acompanhamento</strong></td><td style={td}>Filtra só os chamados com 📌 ativo. Dentro desse filtro, pode filtrar por operador e por mínimo de dias em acompanhamento.</td></tr>
            <tr><td style={td}><strong>Devolver à TI</strong></td><td style={td}>Filtra os Redmines cujo Assyst já saiu da fila.</td></tr>
            <tr><td style={{ ...td, borderBottom: "none" }}><strong>Pesquisar</strong></td><td style={{ ...td, borderBottom: "none" }}>Busca por número do Redmine, número Assyst ou qualquer texto da tabela.</td></tr>
          </tbody>
        </table>
      </Section>

      <Section label="Importação" title="Como importar os dados?">
        <p style={p}>Clique em "Importar Atribuídos" e selecione o arquivo CSV exportado do Redmine. Há dois modos:</p>
        <Item emoji="🔄"><><strong>Sincronizar fila:</strong> remove chamados que saíram do CSV (exceto os que têm 📌). Use para manter a lista atualizada com a fila atual do Redmine.</></>  </Item>
        <Item emoji="➕"><><strong>Atualizar e adicionar:</strong> mantém tudo que já estava, insere os novos e atualiza os dados dos existentes. Não remove nada.</></>  </Item>
        <Aviso>Você pode importar múltiplos arquivos CSV de uma vez — o sistema combina tudo automaticamente.</Aviso>
      </Section>

      <Section label="Resumo" title="Em uma frase cada">
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginTop: 8 }}>
          {[
            ["Em atraso / Em atenção", "Dias sem movimentação no Redmine — vermelho ≥5 dias, amarelo ≥3 dias."],
            ["Pin 📌 Acompanhamento", "Registra quem está acompanhando e o histórico de cobranças feitas no chamado."],
            ["Devolver à TI", "Redmine aberto cujo Assyst já foi encerrado — precisa fechar ou verificar."],
            ["Por responsável", "Chips que filtram por pessoa — veja a carga de cada um rapidamente."],
          ].map(([t, d]) => (
            <div key={t} style={{ border: "1px solid #e2e8f0", borderRadius: 12, padding: 20 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: "#4c1d95", marginBottom: 6 }}>{t}</div>
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
    <div style={{ background: "#f1f5f9", borderLeft: "4px solid #4c1d95", borderRadius: "0 10px 10px 0", padding: "14px 18px", fontSize: 15, fontWeight: 600, color: "#4c1d95", margin: "18px 0" }}>
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

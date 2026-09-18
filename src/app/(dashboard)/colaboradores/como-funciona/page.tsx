export default function ComoFuncionaColaboradoresPage() {
  return (
    <div style={{ fontFamily: "'Inter', system-ui, sans-serif", maxWidth: 760, margin: "0 auto", padding: "32px 16px 60px", color: "#1e293b" }}>

      <div style={{ background: "linear-gradient(135deg,#1e3a8a 0%,#1d4ed8 60%,#2563eb 100%)", color: "#fff", borderRadius: 16, padding: "36px 40px", marginBottom: 36 }}>
        <div style={{ display: "inline-block", background: "rgba(255,255,255,0.15)", color: "rgba(255,255,255,0.85)", fontSize: 11, fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase", padding: "4px 12px", borderRadius: 100, marginBottom: 14 }}>
          Colaboradores — Guia Completo
        </div>
        <h1 style={{ fontSize: 26, fontWeight: 800, lineHeight: 1.25, margin: "0 0 10px" }}>Como usar a tela de Colaboradores</h1>
        <p style={{ fontSize: 14, color: "rgba(255,255,255,0.65)", margin: 0 }}>Cadastro, filtros, links de atendimento pessoal e a ficha completa de cada colaborador</p>
      </div>

      <Section label="O que é essa tela" title="Para que serve?">
        <Pergunta>Quais colaboradores estão ativos? Como cadastro um novo ou vejo os dados de uma pessoa?</Pergunta>
        <p style={p}>A tela de Colaboradores é o <strong>cadastro central</strong> de todas as pessoas da equipe. Aqui você adiciona, edita, ativa e inativa colaboradores, e acessa a ficha completa de cada um — com dados pessoais, plantões, atestados, feedbacks e ocorrências.</p>
        <Destaque>Todo colaborador cadastrado aqui aparece automaticamente na Escala Semanal, nos Plantões &amp; Folgas e nos outros módulos do sistema.</Destaque>
      </Section>

      <Section label="Filtros e Busca" title="Como encontrar um colaborador?">
        <Item emoji="🔍">Digite o nome no campo de busca — a lista filtra em tempo real.</Item>
        <Item emoji="👥">Use o filtro de <strong>equipe</strong> para ver só os colaboradores de uma equipe específica.</Item>
        <Item emoji="✅">Use os botões <strong>Ativos / Inativos / Todos</strong> para alternar entre colaboradores em atividade ou desligados.</Item>
        <table style={tbl}>
          <thead><tr>{["Aba", "Quem aparece"].map(h => <th key={h} style={th}>{h}</th>)}</tr></thead>
          <tbody>
            <tr><td style={td}><strong style={{ color: "#15803d" }}>Ativos</strong></td><td style={td}>Colaboradores com checkbox marcado. Aparecem na escala e nos módulos.</td></tr>
            <tr><td style={td}><strong style={{ color: "#b91c1c" }}>Inativos</strong></td><td style={td}>Colaboradores desligados ou afastados. Não aparecem na escala, mas o histórico é preservado.</td></tr>
            <tr><td style={{ ...td, borderBottom: "none" }}><strong>Todos</strong></td><td style={{ ...td, borderBottom: "none" }}>Lista completa: ativos e inativos juntos.</td></tr>
          </tbody>
        </table>
      </Section>

      <Section label="Cadastro" title="Como adicionar um novo colaborador?">
        <div style={{ background: "#f8fafc", border: "1.5px dashed #cbd5e1", borderRadius: 10, padding: "15px 20px", fontSize: 13.5, color: "#334155", lineHeight: 1.9, marginBottom: 14 }}>
          1. Clique em <strong>+ Novo colaborador</strong> no canto superior direito<br />
          2. Preencha o <strong>Nome</strong> (obrigatório), Matrícula, Cargo e <strong>Equipe</strong> (obrigatória)<br />
          3. Clique em <strong>Salvar</strong> — o colaborador aparece imediatamente na lista como ativo
        </div>
        <Aviso>Matrícula e Cargo são opcionais no cadastro inicial, mas podem ser preenchidos depois na <strong>ficha individual</strong> (clicando no nome).</Aviso>
      </Section>

      <Section label="Ativar / Inativar" title="Como ativar ou inativar um colaborador?">
        <p style={p}>Na coluna <strong>✓</strong> da tabela há um checkbox para cada colaborador. Clique nele para alternar entre ativo e inativo — sem precisar abrir nenhum modal.</p>
        <Item emoji="☑️"><strong>Marcado (verde):</strong> colaborador ativo. Aparece na escala, nos plantões e nos módulos de atendimento.</Item>
        <Item emoji="⬜"><strong>Desmarcado:</strong> colaborador inativo. A linha fica esmaecida. O histórico é mantido, mas ele sai da escala.</Item>
        <Destaque>Inativar não exclui — o histórico de plantões, atestados e feedbacks fica preservado. Para excluir de verdade, abra a ficha do colaborador e use a opção de exclusão.</Destaque>
      </Section>

      <Section label="Links de Atendimento" title='O que é "Gerar links para todos"?'>
        <p style={p}>Cada colaborador pode ter um <strong>link pessoal e privado</strong> para acessar a página <em>/meus-chamados</em> — onde ele vê os próprios chamados sem precisar de login no sistema.</p>
        <p style={p}>Clique em <strong>"Gerar links para todos"</strong> para criar esse link de uma vez para todos os colaboradores ativos. Uma janela abre mostrando o link de cada pessoa.</p>
        <table style={tbl}>
          <thead><tr>{["Ação", "O que faz"].map(h => <th key={h} style={th}>{h}</th>)}</tr></thead>
          <tbody>
            <tr><td style={td}><strong>Copiar</strong></td><td style={td}>Copia o link individual de um colaborador para a área de transferência.</td></tr>
            <tr><td style={td}><strong>✕ Revogar</strong></td><td style={td}>Cancela o link daquela pessoa. Quem tiver o link perde o acesso imediatamente. Útil quando alguém sai da equipe.</td></tr>
            <tr><td style={td}><strong>Revogar selecionados</strong></td><td style={td}>Selecione vários colaboradores com os checkboxes e revogue todos os links de uma vez.</td></tr>
            <tr><td style={{ ...td, borderBottom: "none" }}><strong>↓ Exportar CSV</strong></td><td style={{ ...td, borderBottom: "none" }}>Baixa uma planilha com o nome e o link de cada colaborador — para enviar por e-mail ou WhatsApp em lote.</td></tr>
          </tbody>
        </table>
        <Aviso><strong>O link é pessoal e intransferível.</strong> Ele dá acesso apenas ao histórico de chamados daquele colaborador. Se o link vazar, revogue e gere um novo.</Aviso>
      </Section>

      <Section label="Ficha Individual" title="O que tem na ficha de cada colaborador?">
        <p style={p}>Clique no <strong>nome</strong> de qualquer colaborador para abrir a ficha completa. Ela tem 5 abas:</p>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, margin: "14px 0" }}>
          {[
            ["📋 Dados", "CPF, data de nascimento, e-mail, telefone, contato de emergência, endereço, alergias e o link pessoal de atendimento."],
            ["🌙 Plantões", "Histórico de plantões e folgas compensatórias registradas para essa pessoa."],
            ["💬 Feedbacks", "Registros de feedback com data, descrição e assinatura do responsável."],
            ["⚠️ Ocorrências", "Registros de ocorrências disciplinares ou situações especiais, com tipo e assinatura."],
            ["🏥 Atestados", "Histórico de atestados médicos com CID, período e quantidade de dias afastados."],
          ].map(([t, d]) => (
            <div key={t} style={{ border: "1px solid #e2e8f0", borderRadius: 12, padding: "16px 18px" }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: "#2563eb", marginBottom: 6 }}>{t}</div>
              <div style={{ fontSize: 13, color: "#64748b", lineHeight: 1.5 }}>{d}</div>
            </div>
          ))}
        </div>
        <Destaque>Na aba <strong>Dados</strong>, clique em <strong>"Editar dados"</strong> para preencher ou atualizar as informações pessoais.</Destaque>
      </Section>

      <Section label="Exportar" title="Como exportar a lista de colaboradores?">
        <p style={p}>Clique em <strong>"Exportar CSV"</strong> no topo da página. O arquivo inclui todos os colaboradores da visualização atual (respeitando filtros de busca e equipe), com as colunas:</p>
        <div style={{ fontFamily: "monospace", fontSize: 13, background: "#f1f5f9", padding: "10px 14px", borderRadius: 8, color: "#64748b" }}>
          Nome · Matrícula · Cargo · Equipe · CPF · E-mail · Telefone · Telefone Emergência · Contato Emergência · Endereço · Data de Nascimento
        </div>
      </Section>

      <Section label="Resumo" title="Em uma frase cada">
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginTop: 8 }}>
          {[
            ["✓ Checkbox", "Ativa ou inativa o colaborador sem abrir modal — inativo sai da escala mas mantém histórico."],
            ["+ Novo colaborador", "Cadastra nome, matrícula, cargo e equipe. Aparece na escala imediatamente."],
            ["Gerar links para todos", "Cria links pessoais para cada colaborador ver os próprios chamados em /meus-chamados."],
            ["Exportar CSV", "Baixa planilha com dados completos dos colaboradores filtrados."],
            ["Clicar no nome", "Abre a ficha com 5 abas: Dados, Plantões, Feedbacks, Ocorrências e Atestados."],
            ["Revogar link", "Cancela o acesso pessoal ao /meus-chamados — use quando alguém sair da equipe."],
          ].map(([t, d]) => (
            <div key={t} style={{ border: "1px solid #e2e8f0", borderRadius: 12, padding: 20 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: "#2563eb", marginBottom: 6 }}>{t}</div>
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
    <div style={{ background: "#eff6ff", borderLeft: "4px solid #2563eb", borderRadius: "0 10px 10px 0", padding: "14px 18px", fontSize: 15, fontWeight: 600, color: "#1d4ed8", margin: "18px 0" }}>
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
    <div style={{ background: "#dbeafe", borderRadius: 10, padding: "14px 18px", fontSize: 14, color: "#1e3a8a", margin: "16px 0" }}>
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

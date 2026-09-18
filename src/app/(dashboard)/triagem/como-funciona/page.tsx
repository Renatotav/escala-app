export default function ComoFuncionaTriagemPage() {
  return (
    <div style={{ fontFamily: "'Inter', system-ui, sans-serif", maxWidth: 760, margin: "0 auto", padding: "32px 16px 60px", color: "#1e293b" }}>

      <div style={{ background: "linear-gradient(135deg,#7f1d1d 0%,#991b1b 60%,#dc2626 100%)", color: "#fff", borderRadius: 16, padding: "36px 40px", marginBottom: 36 }}>
        <div style={{ display: "inline-block", background: "rgba(255,255,255,0.15)", color: "rgba(255,255,255,0.85)", fontSize: 11, fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase", padding: "4px 12px", borderRadius: 100, marginBottom: 14 }}>
          Controle de Triagem — Guia Completo
        </div>
        <h1 style={{ fontSize: 26, fontWeight: 800, lineHeight: 1.25, margin: "0 0 10px" }}>Como usar o Controle de Triagem</h1>
        <p style={{ fontSize: 14, color: "rgba(255,255,255,0.65)", margin: 0 }}>Entenda os status, como registrar saídas e retornos, o checkbox e o que o CSV exporta</p>
      </div>

      <Section label="O que é essa tela" title="Para que serve?">
        <Pergunta>Quem está fora da fila de chamados agora — e por quê?</Pergunta>
        <p style={p}>O Controle de Triagem registra e monitora as <strong>saídas temporárias da fila de chamados</strong>. Quando um operador precisa se ausentar por qualquer motivo — ausência, atendimento presencial, acúmulo de chamados ou atividade paralela — o responsável registra a saída aqui.</p>
        <Destaque>O <strong>alerta vermelho no topo</strong> aparece sempre que há alguém fora da lista agora, com o total de operadores ausentes.</Destaque>
      </Section>

      <Section label="Abas e Filtros" title="Como filtrar a lista?">
        <Item emoji="▪">
          <strong>Fora (N)</strong> — mostra só quem está fora da fila agora.
        </Item>
        <Item emoji="▪">
          <strong>Na lista (N)</strong> — mostra só quem está na fila normalmente.
        </Item>
        <Item emoji="▪">
          <strong>Todos</strong> — lista completa, independente do status.
        </Item>
        <Item emoji="👥">
          Use o <strong>filtro de equipe</strong> para ver só uma equipe específica.
        </Item>
      </Section>

      <Section label="Status" title="O que significa cada status?">
        <p style={p}>Há dois tipos de status: <strong>manuais</strong> (você registra) e <strong>automáticos</strong> (detectados de outros módulos).</p>
        <table style={tbl}>
          <thead><tr>{["Status", "Origem", "O que significa"].map(h => <th key={h} style={th}>{h}</th>)}</tr></thead>
          <tbody>
            <tr>
              <td style={td}><strong style={{ color: "#4ade80" }}>Na lista</strong></td>
              <td style={td}>—</td>
              <td style={td}>Na fila normalmente. Nenhum registro ativo.</td>
            </tr>
            <tr>
              <td style={td}><strong style={{ color: "#60a5fa" }}>Declaração</strong></td>
              <td style={td}>Manual</td>
              <td style={td}>Operador precisa se ausentar para uma consulta médica, exame ou qualquer atividade que exija comparecimento presencial e necessite de justificativa.</td>
            </tr>
            <tr>
              <td style={td}><strong style={{ color: "#c084fc" }}>Atendimento Presencial</strong></td>
              <td style={td}>Manual</td>
              <td style={td}>Operador está atendendo alguma unidade que necessita de atendimento presencial no fórum ou TJ.</td>
            </tr>
            <tr>
              <td style={td}><strong style={{ color: "#facc15" }}>Qtd. Chamados</strong></td>
              <td style={td}>Manual</td>
              <td style={td}>Operador tem acúmulo excessivo de chamados e precisa sair da fila para dar vazão e baixar esses chamados em aberto.</td>
            </tr>
            <tr>
              <td style={td}><strong style={{ color: "#94a3b8" }}>Outras atividades</strong></td>
              <td style={td}>Manual</td>
              <td style={td}>Saída da fila para exercer uma atividade paralela — como confecção de material no Canvas, chamados específicos da Coordenação oriundos do SEI, entre outros.</td>
            </tr>
            <tr>
              <td style={td}><strong style={{ color: "#fb923c" }}>Atestado</strong></td>
              <td style={td}>Automático</td>
              <td style={td}>Atestado lançado no módulo de Atestados — aparece aqui automaticamente.</td>
            </tr>
            <tr>
              <td style={td}><strong style={{ color: "#fbbf24" }}>Folga</strong></td>
              <td style={td}>Automático</td>
              <td style={td}>Folga compensatória registrada no módulo de Plantões &amp; Folgas para hoje.</td>
            </tr>
            <tr>
              <td style={{ ...td, borderBottom: "none" }}><strong style={{ color: "#2dd4bf" }}>Plantão</strong></td>
              <td style={{ ...td, borderBottom: "none" }}>Automático</td>
              <td style={{ ...td, borderBottom: "none" }}>Colaborador escalado para plantão hoje — detectado do módulo de Plantões.</td>
            </tr>
          </tbody>
        </table>
        <Aviso><strong>Folga, Plantão e Atestado são automáticos</strong> — não é necessário registrar manualmente. Eles aparecem quando o lançamento já foi feito nos outros módulos do sistema.</Aviso>
      </Section>

      <Section label="Colunas da Tabela" title="O que cada coluna mostra?">
        <table style={tbl}>
          <thead><tr>{["Coluna", "O que mostra"].map(h => <th key={h} style={th}>{h}</th>)}</tr></thead>
          <tbody>
            <tr><td style={td}><strong>Colaborador</strong></td><td style={td}>Nome clicável (abre o histórico completo) + checkbox de distribuição específica.</td></tr>
            <tr><td style={td}><strong>Equipe</strong></td><td style={td}>Equipe do colaborador.</td></tr>
            <tr><td style={td}><strong>Status</strong></td><td style={td}>Badge colorido com o motivo atual. Se retornou recentemente mostra "↩ retornou". Se tem saída agendada mostra 📅 com a data.</td></tr>
            <tr><td style={td}><strong>Saída</strong></td><td style={td}>Data e hora da saída + <strong>(Nd)</strong> entre parênteses indicando quantos dias úteis a pessoa está fora. Mostra "Hoje" se saiu hoje.</td></tr>
            <tr><td style={td}><strong>Retorno</strong></td><td style={td}>"Em aberto" enquanto não houver retorno registrado. Após registrar o retorno, mostra a data e hora de volta.</td></tr>
            <tr><td style={td}><strong>Horas</strong></td><td style={td}>Total de horas fora calculado automaticamente (só aparece quando há hora de saída e hora de retorno registradas).</td></tr>
            <tr><td style={{ ...td, borderBottom: "none" }}><strong>Observação</strong></td><td style={{ ...td, borderBottom: "none" }}>Texto livre digitado ao registrar a saída.</td></tr>
          </tbody>
        </table>
      </Section>

      <Section label="Registrar Saída" title="Como registrar que alguém saiu da fila?">
        <div style={{ background: "#f8fafc", border: "1.5px dashed #cbd5e1", borderRadius: 10, padding: "15px 20px", fontSize: 13.5, color: "#334155", lineHeight: 1.9, marginBottom: 14 }}>
          1. Clique em <strong>Registrar saída</strong> na linha do colaborador<br />
          2. Escolha o <strong>Motivo</strong>: Declaração, Atendimento Presencial, Qtd. Chamados ou Outras atividades<br />
          3. Confirme a <strong>Data e Hora de saída</strong> (preenchidas automaticamente com agora)<br />
          4. Adicione uma <strong>Observação</strong> opcional (ex: "Consulta cardiologista")<br />
          5. Clique em <strong>Registrar saída</strong> — o status muda imediatamente na tabela
        </div>
        <Destaque>Não há campo de data de retorno no momento do registro. O retorno é registrado depois, separadamente, quando o operador voltar — clicando em <strong>"Retornou"</strong>.</Destaque>
      </Section>

      <Section label="Registrar Retorno" title="Como registrar que alguém voltou?">
        <Item emoji="1️⃣">Clique em <strong>Retornou</strong> na linha do colaborador (aparece quando há uma saída ativa).</Item>
        <Item emoji="2️⃣">Confirme a <strong>data e hora de retorno</strong> — preenchidas automaticamente com agora.</Item>
        <Item emoji="3️⃣">Clique em <strong>Confirmar retorno</strong> — o status volta para "Na lista" e as horas fora são calculadas.</Item>
        <p style={{ ...p, marginTop: 12 }}>Você também pode clicar no <strong>nome do colaborador</strong> para abrir o histórico e registrar o retorno por lá.</p>
      </Section>

      <Section label="Checkbox ☑ ao lado do Nome" title="Para que serve o checkbox ao lado do nome?">
        <p style={p}>Esse checkbox marca o colaborador como <strong>distribuição específica</strong> — uma categoria que aparece numa seção separada no CSV exportado.</p>
        <Item emoji="☑️"><strong>Marcado (verde):</strong> colaborador com distribuição específica de chamados. Aparece na seção "Assistentes com distribuição específica" do CSV.</Item>
        <Item emoji="⬜"><strong>Desmarcado:</strong> distribuição padrão pela fila geral.</Item>
        <Aviso>Esse checkbox <strong>não remove o colaborador da fila</strong> — ele apenas sinaliza o tipo de distribuição para o relatório CSV.</Aviso>
      </Section>

      <Section label="Clicando no Nome" title="O que abre ao clicar no nome?">
        <Item emoji="📋">Status atual e botão de Registrar saída ou Retorno (dependendo do estado).</Item>
        <Item emoji="📜"><strong>Histórico completo</strong> de todos os registros daquela pessoa — com motivo, período, horas e observação.</Item>
        <Item emoji="✎">Cada registro tem botões de <strong>Editar</strong> (corrigir motivo, data ou observação) e <strong>Excluir</strong>.</Item>
      </Section>

      <Section label="Exportar CSV" title="O que o CSV exporta?">
        <p style={p}>Clique em <strong>"↓ Exportar CSV"</strong> para gerar o relatório da triagem atual. O arquivo é organizado em até 4 seções:</p>
        <div style={{ background: "#f8fafc", border: "1.5px dashed #cbd5e1", borderRadius: 10, padding: "15px 20px", fontSize: 13.5, color: "#334155", lineHeight: 1.9, marginBottom: 14 }}>
          1. <strong>Balcão Virtual fora da listagem</strong> — Balcão Virtual com registro ativo (exceto Presencial)<br />
          2. <strong>Demais fora da listagem</strong> — outras equipes com registro ativo + Balcão Virtual em Presencial<br />
          3. <strong>Distribuição específica — Migração</strong> — marcados com ☑ na equipe Migração<br />
          4. <strong>Distribuição específica — outros</strong> — demais marcados com ☑ em outras equipes
        </div>
        <Aviso>Seções 3 e 4 só aparecem no CSV se houver colaboradores com o <strong>checkbox ☑ marcado</strong>.</Aviso>
      </Section>

      <Section label="Resumo" title="Em uma frase cada">
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginTop: 8 }}>
          {[
            ["Alerta vermelho", "Aparece sempre que há alguém fora da fila agora, com o total de operadores ausentes."],
            ["Registrar saída", "Remove da fila com motivo, data, hora e observação. Status muda na hora."],
            ["Retornou", "Volta à fila e calcula as horas fora automaticamente."],
            ["Folga / Plantão / Atestado", "Automáticos — detectados de outros módulos, sem registro manual."],
            ["Checkbox ☑ (nome)", "Marca distribuição específica — aparece em seção separada no CSV."],
            ["Clicar no nome", "Abre histórico completo com todos os registros, edição e exclusão."],
            ["(Nd) na coluna Saída", "Dias úteis que a pessoa está fora — desconsidera fins de semana e feriados."],
            ["Em aberto", "Saída registrada sem retorno ainda — a pessoa ainda está fora da fila."],
          ].map(([t, d]) => (
            <div key={t} style={{ border: "1px solid #e2e8f0", borderRadius: 12, padding: 20 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: "#dc2626", marginBottom: 6 }}>{t}</div>
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
    <div style={{ background: "#fff1f2", borderLeft: "4px solid #dc2626", borderRadius: "0 10px 10px 0", padding: "14px 18px", fontSize: 15, fontWeight: 600, color: "#991b1b", margin: "18px 0" }}>
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
    <div style={{ background: "#fee2e2", borderRadius: 10, padding: "14px 18px", fontSize: 14, color: "#7f1d1d", margin: "16px 0" }}>
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

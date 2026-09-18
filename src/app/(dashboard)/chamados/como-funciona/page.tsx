export default function ComoFuncionaChamadosPage() {
  return (
    <div style={{ fontFamily: "'Inter', system-ui, sans-serif", maxWidth: 760, margin: "0 auto", padding: "32px 16px 60px", color: "#1e293b" }}>

      <div style={{ background: "linear-gradient(135deg,#134e4a 0%,#0f766e 55%,#0d9488 100%)", color: "#fff", borderRadius: 16, padding: "36px 40px", marginBottom: 36 }}>
        <div style={{ display: "inline-block", background: "rgba(255,255,255,0.15)", color: "rgba(255,255,255,0.85)", fontSize: 11, fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase", padding: "4px 12px", borderRadius: 100, marginBottom: 14 }}>
          Chamados — Guia Completo
        </div>
        <h1 style={{ fontSize: 26, fontWeight: 800, lineHeight: 1.25, margin: "0 0 10px" }}>Como usar a tela de Chamados</h1>
        <p style={{ fontSize: 14, color: "rgba(255,255,255,0.65)", margin: 0 }}>Importação de CSV, SLA, alertas de urgência, Redmine resolvido e o quantitativo por equipe</p>
      </div>

      <Section label="O que é essa tela" title="Para que serve?">
        <Pergunta>Quem está com mais chamados? Algum está atrasado ou com urgência?</Pergunta>
        <p style={p}>A tela de Chamados centraliza todos os chamados do sistema Assyst atribuídos aos atendentes. Os dados são importados de um arquivo CSV exportado do Assyst e ficam armazenados aqui para consulta, filtro e análise.</p>
        <Destaque>Os dados <strong>não atualizam automaticamente</strong> — é necessário importar um novo CSV sempre que quiser atualizar a base.</Destaque>
      </Section>

      <Section label="Abas" title="Lista e Quantitativo">
        <table style={tbl}>
          <thead><tr>{["Aba", "O que mostra"].map(h => <th key={h} style={th}>{h}</th>)}</tr></thead>
          <tbody>
            <tr><td style={td}><strong>Lista</strong></td><td style={td}>Tabela de chamados individuais com filtros por equipe, atendente, busca por número e urgências. Permite exportar para XLS.</td></tr>
            <tr><td style={{ ...td, borderBottom: "none" }}><strong>Quantitativo</strong></td><td style={{ ...td, borderBottom: "none" }}>Quantidade de chamados por equipe e por atendente. Sub-visão de <strong>Lista</strong> (tabela com ranking) e <strong>Gráficos</strong> (donut + barras). Permite exportar PDF e JPEG.</td></tr>
          </tbody>
        </table>
      </Section>

      <Section label="Painel de Resumo" title="O que os cartões mostram?">
        <table style={tbl}>
          <thead><tr>{["Cartão", "O que é", "Clicável?"].map(h => <th key={h} style={th}>{h}</th>)}</tr></thead>
          <tbody>
            <tr><td style={td}><strong>Total de chamados</strong></td><td style={td}>Quantidade total de chamados importados.</td><td style={td}>Não</td></tr>
            <tr><td style={td}><strong style={{ color: "#b91c1c" }}>Solicitação de Urgência</strong></td><td style={td}>Chamados cuja última ação é "Solicitação de Urgência". A linha fica vermelha na tabela.</td><td style={td}>Sim — ativa filtro</td></tr>
            <tr><td style={td}><strong style={{ color: "#c2410c" }}>Redmine resolvido</strong></td><td style={td}>Chamados que têm um Redmine já resolvido pela TI e ainda estão em aberto no Assyst — devem ser encerrados.</td><td style={td}>Sim — ativa filtro</td></tr>
            <tr><td style={td}><strong>Atendentes</strong></td><td style={td}>Quantidade de atendentes distintos na base.</td><td style={td}>Não</td></tr>
            <tr><td style={{ ...td, borderBottom: "none" }}><strong>Período dos dados</strong></td><td style={{ ...td, borderBottom: "none" }}>Data mais antiga e mais recente entre os chamados importados.</td><td style={{ ...td, borderBottom: "none" }}>Não</td></tr>
          </tbody>
        </table>
      </Section>

      <Section label="Alerta ⚠ Amarelo" title='O que é o alerta "Assysts para verificar"?'>
        <p style={p}>Quando aparecer o banner amarelo com <strong>"N Assysts precisam ser verificados"</strong>, significa que há chamados do Assyst vinculados a Redmines marcados como <strong>"Devolver à TI"</strong> que ainda estão na fila.</p>
        <Item emoji="⚠️">Clique no banner para ver a lista de Assysts e os Redmines correspondentes.</Item>
        <Item emoji="🔍">Verifique no Assyst se esses chamados já podem ser encerrados ou reencaminhados.</Item>
        <Aviso>Este alerta aparece automaticamente cruzando os dados dos módulos <strong>Chamados</strong> e <strong>Chamados Redmine</strong>.</Aviso>
      </Section>

      <Section label="Tabela — Aba Lista" title="O que cada coluna mostra?">
        <table style={tbl}>
          <thead><tr>{["Coluna", "O que mostra"].map(h => <th key={h} style={th}>{h}</th>)}</tr></thead>
          <tbody>
            <tr>
              <td style={td}><strong>Nº Chamado (Assyst)</strong></td>
              <td style={td}>
                Número do chamado — clicável, abre diretamente no Assyst.<br />
                Pode ter dois badges extras:<br />
                <span style={{ display: "inline-block", marginTop: 4, background: "#fee2e2", color: "#b91c1c", fontSize: 12, fontWeight: 700, padding: "2px 8px", borderRadius: 6 }}>⚠ 45d</span> — SLA excedido (dias além do prazo).<br />
                <span style={{ display: "inline-block", marginTop: 4, background: "#fff7ed", color: "#c2410c", fontSize: 12, fontWeight: 700, padding: "2px 8px", borderRadius: 6, border: "1px solid #fed7aa" }}>⚡ Redmine resolvido — encerre</span> — Redmine da TI já resolvido.
              </td>
            </tr>
            <tr><td style={td}><strong>Data/hora</strong></td><td style={td}>Data e hora de abertura do chamado no Assyst.</td></tr>
            <tr><td style={td}><strong>Nome do DPS Atribuído</strong></td><td style={td}>Tipo do chamado (ex: "3N SUPJUD PJE Erro ou Falha", "Orientação", "Cadastro"). Define o SLA.</td></tr>
            <tr><td style={td}><strong>Usuário Atribuído</strong></td><td style={td}>Nome do atendente + badge da equipe. Se sem atendente, mostra <strong>Triagem</strong>.</td></tr>
            <tr><td style={{ ...td, borderBottom: "none" }}><strong>Última ação</strong></td><td style={{ ...td, borderBottom: "none" }}>Última movimentação. Se for "Solicitação de Urgência", aparece badge vermelho e a linha fica vermelha.</td></tr>
          </tbody>
        </table>
      </Section>

      <Section label="SLA — Prazo por Tipo" title="Como funciona o alerta de atraso?">
        <p style={p}>O sistema calcula automaticamente quantos dias o chamado está em aberto e compara com o prazo (SLA) do tipo de DPS. Quando ultrapassa, aparece o badge <span style={{ background: "#fee2e2", color: "#b91c1c", fontSize: 12, fontWeight: 700, padding: "2px 8px", borderRadius: 6 }}>⚠ Nd</span> com os dias em aberto.</p>
        <table style={tbl}>
          <thead><tr>{["Tipo de DPS (contém)", "SLA (dias)"].map(h => <th key={h} style={th}>{h}</th>)}</tr></thead>
          <tbody>
            <tr><td style={td}>Cadastro</td><td style={td}>2 dias</td></tr>
            <tr><td style={td}>Migração</td><td style={td}>15 dias</td></tr>
            <tr><td style={td}>Orientação</td><td style={td}>5 dias</td></tr>
            <tr><td style={{ ...td, borderBottom: "none" }}>Erro ou Falha</td><td style={{ ...td, borderBottom: "none" }}>5 dias</td></tr>
          </tbody>
        </table>
        <Aviso>Chamados sem correspondência de SLA não recebem alerta de atraso.</Aviso>
      </Section>

      <Section label="Filtros — Aba Lista" title="Como filtrar os chamados?">
        <Item emoji="🔍">Digite o número no campo <strong>Pesquisar Chamado</strong> para busca direta.</Item>
        <Item emoji="👥">Use o seletor <strong>Todas as equipes</strong> para ver só uma equipe.</Item>
        <Item emoji="👤">Use o seletor <strong>Todos os atendentes</strong> para ver os chamados de uma pessoa. Ao selecionar um atendente, a equipe é ajustada automaticamente.</Item>
        <Item emoji="🔴">Clique no cartão <strong>Solicitação de Urgência</strong> para ver só os urgentes.</Item>
        <Item emoji="⚡">Clique no cartão <strong>Redmine resolvido</strong> para ver os chamados que precisam ser encerrados.</Item>
        <p style={{ ...p, marginTop: 8 }}>Use <strong>Limpar filtros</strong> para voltar à visualização completa.</p>
      </Section>

      <Section label="Exportar XLS" title="Como exportar a lista de chamados?">
        <p style={p}>Clique em <strong>↓ Exportar XLS</strong> (aba Lista) para baixar os chamados visíveis (com os filtros ativos) em formato de planilha Excel. Colunas exportadas:</p>
        <div style={{ fontFamily: "monospace", fontSize: 13, background: "#f1f5f9", padding: "10px 14px", borderRadius: 8, color: "#64748b" }}>
          Nº Chamado · Data/Hora · Dias em aberto · DPS Atribuído · Usuário Atribuído · Última Ação · Redmine Resolvido
        </div>
      </Section>

      <Section label="Aba Quantitativo" title="Como usar o Quantitativo?">
        <p style={p}>Mostra a distribuição de chamados por equipe e por atendente. Tem duas sub-visualizações:</p>
        <Item emoji="📋"><strong>Lista</strong> — tabela com ranking de atendentes por equipe. Atendentes com mais de 50 chamados ficam em vermelho com o badge <strong>↑ alto</strong>. Clique no nome para ver os chamados daquela pessoa na aba Lista.</Item>
        <Item emoji="📊"><strong>Gráficos</strong> — donut por equipe (clique numa fatia para ver os atendentes) + barras horizontais por atendente.</Item>
        <Item emoji="↓">No modo Lista (Quantitativo): botão <strong>↓ CSV</strong> ao lado de cada atendente baixa uma planilha XLS com os chamados <strong>com SLA excedido</strong> daquela pessoa.</Item>
        <Destaque>Use o filtro <strong>Todas as equipes</strong> (canto superior direito no Quantitativo) para focar em uma equipe ao exportar PDF ou JPEG.</Destaque>
        <table style={{ ...tbl, marginTop: 14 }}>
          <thead><tr>{["Botão", "O que faz"].map(h => <th key={h} style={th}>{h}</th>)}</tr></thead>
          <tbody>
            <tr><td style={td}><strong>↓ PDF</strong></td><td style={td}>Gera um PDF com o quantitativo completo (tabela + gráfico de rosca).</td></tr>
            <tr><td style={td}><strong>↓ JPEG</strong></td><td style={td}>Gera uma imagem JPEG com o quantitativo para compartilhar rapidamente.</td></tr>
            <tr><td style={{ ...td, borderBottom: "none" }}><strong>↓ CSV</strong> (por atendente)</td><td style={{ ...td, borderBottom: "none" }}>Baixa os chamados com SLA excedido daquele atendente.</td></tr>
          </tbody>
        </table>
      </Section>

      <Section label="Importar Chamados" title="Como importar os chamados?">
        <p style={p}>Os chamados são exportados do sistema Assyst em CSV e importados aqui. Clique em <strong>Importar chamados</strong> no canto superior direito.</p>
        <div style={{ background: "#f8fafc", border: "1.5px dashed #cbd5e1", borderRadius: 10, padding: "15px 20px", fontSize: 13.5, color: "#334155", lineHeight: 1.9, marginBottom: 14 }}>
          1. Clique em <strong>Importar chamados</strong><br />
          2. Selecione um ou mais arquivos <strong>.csv / .txt / .tsv</strong> exportados do Assyst<br />
          3. Escolha o modo: <strong>Substituir todos os dados</strong> ou <strong>Adicionar aos existentes</strong><br />
          4. Clique em <strong>Importar N chamados</strong><br />
          5. O sistema mostra o total lido, importado e ignorados (referências já existentes)
        </div>
        <table style={tbl}>
          <thead><tr>{["Modo", "O que faz"].map(h => <th key={h} style={th}>{h}</th>)}</tr></thead>
          <tbody>
            <tr><td style={td}><strong>Substituir todos os dados</strong></td><td style={td}>Apaga tudo antes de importar. Use quando quiser uma base limpa e atualizada.</td></tr>
            <tr><td style={{ ...td, borderBottom: "none" }}><strong>Adicionar aos existentes</strong></td><td style={{ ...td, borderBottom: "none" }}>Mantém os chamados já importados e acrescenta os novos. Duplicados (mesma referência) são ignorados.</td></tr>
          </tbody>
        </table>
        <Aviso>Você pode selecionar <strong>vários arquivos ao mesmo tempo</strong> — o sistema lê e une todos antes de importar.</Aviso>
      </Section>

      <Section label="Limpar Dados" title="Como remover todos os chamados?">
        <p style={p}>Clique em <strong>Limpar dados</strong> (canto superior direito). Uma confirmação aparece com o total de chamados que será removido. Essa ação <strong>não pode ser desfeita</strong>.</p>
        <div style={{ background: "#fff7ed", border: "1px solid #fed7aa", borderRadius: 10, padding: "14px 18px", fontSize: 13.5, color: "#c2410c", margin: "16px 0" }}>
          Use "Limpar dados" antes de importar uma base completamente nova. Ou simplesmente use o modo <strong>Substituir todos os dados</strong> na importação — o efeito é o mesmo.
        </div>
      </Section>

      <Section label="Resumo" title="Em uma frase cada">
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginTop: 8 }}>
          {[
            ["Importar chamados", "Carrega CSV do Assyst. Pode substituir tudo ou adicionar aos existentes. Aceita vários arquivos."],
            ["⚠ Nd (badge vermelho)", "Chamado com SLA excedido — dias em aberto além do prazo do tipo de DPS."],
            ["⚡ Redmine resolvido", "Redmine da TI já encerrado mas o Assyst ainda está em aberto — deve ser encerrado."],
            ["⚠ Banner amarelo", "Assysts vinculados a Redmines 'Devolver à TI' que ainda estão na fila — verificar se podem ser encerrados."],
            ["Aba Lista", "Chamados individuais com filtros por equipe, atendente, busca e urgência. Exporta XLS."],
            ["Aba Quantitativo", "Total por equipe e atendente em tabela ou gráficos. Exporta PDF, JPEG e CSV de atrasos por atendente."],
            ["↑ alto (badge vermelho)", "Atendente com mais de 50 chamados — sinaliza sobrecarga no quantitativo."],
            ["Limpar dados", "Remove todos os chamados da base. Irreversível — use antes de uma nova importação completa."],
          ].map(([t, d]) => (
            <div key={t} style={{ border: "1px solid #e2e8f0", borderRadius: 12, padding: 20 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: "#0d9488", marginBottom: 6 }}>{t}</div>
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
    <div style={{ background: "#f0fdfa", borderLeft: "4px solid #0d9488", borderRadius: "0 10px 10px 0", padding: "14px 18px", fontSize: 15, fontWeight: 600, color: "#0f766e", margin: "18px 0" }}>
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
    <div style={{ background: "#f0fdfa", borderRadius: 10, padding: "14px 18px", fontSize: 14, color: "#0f766e", margin: "16px 0" }}>
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

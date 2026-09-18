export default function ComoFuncionaEscalaPage() {
  return (
    <div style={{ fontFamily: "'Inter', system-ui, sans-serif", maxWidth: 760, margin: "0 auto", padding: "32px 16px 60px", color: "#1e293b" }}>

      <div style={{ background: "linear-gradient(135deg,#14532d 0%,#166534 60%,#15803d 100%)", color: "#fff", borderRadius: 16, padding: "36px 40px", marginBottom: 36 }}>
        <div style={{ display: "inline-block", background: "rgba(255,255,255,0.15)", color: "rgba(255,255,255,0.85)", fontSize: 11, fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase", padding: "4px 12px", borderRadius: 100, marginBottom: 14 }}>
          Escala Semanal — Guia Completo
        </div>
        <h1 style={{ fontSize: 26, fontWeight: 800, lineHeight: 1.25, margin: "0 0 10px" }}>Como usar a tela de Escala Semanal</h1>
        <p style={{ fontSize: 14, color: "rgba(255,255,255,0.65)", margin: 0 }}>Entenda os sinais de elegibilidade, como lançar a semana de cada colaborador e como gerar o PDF</p>
      </div>

      <Section label="O que é essa tela" title="Para que serve?">
        <Pergunta>Quem deve ir presencial essa semana — e quem já fez semanas suficientes para trabalhar de remoto?</Pergunta>
        <p style={p}>A Escala Semanal controla a <strong>rotação de presença</strong> de cada colaborador. O sistema conta quantas semanas cada pessoa já foi ao local de trabalho e usa esse número para dizer se ela ainda deve ir presencial ou se já pode ficar remota.</p>
        <p style={p}>Toda semana você abre essa tela, vê quem está elegível para remoto, lança o que cada um vai fazer — Presencial, Remoto ou Forma Virtual — e depois exporta o PDF ou CSV para comunicar a escala.</p>
        <Destaque>O critério é objetivo: <strong>mais semanas presencial acumuladas = mais elegível para remoto</strong>. O sistema não decide por você, mas deixa claro quem está na frente da fila.</Destaque>
      </Section>

      <Section label="Navegação e Filtros" title="Como navegar pelas semanas?">
        <Item emoji="◀▶">Use as <strong>setas ‹ ›</strong> para ir para a semana anterior ou próxima. O sistema ancora sempre na segunda-feira da semana selecionada.</Item>
        <Item emoji="📅">Clique no <strong>campo de data</strong> para ir diretamente para qualquer semana. A tela carrega automaticamente ao mudar a data.</Item>
        <Item emoji="👥">Use o <strong>filtro de equipe</strong> para ver só os colaboradores de uma equipe específica. Por padrão mostra todas as equipes.</Item>
        <Aviso>Equipes como <strong>Supervisão</strong> e <strong>Coordenação</strong> não aparecem na escala — elas são excluídas nas configurações (⚙). Se precisar incluir ou excluir uma equipe, clique no ícone ⚙ no canto superior direito.</Aviso>
      </Section>

      <Section label="Elegibilidade" title="O que significam os sinais?">
        <p style={p}>A coluna <strong>Elegibilidade</strong> mostra o status de cada colaborador com base na quantidade de semanas presencial acumuladas:</p>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, margin: "14px 0" }}>
          {[
            { label: "★ Prioritário", cor: "#b45309", desc: "Já ultrapassou o limite de semanas presencial e é quem tem mais semanas acumuladas dentro do grupo elegível. É o mais urgente para ir de remoto. Linha com fundo âmbar." },
            { label: "Elegível remoto", cor: "#b91c1c", desc: "Já atingiu o número mínimo de semanas presencial para poder trabalhar de remoto essa semana. Pode ir de Remoto ou Forma Virtual." },
            { label: "Quase elegível", cor: "#a16207", desc: "Está próximo do limite. Faltam poucas semanas para atingir o mínimo de presencial. Ainda deve ir presencial, mas está chegando perto." },
            { label: "Presencial", cor: "#15803d", desc: "Ainda não atingiu o mínimo de semanas presencial. Deve ir ao local de trabalho essa semana. É prioridade de escalação presencial." },
          ].map(({ label, cor, desc }) => (
            <div key={label} style={{ border: "1px solid #e2e8f0", borderRadius: 12, padding: "16px 18px" }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: cor, marginBottom: 6 }}>{label}</div>
              <div style={{ fontSize: 13, color: "#64748b", lineHeight: 1.5 }}>{desc}</div>
            </div>
          ))}
        </div>
        <div style={{ border: "1px solid #e2e8f0", borderRadius: 12, padding: "16px 18px", margin: "12px 0" }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: "#64748b", marginBottom: 6 }}>Sem remoto</div>
          <div style={{ fontSize: 13, color: "#64748b", lineHeight: 1.5 }}>Marcado manualmente como sem elegibilidade para remoto. As colunas de semanas e botões de ação ficam ocultos. Use para colaboradores que nunca fazem trabalho remoto.</div>
        </div>
        <Destaque><strong>Atenção: a lógica dos nomes parece invertida, mas faz sentido.</strong> "Presencial" (dot verde) = <em>deve ir presencial</em>, pois ainda não acumulou semanas suficientes. "Elegível remoto" (dot vermelho) = <em>já pode ir remoto</em>, pois acumulou semanas o suficiente.</Destaque>
        <p style={{ ...p, marginTop: 14 }}><strong>Ordenação das linhas</strong> dentro de cada equipe:</p>
        <Item emoji="1️⃣">Colaboradores com 0 semanas ficam no final.</Item>
        <Item emoji="2️⃣">Depois, ordenado por elegibilidade: Elegível remoto → Quase elegível → Presencial.</Item>
        <Item emoji="3️⃣">Dentro do mesmo nível, quem tem mais semanas acumuladas vem primeiro.</Item>
      </Section>

      <Section label="Lançar a Semana" title="Como lançar o que cada colaborador vai fazer?">
        <p style={p}>Na coluna <strong>Ação</strong> de cada linha há botões para definir o que aquela pessoa vai fazer na semana selecionada:</p>
        <table style={tbl}>
          <thead><tr>{["Botão", "O que faz"].map(h => <th key={h} style={th}>{h}</th>)}</tr></thead>
          <tbody>
            <tr>
              <td style={td}><span style={{ background: "#d97706", color: "#fff", padding: "3px 10px", borderRadius: 6, fontSize: 12, fontWeight: 600 }}>Presencial</span></td>
              <td style={td}>Abre um modal para escolher a <strong>unidade</strong> onde o colaborador vai trabalhar: Fórum Clóvis Beviláqua, TJ, Núcleo de Custódia ou outro local. Para o Núcleo de Custódia, aparece um campo de <strong>horário</strong> adicional que vai para o PDF.</td>
            </tr>
            <tr>
              <td style={td}><span style={{ background: "#7c3aed", color: "#fff", padding: "3px 10px", borderRadius: 6, fontSize: 12, fontWeight: 600 }}>Virtual</span></td>
              <td style={td}>Abre modal para indicar que a pessoa está <strong>fisicamente</strong> em um local (ex: Fórum Clóvis Beviláqua) mas atende outra unidade via WhatsApp (ex: Núcleo de Custódia).</td>
            </tr>
            <tr>
              <td style={td}><span style={{ background: "#2563eb", color: "#fff", padding: "3px 10px", borderRadius: 6, fontSize: 12, fontWeight: 600 }}>Remoto</span></td>
              <td style={td}>Marca o colaborador como remoto essa semana. Pode informar de qual local está trabalhando (opcional).</td>
            </tr>
            <tr>
              <td style={td}><span style={{ background: "#7f1d1d", color: "#fca5a5", padding: "3px 8px", borderRadius: 6, fontSize: 12, fontWeight: 600 }}>✕</span></td>
              <td style={td}>Aparece quando já foi lançado algum tipo. <strong>Limpa</strong> o lançamento dessa semana e volta ao estado em branco.</td>
            </tr>
            <tr>
              <td style={td}><span style={{ background: "#166534", color: "#fff", padding: "3px 8px", borderRadius: 6, fontSize: 12, fontWeight: 600 }}>💬</span></td>
              <td style={td}>Designa (ou remove) esse colaborador como <strong>operador do WhatsApp</strong> dessa semana. Aparece como badge no nome e numa seção separada do PDF. Só um por semana.</td>
            </tr>
            <tr>
              <td style={{ ...td, borderBottom: "none" }}><span style={{ background: "#374151", color: "#9ca3af", padding: "3px 8px", borderRadius: 6, fontSize: 12, fontWeight: 600 }}>🚫</span></td>
              <td style={{ ...td, borderBottom: "none" }}>Marca como <strong>"Sem remoto"</strong> — remove da contagem de elegibilidade e oculta os botões Presencial/Virtual/Remoto. Clique novamente (↺ Reativar) para desfazer.</td>
            </tr>
          </tbody>
        </table>
        <p style={{ ...p, marginTop: 14 }}><strong>Passo a passo típico de uma semana:</strong></p>
        <div style={{ background: "#f8fafc", border: "1.5px dashed #cbd5e1", borderRadius: 10, padding: "15px 20px", fontSize: 13.5, color: "#334155", lineHeight: 1.9 }}>
          1. Selecione a semana com as setas ‹ ›<br />
          2. Veja quem está como <strong>★ Prioritário</strong> → esses vão de Remoto ou Virtual<br />
          3. Lance <strong>Remoto</strong> ou <strong>Virtual</strong> para os "Elegível remoto"<br />
          4. Lance <strong>Presencial</strong> para quem está como "Presencial" ou "Quase elegível"<br />
          5. Designe o <strong>💬 Operador WhatsApp</strong> da semana<br />
          6. Exporte o <strong>PDF</strong> ou <strong>CSV</strong> para comunicar a equipe
        </div>
      </Section>

      <Section label="Coluna Esta Semana" title='O que aparece na coluna "Esta semana"?'>
        <p style={p}>Após lançar, a coluna mostra o que foi definido para aquela pessoa:</p>
        <table style={tbl}>
          <thead><tr>{["O que aparece", "Significa"].map(h => <th key={h} style={th}>{h}</th>)}</tr></thead>
          <tbody>
            <tr><td style={td}><strong style={{ color: "#d97706" }}>Presencial</strong></td><td style={td}>Vai trabalhar fisicamente na unidade indicada. O nome da unidade aparece em âmbar abaixo do status.</td></tr>
            <tr><td style={td}><strong style={{ color: "#7c3aed" }}>Forma virtual</strong></td><td style={td}>Está fisicamente em um local mas atende outra unidade via WhatsApp. A unidade atendida aparece em roxo abaixo.</td></tr>
            <tr><td style={{ ...td, borderBottom: "none" }}><strong style={{ color: "#2563eb" }}>Remoto</strong></td><td style={{ ...td, borderBottom: "none" }}>Trabalha de casa ou outro local remoto. O local (opcional) aparece em azul abaixo do status.</td></tr>
          </tbody>
        </table>
      </Section>

      <Section label="Exportação" title="Como gerar o PDF e o CSV?">
        <p style={p}>Clique em <strong>"↓ PDF"</strong> para gerar o documento oficial da escala da semana. O PDF é organizado em seções:</p>
        <div style={{ background: "#f8fafc", border: "1.5px dashed #cbd5e1", borderRadius: 10, padding: "15px 20px", fontSize: 13.5, color: "#334155", lineHeight: 1.9, marginBottom: 14 }}>
          1. Presencial — Fórum Clóvis Beviláqua<br />
          2. Presencial — Núcleo de Custódia (com horário personalizado)<br />
          3. Forma Virtual (separado por unidade atendida)<br />
          4. Operador — WhatsApp<br />
          5. Presencial — Tribunal de Justiça<br />
          6. Remoto (separado por local, se informado)
        </div>
        <p style={p}>Clique em <strong>"Exportar CSV"</strong> para baixar uma planilha com todos os colaboradores, equipes, semanas presencial, elegibilidade e o que foi lançado para cada um.</p>
        <Aviso>O PDF e o CSV <strong>só incluem</strong> os colaboradores das equipes ativas (não as excluídas nas configurações). O filtro de equipe na tela não afeta a exportação.</Aviso>
      </Section>

      <Section label="Configurações ⚙" title="O que dá para configurar?">
        <p style={p}>Clique no ícone <strong>⚙</strong> no canto superior direito para abrir as configurações. Há 3 abas:</p>
        <table style={tbl}>
          <thead><tr>{["Aba", "O que configura"].map(h => <th key={h} style={th}>{h}</th>)}</tr></thead>
          <tbody>
            <tr><td style={td}><strong>📍 Locais</strong></td><td style={td}>A lista de locais de trabalho presencial disponíveis ao lançar. Você pode adicionar, editar ou remover locais.</td></tr>
            <tr><td style={td}><strong>👥 Equipes</strong></td><td style={td}>Quais equipes ficam fora da escala. Por padrão, Supervisão e Coordenação são excluídas.</td></tr>
            <tr><td style={{ ...td, borderBottom: "none" }}><strong>🕐 Horários</strong></td><td style={{ ...td, borderBottom: "none" }}>O texto de horário que aparece no PDF para o Núcleo de Custódia. Pode ser personalizado quando o horário mudar.</td></tr>
          </tbody>
        </table>
        <Destaque>As configurações são salvas no servidor — valem para todos que acessam a tela, não só para você.</Destaque>
      </Section>

      <Section label="Contador de Semanas" title="Como funciona o contador de Semanas Presencial?">
        <p style={p}>A coluna <strong>Semanas Presencial</strong> mostra quantas semanas aquele colaborador já foi ao local de trabalho de forma presencial ou virtual. É esse número que define a elegibilidade.</p>
        <Item emoji="📈">A contagem <strong>sobe</strong> toda vez que você lança "Presencial" ou "Virtual" para aquela pessoa em uma semana.</Item>
        <Item emoji="➡️">Lançamentos de <strong>Remoto não aumentam</strong> a contagem — só presencial e virtual contam.</Item>
        <Item emoji="🚫">Colaboradores marcados como <strong>"Sem remoto"</strong> mostram "—" nessa coluna e ficam fora da contagem.</Item>
        <Aviso>Se um colaborador parece estar com a elegibilidade errada, verifique se o número de semanas está correto. Pode haver um <strong>ajuste manual</strong> aplicado ao contador para compensar situações especiais (afastamento, ajuste retroativo etc.).</Aviso>
      </Section>

      <Section label="Resumo" title="Em uma frase cada">
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginTop: 8 }}>
          {[
            ["★ Prioritário", "Elegível remoto com mais semanas acumuladas — vai de remoto antes dos demais."],
            ["Elegível remoto", "Já fez semanas suficientes — pode ir de Remoto ou Forma Virtual."],
            ["Quase elegível", "Faltam poucas semanas — ainda vai presencial mas está próximo do limite."],
            ["Presencial (dot verde)", "Ainda não atingiu o mínimo — deve ir ao local de trabalho essa semana."],
            ["Forma Virtual", "Fisicamente em um local, mas atendendo outra unidade via WhatsApp."],
            ["💬 Operador WhatsApp", "Quem fica responsável pelo canal de WhatsApp nessa semana — aparece no PDF."],
            ["🚫 Sem remoto", "Remove da contagem e da escala remota — use para quem nunca vai de remoto."],
            ["⚙ Configurações", "Locais de presencial, equipes excluídas e horário do Núcleo de Custódia no PDF."],
          ].map(([t, d]) => (
            <div key={t} style={{ border: "1px solid #e2e8f0", borderRadius: 12, padding: 20 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: "#16a34a", marginBottom: 6 }}>{t}</div>
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
    <div style={{ background: "#f0fdf4", borderLeft: "4px solid #16a34a", borderRadius: "0 10px 10px 0", padding: "14px 18px", fontSize: 15, fontWeight: 600, color: "#15803d", margin: "18px 0" }}>
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
    <div style={{ background: "#dcfce7", borderRadius: 10, padding: "14px 18px", fontSize: 14, color: "#14532d", margin: "16px 0" }}>
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

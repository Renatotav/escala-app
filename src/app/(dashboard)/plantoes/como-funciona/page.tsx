export default function ComoFuncionaPlantoesPage() {
  return (
    <div style={{ fontFamily: "'Inter', system-ui, sans-serif", maxWidth: 760, margin: "0 auto", padding: "32px 16px 60px", color: "#1e293b" }}>

      <div style={{ background: "#1d4ed8", color: "#fff", borderRadius: 16, padding: "36px 40px", marginBottom: 36 }}>
        <div style={{ display: "inline-block", background: "rgba(255,255,255,0.15)", color: "rgba(255,255,255,0.85)", fontSize: 11, fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase", padding: "4px 12px", borderRadius: 100, marginBottom: 14 }}>
          Plantões & Folgas — Guia Completo
        </div>
        <h1 style={{ fontSize: 26, fontWeight: 800, lineHeight: 1.25, margin: "0 0 10px" }}>Como usar a tela de Plantões & Folgas</h1>
        <p style={{ fontSize: 14, color: "rgba(255,255,255,0.65)", margin: 0 }}>Passo a passo para registrar plantões, agendar folgas, montar a escala e entender o saldo de cada colaborador</p>
      </div>

      <Section label="O que é essa tela" title="Para que serve?">
        <Pergunta>Quem é o próximo a fazer plantão — e quem ainda está devendo folga?</Pergunta>
        <p style={p}>A tela de Plantões & Folgas resolve dois problemas ao mesmo tempo:</p>
        <Item emoji="1️⃣"><><strong>Escala justa:</strong> controla quem já trabalhou mais vezes nos fins de semana e feriados, para que a próxima escala sempre caia em quem foi menos sobrecarregado.</>  </Item>
        <Item emoji="2️⃣"><><strong>Controle de folgas:</strong> todo plantão realizado gera direito a folga compensatória. A tela rastreia quem já recebeu a folga e quem ainda está com crédito pendente.</>  </Item>
        <Destaque>Pense assim: o sistema é como um placar. Cada plantão adiciona pontos. Quem tem <strong>menos pontos</strong> está na frente da fila para o próximo plantão.</Destaque>
      </Section>

      <Section label="Pontuação" title="Como funciona a pontuação?">
        <p style={p}>Cada tipo de plantão vale uma quantidade de pontos — e também define quantas folgas o colaborador tem direito:</p>
        <table style={tbl}>
          <thead><tr>{["Tipo de plantão", "Pontos que adiciona", "Folgas geradas"].map(h => <th key={h} style={th}>{h}</th>)}</tr></thead>
          <tbody>
            <tr>
              <td style={td}><strong>Sábado</strong></td>
              <td style={{ ...td, textAlign: "center" }}><span style={{ fontWeight: 800, fontSize: 18, color: "#3b82f6" }}>1 pt</span></td>
              <td style={{ ...td, textAlign: "center" }}>1 folga simples</td>
            </tr>
            <tr>
              <td style={td}><strong>Ponto Facultativo</strong></td>
              <td style={{ ...td, textAlign: "center" }}><span style={{ fontWeight: 800, fontSize: 18, color: "#3b82f6" }}>1 pt</span></td>
              <td style={{ ...td, textAlign: "center" }}>1 folga simples</td>
            </tr>
            <tr>
              <td style={td}><strong>Domingo</strong></td>
              <td style={{ ...td, textAlign: "center" }}><span style={{ fontWeight: 800, fontSize: 18, color: "#dc2626" }}>2 pts</span></td>
              <td style={{ ...td, textAlign: "center" }}>2 folgas (1ª + 2ª)</td>
            </tr>
            <tr>
              <td style={{ ...td, borderBottom: "none" }}><strong>Feriado</strong></td>
              <td style={{ ...td, borderBottom: "none", textAlign: "center" }}><span style={{ fontWeight: 800, fontSize: 18, color: "#dc2626" }}>2 pts</span></td>
              <td style={{ ...td, borderBottom: "none", textAlign: "center" }}>2 folgas (1ª + 2ª)</td>
            </tr>
          </tbody>
        </table>
        <p style={p}>Exemplo prático: um colaborador fez 3 plantões — dois sábados e um feriado. Seu acumulado é <strong>1 + 1 + 2 = 4 pts</strong>. Ele tem direito a <strong>4 folgas</strong> (1 + 1 + 2).</p>
        <Destaque>A cor da coluna <strong>Acumulado</strong> na aba Sequência indica posição relativa: verde = menos sobrecarregado (frente da fila), amarelo = médio, vermelho = mais sobrecarregado (fundo da fila).</Destaque>
      </Section>

      <Section label="Aba Sequência" title="Como ler o ranking?">
        <p style={p}>A aba <strong>Sequência</strong> é a visão principal da escala. Mostra todos os colaboradores ordenados do menos para o mais sobrecarregado.</p>
        <table style={tbl}>
          <thead><tr>{["Coluna", "O que mostra"].map(h => <th key={h} style={th}>{h}</th>)}</tr></thead>
          <tbody>
            <tr><td style={td}><strong># (posição)</strong></td><td style={td}>Posição na fila. Posição 1 = próximo a ser escalado — é quem tem o menor score.</td></tr>
            <tr><td style={td}><strong>Sáb/Pto</strong></td><td style={td}>Quantidade de plantões simples (sábado ou ponto facultativo) já realizados.</td></tr>
            <tr><td style={td}><strong>Dom/Fer</strong></td><td style={td}>Quantidade de plantões pesados (domingo ou feriado) já realizados.</td></tr>
            <tr><td style={td}><strong>Acumulado</strong></td><td style={td}>Soma total de pontos. É esse número que define a ordem da fila.</td></tr>
            <tr><td style={{ ...td, borderBottom: "none" }}><strong>Próxima escala</strong></td><td style={{ ...td, borderBottom: "none" }}>Indica se o próximo plantão deve ser <em>Sáb / Pto. Fac.</em> (leve) ou <em>Dom / Feriado</em> (pesado). O sistema alterna para que ninguém acumule só plantões pesados seguidos.</td></tr>
          </tbody>
        </table>
        <p style={p}><strong>Como usar no dia a dia:</strong> quando você precisar escalar alguém para um plantão, olhe quem está na posição 1 e verifique se a "Próxima escala" corresponde ao tipo do dia que vai ser escalado. Se bater, esse é o colaborador certo.</p>
        <Aviso>O badge <strong>"Próximo"</strong> em verde aparece no colaborador que está na frente da fila e está ativo. Colaboradores com <strong>"Inativo"</strong> cinza foram retirados da contagem — use o botão "Mostrar inativos" para vê-los. Para retirar ou reativar alguém, clique no ícone à direita da linha.</Aviso>
        <p style={p}><strong>Ficha do colaborador:</strong> clique no nome de qualquer pessoa para ver o histórico completo de plantões individuais dela.</p>
      </Section>

      <Section label="Como Registrar um Plantão" title="Passo a passo para registrar um plantão">
        <p style={p}>Use esse fluxo toda vez que um colaborador realizar um plantão:</p>
        <Item emoji="1️⃣"><>Clique no botão <strong>"+ Registrar plantão"</strong> no canto superior direito da tela.</>  </Item>
        <Item emoji="2️⃣"><>Selecione o <strong>colaborador</strong> que fez o plantão.</>  </Item>
        <Item emoji="3️⃣"><>Informe a <strong>data do plantão</strong>. O sistema detecta automaticamente se é sábado ou domingo e preenche o tipo — mas você pode alterar se necessário (ex: a data era um feriado).</>  </Item>
        <Item emoji="4️⃣"><>Escolha o <strong>tipo</strong>: Sábado, Ponto Facultativo, Domingo ou Feriado.</>  </Item>
        <Item emoji="5️⃣"><>Opcionalmente, já preencha as datas das folgas no mesmo momento. Se não souber ainda, deixe em branco — você pode preencher depois pela aba Histórico.</>  </Item>
        <Item emoji="6️⃣"><>Clique em <strong>Salvar</strong>. O score do colaborador é atualizado imediatamente no ranking.</>  </Item>
        <Destaque>Se o plantão foi em <strong>Domingo ou Feriado</strong>, o formulário abre campos para <strong>1ª folga</strong> e <strong>2ª folga</strong>. Você pode agendar as duas na hora ou só a primeira — a segunda pode ser registrada depois.</Destaque>
      </Section>

      <Section label="Aba Histórico" title="Como usar o Histórico?">
        <p style={p}>A aba <strong>Histórico</strong> mostra todos os plantões já registrados. Use ela para consultar e para agendar folgas pendentes.</p>
        <Item emoji="🗓️"><><strong>Filtro por mês:</strong> use as setas ‹ › ou clique no campo de mês para navegar. Por padrão mostra o mês atual.</>  </Item>
        <Item emoji="👤"><><strong>Filtro por colaborador:</strong> selecione um nome para ver só os plantões daquela pessoa.</>  </Item>
        <Item emoji="🟡"><><strong>Linha amarela:</strong> plantão com folga ainda pendente de agendamento. Clique em <strong>"Agendar folga"</strong> para marcar a data.</>  </Item>
        <Item emoji="✎"><><strong>Editar:</strong> clique em "✎ Editar" para corrigir a data ou o tipo de um plantão já registrado.</>  </Item>
        <p style={{ ...p, marginTop: 12 }}><strong>Como agendar folga pelo Histórico:</strong></p>
        <div style={{ background: "#f8fafc", border: "1.5px solid #e2e8f0", borderRadius: 10, padding: "16px 20px", marginBottom: 14 }}>
          <div style={{ fontSize: 13, color: "#334155", lineHeight: 1.8 }}>
            1. Encontre a linha com "Agendar folga" em amarelo<br />
            2. Clique em "Agendar folga"<br />
            3. Escolha a data em que o colaborador vai tirar a folga<br />
            4. Salve — a data aparece na coluna "Folga simples" (ou "Folga dupla" se for a 2ª)
          </div>
        </div>
      </Section>

      <Section label="Aba Saldo" title="Como funciona o Saldo?">
        <p style={p}>A aba <strong>Saldo</strong> dá uma visão geral de todos os colaboradores: quem está em dia e quem ainda tem folgas pendentes.</p>
        <table style={tbl}>
          <thead><tr>{["Campo", "O que significa"].map(h => <th key={h} style={th}>{h}</th>)}</tr></thead>
          <tbody>
            <tr><td style={td}><strong>Plantões</strong></td><td style={td}>Total de plantões registrados para esse colaborador.</td></tr>
            <tr><td style={td}><strong>Folgas devidas</strong></td><td style={td}>Quantas folgas ele tem direito — soma de pontos de todos os plantões.</td></tr>
            <tr><td style={td}><strong>Agendadas</strong></td><td style={td}>Quantas folgas já têm data marcada. Clique no número azul para ver as datas de cada uma.</td></tr>
            <tr><td style={{ ...td, borderBottom: "none" }}><strong>Pendentes</strong></td><td style={{ ...td, borderBottom: "none" }}>Folgas ainda sem data. Aparece em <strong>amarelo</strong> quando há pendência. Clique em "Agendar folga" para marcar.</td></tr>
          </tbody>
        </table>
        <p style={p}><strong>Abater no Banco de Horas:</strong> se aparecer o botão "Abater no BH" ao lado de "Agendar folga", significa que o colaborador tem saldo negativo no Banco de Horas. Nesse caso você pode usar os créditos do plantão para zerar a dívida no BH em vez de agendar um dia livre.</p>
        <Aviso>O alerta <strong>"Total a agendar: X folgas pendentes"</strong> no topo do Saldo mostra a soma de todas as pendências da equipe. Use como referência para saber quanto ainda precisa ser organizado.</Aviso>
      </Section>

      <Section label="Aba Folgas" title="Como gerenciar as folgas agendadas?">
        <p style={p}>A aba <strong>Folgas</strong> mostra todas as folgas com data marcada, filtradas por mês.</p>
        <Item emoji="◀ ▶"><><strong>Navegue pelo mês</strong> com as setas para ver folgas passadas ou futuras.</>  </Item>
        <Item emoji="👤"><><strong>Filtre por colaborador</strong> para ver só as folgas de uma pessoa específica.</>  </Item>
        <Item emoji="✎"><><strong>Editar data:</strong> se o colaborador precisou mudar o dia da folga, clique em "✎ Editar" e altere a data.</>  </Item>
        <Item emoji="🗑️"><><strong>Excluir:</strong> se a folga foi registrada errada, clique em "Excluir". A folga volta para pendente no saldo do colaborador.</>  </Item>
        <Item emoji="➕"><><strong>+ Registrar folga:</strong> abre o formulário para lançar uma folga sem passar pelo Histórico. Selecione o colaborador, escolha o plantão que está compensando e informe a data.</>  </Item>
        <Destaque>A coluna <strong>"Data do Plantão"</strong> mostra qual plantão está sendo compensado com aquela folga — isso ajuda a rastrear se o colaborador ainda tem créditos de plantões antigos.</Destaque>
      </Section>

      <Section label="Aba Escala do Mês" title="Como montar a Escala do Mês?">
        <p style={p}>A aba <strong>Escala do Mês</strong> serve para planejar a escala com antecedência — designar quem vai trabalhar em cada fim de semana e feriado do mês.</p>
        <Item emoji="1️⃣"><>Navegue até o mês desejado com as setas ‹ › ou o seletor de mês.</>  </Item>
        <Item emoji="2️⃣"><>O sistema lista automaticamente todos os sábados, domingos, feriados e pontos facultativos do mês — inclusive feriados fixos (Natal, Tiradentes, etc.) e móveis (Páscoa, Carnaval).</>  </Item>
        <Item emoji="3️⃣"><>Clique em <strong>"+ Adicionar"</strong> em qualquer data para designar um colaborador naquele dia.</>  </Item>
        <Item emoji="4️⃣"><>Se precisar remover alguém da escala, clique no <strong>"✕"</strong> ao lado do nome.</>  </Item>
        <Item emoji="5️⃣"><>Você pode designar <strong>mais de um colaborador</strong> no mesmo dia — todos aparecem como chips na linha daquela data.</>  </Item>
        <Aviso><strong>Importante:</strong> designar alguém na Escala do Mês <em>não</em> lança o plantão automaticamente no histórico. Após o plantão acontecer, você ainda precisa clicar em <strong>"+ Registrar plantão"</strong> para registrar que o plantão foi realizado e gerar o crédito de folga.</Aviso>
      </Section>

      <Section label="Fluxo Completo" title="Como usar tudo junto no dia a dia">
        <p style={p}><strong>Antes do mês:</strong></p>
        <Item emoji="📆"><>Abra a aba <strong>Escala do Mês</strong> e monte a escala do próximo mês — olhe quem está na frente do ranking na aba Sequência e designe essas pessoas nos dias correspondentes.</>  </Item>
        <p style={{ ...p, marginTop: 16 }}><strong>Após cada plantão:</strong></p>
        <Item emoji="✅"><>Clique em <strong>"+ Registrar plantão"</strong>, informe o colaborador, a data, o tipo e as datas das folgas (se já souber).</>  </Item>
        <p style={{ ...p, marginTop: 16 }}><strong>Para organizar as folgas:</strong></p>
        <Item emoji="🟡"><>Abra a aba <strong>Saldo</strong> para ver quem tem folgas pendentes. Clique em "Agendar folga" para marcar a data de cada uma.</>  </Item>
        <Item emoji="📋"><>Abra a aba <strong>Folgas</strong> para ver o calendário de folgas do mês atual e garantir que não tem ninguém sem folga registrada.</>  </Item>
        <div style={{ background: "#dbeafe", borderRadius: 12, padding: "20px 24px", marginTop: 20 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: "#1e40af", marginBottom: 8 }}>Resumo do ciclo</div>
          <div style={{ fontSize: 13.5, color: "#1e40af", lineHeight: 1.8 }}>
            Montar escala do mês → Plantão acontece → Registrar plantão → Agendar folgas pendentes → Verificar saldo
          </div>
        </div>
      </Section>

      <Section label="Resumo" title="Em uma frase cada">
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginTop: 8 }}>
          {[
            ["Sequência", "Ranking por pontos acumulados — quem tem menos vai primeiro na fila."],
            ["Histórico", "Registro de todos os plantões — use para agendar folgas pendentes (linha amarela)."],
            ["Saldo", "Visão geral de folgas devidas vs. agendadas por colaborador."],
            ["Folgas", "Calendário de folgas com data marcada — edite ou exclua se necessário."],
            ["Escala do Mês", "Planejamento visual de quem vai trabalhar em cada data do mês."],
            ["Abater no BH", "Usa os créditos de plantão para quitar dívida no Banco de Horas."],
            ["Próxima escala", "Alterna simples↔duplo para equilibrar o tipo de plantão por pessoa."],
            ["+ Registrar plantão", "Sempre necessário após o plantão acontecer para gerar crédito de folga."],
          ].map(([t, d]) => (
            <div key={t} style={{ border: "1px solid #e2e8f0", borderRadius: 12, padding: 20 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: "#1d4ed8", marginBottom: 6 }}>{t}</div>
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
    <div style={{ background: "#f1f5f9", borderLeft: "4px solid #1d4ed8", borderRadius: "0 10px 10px 0", padding: "14px 18px", fontSize: 15, fontWeight: 600, color: "#1d4ed8", margin: "18px 0" }}>
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

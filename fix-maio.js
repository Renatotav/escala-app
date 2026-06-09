// Rodar no console do Easypanel: node fix-maio.js
const { Client } = require('pg');
const client = new Client({ connectionString: process.env.DATABASE_URL });

async function run() {
  await client.connect();
  console.log('Conectado.\n');

  // Busca IDs dos colaboradores
  const nomes = [
    'Marcio Kauan', 'Augusto Cesar', 'Luciana Maria', 'Joquebede',
    'Francisco Bruno Batista', 'Vitoria Lima', 'Ana Carolina'
  ];
  const ids = {};
  for (const n of nomes) {
    const r = await client.query(
      `SELECT id, nome FROM "Colaborador" WHERE unaccent(lower(nome)) LIKE unaccent(lower($1)) LIMIT 1`,
      [`%${n}%`]
    );
    if (r.rows[0]) { ids[n] = r.rows[0].id; console.log(`  ${r.rows[0].nome} → id ${r.rows[0].id}`); }
    else console.log(`  !! NÃO ENCONTRADO: ${n}`);
  }
  console.log('');

  // Helper: deletar todos de uma data exceto um colaborador
  async function limparData(data, manter, label) {
    const r = await client.query(
      `DELETE FROM "Plantao" WHERE data::date = $1 AND "colaboradorId" != $2 RETURNING id, "colaboradorId"`,
      [data, manter]
    );
    console.log(`${label}: ${r.rowCount} registro(s) excluído(s)`);
  }

  // Helper: trocar colaborador de um plantão por data
  async function trocarColab(data, deId, paraId, label) {
    const r = await client.query(
      `UPDATE "Plantao" SET "colaboradorId" = $1 WHERE data::date = $2 AND "colaboradorId" = $3 RETURNING id`,
      [paraId, data, deId]
    );
    console.log(`${label}: ${r.rowCount} plantão(ões) atualizado(s)`);
  }

  // ── Limpeza dos registros em massa ───────────────────────────────────────
  console.log('=== Limpeza registros em massa ===');
  await limparData('2026-05-02', ids['Marcio Kauan'],           '02/05 → manter só Marcio Kauan');
  await limparData('2026-05-09', ids['Augusto Cesar'],          '09/05 → manter só Augusto Cesar');
  await limparData('2026-05-16', ids['Luciana Maria'],          '16/05 → manter só Luciana Maria');
  await limparData('2026-05-23', ids['Joquebede'],              '23/05 → manter só Joquebede');
  await limparData('2026-05-31', ids['Francisco Bruno Batista'],'31/05 → manter só Francisco Bruno Batista Porto');

  // 24/05 — não consta no relatório correto, deletar Francisca Cristiana
  const r24 = await client.query(`DELETE FROM "Plantao" WHERE data::date = '2026-05-24' RETURNING id`);
  console.log(`24/05 → ${r24.rowCount} registro(s) excluído(s) (não consta no relatório)`);

  // ── Trocar 03/05 e 17/05 ────────────────────────────────────────────────
  console.log('\n=== Correção 03/05 ↔ 17/05 ===');
  await trocarColab('2026-05-03', ids['Ana Carolina'],  ids['Vitoria Lima'], '03/05: Ana Carolina → Vitória Lima');
  await trocarColab('2026-05-17', ids['Vitoria Lima'],  ids['Ana Carolina'], '17/05: Vitória Lima → Ana Carolina');

  // ── Resultado final ──────────────────────────────────────────────────────
  console.log('\n=== Verificação final maio/2026 ===');
  const fin = await client.query(
    `SELECT p.data::date, c.nome FROM "Plantao" p
     JOIN "Colaborador" c ON c.id = p."colaboradorId"
     WHERE p.data >= '2026-05-01' AND p.data <= '2026-05-31'
     ORDER BY p.data, c.nome`
  );
  for (const row of fin.rows) {
    const d = new Date(row.data).toLocaleDateString('pt-BR', { timeZone: 'UTC' });
    console.log(`  ${d} — ${row.nome}`);
  }

  await client.end();
  console.log('\nConcluído!');
}

run().catch(e => { console.error('ERRO:', e.message); client.end(); });

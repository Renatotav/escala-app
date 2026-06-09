// Script de correção de plantões
// Uso: node fix-plantoes.js
require("dotenv").config();
const { Client } = require("pg");

const client = new Client({ connectionString: process.env.DATABASE_URL });

async function findColab(partialName) {
  const res = await client.query(
    `SELECT id, nome FROM "Colaborador" WHERE LOWER(nome) LIKE LOWER($1) AND ativo = true LIMIT 1`,
    [`%${partialName}%`]
  );
  if (res.rows.length === 0) throw new Error(`Colaborador não encontrado: ${partialName}`);
  return res.rows[0];
}

async function findPlantao(date, colabName) {
  const res = await client.query(
    `SELECT p.id, p."colaboradorId", c.nome, p.data, p.tipo
     FROM "Plantao" p
     JOIN "Colaborador" c ON c.id = p."colaboradorId"
     WHERE p.data::date = $1
     AND LOWER(c.nome) LIKE LOWER($2)`,
    [date, `%${colabName}%`]
  );
  return res.rows;
}

async function listPlantoesByDate(date) {
  const res = await client.query(
    `SELECT p.id, p."colaboradorId", c.nome, p.data, p.tipo
     FROM "Plantao" p
     JOIN "Colaborador" c ON c.id = p."colaboradorId"
     WHERE p.data::date = $1
     ORDER BY c.nome`,
    [date]
  );
  return res.rows;
}

async function updatePlantaoColab(plantaoId, newColabId, newColabNome) {
  await client.query(`UPDATE "Plantao" SET "colaboradorId" = $1 WHERE id = $2`, [newColabId, plantaoId]);
  console.log(`  ✓ Plantão ${plantaoId} → ${newColabNome}`);
}

async function updatePlantaoData(plantaoId, newDate) {
  await client.query(`UPDATE "Plantao" SET data = $1 WHERE id = $2`, [newDate, plantaoId]);
  console.log(`  ✓ Plantão ${plantaoId} → data ${newDate}`);
}

async function deletePlantao(plantaoId, motivo) {
  await client.query(`DELETE FROM "Plantao" WHERE id = $1`, [plantaoId]);
  console.log(`  🗑 Plantão ${plantaoId} excluído (${motivo})`);
}

async function main() {
  await client.connect();
  console.log("Conectado ao banco.\n");

  // ── 25/01: Mude para Maria Julya ──────────────────────────────────────────
  console.log("25/01 → Maria Julya:");
  {
    const novoColab = await findColab("Maria Julya");
    const plantoes = await listPlantoesByDate("2026-01-25");
    if (plantoes.length === 0) console.log("  Nenhum plantão encontrado em 25/01");
    else {
      // Atualiza o primeiro que não for Maria Julya
      const alvo = plantoes.find(p => p.id !== novoColab.id) || plantoes[0];
      await updatePlantaoColab(alvo.id, novoColab.id, novoColab.nome);
    }
  }

  // ── 01/02: Deixe só Thais e José Araújo ──────────────────────────────────
  console.log("\n01/02 → Manter só Thais e José Araújo:");
  {
    const thais   = await findColab("Thais Angelim");
    const jose    = await findColab("José Araújo");
    const manter  = new Set([thais.id, jose.id]);
    const plantoes = await listPlantoesByDate("2026-02-01");
    if (plantoes.length === 0) console.log("  Nenhum plantão encontrado em 01/02");
    for (const p of plantoes) {
      if (!manter.has(p.colaboradorid)) {
        await deletePlantao(p.id, `${p.nome} removido`);
      } else {
        console.log(`  ✓ Mantido: ${p.nome}`);
      }
    }
  }

  // ── 08/02: Ane Karoline (tirar do 07/02 e colocar no 08/02) ──────────────
  console.log("\n08/02 → Mover Ane Karoline de 07/02 para 08/02:");
  {
    const plantoes07 = await findPlantao("2026-02-07", "Ane Karoline");
    if (plantoes07.length === 0) console.log("  Ane Karoline não tem plantão em 07/02");
    else {
      await updatePlantaoData(plantoes07[0].id, "2026-02-08");
    }
  }

  // ── 08/03: Mude para Lorena Maria ────────────────────────────────────────
  console.log("\n08/03 → Lorena Maria:");
  {
    const novoColab = await findColab("Lorena Maria");
    const plantoes  = await listPlantoesByDate("2026-03-08");
    if (plantoes.length === 0) console.log("  Nenhum plantão encontrado em 08/03");
    else {
      const alvo = plantoes.find(p => p.colaboradorid !== novoColab.id) || plantoes[0];
      await updatePlantaoColab(alvo.id, novoColab.id, novoColab.nome);
    }
  }

  // ── 15/03: Mude para José Tarciso ────────────────────────────────────────
  console.log("\n15/03 → José Tarciso:");
  {
    const novoColab = await findColab("José Tarciso");
    const plantoes  = await listPlantoesByDate("2026-03-15");
    if (plantoes.length === 0) console.log("  Nenhum plantão encontrado em 15/03");
    else {
      const alvo = plantoes.find(p => p.colaboradorid !== novoColab.id) || plantoes[0];
      await updatePlantaoColab(alvo.id, novoColab.id, novoColab.nome);
    }
  }

  // ── 03/05: Mude para Vitória Lima ────────────────────────────────────────
  console.log("\n03/05 → Vitória Lima:");
  {
    const novoColab = await findColab("Vitória Lima");
    const plantoes  = await listPlantoesByDate("2026-05-03");
    if (plantoes.length === 0) console.log("  Nenhum plantão encontrado em 03/05");
    else {
      const alvo = plantoes.find(p => p.colaboradorid !== novoColab.id) || plantoes[0];
      await updatePlantaoColab(alvo.id, novoColab.id, novoColab.nome);
    }
  }

  // ── 17/05: Mude para Ana Carolina ────────────────────────────────────────
  console.log("\n17/05 → Ana Carolina:");
  {
    const novoColab = await findColab("Ana Carolina");
    const plantoes  = await listPlantoesByDate("2026-05-17");
    if (plantoes.length === 0) console.log("  Nenhum plantão encontrado em 17/05");
    else {
      const alvo = plantoes.find(p => p.colaboradorid !== novoColab.id) || plantoes[0];
      await updatePlantaoColab(alvo.id, novoColab.id, novoColab.nome);
    }
  }

  // ── 09/05: Excluir plantão de Renato ──────────────────────────────────────
  console.log("\n09/05 → Excluir plantão de Renato:");
  {
    const plantoes = await findPlantao("2026-05-09", "Renato");
    if (plantoes.length === 0) console.log("  Nenhum plantão de Renato em 09/05");
    else {
      for (const p of plantoes) await deletePlantao(p.id, `${p.nome} não trabalhou`);
    }
  }

  console.log("\nConcluído!");
  await client.end();
}

main().catch(async (e) => {
  console.error("Erro:", e.message);
  await client.end();
  process.exit(1);
});

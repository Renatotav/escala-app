// Seed com datas REAIS de plantão e folga (substitui seed-plantoes.js)
// Tipos inferidos pelo dia da semana: Sábado=SABADO, Domingo=DOMINGO, Feriado=FERIADO
const { Client } = require("pg");

const client = new Client({ connectionString: process.env.DATABASE_URL });

function normalize(name) {
  return name.trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/\s+/g, " ");
}

const aliases = {
  "maria julya mendes callado": "maria julya lopes callado",
  "ana carolina sa":             "ana carolina de sa alves",
  "ana carolina sa alves":       "ana carolina de sa alves",
};

const skipSet = new Set([
  "nata caminha garcia",
  "francisco bruno batista porto", // não cadastrado ainda no sistema
]);

// Registros consolidados: cada objeto = 1 plantão com suas folgas
// Múltiplas linhas com mesma data = 1 DOMINGO → folga1 + folga2 (já mescladas abaixo)
const plantoes = [
  // MARIA IOLANDA CRISPIM GONÇALVES
  { nome: "Maria Iolanda Crispim Gonçalves",      data: "2025-11-22", tipo: "SABADO",  folga1: "2026-04-15", folga2: null },
  { nome: "Maria Iolanda Crispim Gonçalves",      data: "2026-03-22", tipo: "DOMINGO", folga1: "2026-04-27", folga2: "2026-09-01" },

  // RAFFAELA DE PAIVA SOUSA (03/04/2026 = Sexta-feira Santa = FERIADO; duas linhas mescladas)
  { nome: "Raffaela de Paiva Sousa",              data: "2026-04-03", tipo: "FERIADO", folga1: "2026-04-30", folga2: "2026-05-04" },

  // FABRÍCIO LIMA DA SILVA
  { nome: "Fabricio Lima da Silva",               data: "2025-08-16", tipo: "SABADO",  folga1: "2026-01-14", folga2: null },

  // JOQUEBEDE GABRIELA DO NASCIMENTO BRAUNA FERREIRA
  { nome: "Joquebede Gabriela do Nascimento Brauna Ferreira", data: "2025-11-29", tipo: "SABADO", folga1: "2026-04-02", folga2: null },

  // JOSÉ ARAÚJO DA SILVA JUNIOR — dois plantões
  { nome: "José Araújo da Silva Junior",          data: "2026-01-31", tipo: "SABADO",  folga1: "2026-09-02", folga2: null },
  { nome: "José Araújo da Silva Junior",          data: "2026-04-21", tipo: "FERIADO", folga1: "2026-04-27", folga2: "2026-05-15" }, // Tiradentes

  // RAMON VITOR MENDES CIRCUNDE — dois plantões (12/10 = Domingo + N.Sra.Aparecida)
  { nome: "Ramon Vitor Mendes Circunde",          data: "2025-10-12", tipo: "DOMINGO", folga1: "2026-02-18", folga2: "2026-02-19" },
  { nome: "Ramon Vitor Mendes Circunde",          data: "2026-01-24", tipo: "SABADO",  folga1: "2026-02-20", folga2: null },

  // TATIANA DA SILVA SANTOS
  { nome: "Tatiana da Silva Santos",              data: "2025-12-13", tipo: "SABADO",  folga1: "2026-02-25", folga2: null },

  // ANE KAROLINE LIMA DA SILVA — dois plantões
  { nome: "Ane Karoline Lima da Silva",           data: "2025-10-18", tipo: "SABADO",  folga1: "2026-02-13", folga2: null },
  { nome: "Ane Karoline Lima da Silva",           data: "2026-02-08", tipo: "DOMINGO", folga1: null,         folga2: null },

  // JÉSSICA SOARES DE MENEZES PEREIRA (05/07 = Sábado de 2025)
  { nome: "Jéssica Soares de Menezes Pereira",   data: "2025-07-05", tipo: "SABADO",  folga1: "2026-03-13", folga2: null },

  // RAPHAEL BRUNO OLIVEIRA DE MELO (17/08/2025 = Domingo)
  { nome: "Raphael Bruno Oliveira de Melo",       data: "2025-08-17", tipo: "DOMINGO", folga1: "2026-03-20", folga2: null },

  // LUIS FERNANDO EDUARDO SALES (14/12/2025 = Domingo; nome no banco sem "Felix")
  { nome: "Luis Fernando Eduardo Sales",          data: "2025-12-14", tipo: "DOMINGO", folga1: "2026-03-30", folga2: "2026-03-31" },

  // BRENA FERREIRA BASTOS — 5 plantões (inativa, mas mantida para histórico)
  { nome: "Brena Ferreira Bastos",                data: "2025-05-18", tipo: "DOMINGO", folga1: "2026-05-04", folga2: "2026-05-05" }, // Domingo
  { nome: "Brena Ferreira Bastos",                data: "2025-08-23", tipo: "SABADO",  folga1: "2026-05-06", folga2: null },          // Sábado
  { nome: "Brena Ferreira Bastos",                data: "2025-11-30", tipo: "DOMINGO", folga1: "2026-05-07", folga2: "2026-05-08" }, // Domingo
  { nome: "Brena Ferreira Bastos",                data: "2026-02-21", tipo: "SABADO",  folga1: null,         folga2: null },           // PLANTÃO EXCEPCIONAL
  { nome: "Brena Ferreira Bastos",                data: "2026-03-29", tipo: "DOMINGO", folga1: null,         folga2: null },           // Domingo

  // MARIANA CUNHA DO CARMO (22/02/2026 = Domingo)
  { nome: "Mariana Cunha do Carmo",               data: "2026-02-22", tipo: "DOMINGO", folga1: "2026-03-20", folga2: null },

  // AMANDA BRAGA BARROS DE SOUSA (28/12/2025 = Domingo)
  { nome: "Amanda Braga Barros de Sousa",         data: "2025-12-28", tipo: "DOMINGO", folga1: "2026-03-20", folga2: null },

  // FRANCISCO BRUNO DE OLIVEIRA SILVA (07/02/2026 = Sábado)
  { nome: "Francisco Bruno de Oliveira Silva",    data: "2026-02-07", tipo: "SABADO",  folga1: "2026-03-23", folga2: null },

  // LUCIANA MARIA ROCHA DE SOUZA MIRANDA (16/05/2026 = Sábado)
  { nome: "Luciana Maria Rocha de Souza Miranda", data: "2026-05-16", tipo: "SABADO",  folga1: "2026-07-17", folga2: null },

  // NATÃ CAMINHA GARCIA — SKIP (não está no sistema)

  // ANNE KAROLINE OLIVEIRA LOPES (14/02/2026 = Sábado, 2 folgas = tratado como especial)
  { nome: "Anne Karoline Oliveira Lopes",         data: "2026-02-14", tipo: "SABADO",  folga1: "2026-03-30", folga2: "2026-04-06" },

  // AUGUSTO CESAR MIRANDA LIMA FILHO (18/01/2026 = Domingo)
  { nome: "Augusto Cesar Miranda Lima Filho",     data: "2026-01-18", tipo: "DOMINGO", folga1: "2026-03-26", folga2: "2026-03-27" },

  // ANTONIO GUILHERME SILVA DE PAULA (17/01/2026 = Sábado, 2 folgas = especial)
  { nome: "Antonio Guilherme Silva de Paula",     data: "2026-01-17", tipo: "SABADO",  folga1: "2026-03-26", folga2: "2026-04-24" },

  // MARIA JULYA LOPES CALLADO (25/01/2026 = Domingo)
  { nome: "Maria Julya Lopes Callado",            data: "2026-01-25", tipo: "DOMINGO", folga1: "2026-04-13", folga2: null },

  // THAIS ANGELIM RODRIGUES (01/02/2026 = Domingo)
  { nome: "Thais Angelim Rodrigues",              data: "2026-02-01", tipo: "DOMINGO", folga1: "2026-04-16", folga2: "2026-04-17" },

  // PEDRO FERNANDO LOPES FARIAS (05/04/2026 = Domingo)
  { nome: "Pedro Fernando Lopes Farias",          data: "2026-04-05", tipo: "DOMINGO", folga1: "2026-04-20", folga2: "2026-04-26" },

  // TACILIA DE SOUSA SILVA (04/04/2026 = Sábado)
  { nome: "Tacilia de Sousa Silva",               data: "2026-04-04", tipo: "SABADO",  folga1: "2026-04-15", folga2: null },

  // RENATO TAVARES VENÂNCIO (13/04/2026 = Segunda, provavelmente feriado regional)
  { nome: "Renato Tavares Venâncio",              data: "2026-04-13", tipo: "FERIADO", folga1: null,         folga2: null },

  // ANA KARINY OLIVEIRA DA SILVA (21/02/2026 = Sábado)
  { nome: "Ana Kariny Oliveira da Silva",         data: "2026-02-21", tipo: "SABADO",  folga1: "2026-04-30", folga2: null },

  // VIVIAN DA SILVA DUARTE (21/03/2026 = Sábado)
  { nome: "Vivian da Silva Duarte",               data: "2026-03-21", tipo: "SABADO",  folga1: "2026-05-22", folga2: null },

  // MÁRCIO KAUAN MENDES DA SILVA (02/05/2026 = Sábado)
  { nome: "Marcio Kauan Mendes da Silva",         data: "2026-05-02", tipo: "SABADO",  folga1: "2026-05-08", folga2: null },

  // LORENA MARIA OLIVEIRA LEITE DA SILVA (08/03/2026 = Domingo; duas linhas mescladas)
  { nome: "Lorena Maria Oliveira Leite da Silva", data: "2026-03-08", tipo: "DOMINGO", folga1: "2026-05-08", folga2: "2026-05-15" },

  // VITÓRIA LIMA AMORIM (17/05/2026 = Domingo) — corrigido: antes estava com data errada 03/05
  { nome: "Vitória Lima Amorim",                  data: "2026-05-17", tipo: "DOMINGO", folga1: "2026-05-22", folga2: null },

  // ── MAIO 2026 (escala oficial) ────────────────────────────────────────────

  // FRANCISCO BRUNO DE OLIVEIRA SILVA (01/05/2026 = Sexta = Dia do Trabalho = FERIADO)
  { nome: "Francisco Bruno de Oliveira Silva",    data: "2026-05-01", tipo: "FERIADO", folga1: null, folga2: null },

  // ANA CAROLINA DE SÁ ALVES (03/05/2026 = Domingo)
  { nome: "Ana Carolina de Sá Alves",             data: "2026-05-03", tipo: "DOMINGO", folga1: null, folga2: null },

  // AUGUSTO CESAR MIRANDA LIMA FILHO (09/05/2026 = Sábado)
  { nome: "Augusto Cesar Miranda Lima Filho",     data: "2026-05-09", tipo: "SABADO",  folga1: null, folga2: null },

  // ANNE KAROLINE OLIVEIRA LOPES (10/05/2026 = Domingo)
  { nome: "Anne Karoline Oliveira Lopes",         data: "2026-05-10", tipo: "DOMINGO", folga1: null, folga2: null },

  // JOQUEBEDE GABRIELA DO NASCIMENTO BRAUNA FERREIRA (23/05/2026 = Sábado)
  { nome: "Joquebede Gabriela do Nascimento Brauna Ferreira", data: "2026-05-23", tipo: "SABADO", folga1: null, folga2: null },

  // FRANCISCA CRISTIANA GOMES RODRIGUES (24/05/2026 = Domingo)
  { nome: "Francisca Cristiana Gomes Rodrigues", data: "2026-05-24", tipo: "DOMINGO", folga1: null, folga2: null },

  // THAIS ANGELIM RODRIGUES (30/05/2026 = Sábado)
  { nome: "Thais Angelim Rodrigues",              data: "2026-05-30", tipo: "SABADO",  folga1: null, folga2: null },

  // FRANCISCO BRUNO BATISTA PORTO (31/05/2026 = Domingo) — SKIP: não cadastrado no sistema
];

async function main() {
  await client.connect();
  console.log("Conectado ao banco.");

  const { rows: allColabs } = await client.query(`SELECT id, nome FROM "Colaborador"`);
  const byNorm = new Map(allColabs.map(c => [normalize(c.nome), c]));

  function find(rawName) {
    const norm = normalize(rawName);
    if (skipSet.has(norm)) return null;
    if (byNorm.has(norm)) return byNorm.get(norm);
    const aliased = aliases[norm];
    if (aliased && byNorm.has(aliased)) return byNorm.get(aliased);
    const words = norm.split(" ");
    const prefix = words.slice(0, Math.min(words.length, 3)).join(" ");
    for (const [key, val] of byNorm) {
      if (key.startsWith(prefix)) return val;
    }
    return null;
  }

  let inserted = 0, skipped = 0, existing = 0;

  for (const entry of plantoes) {
    const colab = find(entry.nome);
    if (!colab) {
      console.log(`  SKIP: ${entry.nome}`);
      skipped++;
      continue;
    }

    const res = await client.query(
      `INSERT INTO "Plantao" ("colaboradorId", "data", "tipo", "folga1", "folga2", "createdAt")
       VALUES ($1, $2::date, $3, $4::date, $5::date, NOW())
       ON CONFLICT ("colaboradorId", "data") DO NOTHING`,
      [colab.id, entry.data, entry.tipo, entry.folga1 || null, entry.folga2 || null]
    );

    if (res.rowCount > 0) {
      const f = [entry.folga1, entry.folga2].filter(Boolean).join(" + ") || "folga pendente";
      console.log(`  + ${colab.nome} | ${entry.data} (${entry.tipo}) → ${f}`);
      inserted++;
    } else {
      console.log(`  = ${colab.nome} | ${entry.data} (já existe)`);
      existing++;
    }
  }

  await client.end();
  console.log(`\nConcluído! ${inserted} inseridos, ${existing} já existiam, ${skipped} ignorados.`);
}

main().catch(e => { console.error(e); process.exit(1); });

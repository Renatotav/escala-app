// Popula a tabela Plantao com o histórico inicial baseado nos saldos de folgas.
// Todos registrados como SABADO pois não temos o tipo exato de cada plantão histórico.
// Plantões futuros devem ser registrados pelo sistema com o tipo correto.
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
  "tatiana silva":                      "tatiana da silva santos",
  "vivian duarte":                      "vivian da silva duarte",
  "jose tarciso guimaes saunders neto": "jose tarciso guimaraes saunders neto",
  "maria julya mendes callado":         "maria julya lopes callado",
  "luciana maria rocha de sousa":       "luciana maria rocha de souza miranda",
};

// Sábados passados suficientes para cobrir até 10 plantões históricos
const saturdays = [
  "2026-05-23", "2026-05-16", "2026-05-09", "2026-05-02",
  "2026-04-25", "2026-04-18", "2026-04-11", "2026-04-04",
  "2026-03-28", "2026-03-21",
];

// Saldo de plantões = mesmos valores do seed-folgas
// (1 folga sábado = 1 plantão; neste seed todos tratados como SABADO)
const plantoes = [
  { nome: "AMANDA BRAGA BARROS",                     count: 2 },
  { nome: "ANA KARINY OLIVEIRA DA SILVA",             count: 3 },
  { nome: "ANA CAROLINA DE SÁ ALVES",                count: 3 },
  { nome: "ANE KAROLINE LIMA",                        count: 2 },
  { nome: "ANNE KAROLINE OLIVEIRA LOPES",             count: 4 },
  { nome: "ANTONIO GUILHERME SILVA",                  count: 1 },
  { nome: "AUGUSTO CÉSAR",                            count: 2 },
  { nome: "BRENA FERREIRA BASTOS",                    count: 1 },
  { nome: "BRUNO DE SOUSA SILVA",                     count: 10 },
  { nome: "CAMILA LINS ALBUQUERQUE",                  count: 4 },
  { nome: "FABRÍCIO LIMA DA SILVA",                   count: 3 },
  { nome: "FRANCISCA CRISTIANA GOMES RODRIGUES",      count: 1 },
  { nome: "FRANCISCO BRUNO DE OLIVEIRA SILVA",        count: 2 },
  { nome: "FRANCISCO JOABE",                          count: 1 },
  { nome: "GABRIEL BRAGA SIEBRA",                     count: 2 },
  { nome: "GEORGIA NOGUEIRA DA SILVA FARIAS",         count: 3 },
  { nome: "JÉSSICA SOARES",                           count: 3 },
  { nome: "JOQUEBEDE GABRIELA DO NASCIMENTO BRAUNA",  count: 2 },
  { nome: "JOSÉ ARAÚJO DA SILVA JUNIOR",              count: 1 },
  { nome: "JOSÉ TARCISO GUIMÃES SAUNDERS NETO",       count: 3 },
  { nome: "LUIS FERNANDO EDUARDO SALES",              count: 1 },
  { nome: "LUCIANA MARIA ROCHA DE SOUSA",             count: 1 },
  { nome: "MARIA JULYA MENDES CALLADO",               count: 2 },
  { nome: "RAMON VITOR MENDES CIRCUNDE",              count: 2 },
  { nome: "RAPHAEL BRUNO OLIVEIRA DE MELO",           count: 2 },
  { nome: "RENATO TAVARES VENANCIO",                  count: 3 },
  { nome: "ROGER ARAUJO MONTEIRO",                    count: 2 },
  { nome: "TACILIA DE SOUSA SILVA",                   count: 4 },
  { nome: "TATIANA SILVA",                            count: 3 },
  { nome: "THAIS ANGELIM RODRIGUES",                  count: 2 },
  { nome: "VITÓRIA LIMA AMORIM",                      count: 3 },
];

async function main() {
  await client.connect();
  console.log("Conectado ao banco.");

  const { rows: allColabs } = await client.query(`SELECT id, nome FROM "Colaborador"`);
  const byNorm = new Map(allColabs.map(c => [normalize(c.nome), c]));

  function find(rawName) {
    const norm = normalize(rawName);
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

  let inserted = 0, skipped = 0;

  for (const entry of plantoes) {
    if (entry.count === 0) continue;
    const colab = find(entry.nome);
    if (!colab) {
      console.log(`  SKIP: ${entry.nome} (não encontrado)`);
      skipped++;
      continue;
    }
    const dates = saturdays.slice(0, entry.count);
    for (const data of dates) {
      await client.query(
        `INSERT INTO "Plantao" ("colaboradorId", "data", "tipo", "createdAt")
         VALUES ($1, $2::date, 'SABADO', NOW())
         ON CONFLICT ("colaboradorId", "data") DO NOTHING`,
        [colab.id, data]
      );
    }
    console.log(`  + ${colab.nome}: ${entry.count} plantão(ões)`);
    inserted++;
  }

  await client.end();
  console.log(`\nConcluído! ${inserted} colaboradores com plantões históricos, ${skipped} ignorados.`);
}

main().catch(e => { console.error(e); process.exit(1); });

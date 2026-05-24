const { Client } = require("pg");

const client = new Client({ connectionString: process.env.DATABASE_URL });

function normalize(name) {
  return name.trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/\s+/g, " ");
}

// Nomes que precisam de alias (grafia diferente do cadastro)
const aliases = {
  "ana carolina sa": "ana carolina de sa alves",
  "pedro fernandes lopes farias": "pedro fernando lopes farias",
  "rafaella de paiva sousa": "raffaela de paiva sousa",
};

// Colaboradores históricos não cadastrados (ex-funcionários)
const skipSet = new Set([
  "nata caminha garcia",
  "erasmo correia da costa",
]);

const escalas = [
  {
    semana: "2026-05-25",
    colaboradores: [
      "AMANDA BRAGA BARROS DE SOUSA",
      "ANE KAROLINE LIMA DA SILVA",
      "FABRÍCIO LIMA DA SILVA",
      "FRANCISCO JOABE PEREIRA DE LIMA",
      "LUCIANA MARIA ROCHA DE SOUZA MIRANDA",
      "JOQUEBEDE GABRIELA DO NASCIMENTO BRAUNA FERREIRA",
      "VITÓRIA LIMA AMORIM",
      "GEORGIA NOGUEIRA DA SILVA FARIAS",
      "ROGER ARAUJO MONTEIRO",
    ],
  },
  {
    semana: "2026-05-18",
    colaboradores: [
      "AMANDA BRAGA BARROS DE SOUSA",
      "ANA CAROLINA SÁ",
      "CAMILA LINS ALBUQUERQUE",
      "FABRÍCIO LIMA DA SILVA",
      "FRANCISCO BRUNO DE OLIVEIRA SILVA",
      "MARIA JULYA LOPES CALLADO",
      "JOQUEBEDE GABRIELA DO NASCIMENTO BRAUNA FERREIRA",
      "RAFAELLA DE PAIVA SOUSA",
      "RAPHAEL BRUNO OLIVEIRA DE MELO",
    ],
  },
  {
    semana: "2026-05-11",
    colaboradores: [
      "ANTONIO GUILHERME SILVA DE PAULA",
      "ANNE KAROLINE OLIVEIRA LOPES",
      "AMANDA BRAGA BARROS DE SOUSA",
      "ANA KARINY OLIVEIRA DA SILVA",
      "AUGUSTO CESAR MIRANDA LIMA FILHO",
      "FABRICIO LIMA DA SILVA",
      "GABRIEL BRAGA SIEBRA",
      "JÉSSICA SOARES DE MENEZES PEREIRA",
      "JOQUEBEDE GABRIELA DO NASCIMENTO BRAUNA FERREIRA",
      "THAIS ANGELIM RODRIGUES",
    ],
  },
  {
    semana: "2026-05-04",
    colaboradores: [
      "VIVIAN DA SILVA DUARTE",
      "FABRICIO LIMA DA SILVA",
      "JOQUEBEDE GABRIELA DO NASCIMENTO BRAUNA FERREIRA",
      "FRANCISCA CRISTIANA GOMES RODRIGUES",
      "MARIANA CUNHA DO CARMO",
      "RAMON VITOR MENDES CIRCUNDE",
      "TATIANA DA SILVA SANTOS",
    ],
  },
  {
    semana: "2026-04-27",
    colaboradores: [
      "AUGUSTO CESAR MIRANDA LIMA FILHO",
      "FABRÍCIO LIMA DA SILVA",
      "JOQUEBEDE GABRIELA DO NASCIMENTO BRAUNA FERREIRA",
      "LUCIANA MARIA ROCHA DE SOUZA MIRANDA",
      "MARIA IOLANDA CRISPIM GONÇALVES",
      "TACILIA DE SOUSA SILVA",
    ],
  },
  {
    semana: "2026-04-20",
    colaboradores: [
      "ANE KAROLINE LIMA DA SILVA",
      "CAMILA LINS ALBUQUERQUE",
      "FABRÍCIO LIMA DA SILVA",
      "FRANCISCO BRUNO BATISTA PORTO",
      "JOQUEBEDE GABRIELA DO NASCIMENTO BRAUNA FERREIRA",
      "JOSÉ ARAÚJO DA SILVA JUNIOR",
      "ROGER ARAUJO MONTEIRO",
    ],
  },
  {
    semana: "2026-04-13",
    colaboradores: [
      "ANA KARINY OLIVEIRA DA SILVA",
      "FABRÍCIO LIMA DA SILVA",
      "JOQUEBEDE GABRIELA DO NASCIMENTO BRAUNA FERREIRA",
      "LORENA MARIA OLIVEIRA LEITE DA SILVA",
      "PEDRO FERNANDES LOPES FARIAS",
      "RAPHAEL BRUNO OLIVEIRA DE MELO",
    ],
  },
  {
    semana: "2026-04-06",
    colaboradores: [
      "VIVIAN DA SILVA DUARTE",
      "ANTÔNIO GUILHERME SILVA DE PAULA",
      "THAIS ANGELIM RODRIGUES",
      "GEORGIA NOGUEIRA DA SILVA FARIAS",
      "MARIA JULYA LOPES CALLADO",
      "JÉSSICA SOARES DE MENEZES PEREIRA",
      "FRANCISCO JOABE PEREIRA DE LIMA",
    ],
  },
  {
    semana: "2026-03-09",
    colaboradores: [
      "JOQUEBEDE GABRIELA DO NASCIMENTO BRAUNA FERREIRA",
      "NATÃ CAMINHA GARCIA",
      "MARIA JULYA LOPES CALLADO",
      "RAPHAEL BRUNO OLIVEIRA DE MELO",
      "THAIS ANGELIM RODRIGUES",
      "VIVIAN DA SILVA DUARTE",
    ],
  },
  {
    semana: "2026-03-02",
    colaboradores: [
      "ANTONIO GUILHERME SILVA",
      "GEORGIA NOGUEIRA DA SILVA FARIAS",
      "JÉSSICA SOARES DE MENEZES",
      "LORENA MARIA OLIVEIRA LEITE DA SILVA",
      "LUCIANA MARIA ROCHA DE SOUZA MIRANDA",
      "MARIANA CUNHA DO CARMO",
    ],
  },
  {
    semana: "2026-02-23",
    colaboradores: [
      "TACILIA DE SOUSA SILVA",
      "PEDRO FERNANDES LOPES FARIAS",
      "RAMON VITOR MENDES CIRCUNDE",
      "ANA KARINY OLIVEIRA DA SILVA",
      "ANE KAROLINE LIMA DA SILVA",
      "JOSÉ ARAÚJO DA SILVA JUNIOR",
    ],
  },
  {
    semana: "2026-02-18",
    colaboradores: [
      "AUGUSTO CESAR MIRANDA LIMA FILHO",
      "CAMILA LINS ALBUQUERQUE",
      "FRANCISCO BRUNO BATISTA PORTO",
      "JOQUEBEDE GABRIELA DO NASCIMENTO BRAUNA FERREIRA",
      "RAFFAELA DE PAIVA SOUSA",
      "ROGER ARAÚJO MONTEIRO",
    ],
  },
  {
    semana: "2026-02-09",
    colaboradores: [
      "LUCIANA MARIA ROCHA DE SOUZA MIRANDA",
      "MARIA IOLANDA CRISPIM GONÇALVES",
      "FRANCISCA CRISTIANA",
      "FABRICIO LIMA DA SILVA",
      "TATIANA DA SILVA SANTOS",
      "GABRIEL BRAGA SIEBRA",
    ],
  },
  {
    semana: "2026-02-02",
    colaboradores: [
      "VIVIAN DA SILVA DUARTE",
      "RAPHAEL BRUNO OLIVEIRA DE MELO",
      "JÉSSICA SOARES DE MENEZES",
      "FRANCISCO BRUNO DE OLIVEIRA SILVA",
      "ANTONIO GUILHERME SILVA",
      "FRANCISCO JOABE PEREIRA DE LIMA",
    ],
  },
  {
    semana: "2026-01-26",
    colaboradores: [
      "ANE KAROLINE LIMA DA SILVA",
      "ANA KARINY OLIVEIRA DA SILVA",
      "ERASMO CORREIA DA COSTA",
      "NATÃ CAMINHA GARCIA",
      "MARIA JULYA LOPES CALLADO",
    ],
  },
  {
    semana: "2026-01-12",
    colaboradores: [
      "ANE KAROLINE LIMA DA SILVA",
      "GEORGIA NOGUEIRA DA SILVA FARIAS",
      "JOSÉ ARAÚJO DA SILVA JUNIOR",
      "LUCIANA MARIA ROCHA DE SOUSA",
      "ROGER ARAÚJO MONTEIRO",
    ],
  },
  {
    semana: "2026-01-07",
    colaboradores: [
      "VIVIAN DA SILVA DUARTE",
      "AUGUSTO CÉSAR MIRANDA LIMA FILHO",
      "LORENA MARIA OLIVEIRA LEITE DA SILVA",
      "Raffaela de Paiva Sousa",
      "FRANCISCA CRISTIANA GOMES RODRIGUES",
      "MARIA IOLANDA CRISPIM GONÇALVES",
    ],
  },
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

    // Prefix match (first 3 words)
    const prefix = norm.split(" ").slice(0, 3).join(" ");
    for (const [key, val] of byNorm) {
      if (key.startsWith(prefix)) return val;
    }

    return null;
  }

  let inserted = 0, skipped = 0;

  for (const escala of escalas) {
    console.log(`\nSemana ${escala.semana}:`);
    const semana = new Date(escala.semana + "T12:00:00Z");

    for (const rawName of escala.colaboradores) {
      const colab = find(rawName);
      if (!colab) {
        console.log(`  SKIP: ${rawName}`);
        skipped++;
        continue;
      }
      const res = await client.query(
        `INSERT INTO "EscalaSemana" ("colaboradorId", "semana", "tipo", "createdAt")
         VALUES ($1, $2, 'REMOTO', NOW())
         ON CONFLICT ("colaboradorId", "semana") DO NOTHING`,
        [colab.id, semana]
      );
      if (res.rowCount > 0) {
        console.log(`  + ${colab.nome}`);
        inserted++;
      } else {
        console.log(`  = ${colab.nome} (já existe)`);
      }
    }
  }

  await client.end();
  console.log(`\nConcluído! ${inserted} inseridos, ${skipped} ignorados.`);
}

main().catch(e => { console.error(e); process.exit(1); });

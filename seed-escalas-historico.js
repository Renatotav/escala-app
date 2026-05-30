// seed-escalas-historico.js
// Seeds escala real (PRESENCIAL + REMOTO) para abr/mai 2026
// ON CONFLICT DO UPDATE corrige registros antigos incorretos
const { Client } = require("pg");

const client = new Client({ connectionString: process.env.DATABASE_URL });

function normalize(name) {
  return name.trim().toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/\s+/g, " ");
}

const aliases = {
  "ana carolina sa":                      "ana carolina de sa alves",
  "ana carolina sa alves":                "ana carolina de sa alves",
  "rafaella de paiva sousa":              "raffaela de paiva sousa",
  "jose tarciso guimares saunders neto":  "jose tarciso guimaraes saunders neto",
  "pedro fernandes lopes farias":         "pedro fernando lopes farias",
  "marcio kauan mendes da silva":         "marcio kauan mendes da silva",
};

// ── 6 semanas ──────────────────────────────────────────────────────────────
const semanas = [
  {
    semana: "2026-04-20",
    entries: [
      // PRESENCIAL (Fórum + TJ)
      { nome: "Ana Kariny Oliveira da Silva",                          tipo: "PRESENCIAL" },
      { nome: "Ana Carolina Sá",                                       tipo: "PRESENCIAL" },
      { nome: "Antonio Guilherme Silva de Paula",                      tipo: "PRESENCIAL" },
      { nome: "Augusto Cesar Miranda Lima Filho",                      tipo: "PRESENCIAL" },
      { nome: "Francisca Cristiana Gomes Rodrigues",                   tipo: "PRESENCIAL" },
      { nome: "Francisco Bruno de Oliveira Silva",                     tipo: "PRESENCIAL" },
      { nome: "Francisco Joabe Pereira de Lima",                       tipo: "PRESENCIAL" },
      { nome: "Gabriel Braga Siebra",                                  tipo: "PRESENCIAL" },
      { nome: "Georgia Nogueira da Silva Farias",                      tipo: "PRESENCIAL" },
      { nome: "Jéssica Soares de Menezes Pereira",                    tipo: "PRESENCIAL" },
      { nome: "José Tarciso Guimares Saunders Neto",                  tipo: "PRESENCIAL" },
      { nome: "Lorena Maria Oliveira Leite da Silva",                  tipo: "PRESENCIAL" },
      { nome: "Luciana Maria Rocha de Souza Miranda",                  tipo: "PRESENCIAL" },
      { nome: "Maria Iolanda Crispim Gonçalves",                       tipo: "PRESENCIAL" },
      { nome: "Maria Julya Lopes Callado",                             tipo: "PRESENCIAL" },
      { nome: "Mariana Cunha do Carmo",                                tipo: "PRESENCIAL" },
      { nome: "Marcio Kauan Mendes da Silva",                          tipo: "PRESENCIAL" },
      { nome: "Pedro Fernando Lopes Farias",                           tipo: "PRESENCIAL" },
      { nome: "Raffaela de Paiva Sousa",                               tipo: "PRESENCIAL" },
      { nome: "Raphael Bruno Oliveira de Melo",                        tipo: "PRESENCIAL" },
      { nome: "Ramon Vitor Mendes Circunde",                           tipo: "PRESENCIAL" },
      { nome: "Tacilia de Sousa Silva",                                tipo: "PRESENCIAL" },
      { nome: "Tatiana da Silva Santos",                               tipo: "PRESENCIAL" },
      { nome: "Thais Angelim Rodrigues",                               tipo: "PRESENCIAL" },
      { nome: "Vivian da Silva Duarte",                                tipo: "PRESENCIAL" },
      { nome: "Amanda Braga Barros de Sousa",                          tipo: "PRESENCIAL" }, // TJ
      { nome: "Anne Karoline Oliveira Lopes",                          tipo: "PRESENCIAL" }, // TJ
      { nome: "Vitória Lima Amorim",                                   tipo: "PRESENCIAL" }, // TJ
      { nome: "Anderson de Oliveira Pereira",                          tipo: "PRESENCIAL" }, // TJ (se cadastrado)
      { nome: "Eliana Pinheiro Almeida",                               tipo: "PRESENCIAL" }, // TJ (se cadastrado)
      // REMOTO
      { nome: "Ane Karoline Lima da Silva",                            tipo: "REMOTO" },
      { nome: "Camila Lins Albuquerque",                               tipo: "REMOTO" },
      { nome: "Fabricio Lima da Silva",                                tipo: "REMOTO" },
      { nome: "Francisco Bruno Batista Porto",                         tipo: "REMOTO" },
      { nome: "Joquebede Gabriela do Nascimento Brauna Ferreira",      tipo: "REMOTO" },
      { nome: "José Araújo da Silva Junior",                           tipo: "REMOTO" },
      { nome: "Roger Araujo Monteiro",                                 tipo: "REMOTO" },
      { nome: "Francisca Paula Araújo Lima",                           tipo: "PRESENCIAL" }, // Fórum (se cadastrado)
    ],
  },
  {
    semana: "2026-04-27",
    entries: [
      // PRESENCIAL (Fórum)
      { nome: "Ana Kariny Oliveira da Silva",                          tipo: "PRESENCIAL" },
      { nome: "Ane Karoline Lima da Silva",                            tipo: "PRESENCIAL" },
      { nome: "Antonio Guilherme Silva de Paula",                      tipo: "PRESENCIAL" },
      { nome: "Augusto Cesar Miranda Lima Filho",                      tipo: "PRESENCIAL" },
      { nome: "Camila Lins Albuquerque",                               tipo: "PRESENCIAL" },
      { nome: "Francisca Cristiana Gomes Rodrigues",                   tipo: "PRESENCIAL" },
      { nome: "Francisco Bruno Batista Porto",                         tipo: "PRESENCIAL" },
      { nome: "Francisco Bruno de Oliveira Silva",                     tipo: "PRESENCIAL" },
      { nome: "Francisco Joabe Pereira de Lima",                       tipo: "PRESENCIAL" },
      { nome: "Georgia Nogueira da Silva Farias",                      tipo: "PRESENCIAL" },
      { nome: "Jéssica Soares de Menezes Pereira",                    tipo: "PRESENCIAL" },
      { nome: "José Araújo da Silva Junior",                           tipo: "PRESENCIAL" },
      { nome: "José Tarciso Guimares Saunders Neto",                  tipo: "PRESENCIAL" },
      { nome: "Lorena Maria Oliveira Leite da Silva",                  tipo: "PRESENCIAL" },
      { nome: "Marcio Kauan Mendes da Silva",                          tipo: "PRESENCIAL" },
      { nome: "Maria Julya Lopes Callado",                             tipo: "PRESENCIAL" },
      { nome: "Mariana Cunha do Carmo",                                tipo: "PRESENCIAL" },
      { nome: "Pedro Fernando Lopes Farias",                           tipo: "PRESENCIAL" },
      { nome: "Raffaela de Paiva Sousa",                               tipo: "PRESENCIAL" },
      { nome: "Ramon Vitor Mendes Circunde",                           tipo: "PRESENCIAL" },
      { nome: "Raphael Bruno Oliveira de Melo",                        tipo: "PRESENCIAL" },
      { nome: "Roger Araujo Monteiro",                                 tipo: "PRESENCIAL" },
      { nome: "Tatiana da Silva Santos",                               tipo: "PRESENCIAL" },
      { nome: "Thais Angelim Rodrigues",                               tipo: "PRESENCIAL" },
      { nome: "Vitória Lima Amorim",                                   tipo: "PRESENCIAL" },
      { nome: "Vivian da Silva Duarte",                                tipo: "PRESENCIAL" },
      { nome: "Francisca Paula Araújo Lima",                           tipo: "PRESENCIAL" }, // se cadastrado
      { nome: "Anderson de Oliveira Pereira",                          tipo: "PRESENCIAL" }, // se cadastrado
      // PRESENCIAL TJ
      { nome: "Amanda Braga Barros de Sousa",                          tipo: "PRESENCIAL" },
      { nome: "Anne Karoline Oliveira Lopes",                          tipo: "PRESENCIAL" },
      { nome: "Ana Carolina Sá",                                       tipo: "PRESENCIAL" },
      { nome: "Eliana Pinheiro Almeida",                               tipo: "PRESENCIAL" }, // se cadastrado
      // REMOTO
      { nome: "Fabricio Lima da Silva",                                tipo: "REMOTO" },
      { nome: "Gabriel Braga Siebra",                                  tipo: "REMOTO" },
      { nome: "Joquebede Gabriela do Nascimento Brauna Ferreira",      tipo: "REMOTO" },
      { nome: "Luciana Maria Rocha de Souza Miranda",                  tipo: "REMOTO" },
      { nome: "Maria Iolanda Crispim Gonçalves",                       tipo: "REMOTO" },
      { nome: "Tacilia de Sousa Silva",                                tipo: "REMOTO" },
    ],
  },
  {
    semana: "2026-05-04",
    entries: [
      // PRESENCIAL Fórum
      { nome: "Amanda Braga Barros de Sousa",                          tipo: "PRESENCIAL" },
      { nome: "Ana Kariny Oliveira da Silva",                          tipo: "PRESENCIAL" },
      { nome: "Ane Karoline Lima da Silva",                            tipo: "PRESENCIAL" },
      { nome: "Antonio Guilherme Silva de Paula",                      tipo: "PRESENCIAL" },
      { nome: "Augusto Cesar Miranda Lima Filho",                      tipo: "PRESENCIAL" },
      { nome: "Camila Lins Albuquerque",                               tipo: "PRESENCIAL" },
      { nome: "Francisco Bruno Batista Porto",                         tipo: "PRESENCIAL" },
      { nome: "Francisco Bruno de Oliveira Silva",                     tipo: "PRESENCIAL" },
      { nome: "Francisco Joabe Pereira de Lima",                       tipo: "PRESENCIAL" },
      { nome: "Gabriel Braga Siebra",                                  tipo: "PRESENCIAL" },
      { nome: "Georgia Nogueira da Silva Farias",                      tipo: "PRESENCIAL" },
      { nome: "Jéssica Soares de Menezes Pereira",                    tipo: "PRESENCIAL" },
      { nome: "José Araújo da Silva Junior",                           tipo: "PRESENCIAL" },
      { nome: "José Tarciso Guimares Saunders Neto",                  tipo: "PRESENCIAL" },
      { nome: "Lorena Maria Oliveira Leite da Silva",                  tipo: "PRESENCIAL" },
      { nome: "Luciana Maria Rocha de Souza Miranda",                  tipo: "PRESENCIAL" },
      { nome: "Marcio Kauan Mendes da Silva",                          tipo: "PRESENCIAL" },
      { nome: "Maria Iolanda Crispim Gonçalves",                       tipo: "PRESENCIAL" },
      { nome: "Maria Julya Lopes Callado",                             tipo: "PRESENCIAL" },
      { nome: "Pedro Fernando Lopes Farias",                           tipo: "PRESENCIAL" },
      { nome: "Raffaela de Paiva Sousa",                               tipo: "PRESENCIAL" },
      { nome: "Raphael Bruno Oliveira de Melo",                        tipo: "PRESENCIAL" },
      { nome: "Roger Araujo Monteiro",                                 tipo: "PRESENCIAL" },
      { nome: "Tacilia de Sousa Silva",                                tipo: "PRESENCIAL" },
      { nome: "Thais Angelim Rodrigues",                               tipo: "PRESENCIAL" },
      { nome: "Francisca Paula Araújo Lima",                           tipo: "PRESENCIAL" }, // se cadastrado
      { nome: "Eliana Pinheiro Almeida",                               tipo: "PRESENCIAL" }, // se cadastrado
      // PRESENCIAL TJ
      { nome: "Anderson de Oliveira Pereira",                          tipo: "PRESENCIAL" }, // se cadastrado
      { nome: "Anne Karoline Oliveira Lopes",                          tipo: "PRESENCIAL" },
      { nome: "Ana Carolina Sá",                                       tipo: "PRESENCIAL" },
      { nome: "Vitória Lima Amorim",                                   tipo: "PRESENCIAL" },
      // REMOTO
      { nome: "Fabricio Lima da Silva",                                tipo: "REMOTO" },
      { nome: "Francisca Cristiana Gomes Rodrigues",                   tipo: "REMOTO" },
      { nome: "Joquebede Gabriela do Nascimento Brauna Ferreira",      tipo: "REMOTO" },
      { nome: "Mariana Cunha do Carmo",                                tipo: "REMOTO" },
      { nome: "Ramon Vitor Mendes Circunde",                           tipo: "REMOTO" },
      { nome: "Tatiana da Silva Santos",                               tipo: "REMOTO" },
      { nome: "Vivian da Silva Duarte",                                tipo: "REMOTO" },
    ],
  },
  {
    semana: "2026-05-11",
    entries: [
      // PRESENCIAL Fórum
      { nome: "Ane Karoline Lima da Silva",                            tipo: "PRESENCIAL" },
      { nome: "Camila Lins Albuquerque",                               tipo: "PRESENCIAL" },
      { nome: "Francisca Cristiana Gomes Rodrigues",                   tipo: "PRESENCIAL" },
      { nome: "Francisco Bruno Batista Porto",                         tipo: "PRESENCIAL" },
      { nome: "Francisco Bruno de Oliveira Silva",                     tipo: "PRESENCIAL" },
      { nome: "Francisco Joabe Pereira de Lima",                       tipo: "PRESENCIAL" },
      { nome: "Georgia Nogueira da Silva Farias",                      tipo: "PRESENCIAL" },
      { nome: "José Araújo da Silva Junior",                           tipo: "PRESENCIAL" },
      { nome: "José Tarciso Guimares Saunders Neto",                  tipo: "PRESENCIAL" },
      { nome: "Lorena Maria Oliveira Leite da Silva",                  tipo: "PRESENCIAL" },
      { nome: "Luciana Maria Rocha de Souza Miranda",                  tipo: "PRESENCIAL" },
      { nome: "Marcio Kauan Mendes da Silva",                          tipo: "PRESENCIAL" },
      { nome: "Maria Iolanda Crispim Gonçalves",                       tipo: "PRESENCIAL" },
      { nome: "Maria Julya Lopes Callado",                             tipo: "PRESENCIAL" },
      { nome: "Mariana Cunha do Carmo",                                tipo: "PRESENCIAL" },
      { nome: "Pedro Fernando Lopes Farias",                           tipo: "PRESENCIAL" },
      { nome: "Raffaela de Paiva Sousa",                               tipo: "PRESENCIAL" },
      { nome: "Ramon Vitor Mendes Circunde",                           tipo: "PRESENCIAL" },
      { nome: "Raphael Bruno Oliveira de Melo",                        tipo: "PRESENCIAL" },
      { nome: "Roger Araujo Monteiro",                                 tipo: "PRESENCIAL" },
      { nome: "Tacilia de Sousa Silva",                                tipo: "PRESENCIAL" },
      { nome: "Tatiana da Silva Santos",                               tipo: "PRESENCIAL" },
      { nome: "Thais Angelim Rodrigues",                               tipo: "PRESENCIAL" },
      { nome: "Vivian da Silva Duarte",                                tipo: "PRESENCIAL" },
      { nome: "Francisca Paula Araújo Lima",                           tipo: "PRESENCIAL" }, // se cadastrado
      // PRESENCIAL TJ
      { nome: "Anderson de Oliveira Pereira",                          tipo: "PRESENCIAL" }, // se cadastrado
      { nome: "Ana Carolina Sá",                                       tipo: "PRESENCIAL" },
      { nome: "Eliana Pinheiro Almeida",                               tipo: "PRESENCIAL" }, // se cadastrado
      { nome: "Vitória Lima Amorim",                                   tipo: "PRESENCIAL" },
      // REMOTO
      { nome: "Amanda Braga Barros de Sousa",                          tipo: "REMOTO" },
      { nome: "Ana Kariny Oliveira da Silva",                          tipo: "REMOTO" },
      { nome: "Anne Karoline Oliveira Lopes",                          tipo: "REMOTO" },
      { nome: "Antonio Guilherme Silva de Paula",                      tipo: "REMOTO" },
      { nome: "Augusto Cesar Miranda Lima Filho",                      tipo: "REMOTO" },
      { nome: "Fabricio Lima da Silva",                                tipo: "REMOTO" },
      { nome: "Gabriel Braga Siebra",                                  tipo: "REMOTO" },
      { nome: "Jéssica Soares de Menezes Pereira",                    tipo: "REMOTO" },
      { nome: "Joquebede Gabriela do Nascimento Brauna Ferreira",      tipo: "REMOTO" },
    ],
  },
  {
    semana: "2026-05-18",
    entries: [
      // PRESENCIAL Fórum
      { nome: "Ana Kariny Oliveira da Silva",                          tipo: "PRESENCIAL" },
      { nome: "Ane Karoline Lima da Silva",                            tipo: "PRESENCIAL" },
      { nome: "Antonio Guilherme Silva de Paula",                      tipo: "PRESENCIAL" },
      { nome: "Augusto Cesar Miranda Lima Filho",                      tipo: "PRESENCIAL" },
      { nome: "Francisca Cristiana Gomes Rodrigues",                   tipo: "PRESENCIAL" },
      { nome: "Francisco Bruno Batista Porto",                         tipo: "PRESENCIAL" },
      { nome: "Francisco Joabe Pereira de Lima",                       tipo: "PRESENCIAL" },
      { nome: "Gabriel Braga Siebra",                                  tipo: "PRESENCIAL" },
      { nome: "Georgia Nogueira da Silva Farias",                      tipo: "PRESENCIAL" },
      { nome: "Jéssica Soares de Menezes Pereira",                    tipo: "PRESENCIAL" },
      { nome: "José Araújo da Silva Junior",                           tipo: "PRESENCIAL" },
      { nome: "José Tarciso Guimares Saunders Neto",                  tipo: "PRESENCIAL" },
      { nome: "Lorena Maria Oliveira Leite da Silva",                  tipo: "PRESENCIAL" },
      { nome: "Luciana Maria Rocha de Souza Miranda",                  tipo: "PRESENCIAL" },
      { nome: "Marcio Kauan Mendes da Silva",                          tipo: "PRESENCIAL" },
      { nome: "Maria Iolanda Crispim Gonçalves",                       tipo: "PRESENCIAL" },
      { nome: "Mariana Cunha do Carmo",                                tipo: "PRESENCIAL" },
      { nome: "Pedro Fernando Lopes Farias",                           tipo: "PRESENCIAL" },
      { nome: "Ramon Vitor Mendes Circunde",                           tipo: "PRESENCIAL" },
      { nome: "Roger Araujo Monteiro",                                 tipo: "PRESENCIAL" },
      { nome: "Tacilia de Sousa Silva",                                tipo: "PRESENCIAL" },
      { nome: "Tatiana da Silva Santos",                               tipo: "PRESENCIAL" },
      { nome: "Thais Angelim Rodrigues",                               tipo: "PRESENCIAL" },
      { nome: "Vivian da Silva Duarte",                                tipo: "PRESENCIAL" },
      { nome: "Francisca Paula Araújo Lima",                           tipo: "PRESENCIAL" }, // se cadastrado
      { nome: "Thiago da Silva Andrade",                               tipo: "PRESENCIAL" }, // se cadastrado
      // PRESENCIAL TJ
      { nome: "Anderson de Oliveira Pereira",                          tipo: "PRESENCIAL" }, // se cadastrado
      { nome: "Anne Karoline Oliveira Lopes",                          tipo: "PRESENCIAL" },
      { nome: "Eliana Pinheiro Almeida",                               tipo: "PRESENCIAL" }, // se cadastrado
      { nome: "Vitória Lima Amorim",                                   tipo: "PRESENCIAL" },
      // REMOTO
      { nome: "Amanda Braga Barros de Sousa",                          tipo: "REMOTO" },
      { nome: "Ana Carolina Sá",                                       tipo: "REMOTO" },
      { nome: "Camila Lins Albuquerque",                               tipo: "REMOTO" },
      { nome: "Fabricio Lima da Silva",                                tipo: "REMOTO" },
      { nome: "Francisco Bruno de Oliveira Silva",                     tipo: "REMOTO" },
      { nome: "Maria Julya Lopes Callado",                             tipo: "REMOTO" },
      { nome: "Joquebede Gabriela do Nascimento Brauna Ferreira",      tipo: "REMOTO" },
      { nome: "Raffaela de Paiva Sousa",                               tipo: "REMOTO" },
      { nome: "Raphael Bruno Oliveira de Melo",                        tipo: "REMOTO" },
    ],
  },
  {
    semana: "2026-05-25",
    entries: [
      // PRESENCIAL Fórum
      { nome: "Ana Kariny Oliveira da Silva",                          tipo: "PRESENCIAL" },
      { nome: "Antonio Guilherme Silva de Paula",                      tipo: "PRESENCIAL" },
      { nome: "Augusto Cesar Miranda Lima Filho",                      tipo: "PRESENCIAL" },
      { nome: "Camila Lins Albuquerque",                               tipo: "PRESENCIAL" },
      { nome: "Francisca Cristiana Gomes Rodrigues",                   tipo: "PRESENCIAL" },
      { nome: "Francisco Bruno Batista Porto",                         tipo: "PRESENCIAL" },
      { nome: "Francisco Bruno de Oliveira Silva",                     tipo: "PRESENCIAL" },
      { nome: "Gabriel Braga Siebra",                                  tipo: "PRESENCIAL" },
      { nome: "Jéssica Soares de Menezes Pereira",                    tipo: "PRESENCIAL" },
      { nome: "José Araújo da Silva Junior",                           tipo: "PRESENCIAL" },
      { nome: "José Tarciso Guimares Saunders Neto",                  tipo: "PRESENCIAL" },
      { nome: "Lorena Maria Oliveira Leite da Silva",                  tipo: "PRESENCIAL" },
      { nome: "Marcio Kauan Mendes da Silva",                          tipo: "PRESENCIAL" },
      { nome: "Maria Iolanda Crispim Gonçalves",                       tipo: "PRESENCIAL" },
      { nome: "Maria Julya Lopes Callado",                             tipo: "PRESENCIAL" },
      { nome: "Mariana Cunha do Carmo",                                tipo: "PRESENCIAL" },
      { nome: "Pedro Fernando Lopes Farias",                           tipo: "PRESENCIAL" },
      { nome: "Raffaela de Paiva Sousa",                               tipo: "PRESENCIAL" },
      { nome: "Ramon Vitor Mendes Circunde",                           tipo: "PRESENCIAL" },
      { nome: "Raphael Bruno Oliveira de Melo",                        tipo: "PRESENCIAL" },
      { nome: "Tacilia de Sousa Silva",                                tipo: "PRESENCIAL" },
      { nome: "Tatiana da Silva Santos",                               tipo: "PRESENCIAL" },
      { nome: "Thais Angelim Rodrigues",                               tipo: "PRESENCIAL" },
      { nome: "Vivian da Silva Duarte",                                tipo: "PRESENCIAL" },
      { nome: "Francisca Paula Araújo Lima",                           tipo: "PRESENCIAL" }, // se cadastrado
      // PRESENCIAL TJ
      { nome: "Anderson de Oliveira Pereira",                          tipo: "PRESENCIAL" }, // se cadastrado
      { nome: "Ana Carolina Sá",                                       tipo: "PRESENCIAL" },
      { nome: "Anne Karoline Oliveira Lopes",                          tipo: "PRESENCIAL" },
      { nome: "Eliana Pinheiro Almeida",                               tipo: "PRESENCIAL" }, // se cadastrado
      // REMOTO
      { nome: "Amanda Braga Barros de Sousa",                          tipo: "REMOTO" },
      { nome: "Ane Karoline Lima da Silva",                            tipo: "REMOTO" },
      { nome: "Fabricio Lima da Silva",                                tipo: "REMOTO" },
      { nome: "Francisco Joabe Pereira de Lima",                       tipo: "REMOTO" },
      { nome: "Georgia Nogueira da Silva Farias",                      tipo: "REMOTO" },
      { nome: "Joquebede Gabriela do Nascimento Brauna Ferreira",      tipo: "REMOTO" },
      { nome: "Luciana Maria Rocha de Souza Miranda",                  tipo: "REMOTO" },
      { nome: "Roger Araujo Monteiro",                                 tipo: "REMOTO" },
      { nome: "Vitória Lima Amorim",                                   tipo: "REMOTO" },
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

  let updated = 0, skipped = 0;

  for (const { semana, entries } of semanas) {
    console.log(`\nSemana ${semana}:`);
    for (const entry of entries) {
      const colab = find(entry.nome);
      if (!colab) {
        console.log(`  SKIP (não cadastrado): ${entry.nome}`);
        skipped++;
        continue;
      }
      await client.query(
        `INSERT INTO "EscalaSemana" ("colaboradorId", "semana", "tipo", "createdAt")
         VALUES ($1, $2::date, $3, NOW())
         ON CONFLICT ("colaboradorId", "semana") DO UPDATE SET "tipo" = EXCLUDED."tipo"`,
        [colab.id, semana, entry.tipo]
      );
      console.log(`  ${entry.tipo === "PRESENCIAL" ? "P" : "R"} ${colab.nome}`);
      updated++;
    }
  }

  await client.end();
  console.log(`\nConcluído! ${updated} registros inseridos/atualizados, ${skipped} ignorados.`);
}

main().catch(e => { console.error(e); process.exit(1); });

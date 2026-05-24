const { Client } = require("pg");

const client = new Client({ connectionString: process.env.DATABASE_URL });

const equipes = [
  "Cadastro",
  "Erro e falha 1G",
  "Erro e falha 2G",
  "Migração",
  "Triagem",
  "Balcão Virtual",
  "Supervisão",
  "Coordenação",
];

const colaboradores = {
  "Cadastro": [
    "Antonio Guilherme Silva de Paula",
    "Francisca Cristiana Gomes Rodrigues",
    "Jose Tarciso Guimarães Saunders Neto",
    "Raphael Bruno Oliveira de Melo",
    "Roger Araujo Monteiro",
    "Tacilia de Sousa Silva",
    "Tatiana da Silva Santos",
  ],
  "Erro e falha 1G": [
    "Augusto Cesar Miranda Lima Filho",
    "Fabricio Lima da Silva",
    "Francisca Paula Araujo Lima",
    "Francisco Bruno de Oliveira Silva",
    "Francisco Joabe Pereira de Lima",
    "Gabriel Braga Siebra",
    "Georgia Nogueira da Silva Farias",
    "Joquebede Gabriela do Nascimento Brauna Ferreira",
    "José Araújo da Silva Junior",
    "Marcio Kauan Mendes da Silva",
    "Maria Julya Lopes Callado",
    "Pedro Fernando Lopes Farias",
    "Ramon Vitor Mendes Circunde",
  ],
  "Erro e falha 2G": [
    "Ana Carolina de Sá Alves",
    "Amanda Braga Barros de Sousa",
    "Anderson de Oliveira Pereira",
    "Anne Karoline Oliveira Lopes",
    "Eliana Pinheiro Almeida",
    "Vitória Lima Amorim",
  ],
  "Migração": [
    "Ane Karoline Lima da Silva",
    "Mariana Cunha do Carmo",
    "Raffaela de Paiva Sousa",
    "Thais Angelim Rodrigues",
  ],
  "Triagem": [
    "Lorena Maria Oliveira Leite da Silva",
    "Maria Iolanda Crispim Gonçalves",
    "Francisco Bruno Batista Porto",
    "Jéssica Soares de Menezes Pereira",
  ],
  "Balcão Virtual": [
    "Ana Kariny Oliveira da Silva",
    "Camila Lins Albuquerque",
    "Luciana Maria Rocha de Souza Miranda",
    "Vivian da Silva Duarte",
  ],
  "Supervisão": [
    "Bruno de Sousa Silva",
    "Renato Tavares Venâncio",
  ],
  "Coordenação": [
    "Nathalia Roberto Gonçalves",
  ],
};

async function main() {
  await client.connect();
  console.log("Conectado ao banco.");

  for (const nome of equipes) {
    await client.query(
      `INSERT INTO "Equipe" ("nome", "thresholdAmarelo", "thresholdVerde", "createdAt", "updatedAt")
       VALUES ($1, 3, 4, NOW(), NOW()) ON CONFLICT ("nome") DO NOTHING`,
      [nome]
    );
    console.log(`Equipe: ${nome}`);
  }

  for (const [equipeNome, membros] of Object.entries(colaboradores)) {
    const { rows } = await client.query(`SELECT id FROM "Equipe" WHERE nome = $1`, [equipeNome]);
    const equipeId = rows[0]?.id;
    if (!equipeId) { console.log(`Equipe não encontrada: ${equipeNome}`); continue; }

    for (const nome of membros) {
      await client.query(
        `INSERT INTO "Colaborador" ("nome", "equipeId", "ativo", "createdAt", "updatedAt")
         VALUES ($1, $2, true, NOW(), NOW()) ON CONFLICT DO NOTHING`,
        [nome, equipeId]
      );
      console.log(`  + ${nome}`);
    }
  }

  await client.end();
  console.log("Seed concluído!");
}

main().catch(e => { console.error(e); process.exit(1); });

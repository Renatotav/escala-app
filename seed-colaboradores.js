// seed-colaboradores.js
// Insere colaboradores que ainda não existem no banco (compara por nome)
// Uso: node seed-colaboradores.js
const { Client } = require("pg");

const client = new Client({ connectionString: process.env.DATABASE_URL });

const EQUIPE_MAP = {
  "Erro/Falha 1G":  "Erro e falha 1G",
  "Erro/Falha 2G":  "Erro e falha 2G",
  "Balcão Virtual": "Balcão Virtual",
  "Migração":       "Migração",
  "Cadastro":       "Cadastro",
  "Triagem":        "Triagem",
  "Supervisão":     "Supervisão",
  "Coordenação":    "Coordenação",
};

const colaboradores = [
  { nome: "Amanda Braga Barros de Sousa",                    cargo: "Operador de Atendimento Especializado", equipe: "Erro/Falha 2G"  },
  { nome: "Ana Carolina Sá",                                 cargo: "Supervisor de Atendimento",             equipe: "Supervisão"     },
  { nome: "Ana Kariny Oliveira da Silva",                    cargo: "Operador de Atendimento Especializado", equipe: "Balcão Virtual" },
  { nome: "Ane Karoline Lima da Silva",                      cargo: "Operador de Atendimento Especializado", equipe: "Migração"       },
  { nome: "Anderson de Oliveira Pereira",                    cargo: "Operador de Atendimento Especializado", equipe: "Erro/Falha 2G"  },
  { nome: "Anne Karoline Oliveira Lopes",                    cargo: "Operador de Atendimento Especializado", equipe: "Erro/Falha 2G"  },
  { nome: "Antonio Guilherme Silva de Paula",                cargo: "Operador de Atendimento Especializado", equipe: "Cadastro"       },
  { nome: "Augusto Cesar Miranda Lima Filho",                cargo: "Operador de Atendimento Especializado", equipe: "Erro/Falha 1G"  },
  { nome: "Bruno de Sousa Silva",                            cargo: "Supervisor de Atendimento",             equipe: "Supervisão"     },
  { nome: "Camila Lins Albuquerque",                         cargo: "Operador de Atendimento Especializado", equipe: "Balcão Virtual" },
  { nome: "Eliana Pinheiro Almeida",                         cargo: "Operador de Atendimento Especializado", equipe: "Erro/Falha 2G"  },
  { nome: "Fabrício Lima da Silva",                          cargo: "Operador de Atendimento Especializado", equipe: "Erro/Falha 1G"  },
  { nome: "Francisca Cristiana Gomes Rodrigues",             cargo: "Operador de Atendimento Especializado", equipe: "Cadastro"       },
  { nome: "Francisca Paula Araújo Lima",                     cargo: "Operador de Atendimento Especializado", equipe: "Erro/Falha 1G"  },
  { nome: "Francisco Bruno de Oliveira Silva",               cargo: "Operador de Atendimento Especializado", equipe: "Erro/Falha 1G"  },
  { nome: "Francisco Bruno Batista Porto",                   cargo: "Operador de Atendimento Especializado", equipe: "Triagem"        },
  { nome: "Francisco Joabe Pereira de Lima",                 cargo: "Operador de Atendimento Especializado", equipe: "Erro/Falha 1G"  },
  { nome: "Gabriel Braga Siebra",                            cargo: "Operador de Atendimento Especializado", equipe: "Erro/Falha 1G"  },
  { nome: "Georgia Nogueira da Silva Farias",                cargo: "Operador de Atendimento Especializado", equipe: "Erro/Falha 1G"  },
  { nome: "Jéssica Soares de Menezes Pereira",               cargo: "Operador de Atendimento Especializado", equipe: "Triagem"        },
  { nome: "Joquebede Gabriela do Nascimento Brauna Ferreira",cargo: "Operador de Atendimento Especializado", equipe: "Erro/Falha 1G"  },
  { nome: "José Araújo da Silva Júnior",                     cargo: "Operador de Atendimento Especializado", equipe: "Erro/Falha 1G"  },
  { nome: "José Tarciso Guimães Saunders Neto",              cargo: "Operador de Atendimento Especializado", equipe: "Cadastro"       },
  { nome: "Lorena Maria Oliveira Leite da Silva",            cargo: "Operador de Atendimento Especializado", equipe: "Triagem"        },
  { nome: "Luciana Maria Rocha de Souza Miranda",            cargo: "Operador de Atendimento Especializado", equipe: "Balcão Virtual" },
  { nome: "Luís Fernando Eduardo Sales Felix",               cargo: "Operador de Atendimento Especializado", equipe: "Migração"       },
  { nome: "Maria Iolanda Crispim Gonçalves",                 cargo: "Operador de Atendimento Especializado", equipe: "Triagem"        },
  { nome: "Maria Julya Lopes Callado",                       cargo: "Operador de Atendimento Especializado", equipe: "Erro/Falha 1G"  },
  { nome: "Mariana Cunha do Carmo",                          cargo: "Operador de Atendimento Especializado", equipe: "Migração"       },
  { nome: "Márcio Kauan Mendes da Silva",                    cargo: "Operador de Atendimento Especializado", equipe: "Erro/Falha 1G"  },
  { nome: "Nathalia Roberto Gonçalves",                      cargo: "Coordenadora",                          equipe: "Coordenação"    },
  { nome: "Pedro Fernando Lopes Farias",                     cargo: "Operador de Atendimento Especializado", equipe: "Erro/Falha 1G"  },
  { nome: "Ramon Vitor Mendes Circunde",                     cargo: "Operador de Atendimento Especializado", equipe: "Erro/Falha 1G"  },
  { nome: "Raffaela de Paiva Sousa",                         cargo: "Operador de Atendimento Especializado", equipe: "Migração"       },
  { nome: "Raphael Bruno Oliveira de Melo",                  cargo: "Operador de Atendimento Especializado", equipe: "Cadastro"       },
  { nome: "Renato Tavares Venâncio",                         cargo: "Supervisor de Atendimento",             equipe: "Supervisão"     },
  { nome: "Roger Araujo Monteiro",                           cargo: "Operador de Atendimento Especializado", equipe: "Cadastro"       },
  { nome: "Tacilia de Sousa Silva",                          cargo: "Operador de Atendimento Especializado", equipe: "Cadastro"       },
  { nome: "Tatiana da Silva Santos",                         cargo: "Operador de Atendimento Especializado", equipe: "Cadastro"       },
  { nome: "Thais Angelim Rodrigues",                         cargo: "Operador de Atendimento Especializado", equipe: "Erro/Falha 2G"  },
  { nome: "Thiago da Silva Andrade",                         cargo: "Operador de Atendimento Especializado", equipe: "Cadastro"       },
  { nome: "Vitória Lima Amorim",                             cargo: "Operador de Atendimento Especializado", equipe: "Erro/Falha 2G"  },
  { nome: "Vivian da Silva Duarte",                          cargo: "Operador de Atendimento Especializado", equipe: "Balcão Virtual" },
];

async function main() {
  await client.connect();
  console.log("Conectado ao banco de dados.\n");

  // Buscar equipes
  const { rows: equipes } = await client.query(`SELECT id, nome FROM "Equipe"`);
  const equipeById = {};
  for (const eq of equipes) equipeById[eq.nome] = eq.id;

  // Buscar colaboradores existentes (comparação por nome em minúsculas)
  const { rows: existentes } = await client.query(`SELECT LOWER(TRIM(nome)) as nome_norm FROM "Colaborador"`);
  const nomesExistentes = new Set(existentes.map(c => c.nome_norm));

  let adicionados = 0;
  let pulados = 0;
  let erros = 0;

  for (const colab of colaboradores) {
    const nomeNorm = colab.nome.toLowerCase().trim();

    if (nomesExistentes.has(nomeNorm)) {
      console.log(`PULAR  (já existe): ${colab.nome}`);
      pulados++;
      continue;
    }

    const equipeNome = EQUIPE_MAP[colab.equipe];
    const equipeId = equipeById[equipeNome];

    if (!equipeId) {
      console.log(`ERRO   (equipe "${colab.equipe}" não encontrada): ${colab.nome}`);
      erros++;
      continue;
    }

    await client.query(
      `INSERT INTO "Colaborador" (nome, cargo, ativo, "equipeId", "createdAt", "updatedAt")
       VALUES ($1, $2, true, $3, NOW(), NOW())`,
      [colab.nome, colab.cargo, equipeId]
    );
    console.log(`ADD    : ${colab.nome} → ${equipeNome}`);
    adicionados++;
  }

  console.log(`\n✓ ${adicionados} adicionados | ${pulados} já existiam | ${erros} erros`);
  await client.end();
}

main().catch(e => {
  console.error("Erro fatal:", e.message);
  client.end();
  process.exit(1);
});

#!/bin/sh
set -e
echo "Running database migration..."

node -e "
const { Client } = require('pg');
const client = new Client({ connectionString: process.env.DATABASE_URL });

async function migrate() {
  await client.connect();

  // Enum value — must be outside a transaction
  try {
    await client.query(\"ALTER TYPE \\\"TipoFolga\\\" ADD VALUE IF NOT EXISTS 'PONTO_FACULTATIVO'\");
  } catch(e) { console.log('enum skip:', e.message); }

  // New columns on Colaborador
  const cols = [
    'ALTER TABLE \"Colaborador\" ADD COLUMN IF NOT EXISTS \"dataNascimento\" DATE',
    'ALTER TABLE \"Colaborador\" ADD COLUMN IF NOT EXISTS \"cpf\" TEXT',
    'ALTER TABLE \"Colaborador\" ADD COLUMN IF NOT EXISTS \"email\" TEXT',
    'ALTER TABLE \"Colaborador\" ADD COLUMN IF NOT EXISTS \"telefone\" TEXT',
    'ALTER TABLE \"Colaborador\" ADD COLUMN IF NOT EXISTS \"telefoneEmerg\" TEXT',
    'ALTER TABLE \"Colaborador\" ADD COLUMN IF NOT EXISTS \"nomeEmerg\" TEXT',
    'ALTER TABLE \"Colaborador\" ADD COLUMN IF NOT EXISTS \"endereco\" TEXT',
  ];
  for (const sql of cols) await client.query(sql);

  // Atestado table
  await client.query(\`CREATE TABLE IF NOT EXISTS \"Atestado\" (
    \"id\" SERIAL PRIMARY KEY,
    \"colaboradorId\" INTEGER NOT NULL,
    \"dataInicio\" DATE NOT NULL,
    \"dataFim\" DATE NOT NULL,
    \"cid\" TEXT,
    \"descricao\" TEXT,
    \"createdAt\" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT \"Atestado_colaboradorId_fkey\" FOREIGN KEY (\"colaboradorId\") REFERENCES \"Colaborador\"(\"id\") ON DELETE RESTRICT ON UPDATE CASCADE
  )\`);

  // Feedback table
  await client.query(\`CREATE TABLE IF NOT EXISTS \"Feedback\" (
    \"id\" SERIAL PRIMARY KEY,
    \"colaboradorId\" INTEGER NOT NULL,
    \"data\" DATE NOT NULL,
    \"descricao\" TEXT NOT NULL,
    \"assinatura\" TEXT,
    \"createdAt\" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT \"Feedback_colaboradorId_fkey\" FOREIGN KEY (\"colaboradorId\") REFERENCES \"Colaborador\"(\"id\") ON DELETE RESTRICT ON UPDATE CASCADE
  )\`);

  // Ocorrencia table
  await client.query(\`CREATE TABLE IF NOT EXISTS \"Ocorrencia\" (
    \"id\" SERIAL PRIMARY KEY,
    \"colaboradorId\" INTEGER NOT NULL,
    \"data\" DATE NOT NULL,
    \"tipo\" TEXT,
    \"descricao\" TEXT NOT NULL,
    \"assinatura\" TEXT,
    \"createdAt\" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT \"Ocorrencia_colaboradorId_fkey\" FOREIGN KEY (\"colaboradorId\") REFERENCES \"Colaborador\"(\"id\") ON DELETE RESTRICT ON UPDATE CASCADE
  )\`);

  // ControleTriagem table
  await client.query(\`CREATE TABLE IF NOT EXISTS \"ControleTriagem\" (
    \"id\" SERIAL PRIMARY KEY,
    \"colaboradorId\" INTEGER NOT NULL,
    \"motivo\" TEXT NOT NULL,
    \"dataInicio\" TIMESTAMP(3) NOT NULL,
    \"dataFim\" TIMESTAMP(3),
    \"observacao\" TEXT,
    \"atestadoId\" INTEGER,
    \"createdAt\" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT \"ControleTriagem_colaboradorId_fkey\" FOREIGN KEY (\"colaboradorId\") REFERENCES \"Colaborador\"(\"id\") ON DELETE RESTRICT ON UPDATE CASCADE
  )\`);
  // Upgrade DATE -> TIMESTAMP(3) if table was created with old schema
  try { await client.query('ALTER TABLE \"ControleTriagem\" ALTER COLUMN \"dataInicio\" TYPE TIMESTAMP(3) USING \"dataInicio\"::TIMESTAMP(3)'); } catch(e) {}
  try { await client.query('ALTER TABLE \"ControleTriagem\" ALTER COLUMN \"dataFim\" TYPE TIMESTAMP(3) USING \"dataFim\"::TIMESTAMP(3)'); } catch(e) {}
  // Add horaInicio / horaFim columns
  try { await client.query('ALTER TABLE \"ControleTriagem\" ADD COLUMN IF NOT EXISTS \"horaInicio\" TEXT'); } catch(e) {}
  try { await client.query('ALTER TABLE \"ControleTriagem\" ADD COLUMN IF NOT EXISTS \"horaFim\" TEXT'); } catch(e) {}
  // Add grupoListagem to Colaborador
  try { await client.query('ALTER TABLE \"Colaborador\" ADD COLUMN IF NOT EXISTS \"grupoListagem\" TEXT NOT NULL DEFAULT \'FORA\''); } catch(e) {}
  // Add ajusteSemanasPresencial to Colaborador
  try { await client.query('ALTER TABLE \"Colaborador\" ADD COLUMN IF NOT EXISTS \"ajusteSemanasPresencial\" INTEGER NOT NULL DEFAULT 0'); } catch(e) {}
  // Add semRemoto to Colaborador
  try { await client.query('ALTER TABLE \"Colaborador\" ADD COLUMN IF NOT EXISTS \"semRemoto\" BOOLEAN NOT NULL DEFAULT false'); } catch(e) {}
  // Add link de atendimento (token, contador e data de último acesso) ao Colaborador
  try { await client.query('ALTER TABLE \"Colaborador\" ADD COLUMN IF NOT EXISTS \"tokenAtendimento\" TEXT'); } catch(e) {}
  try { await client.query('ALTER TABLE \"Colaborador\" ADD COLUMN IF NOT EXISTS \"ultimoAcessoAtendimento\" TIMESTAMP(3)'); } catch(e) {}
  try { await client.query('ALTER TABLE \"Colaborador\" ADD COLUMN IF NOT EXISTS \"acessosAtendimento\" INTEGER NOT NULL DEFAULT 0'); } catch(e) {}
  try { await client.query('CREATE UNIQUE INDEX IF NOT EXISTS \"Colaborador_tokenAtendimento_key\" ON \"Colaborador\"(\"tokenAtendimento\")'); } catch(e) {}

  // Chamado table
  await client.query(\`CREATE TABLE IF NOT EXISTS \"Chamado\" (
    \"id\" SERIAL PRIMARY KEY,
    \"referencia\" TEXT NOT NULL DEFAULT '',
    \"alerta\" TEXT,
    \"nivelEscalacao\" INTEGER,
    \"estado\" TEXT,
    \"dataRegistro\" TIMESTAMP(3),
    \"nomeAfetado\" TEXT,
    \"nomeSecao\" TEXT,
    \"nomeItem\" TEXT,
    \"nomeCategoria\" TEXT,
    \"nomeDpsAtribuido\" TEXT,
    \"nomeUsuarioAtribuido\" TEXT,
    \"ultimaAcao\" TEXT,
    \"createdAt\" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
  )\`);

  // DeclaracaoMedica table
  await client.query(\`CREATE TABLE IF NOT EXISTS \"DeclaracaoMedica\" (
    \"id\" SERIAL PRIMARY KEY,
    \"colaboradorId\" INTEGER NOT NULL,
    \"data\" DATE NOT NULL,
    \"horaEntrada\" TEXT,
    \"horaSaida\" TEXT,
    \"especialidade\" TEXT,
    \"observacao\" TEXT,
    \"createdAt\" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT \"DeclaracaoMedica_colaboradorId_fkey\" FOREIGN KEY (\"colaboradorId\") REFERENCES \"Colaborador\"(\"id\") ON DELETE RESTRICT ON UPDATE CASCADE
  )\`);

  // ConfiguracaoSistema
  await client.query(\`CREATE TABLE IF NOT EXISTS \"ConfiguracaoSistema\" (
    \"chave\" TEXT PRIMARY KEY,
    \"valor\" TEXT NOT NULL,
    \"updatedAt\" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
  )\`);

  await client.end();
  console.log('Migration completed successfully.');
}

migrate().catch(async e => {
  console.error('Migration failed:', e.message);
  await client.end().catch(() => {});
  process.exit(1);
});
"

echo "Starting server..."
exec npx next start -p 3000

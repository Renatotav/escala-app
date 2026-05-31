#!/bin/sh
echo "Running database migration..."

node -e "
const { PrismaClient } = require('./src/generated/prisma');
const prisma = new PrismaClient();

async function migrate() {
  const q = (sql) => prisma.\$executeRawUnsafe(sql);

  // Enum value
  try { await q(\"ALTER TYPE \\\"TipoFolga\\\" ADD VALUE IF NOT EXISTS 'PONTO_FACULTATIVO'\"); } catch(e) { console.log('enum skip:', e.message); }

  // New columns on Colaborador
  await q('ALTER TABLE \"Colaborador\" ADD COLUMN IF NOT EXISTS \"dataNascimento\" DATE');
  await q('ALTER TABLE \"Colaborador\" ADD COLUMN IF NOT EXISTS \"cpf\" TEXT');
  await q('ALTER TABLE \"Colaborador\" ADD COLUMN IF NOT EXISTS \"email\" TEXT');
  await q('ALTER TABLE \"Colaborador\" ADD COLUMN IF NOT EXISTS \"telefone\" TEXT');
  await q('ALTER TABLE \"Colaborador\" ADD COLUMN IF NOT EXISTS \"telefoneEmerg\" TEXT');
  await q('ALTER TABLE \"Colaborador\" ADD COLUMN IF NOT EXISTS \"nomeEmerg\" TEXT');
  await q('ALTER TABLE \"Colaborador\" ADD COLUMN IF NOT EXISTS \"endereco\" TEXT');

  // Atestado table
  await q(\`CREATE TABLE IF NOT EXISTS \"Atestado\" (
    \"id\" SERIAL PRIMARY KEY,
    \"colaboradorId\" INTEGER NOT NULL,
    \"dataInicio\" DATE NOT NULL,
    \"dataFim\" DATE NOT NULL,
    \"cid\" TEXT,
    \"descricao\" TEXT,
    \"createdAt\" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT \"Atestado_colaboradorId_fkey\" FOREIGN KEY (\"colaboradorId\") REFERENCES \"Colaborador\"(\"id\") ON DELETE RESTRICT ON UPDATE CASCADE
  )\`);
  await q('ALTER TABLE \"Atestado\" ADD COLUMN IF NOT EXISTS \"cid\" TEXT');

  // Feedback table
  await q(\`CREATE TABLE IF NOT EXISTS \"Feedback\" (
    \"id\" SERIAL PRIMARY KEY,
    \"colaboradorId\" INTEGER NOT NULL,
    \"data\" DATE NOT NULL,
    \"descricao\" TEXT NOT NULL,
    \"assinatura\" TEXT,
    \"createdAt\" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT \"Feedback_colaboradorId_fkey\" FOREIGN KEY (\"colaboradorId\") REFERENCES \"Colaborador\"(\"id\") ON DELETE RESTRICT ON UPDATE CASCADE
  )\`);

  // Ocorrencia table
  await q(\`CREATE TABLE IF NOT EXISTS \"Ocorrencia\" (
    \"id\" SERIAL PRIMARY KEY,
    \"colaboradorId\" INTEGER NOT NULL,
    \"data\" DATE NOT NULL,
    \"tipo\" TEXT,
    \"descricao\" TEXT NOT NULL,
    \"assinatura\" TEXT,
    \"createdAt\" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT \"Ocorrencia_colaboradorId_fkey\" FOREIGN KEY (\"colaboradorId\") REFERENCES \"Colaborador\"(\"id\") ON DELETE RESTRICT ON UPDATE CASCADE
  )\`);

  await prisma.\$disconnect();
  console.log('Migration completed successfully.');
}

migrate().catch(e => { console.error('Migration error:', e.message); prisma.\$disconnect(); });
"

echo "Starting server..."
exec npx next start -p 3000

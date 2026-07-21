"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useSearchParams } from "next/navigation";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

// ─── Types ────────────────────────────────────────────────────────────────────

type Chamado = {
  id: number;
  referencia: string;
  dataRegistro: string | null;
  nomeDpsAtribuido: string | null;
  nomeSecao: string | null;
  nomeUsuarioAtribuido: string | null;
  ultimaAcao: string | null;
  alerta: string | null;
  nivelEscalacao: number | null;
  equipe: string | null;
};

type DadosChamados = {
  total: number;
  chamados: Chamado[];
  page: number;
  pageSize: number;
  totalPages: number;
  dataMin: string | null;
  dataMax: string | null;
  usuarios: string[];
  ultimaAcoes: string[];
  equipes: string[];
  usuarioEquipeMap: Record<string, string>;
  totalUrgentes: number;
};

type UsuarioStats = {
  nome: string;
  total: number;
};

type EquipeStats = {
  equipe: string;
  total: number;
  usuarios: UsuarioStats[];
};

type DadosStats = {
  total: number;
  porEquipe: EquipeStats[];
  dataMin: string | null;
  dataMax: string | null;
};

// ─── CSV parser ───────────────────────────────────────────────────────────────

function normalize(s: string) {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9 /]/g, "")
    .trim();
}

const HEADER_MAP: Record<string, string> = {
  "referencia": "referencia",
  "alerta": "alerta",
  "nivel de escalacao": "nivelEscalacao",
  "estado texto": "estado",
  "estado": "estado",
  "data hora de registro": "dataRegistro",
  "data/hora de registro": "dataRegistro",
  "nome afetado": "nomeAfetado",
  "nome da secao": "nomeSecao",
  "nome do item": "nomeItem",
  "nome de categoria": "nomeCategoria",
  "nome do dps atribuido": "nomeDpsAtribuido",
  "nome do usuario atribuido": "nomeUsuarioAtribuido",
  "nome da ultima acao realizada": "ultimaAcao",
};

// Parser de CSV completo — processa caracter a caracter para suportar
// quebras de linha dentro de campos entre aspas (RFC 4180).
function parseCsvFull(text: string, delim: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cur = "";
  let inQ = false;

  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (ch === '"') {
      if (inQ && text[i + 1] === '"') { cur += '"'; i++; }
      else inQ = !inQ;
    } else if (ch === delim && !inQ) {
      row.push(cur.trim()); cur = "";
    } else if (ch === '\r' && text[i + 1] === '\n' && !inQ) {
      i++;
      row.push(cur.trim()); rows.push(row); row = []; cur = "";
    } else if ((ch === '\n' || ch === '\r') && !inQ) {
      row.push(cur.trim()); rows.push(row); row = []; cur = "";
    } else {
      cur += ch;
    }
  }
  if (row.length > 0 || cur.trim()) {
    row.push(cur.trim());
    if (row.some(c => c !== "")) rows.push(row);
  }
  return rows;
}

function parseDateBR(s: string): string | null {
  const m = s.match(/^(\d{2})\/(\d{2})\/(\d{2,4})\s+(\d{2}):(\d{2})/);
  if (!m) return null;
  const year = m[3].length === 2 ? `20${m[3]}` : m[3];
  return `${year}-${m[2]}-${m[1]}T${m[4]}:${m[5]}:00`;
}

type ChamadoParsed = Record<string, string | number | null>;

function parsePaste(text: string): ChamadoParsed[] {
  const clean = text.replace(/^﻿/, ""); // remove BOM
  if (!clean.trim()) return [];

  // detecta delimitador pela primeira linha
  const firstNl = clean.indexOf('\n');
  const firstLine = (firstNl >= 0 ? clean.slice(0, firstNl) : clean).replace(/\r$/, "");
  const delim = firstLine.includes("\t") ? "\t" : firstLine.includes(";") ? ";" : ",";

  const rows = parseCsvFull(clean, delim);
  if (rows.length < 2) return [];

  const rawHeaders = rows[0];
  const fieldMap = rawHeaders.map((h) => HEADER_MAP[normalize(h)] ?? null);

  const result: ChamadoParsed[] = [];
  for (let i = 1; i < rows.length; i++) {
    const cols = rows[i];
    if (cols.every(c => !c)) continue;
    const obj: ChamadoParsed = {};
    for (let j = 0; j < fieldMap.length; j++) {
      const field = fieldMap[j];
      if (!field) continue;
      const raw = (cols[j] ?? "").replace(/^"|"$/g, "").trim();
      if (field === "dataRegistro") {
        obj[field] = parseDateBR(raw);
      } else if (field === "nivelEscalacao") {
        obj[field] = raw ? Number(raw) : null;
      } else {
        obj[field] = raw || null;
      }
    }
    if ((obj.referencia as string | null)?.trim()) result.push(obj);
  }
  return result;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function fmtDateTime(iso: string | null) {
  if (!iso) return "—";
  const d = new Date(iso);
  return d.toLocaleString("pt-BR", {
    timeZone: "UTC",
    day: "2-digit",
    month: "2-digit",
    year: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function fmtDateShort(iso: string) {
  return new Date(iso).toLocaleDateString("pt-BR", {
    timeZone: "UTC",
    day: "2-digit",
    month: "2-digit",
    year: "2-digit",
  });
}

function urgenciaCfg(ultimaAcao: string | null) {
  if (ultimaAcao === "Solicitação de Urgência") {
    return { rowClass: "bg-red-950/30 border-l-2 border-red-500/60", badge: true, acaoClass: "text-red-400 font-medium" };
  }
  return { rowClass: "", badge: false, acaoClass: "text-gray-400" };
}

const SLA_REGRAS: { match: string; dias: number }[] = [
  { match: "cadastro", dias: 2 },
  { match: "migracao", dias: 15 },
  { match: "orientacao", dias: 5 },
  { match: "erro", dias: 5 },
  { match: "falha", dias: 5 },
];

function normSimples(s: string): string {
  return s
    .toLowerCase()
    .replace(/[àáâãä]/g, "a")
    .replace(/[èéêë]/g, "e")
    .replace(/[ìíîï]/g, "i")
    .replace(/[òóôõö]/g, "o")
    .replace(/[ùúûü]/g, "u")
    .replace(/[ç]/g, "c")
    .replace(/[^a-z0-9 ]/g, "");
}

function getSLADias(nomeDps: string | null): number | null {
  if (!nomeDps) return null;
  const norm = normSimples(nomeDps);
  for (const r of SLA_REGRAS) {
    if (norm.includes(r.match)) return r.dias;
  }
  return null;
}

function diasDesde(dataRegistro: string | null): number | null {
  if (!dataRegistro) return null;
  return Math.floor((Date.now() - new Date(dataRegistro).getTime()) / 86_400_000);
}

// ─── Component ───────────────────────────────────────────────────────────────

export default function ChamadosPage() {
  const [view, setView] = useState<"lista" | "quantitativo">("lista");
  const [dados, setDados] = useState<DadosChamados | null>(null);
  const [stats, setStats] = useState<DadosStats | null>(null);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [usuario, setUsuario] = useState("");
  const [equipe, setEquipe] = useState("");
  const [urgentes, setUrgentes] = useState(false);
  const [busca, setBusca] = useState("");
  const [equipeQuant, setEquipeQuant] = useState("");
  const quantRef = useRef<HTMLDivElement>(null);

  const [importModal, setImportModal] = useState(false);
  const [fileNames, setFileNames] = useState<string[]>([]);
  const [parsed, setParsed] = useState<ChamadoParsed[]>([]);
  const [substituir, setSubstituir] = useState(true);
  const [importing, setImporting] = useState(false);
  const [devolverAssysts, setDevolverAssysts] = useState<{ assyst: string; redmine: string }[]>([]);
  const [modalDevolverTI, setModalDevolverTI] = useState(false);
  const [resolvidosTI, setResolvidosTI] = useState<Set<string>>(new Set());
  const [filtroRedmineResolvido, setFiltroRedmineResolvido] = useState(false);
  const searchParams = useSearchParams();
  const [importError, setImportError] = useState("");
  const [importResult, setImportResult] = useState<{ count: number; skipped: number; parsed: number } | null>(null);

  const [clearing, setClearing] = useState(false);
  const [confirmClear, setConfirmClear] = useState(false);
  const [csvExporting, setCsvExporting] = useState<string | null>(null);
  const [listaExporting, setListaExporting] = useState(false);

  const load = useCallback(() => {
    setLoading(true);
    const params = new URLSearchParams({ page: String(page) });
    if (usuario) params.set("usuario", usuario);
    if (equipe) params.set("equipe", equipe);
    if (urgentes) params.set("urgentes", "1");
    if (busca) params.set("busca", busca);
    fetch(`/api/chamados?${params}`)
      .then((r) => r.json())
      .then(setDados)
      .finally(() => setLoading(false));
  }, [page, usuario, equipe, urgentes, busca]);

  useEffect(() => { load(); }, [load]);

  // Carrega Assysts vinculados a Redmines "Devolver à TI"
  useEffect(() => {
    fetch("/api/redmine-atribuidos")
      .then(r => r.json())
      .then(({ registros, assystAtivos }: { registros: { numerosAssyst: string; numeroRedmine: string }[]; assystAtivos: string[] }) => {
        const ativos = new Set(assystAtivos.map(n => n.toUpperCase()));
        const lista: { assyst: string; redmine: string }[] = [];
        for (const r of registros) {
          if (!r.numerosAssyst) continue;
          const nums = r.numerosAssyst.split(/[;/,|\\]|\s+e\s+/i).map(s => s.trim().toUpperCase()).filter(Boolean);
          if (nums.length === 0 || ativos.size === 0) continue;
          if (nums.every(n => !ativos.has(n))) {
            for (const n of nums) lista.push({ assyst: n, redmine: r.numeroRedmine });
          }
        }
        setDevolverAssysts(lista);
      })
      .catch(() => {});
  }, []);

  // Ativa filtro automaticamente se vier de Redmine Resolvidos
  useEffect(() => {
    if (searchParams.get("filtro") === "redmine-resolvido") {
      setFiltroRedmineResolvido(true);
    }
  }, [searchParams]);

  // Carrega Assysts com Redmine já resolvido pela TI (Encontrados nos Resolvidos)
  useEffect(() => {
    fetch("/api/redmine-resolvidos")
      .then(r => r.json())
      .then(({ encontrados }: { encontrados: string[] }) => {
        setResolvidosTI(new Set(encontrados.map(n => n.toUpperCase())));
      })
      .catch(() => {});
  }, []);

  const loadStats = useCallback(() => {
    fetch("/api/chamados?stats=1")
      .then((r) => r.json())
      .then(setStats);
  }, []);

  useEffect(() => { loadStats(); }, [loadStats]);

  function setFilter(key: "usuario" | "equipe", value: string) {
    if (key === "usuario") {
      setUsuario(value);
      if (value && dados?.usuarioEquipeMap?.[value]) {
        setEquipe(dados.usuarioEquipeMap[value]);
      } else if (!value) {
        // não limpa equipe ao deselecionar usuário
      }
    }
    if (key === "equipe") { setEquipe(value); setUsuario(""); }
    setPage(1);
  }

  function toggleUrgentes() {
    setUrgentes((v) => !v);
    setPage(1);
  }

  function clearFilters() {
    setUsuario("");
    setEquipe("");
    setUrgentes(false);
    setBusca("");
    setFiltroRedmineResolvido(false);
    setPage(1);
  }

  async function exportUserCSV(nome: string) {
    setCsvExporting(nome);
    try {
      const params = new URLSearchParams({ usuario: nome, export: "1" });
      const res = await fetch(`/api/chamados?${params}`);
      const data = await res.json() as { chamados: Array<{ referencia: string; dataRegistro: string | null; nomeDpsAtribuido: string | null; nomeUsuarioAtribuido: string | null; ultimaAcao: string | null }> };
      const atrasados = data.chamados.filter((c) => {
        const sla = getSLADias(c.nomeDpsAtribuido);
        const dias = diasDesde(c.dataRegistro);
        return sla !== null && dias !== null && dias >= sla;
      });
      if (atrasados.length === 0) {
        alert("Nenhum chamado com SLA excedido para este operador.");
        return;
      }
      function esc(s: string) { return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;"); }
      const rows = atrasados.map((c) => {
        const dias = diasDesde(c.dataRegistro) ?? 0;
        const url = `https://cati.tjce.jus.br/assystnet/#events/${c.referencia}?eventType=1&currentIndex=0`;
        const rmResolvido = resolvidosTI.has(c.referencia.toUpperCase());
        const rmCell = rmResolvido ? `<td style="background:#7c2d12;color:#fed7aa;font-weight:bold">⚡ Redmine resolvido — encerre</td>` : `<td></td>`;
        return `<tr><td><a href="${esc(url)}">${esc(c.referencia)}</a></td><td>${esc(fmtDateTime(c.dataRegistro))}</td><td>${esc(c.nomeDpsAtribuido ?? "")}</td><td>${dias}</td>${rmCell}</tr>`;
      }).join("");
      const html = `<html><head><meta charset="UTF-8"><style>table{border-collapse:collapse}th,td{border:1px solid #ccc;padding:4px 8px;font-size:12px}th{background:#f0f0f0}a{color:#1155cc}</style></head><body><table><tr><th>Nº Chamado (Assyst)</th><th>Data/Hora</th><th>DPS Atribuído</th><th>Dias em aberto</th><th>Redmine Resolvido</th></tr>${rows}</table></body></html>`;
      const blob = new Blob([html], { type: "application/vnd.ms-excel;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `atrasados_${nome.replace(/[^a-z0-9]/gi, "_").toLowerCase()}.xls`;
      a.click();
      URL.revokeObjectURL(url);
    } finally {
      setCsvExporting(null);
    }
  }

  async function exportListaXLS() {
    setListaExporting(true);
    try {
      const params = new URLSearchParams({ export: "1" });
      if (usuario) params.set("usuario", usuario);
      if (equipe) params.set("equipe", equipe);
      if (urgentes) params.set("urgentes", "1");
      if (busca) params.set("busca", busca);
      const res = await fetch(`/api/chamados?${params}`);
      const data = await res.json() as { chamados: Array<{ referencia: string; dataRegistro: string | null; nomeDpsAtribuido: string | null; nomeUsuarioAtribuido: string | null; ultimaAcao: string | null }> };
      function esc(s: string) { return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;"); }
      const chamadosParaExportar = filtroRedmineResolvido
        ? data.chamados.filter(c => resolvidosTI.has(c.referencia.toUpperCase()))
        : data.chamados;
      const dataRows = chamadosParaExportar.map(c => {
        const url = `https://cati.tjce.jus.br/assystnet/#events/${c.referencia}?eventType=1&currentIndex=0`;
        const dias = diasDesde(c.dataRegistro) ?? "";
        const rmResolvido = resolvidosTI.has(c.referencia.toUpperCase());
        const rmCell = rmResolvido ? `<td style="background:#7c2d12;color:#fed7aa;font-weight:bold">⚡ Redmine resolvido — encerre</td>` : `<td></td>`;
        return `<tr><td><a href="${esc(url)}">${esc(c.referencia)}</a></td><td>${esc(fmtDateTime(c.dataRegistro))}</td><td>${dias}</td><td>${esc(c.nomeDpsAtribuido ?? "")}</td><td>${esc(c.nomeUsuarioAtribuido ?? "Triagem")}</td><td>${esc(c.ultimaAcao ?? "")}</td>${rmCell}</tr>`;
      }).join("");
      const html = `<html><head><meta charset="UTF-8"><style>table{border-collapse:collapse}th,td{border:1px solid #ccc;padding:4px 8px;font-size:12px}th{background:#f0f0f0}a{color:#1155cc}</style></head><body><table><tr><th>Nº Chamado (Assyst)</th><th>Data/Hora</th><th>Dias em aberto</th><th>DPS Atribuído</th><th>Usuário Atribuído</th><th>Última Ação</th><th>Redmine Resolvido</th></tr>${dataRows}</table></body></html>`;
      const blob = new Blob([html], { type: "application/vnd.ms-excel;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `chamados${usuario ? "_" + usuario.replace(/[^a-z0-9]/gi, "_").toLowerCase() : ""}.xls`;
      a.click();
      URL.revokeObjectURL(url);
    } finally {
      setListaExporting(false);
    }
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    if (files.length === 0) return;
    setFileNames(files.map(f => f.name));
    setImportError("");
    setParsed([]);

    let completed = 0;
    const allParsed: ChamadoParsed[] = [];

    for (const file of files) {
      const reader = new FileReader();
      reader.onload = (ev) => {
        const text = ev.target?.result as string;
        allParsed.push(...parsePaste(text));
        completed++;
        if (completed === files.length) {
          if (allParsed.length === 0)
            setImportError("Nenhum chamado encontrado. Verifique se os arquivos têm o cabeçalho correto.");
          else
            setParsed(allParsed);
        }
      };
      reader.readAsText(file, "UTF-8");
    }
  }

  async function handleImport() {
    if (parsed.length === 0) return;
    const parsedCount = parsed.length;
    setImporting(true);
    try {
      const res = await fetch("/api/chamados/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ chamados: parsed, substituir }),
      });
      const data = await res.json();
      if (data.ok) {
        setImportResult({ count: data.count, skipped: data.skipped ?? 0, parsed: parsedCount });
        setFileNames([]);
        setParsed([]);
        load();
        loadStats();
      }
    } finally {
      setImporting(false);
    }
  }

  async function handleClear() {
    setClearing(true);
    await fetch("/api/chamados", { method: "DELETE" });
    setClearing(false);
    setConfirmClear(false);
    load();
    loadStats();
  }

  const temFiltro = !!(usuario || equipe || urgentes || busca || filtroRedmineResolvido);

  function gerarPDF() {
    if (!stats) return;
    const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
    const geradoEm = new Date().toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" });

    doc.setFontSize(16);
    doc.setTextColor(30, 30, 30);
    doc.text("Chamados - Quantitativo", 14, 18);

    doc.setFontSize(9);
    doc.setTextColor(100, 100, 100);
    doc.text(`Total: ${stats.total.toLocaleString("pt-BR")} chamados`, 14, 26);
    doc.text(`Gerado em: ${geradoEm}`, 14, 31);

    let y = 37;

    const equipesFiltradas = equipeQuant ? stats.porEquipe.filter((eq) => eq.equipe === equipeQuant) : stats.porEquipe;
    for (const eq of equipesFiltradas) {
      const pct = ((eq.total / stats.total) * 100).toFixed(1);
      const rows = eq.usuarios.map((u, i) => {
        const over = eq.equipe !== "Supervisao" && u.nome !== "(Triagem)" && u.total > 50;
        return { cells: [`${i + 1}`, u.nome, over ? "ALTO" : "", u.total.toLocaleString("pt-BR")], over };
      });
      autoTable(doc, {
        startY: y,
        head: [[{ content: `${eq.equipe}  -  ${eq.total.toLocaleString("pt-BR")} chamados (${pct}%)`, colSpan: 4 }]],
        body: rows.map((r) => r.cells),
        columnStyles: {
          0: { cellWidth: 10, halign: "center" },
          2: { cellWidth: 20, halign: "center" },
          3: { cellWidth: 22, halign: "right" },
        },
        headStyles: { fillColor: [30, 41, 59], textColor: [200, 200, 220], fontStyle: "bold", fontSize: 9 },
        bodyStyles: { fontSize: 8.5, textColor: [40, 40, 40] },
        alternateRowStyles: { fillColor: [248, 250, 252] },
        margin: { left: 14, right: 14 },
        didParseCell: (data) => {
          if (data.section !== "body") return;
          const row = rows[data.row.index];
          if (!row?.over) return;
          data.cell.styles.textColor = [180, 30, 30];
          if (data.column.index === 2) {
            data.cell.styles.fontStyle = "bold";
            data.cell.styles.fillColor = [255, 235, 235];
          }
        },
        didDrawPage: () => { y = 14; },
      });
      y = (doc as jsPDF & { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 6;
    }

    doc.save(`chamados-quantitativo-${new Date().toISOString().slice(0, 10)}.pdf`);
  }

  function baixarJPEG() {
    if (!stats) return;
    const equipesParaExportar = equipeQuant
      ? stats.porEquipe.filter((eq) => eq.equipe === equipeQuant)
      : stats.porEquipe;

    const W = 800;
    const PAD = 24;
    const ROW_H = 30;
    const TEAM_H = 38;
    const GAP = 10;
    const HEADER_H = 70;

    let totalH = HEADER_H;
    for (const eq of equipesParaExportar) totalH += TEAM_H + eq.usuarios.length * ROW_H + GAP;
    totalH += PAD;

    const canvas = document.createElement("canvas");
    canvas.width = W * 2;
    canvas.height = totalH * 2;
    const ctx = canvas.getContext("2d")!;
    ctx.scale(2, 2);

    // fundo
    ctx.fillStyle = "#0f172a";
    ctx.fillRect(0, 0, W, totalH);

    // título
    ctx.fillStyle = "#f1f5f9";
    ctx.font = "bold 18px system-ui, sans-serif";
    ctx.fillText("Chamados - Quantitativo", PAD, 30);
    ctx.fillStyle = "#64748b";
    ctx.font = "12px system-ui, sans-serif";
    const geradoEm = new Date().toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" });
    ctx.fillText(`Total: ${stats.total.toLocaleString("pt-BR")} chamados   Gerado em: ${geradoEm}`, PAD, 52);

    let y = HEADER_H;

    for (const eq of equipesParaExportar) {
      const pct = ((eq.total / stats.total) * 100).toFixed(1);

      // cabeçalho equipe
      ctx.fillStyle = "#1e293b";
      ctx.fillRect(PAD, y, W - PAD * 2, TEAM_H);
      ctx.fillStyle = "#cbd5e1";
      ctx.font = "bold 12px system-ui, sans-serif";
      ctx.fillText(`${eq.equipe}   ${eq.total.toLocaleString("pt-BR")} chamados (${pct}%)`, PAD + 12, y + 24);
      y += TEAM_H;

      for (let i = 0; i < eq.usuarios.length; i++) {
        const u = eq.usuarios[i];
        const over = eq.equipe !== "Supervisão" && u.nome !== "(Triagem)" && u.total > 50;

        ctx.fillStyle = i % 2 === 0 ? "#1e2d3d" : "#0f172a";
        ctx.fillRect(PAD, y, W - PAD * 2, ROW_H);

        // rank
        ctx.fillStyle = "#475569";
        ctx.font = "11px monospace";
        ctx.fillText(`${i + 1}`, PAD + 8, y + 20);

        // nome
        ctx.fillStyle = over ? "#fca5a5" : "#e2e8f0";
        ctx.font = over ? "bold 12px system-ui, sans-serif" : "12px system-ui, sans-serif";
        ctx.fillText(u.nome, PAD + 36, y + 20);

        // badge ALTO
        if (over) {
          ctx.fillStyle = "#7f1d1d";
          const bx = W - PAD - 80;
          ctx.fillRect(bx, y + 7, 34, 16);
          ctx.fillStyle = "#fca5a5";
          ctx.font = "bold 9px system-ui, sans-serif";
          ctx.fillText("ALTO", bx + 5, y + 19);
        }

        // total
        ctx.fillStyle = over ? "#f87171" : "#f1f5f9";
        ctx.font = "bold 12px monospace";
        const txt = u.total.toLocaleString("pt-BR");
        ctx.fillText(txt, W - PAD - 10 - ctx.measureText(txt).width, y + 20);

        y += ROW_H;
      }
      y += GAP;
    }

    const a = document.createElement("a");
    a.href = canvas.toDataURL("image/jpeg", 0.95);
    a.download = `chamados-quantitativo-${new Date().toISOString().slice(0, 10)}.jpg`;
    a.click();
  }

  return (
    <div>
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-3 mb-6">
        <div>
          <h2 className="text-xl font-semibold text-white">Chamados</h2>
          <p className="text-sm text-gray-400 mt-0.5">Listagem de chamados por atendente</p>
        </div>
        <div className="flex gap-2 flex-wrap items-center">
          {view === "quantitativo" && stats && stats.total > 0 && (
            <>
              <select
                value={equipeQuant}
                onChange={(e) => setEquipeQuant(e.target.value)}
                className="bg-gray-900 border border-gray-700 text-white text-xs rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 min-w-[160px]">
                <option value="">Todas as equipes</option>
                {stats.porEquipe.map((eq) => (
                  <option key={eq.equipe} value={eq.equipe}>{eq.equipe}</option>
                ))}
              </select>
              <button
                onClick={gerarPDF}
                className="text-xs px-3 py-2 rounded-lg bg-gray-800 hover:bg-gray-700 text-gray-300 hover:text-white border border-gray-700 transition">
                ↓ PDF
              </button>
              <button
                onClick={baixarJPEG}
                className="text-xs px-3 py-2 rounded-lg bg-gray-800 hover:bg-gray-700 text-gray-300 hover:text-white border border-gray-700 transition">
                ↓ JPEG
              </button>
              {equipeQuant && (
                <button
                  onClick={() => setEquipeQuant("")}
                  className="text-xs px-3 py-2 rounded-lg bg-gray-800 hover:bg-gray-700 text-gray-400 hover:text-white border border-gray-700 transition">
                  Limpar filtro
                </button>
              )}
            </>
          )}
          {view === "lista" && dados && dados.total > 0 && (
            <button
              onClick={exportListaXLS}
              disabled={listaExporting}
              className="text-xs px-3 py-2 rounded-lg bg-green-700 hover:bg-green-600 disabled:opacity-50 text-white border border-green-700 transition">
              {listaExporting ? "Exportando..." : "↓ Exportar XLS"}
            </button>
          )}
          {dados && dados.total > 0 && (
            <button
              onClick={() => setConfirmClear(true)}
              className="text-xs px-3 py-2 rounded-lg bg-gray-800 hover:bg-gray-700 text-gray-400 hover:text-red-400 border border-gray-700 transition">
              Limpar dados
            </button>
          )}
          <button
            onClick={() => { setImportModal(true); setFileNames([]); setParsed([]); setImportError(""); setImportResult(null); }}
            className="bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium px-4 py-2 rounded-lg transition">
            Importar chamados
          </button>
        </div>
      </div>

      {/* Abas */}
      <div className="flex gap-1 mb-6 bg-gray-900 border border-gray-800 rounded-lg p-1 w-fit">
        <button
          onClick={() => setView("lista")}
          className={`text-sm px-4 py-1.5 rounded-md transition ${view === "lista" ? "bg-gray-700 text-white font-medium" : "text-gray-500 hover:text-gray-300"}`}>
          Lista
        </button>
        <button
          onClick={() => setView("quantitativo")}
          className={`text-sm px-4 py-1.5 rounded-md transition ${view === "quantitativo" ? "bg-gray-700 text-white font-medium" : "text-gray-500 hover:text-gray-300"}`}>
          Quantitativo
        </button>
      </div>

      {/* Card: Assysts vinculados a Devolver à TI */}
      {devolverAssysts.length > 0 && (
        <div
          onClick={() => setModalDevolverTI(true)}
          className="mb-4 flex items-center gap-3 px-4 py-3 rounded-xl border border-yellow-700 bg-yellow-950/30 cursor-pointer hover:bg-yellow-950/50 transition">
          <span className="text-yellow-400 text-xl">⚠</span>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-yellow-300">
              {devolverAssysts.length} Assyst{devolverAssysts.length > 1 ? "s" : ""} precisam ser verificados
            </p>
            <p className="text-xs text-yellow-600 mt-0.5">Vinculados a Redmines "Devolver à TI" — clique para ver a lista</p>
          </div>
          <span className="text-yellow-600 text-xs shrink-0">Ver lista →</span>
        </div>
      )}

      {/* Summary cards */}
      {dados && dados.total > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
          <div className="bg-gray-900 rounded-xl border border-gray-800 p-4">
            <p className="text-xs text-gray-500 mb-1">Total de chamados</p>
            <p className="text-3xl font-bold text-white tabular-nums">
              {dados.total.toLocaleString("pt-BR")}
            </p>
          </div>
          <div
            onClick={toggleUrgentes}
            className={`rounded-xl border p-4 cursor-pointer transition light-card-red ${urgentes ? "bg-red-900/30 border-red-500/50 animate-pulse" : "bg-gray-900 border-gray-800 hover:border-red-500/30"}`}>
            <p className="text-xs text-gray-500 mb-1">Solicitação de Urgência</p>
            <p className={`text-3xl font-bold tabular-nums ${dados.totalUrgentes > 0 ? "text-red-400" : "text-gray-600"}`}>
              {dados.totalUrgentes.toLocaleString("pt-BR")}
            </p>
            {urgentes && <p className="text-xs text-red-400 mt-1">Filtro ativo</p>}
          </div>
          <div
            onClick={() => setFiltroRedmineResolvido(f => !f)}
            className={`rounded-xl border p-4 cursor-pointer transition ${filtroRedmineResolvido ? "bg-orange-900/30 border-orange-500/50 animate-pulse" : dados.chamados.some(c => resolvidosTI.has(c.referencia.toUpperCase())) ? "bg-orange-950/20 border-orange-800 hover:border-orange-600" : "bg-gray-900 border-gray-800"}`}>
            <p className="text-xs text-gray-500 mb-1">Redmine resolvido</p>
            <p className={`text-3xl font-bold tabular-nums ${dados.chamados.some(c => resolvidosTI.has(c.referencia.toUpperCase())) ? "text-orange-400" : "text-gray-600"}`}>
              {dados.chamados.filter(c => resolvidosTI.has(c.referencia.toUpperCase())).length}
            </p>
            <p className="text-xs mt-1 text-gray-500">{filtroRedmineResolvido ? "✓ Filtro ativo" : "⚡ Clique para filtrar"}</p>
          </div>
          <div className="bg-gray-900 rounded-xl border border-gray-800 p-4">
            <p className="text-xs text-gray-500 mb-1">Atendentes</p>
            <p className="text-3xl font-bold text-white tabular-nums">
              {dados.usuarios.length}
            </p>
          </div>
          {dados.dataMin && dados.dataMax && (
            <div className="bg-gray-900 rounded-xl border border-gray-800 p-4">
              <p className="text-xs text-gray-500 mb-1">Período dos dados</p>
              <p className="text-sm font-medium text-gray-300">
                {fmtDateShort(dados.dataMin)} → {fmtDateShort(dados.dataMax)}
              </p>
            </div>
          )}
        </div>
      )}

      {/* Lista e filtros — apenas na aba Lista */}
      {view === "lista" && dados && dados.total > 0 && (
        <div className="flex flex-wrap items-center gap-2 mb-4">
          <div className="relative">
            <input
              type="text"
              value={busca}
              onChange={e => { setBusca(e.target.value); setPage(1); }}
              placeholder="Pesquisar Chamado..."
              className="bg-gray-900 border border-gray-700 text-white text-xs rounded-lg pl-7 pr-7 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 min-w-[200px]"
            />
            <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-500 text-xs pointer-events-none">🔍</span>
            {busca && (
              <button onClick={() => { setBusca(""); setPage(1); }} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white text-xs">✕</button>
            )}
          </div>
          {dados.equipes && dados.equipes.length > 0 && (
            <select
              value={equipe}
              onChange={(e) => setFilter("equipe", e.target.value)}
              className="bg-gray-900 border border-gray-700 text-white text-xs rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 min-w-[160px]">
              <option value="">Todas as equipes</option>
              {dados.equipes.map((eq) => (
                <option key={eq} value={eq}>{eq}</option>
              ))}
            </select>
          )}
          {dados.usuarios.length > 0 && (
            <select
              value={usuario}
              onChange={(e) => setFilter("usuario", e.target.value)}
              className="bg-gray-900 border border-gray-700 text-white text-xs rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 min-w-[180px]">
              <option value="">Todos os atendentes</option>
              {dados.usuarios.map((u) => (
                <option key={u} value={u}>{u}</option>
              ))}
            </select>
          )}
          {filtroRedmineResolvido && (
            <span className="inline-flex items-center gap-1.5 text-xs px-3 py-2 rounded-lg bg-orange-500/15 text-orange-300 border border-orange-500/30">
              ⚡ Redmine resolvido
              <button onClick={() => setFiltroRedmineResolvido(false)} className="hover:text-white transition">✕</button>
            </span>
          )}
          {temFiltro && (
            <button
              onClick={clearFilters}
              className="text-xs px-3 py-2 rounded-lg bg-gray-800 hover:bg-gray-700 text-gray-400 hover:text-white border border-gray-700 transition">
              Limpar filtros
            </button>
          )}
        </div>
      )}

      {/* Table — apenas na aba Lista */}
      {view === "lista" && loading ? (
        <p className="text-gray-500 text-sm">Carregando...</p>
      ) : view === "lista" && (!dados || dados.total === 0) && !busca && !usuario && !equipe && !urgentes ? (
        <div className="bg-gray-900 rounded-xl border border-gray-800 p-12 text-center">
          <p className="text-gray-500 text-sm mb-1">Nenhum dado importado ainda.</p>
          <p className="text-gray-600 text-xs">Clique em "Importar chamados" e selecione o arquivo CSV exportado do sistema.</p>
        </div>
      ) : view === "lista" && (!dados || dados.total === 0 || dados.chamados.length === 0) ? (
        <div className="bg-gray-900 rounded-xl border border-gray-800 p-8 text-center">
          <p className="text-gray-500 text-sm">Nenhum chamado encontrado para a pesquisa realizada.</p>
        </div>
      ) : view === "lista" && dados ? (
        <>
          <div className="bg-gray-900 rounded-xl border border-gray-800 overflow-x-auto">
            <table className="w-full text-sm min-w-[800px]">
              <thead>
                <tr className="border-b border-gray-700 text-gray-400 text-xs uppercase tracking-wide">
                  <th className="text-left px-4 py-3 w-44">Nº Chamado (Assyst)</th>
                  <th className="text-left px-4 py-3 w-36">Data/hora</th>
                  <th className="text-left px-4 py-3 w-64">Nome do DPS Atribuído</th>
                  <th className="text-left px-4 py-3 w-60">Usuário Atribuído</th>
                  <th className="text-left px-4 py-3">Última ação</th>
                </tr>
              </thead>
              <tbody>
                {dados.chamados.filter(c => !filtroRedmineResolvido || resolvidosTI.has(c.referencia.toUpperCase())).map((c) => {
                  const urg = urgenciaCfg(c.ultimaAcao);
                  const sla = getSLADias(c.nomeDpsAtribuido);
                  const dias = diasDesde(c.dataRegistro);
                  const atrasado = sla !== null && dias !== null && dias >= sla;
                  const rowExtra = !urg.badge && atrasado ? "bg-orange-950/20 border-l-2 border-orange-500/50" : "";
                  return (
                    <tr
                      key={c.id}
                      className={`border-b border-gray-800/60 last:border-0 hover:bg-gray-800/40 transition ${urg.rowClass} ${rowExtra}`}>
                      <td className="px-4 py-2.5">
                        <div className="flex flex-col gap-1">
                          <div className="flex items-center gap-1.5 flex-nowrap">
                            <a
                              href={`https://cati.tjce.jus.br/assystnet/#events/${c.referencia}?eventType=1&currentIndex=0`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="font-mono text-xs text-blue-400 hover:text-blue-300 hover:underline transition">
                              {c.referencia}
                            </a>
                            {atrasado && dias !== null && (
                              <span
                                title="Chamado atrasado"
                                className="inline-flex items-center gap-1 text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-red-600 text-white leading-none cursor-help animate-pulse">
                                ⚠ {dias}d
                              </span>
                            )}
                          </div>
                          {resolvidosTI.has(c.referencia.toUpperCase()) && (
                            <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-orange-500/20 text-orange-300 border border-orange-500/40 animate-pulse w-fit whitespace-nowrap">
                              ⚡ Redmine resolvido — encerre
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-2.5">
                        <span className="text-xs text-gray-400 tabular-nums whitespace-nowrap">
                          {fmtDateTime(c.dataRegistro)}
                        </span>
                      </td>
                      <td className="px-4 py-2.5">
                        <span
                          className="text-xs text-gray-300 cursor-default"
                          title={c.nomeSecao ?? undefined}>
                          {c.nomeDpsAtribuido ?? "—"}
                        </span>
                      </td>
                      <td className="px-4 py-2.5">
                        {c.nomeUsuarioAtribuido ? (
                          <div className="flex flex-col gap-0.5">
                            <span className="text-xs text-gray-200 whitespace-nowrap">{c.nomeUsuarioAtribuido}</span>
                            {c.equipe && c.equipe !== "Sem equipe" && (
                              <span className="text-[10px] px-1.5 py-0.5 rounded bg-gray-700/60 text-gray-400 border border-gray-700 w-fit whitespace-nowrap">
                                {c.equipe}
                              </span>
                            )}
                          </div>
                        ) : (
                          <span className="text-xs px-2 py-0.5 rounded bg-blue-500/15 text-blue-400 border border-blue-500/25">
                            Triagem
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-2.5">
                        {urg.badge ? (
                          <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full bg-red-600 text-white animate-pulse whitespace-nowrap">
                            ⚠ Solicitação de Urgência
                          </span>
                        ) : (
                          <span className="text-xs text-gray-400">{c.ultimaAcao ?? "—"}</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {dados.totalPages > 1 && (
            <div className="flex items-center justify-between mt-4">
              <p className="text-xs text-gray-500">
                {((page - 1) * dados.pageSize + 1).toLocaleString("pt-BR")}–
                {Math.min(page * dados.pageSize, dados.total).toLocaleString("pt-BR")} de{" "}
                {dados.total.toLocaleString("pt-BR")} chamados
              </p>
              <div className="flex gap-1">
                <button
                  onClick={() => setPage(1)}
                  disabled={page === 1}
                  className="text-xs px-2 py-1 rounded bg-gray-800 hover:bg-gray-700 text-gray-400 disabled:opacity-30 transition">
                  «
                </button>
                <button
                  onClick={() => setPage((p) => p - 1)}
                  disabled={page === 1}
                  className="text-xs px-3 py-1 rounded bg-gray-800 hover:bg-gray-700 text-gray-400 disabled:opacity-30 transition">
                  ‹ Anterior
                </button>
                <span className="text-xs px-3 py-1 text-gray-300 tabular-nums">
                  {page} / {dados.totalPages}
                </span>
                <button
                  onClick={() => setPage((p) => p + 1)}
                  disabled={page === dados.totalPages}
                  className="text-xs px-3 py-1 rounded bg-gray-800 hover:bg-gray-700 text-gray-400 disabled:opacity-30 transition">
                  Próximo ›
                </button>
                <button
                  onClick={() => setPage(dados.totalPages)}
                  disabled={page === dados.totalPages}
                  className="text-xs px-2 py-1 rounded bg-gray-800 hover:bg-gray-700 text-gray-400 disabled:opacity-30 transition">
                  »
                </button>
              </div>
            </div>
          )}
        </>
      ) : null}

      {/* Tabela quantitativa */}
      {view === "quantitativo" && (
        <>
          {!stats || stats.total === 0 ? (
            <div className="bg-gray-900 rounded-xl border border-gray-800 p-12 text-center">
              <p className="text-gray-500 text-sm">Nenhum dado importado ainda.</p>
            </div>
          ) : (
            <div className="space-y-4" ref={quantRef}>
              {stats.porEquipe.filter((eq) => !equipeQuant || eq.equipe === equipeQuant).map((eq) => (
                <div key={eq.equipe} className="bg-gray-900 rounded-xl border border-gray-800 overflow-hidden">
                  {/* Cabeçalho da equipe */}
                  <div className="flex items-center justify-between px-4 py-3 border-b border-gray-700 bg-gray-800/40">
                    <span className="text-sm font-semibold text-white">{eq.equipe}</span>
                    <span className="text-xs text-gray-400 tabular-nums">
                      {eq.total.toLocaleString("pt-BR")} chamado{eq.total !== 1 ? "s" : ""}
                      <span className="ml-2 text-gray-600">
                        ({((eq.total / stats.total) * 100).toFixed(1)}%)
                      </span>
                    </span>
                  </div>
                  {/* Usuários */}
                  <table className="w-full text-sm">
                    <tbody>
                      {(() => {
                        return eq.usuarios.map((u, i) => {
                          const pct = eq.total > 0 ? (u.total / eq.total) * 100 : 0;
                          const sobrecarregado = eq.equipe !== "Supervisão" && u.nome !== "(Triagem)" && u.total > 50;
                          return (
                            <tr key={u.nome} className={`border-b border-gray-800/60 last:border-0 hover:bg-gray-800/40 transition ${sobrecarregado ? "bg-red-950/20" : ""}`}>
                              <td className="px-3 py-2.5 text-center w-9">
                                <span className="text-xs font-mono text-gray-600">{i + 1}</span>
                              </td>
                              <td className="px-4 py-2.5">
                                <div className="flex items-center gap-2">
                                  {sobrecarregado && (
                                    <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-xs bg-red-500/20 text-red-400 border border-red-500/30 shrink-0">
                                      ↑ alto
                                    </span>
                                  )}
                                  <button
                                    onClick={() => { setUsuario(u.nome); setEquipe(""); setPage(1); setView("lista"); }}
                                    className={`text-sm text-left hover:underline ${sobrecarregado ? "text-red-200" : "text-gray-200"}`}>
                                    {u.nome}
                                  </button>
                                  <div className="flex-1 h-1.5 bg-gray-800 rounded-full overflow-hidden min-w-[40px] max-w-[80px]">
                                    <div className={`h-full rounded-full ${sobrecarregado ? "bg-red-500/60" : "bg-blue-600/60"}`} style={{ width: `${pct}%` }} />
                                  </div>
                                  <button
                                    onClick={() => exportUserCSV(u.nome)}
                                    disabled={csvExporting === u.nome}
                                    title="Exportar chamados com dias em atraso"
                                    className="shrink-0 text-[10px] font-medium px-1.5 py-0.5 rounded bg-orange-500/15 text-orange-400 border border-orange-500/25 hover:bg-orange-500/25 transition disabled:opacity-50">
                                    {csvExporting === u.nome ? "..." : "↓ CSV"}
                                  </button>
                                </div>
                              </td>
                              <td className="px-4 py-2.5 text-right w-24">
                                <span className={`font-mono font-bold tabular-nums ${sobrecarregado ? "text-red-400" : "text-white"}`}>{u.total}</span>
                              </td>
                            </tr>
                          );
                        });
                      })()}
                    </tbody>
                  </table>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {/* Modal: Assysts Devolver à TI */}
      {modalDevolverTI && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 px-4" onClick={() => setModalDevolverTI(false)}>
          <div className="bg-gray-900 border border-yellow-800/50 rounded-xl w-full max-w-lg p-6 max-h-[80vh] flex flex-col" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-base font-semibold text-yellow-300">⚠ Assysts para verificar</h3>
                <p className="text-xs text-gray-500 mt-0.5">Vinculados a Redmines marcados como "Devolver à TI" — verifique se já podem ser encerrados</p>
              </div>
              <button onClick={() => setModalDevolverTI(false)} className="text-gray-600 hover:text-gray-400 transition">✕</button>
            </div>
            <div className="overflow-y-auto flex-1 space-y-2">
              {devolverAssysts.map((item, i) => (
                <div key={i} className="flex items-center justify-between px-3 py-2 rounded-lg bg-yellow-950/20 border border-yellow-900/40">
                  <div>
                    <a href={`https://cati.tjce.jus.br/assystnet/#events/${item.assyst}?eventType=1&currentIndex=0`}
                      target="_blank" rel="noopener noreferrer"
                      className="font-mono text-sm text-blue-400 hover:text-blue-300 hover:underline transition">
                      {item.assyst}
                    </a>
                    <p className="text-xs text-gray-500 mt-0.5">Redmine #{item.redmine}</p>
                  </div>
                  <span className="text-xs text-yellow-600 font-medium">Devolver à TI</span>
                </div>
              ))}
            </div>
            <button onClick={() => setModalDevolverTI(false)}
              className="mt-4 w-full bg-gray-800 hover:bg-gray-700 text-gray-300 text-sm rounded-lg py-2 transition">
              Fechar
            </button>
          </div>
        </div>
      )}

      {/* Modal de importação */}
      {importModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 px-4">
          <div className="bg-gray-900 border border-gray-800 rounded-xl w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-base font-semibold text-white">Importar chamados</h3>
                <p className="text-xs text-gray-500 mt-0.5">Selecione o arquivo CSV exportado do sistema</p>
              </div>
              <button onClick={() => setImportModal(false)} className="text-gray-600 hover:text-gray-400 transition">✕</button>
            </div>

            <label className={`flex flex-col items-center justify-center w-full border-2 border-dashed rounded-xl cursor-pointer transition px-3 py-4
              ${fileNames.length > 0 ? "border-blue-500/50 bg-blue-500/5" : "border-gray-700 bg-gray-800/50 hover:border-gray-600 hover:bg-gray-800"}`}>
              <input type="file" accept=".csv,.txt,.tsv" multiple onChange={handleFileChange} className="hidden" />
              {fileNames.length > 0 ? (
                <>
                  <span className="text-2xl mb-1">📄</span>
                  <span className="text-sm font-medium text-blue-400 text-center">
                    {fileNames.length === 1 ? fileNames[0] : `${fileNames.length} arquivos selecionados`}
                  </span>
                  {fileNames.length > 1 && (
                    <span className="text-[10px] text-gray-500 mt-1 text-center">{fileNames.join(", ")}</span>
                  )}
                  <span className="text-xs text-gray-500 mt-1">Clique para trocar</span>
                </>
              ) : (
                <>
                  <span className="text-2xl mb-1">📂</span>
                  <span className="text-sm text-gray-400">Clique para selecionar os arquivos</span>
                  <span className="text-xs text-gray-600 mt-0.5">.csv · .txt · .tsv · vários ao mesmo tempo</span>
                </>
              )}
            </label>

            {parsed.length > 0 && (
              <div className="mt-3 px-3 py-2 rounded-lg bg-green-500/10 border border-green-500/20 text-xs text-green-400">
                {parsed.length.toLocaleString("pt-BR")} chamado{parsed.length !== 1 ? "s" : ""} encontrado{parsed.length !== 1 ? "s" : ""}{" "}
                · {new Set(parsed.map((c) => c.nomeUsuarioAtribuido)).size} atendente{new Set(parsed.map((c) => c.nomeUsuarioAtribuido)).size !== 1 ? "s" : ""}
              </div>
            )}
            {importError && (
              <div className="mt-3 px-3 py-2 rounded-lg bg-red-500/10 border border-red-500/20 text-xs text-red-400">
                {importError}
              </div>
            )}

            <div className="mt-3 flex items-center gap-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="radio" name="modo" checked={substituir} onChange={() => setSubstituir(true)} className="accent-blue-500" />
                <span className="text-sm text-gray-300">Substituir todos os dados</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="radio" name="modo" checked={!substituir} onChange={() => setSubstituir(false)} className="accent-blue-500" />
                <span className="text-sm text-gray-300">Adicionar aos existentes</span>
              </label>
            </div>
            {substituir && (
              <p className="text-xs text-amber-500/80 mt-1.5">
                Os dados anteriores serão apagados antes de importar.
              </p>
            )}

            {importResult && (
              <div className="mt-3 px-3 py-2 rounded-lg bg-blue-500/10 border border-blue-500/20 text-xs text-blue-300 space-y-0.5">
                <p className="text-gray-400">{importResult.parsed.toLocaleString("pt-BR")} linha{importResult.parsed !== 1 ? "s" : ""} lida{importResult.parsed !== 1 ? "s" : ""} dos arquivos</p>
                <p>{importResult.count.toLocaleString("pt-BR")} chamado{importResult.count !== 1 ? "s" : ""} importado{importResult.count !== 1 ? "s" : ""}</p>
                {importResult.skipped > 0 && (
                  <p className="text-gray-500">{importResult.skipped.toLocaleString("pt-BR")} ignorado{importResult.skipped !== 1 ? "s" : ""} (referência já existia)</p>
                )}
              </div>
            )}

            <div className="flex gap-2 mt-4">
              <button onClick={() => setImportModal(false)}
                className="flex-1 bg-gray-800 hover:bg-gray-700 text-gray-300 text-sm rounded-lg py-2 transition">
                {importResult ? "Fechar" : "Cancelar"}
              </button>
              {!importResult && (
                <button
                  onClick={handleImport}
                  disabled={parsed.length === 0 || importing}
                  className="flex-1 bg-blue-600 hover:bg-blue-500 disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm font-medium rounded-lg py-2 transition">
                  {importing ? "Importando..." : `Importar ${parsed.length > 0 ? parsed.length.toLocaleString("pt-BR") : ""} chamados`}
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Modal de confirmação de limpeza */}
      {confirmClear && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 px-4">
          <div className="bg-gray-900 border border-gray-800 rounded-xl w-full max-w-sm p-6">
            <h3 className="text-base font-semibold text-white mb-2">Limpar todos os dados?</h3>
            <p className="text-sm text-gray-400 mb-4">
              Todos os {dados?.total.toLocaleString("pt-BR")} chamados serão removidos permanentemente.
            </p>
            <div className="flex gap-2">
              <button onClick={() => setConfirmClear(false)}
                className="flex-1 bg-gray-800 hover:bg-gray-700 text-gray-300 text-sm rounded-lg py-2 transition">
                Cancelar
              </button>
              <button onClick={handleClear} disabled={clearing}
                className="flex-1 bg-red-600 hover:bg-red-500 disabled:opacity-40 text-white text-sm font-medium rounded-lg py-2 transition">
                {clearing ? "Limpando..." : "Confirmar"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

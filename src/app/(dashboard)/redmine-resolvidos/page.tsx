"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

type Resolvido = {
  id: number;
  numeroRedmine: string;
  numerosAssyst: string;
  tipo: string | null;
  situacao: string | null;
};

type Dados = {
  resolvidos: Resolvido[];
  esquecidos: string[];
  encontrados: string[];
  aguardandoEmChamados: string[];
  totalRedmine: number;
  chamadosMap: Record<string, string | null>;
  resolvidosRedmineNums: string[];
  totalResolvidos: number;
  page: number;
  totalPages: number;
  ultimaImportacao?: string | null;
};

function diasAberto(dataAbertura: string | null | undefined): number | null {
  if (!dataAbertura) return null;
  return Math.floor((Date.now() - new Date(dataAbertura).getTime()) / 86400000);
}

function TextoComLinks({
  texto, resolvidosSet, redmineToAssystMap, assystNums,
}: {
  texto: string;
  resolvidosSet?: Set<string>;
  redmineToAssystMap?: Map<string, Set<string>>;
  assystNums?: string[];
}) {
  const partes = texto.split(/(#\d{4,})/g);
  return (
    <>
      {partes.map((parte, i) => {
        if (!/^#\d{4,}$/.test(parte)) return <span key={i}>{parte}</span>;
        const num = parte.slice(1);
        const isResolvido = resolvidosSet?.has(num) ?? false;
        const assystDessaRedmine = redmineToAssystMap?.get(num);
        const chamadoVinculado = !assystNums || !assystDessaRedmine
          ? true
          : assystNums.some(a => assystDessaRedmine.has(a.toUpperCase()));
        return (
          <span key={i} className="inline-flex items-center gap-1 flex-wrap">
            <a href={redmineUrl(num)} target="_blank" rel="noopener noreferrer"
              className="text-blue-400 hover:text-blue-300 hover:underline font-mono">
              {parte}
            </a>
            {isResolvido && chamadoVinculado && (
              <span className="text-xs font-semibold px-1.5 py-0.5 rounded bg-green-500/20 text-green-400 border border-green-500/30 whitespace-nowrap">
                ✓ Resolvido
              </span>
            )}
            {isResolvido && !chamadoVinculado && (
              <span className="text-xs font-semibold px-1.5 py-0.5 rounded bg-orange-500/20 text-orange-400 border border-orange-500/30 whitespace-nowrap">
                ⚠ Chamado não incluído
              </span>
            )}
          </span>
        );
      })}
    </>
  );
}

function preview(texto: string, max = 55): string {
  const s = texto.replace(/\s+/g, " ").trim();
  if (s.length <= max) return s;
  const cortado = s.slice(0, max);
  const ultimoEspaco = cortado.lastIndexOf(" ");
  return (ultimoEspaco > 10 ? cortado.slice(0, ultimoEspaco) : cortado) + "…";
}

function splitAssyst(raw: string): string[] {
  return raw.split(/[;/,|\\]|\s+e\s+/i).map(s => s.trim()).filter(Boolean);
}

function assystUrl(num: string) {
  return `https://cati.tjce.jus.br/assystnet/#events/${num}?eventType=1&currentIndex=0`;
}

function redmineUrl(num: string) {
  return `https://redmine.tjce.jus.br/issues/${num}`;
}

// ─── DonutChart ────────────────────────────────────────────────────────────
type DonutItem = { label: string; value: number; cor?: string };

const CORES_DEFAULT = ["#6366f1","#22c55e","#f59e0b","#ef4444","#3b82f6","#ec4899","#14b8a6","#f97316"];

function DonutChart({ itens, cores }: { itens: DonutItem[]; cores?: string[] }) {
  const [hover, setHover] = useState<number | null>(null);
  const total = itens.reduce((s, d) => s + d.value, 0);
  if (total === 0) return null;

  const R = 70; const CX = 90; const CY = 90; const IR = 42;
  let ang = -Math.PI / 2;
  const slices = itens.map((d, i) => {
    const frac = d.value / total;
    const start = ang; ang += frac * 2 * Math.PI;
    const end = ang;
    const lx = CX + R * Math.cos((start + end) / 2);
    const ly = CY + R * Math.sin((start + end) / 2);
    const x1 = CX + R * Math.cos(start); const y1 = CY + R * Math.sin(start);
    const x2 = CX + R * Math.cos(end);   const y2 = CY + R * Math.sin(end);
    const xi1 = CX + IR * Math.cos(start); const yi1 = CY + IR * Math.sin(start);
    const xi2 = CX + IR * Math.cos(end);   const yi2 = CY + IR * Math.sin(end);
    const large = frac > 0.5 ? 1 : 0;
    const path = `M ${xi1} ${yi1} L ${x1} ${y1} A ${R} ${R} 0 ${large} 1 ${x2} ${y2} L ${xi2} ${yi2} A ${IR} ${IR} 0 ${large} 0 ${xi1} ${yi1} Z`;
    const cor = d.cor ?? (cores?.[i] ?? CORES_DEFAULT[i % CORES_DEFAULT.length]);
    return { ...d, frac, path, cor, lx, ly };
  });

  return (
    <div className="flex flex-col sm:flex-row items-center gap-6">
      <svg width="180" height="180" viewBox="0 0 180 180" className="shrink-0">
        {slices.map((s, i) => (
          <path key={i} d={s.path} fill={s.cor}
            opacity={hover === null || hover === i ? 1 : 0.45}
            className="cursor-pointer transition-opacity"
            onMouseEnter={() => setHover(i)} onMouseLeave={() => setHover(null)} />
        ))}
        <text x={CX} y={CY - 7} textAnchor="middle" fill="#fff" fontSize="22" fontWeight="bold">{total}</text>
        <text x={CX} y={CY + 11} textAnchor="middle" fill="#9ca3af" fontSize="10">total</text>
      </svg>
      <div className="flex flex-col gap-2 min-w-0">
        {slices.map((s, i) => (
          <div key={i} className="flex items-center gap-2 cursor-pointer"
            onMouseEnter={() => setHover(i)} onMouseLeave={() => setHover(null)}
            style={{ opacity: hover === null || hover === i ? 1 : 0.5 }}>
            <span className="w-3 h-3 rounded-full shrink-0" style={{ background: s.cor }} />
            <span className="text-xs text-gray-300 truncate">{s.label}</span>
            <span className="text-xs font-bold text-white ml-auto pl-3 shrink-0">{s.value}</span>
            <span className="text-xs text-gray-500 shrink-0">({(s.frac * 100).toFixed(1)}%)</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Helpers PDF ───────────────────────────────────────────────────────────
function hexToRgb(hex: string): [number, number, number] {
  return [parseInt(hex.slice(1,3),16), parseInt(hex.slice(3,5),16), parseInt(hex.slice(5,7),16)];
}

function desenharDonutPDF(
  doc: jsPDF,
  itens: DonutItem[],
  ox: number, oy: number, sz: number,
  cores?: string[],
) {
  const total = itens.reduce((s, d) => s + d.value, 0);
  if (total === 0) return;
  const cx = ox + sz / 2, cy = oy + sz / 2;
  const R = sz / 2 * 0.90, ri = sz / 2 * 0.44;
  const STEPS = 64;
  let ang = -Math.PI / 2;
  itens.forEach((d, i) => {
    const frac = d.value / total;
    const sa = ang, ea = ang + frac * 2 * Math.PI;
    ang = ea;
    const steps = Math.max(4, Math.ceil(STEPS * frac));
    const pts: [number, number][] = [];
    for (let j = 0; j <= steps; j++) { const a = sa + (ea - sa) * j / steps; pts.push([cx + R * Math.cos(a), cy + R * Math.sin(a)]); }
    for (let j = steps; j >= 0; j--) { const a = sa + (ea - sa) * j / steps; pts.push([cx + ri * Math.cos(a), cy + ri * Math.sin(a)]); }
    const palette = cores ?? CORES_DEFAULT;
    const cor = d.cor ?? palette[i % palette.length];
    const [r2, g2, b2] = hexToRgb(cor);
    doc.setFillColor(r2, g2, b2); doc.setDrawColor(255, 255, 255); doc.setLineWidth(0.35);
    const lines: [number, number][] = pts.slice(1).map((p, k) => [p[0] - pts[k][0], p[1] - pts[k][1]]);
    doc.lines(lines, pts[0][0], pts[0][1], [1, 1], "FD", true);
    if (frac >= 0.03) {
      const ma = sa + (ea - sa) / 2, lr = (R + ri) / 2;
      doc.setFontSize(7); doc.setTextColor(255, 255, 255); doc.setFont("helvetica", "bold");
      doc.text(`${(frac * 100).toFixed(1)}%`, cx + lr * Math.cos(ma), cy + lr * Math.sin(ma), { align: "center", baseline: "middle" });
    }
  });
  doc.setFillColor(255, 255, 255); doc.setDrawColor(255, 255, 255); doc.circle(cx, cy, ri, "F");
  doc.setFontSize(10); doc.setTextColor(30, 41, 59); doc.setFont("helvetica", "bold");
  doc.text(total.toLocaleString("pt-BR"), cx, cy - 1.5, { align: "center", baseline: "middle" });
  doc.setFontSize(5.5); doc.setTextColor(148, 163, 184); doc.setFont("helvetica", "normal");
  doc.text("REDMINES", cx, cy + 4, { align: "center", baseline: "middle" });
}

export default function RedmineResolvidosPage() {
  const [dados, setDados] = useState<Dados | null>(null);
  const [loading, setLoading] = useState(true);
  const [importing, setImporting] = useState(false);
  const [xlsExporting, setXlsExporting] = useState(false);
  const [importModal, setImportModal] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [importResult, setImportResult] = useState<{ count?: number; skipped?: number; error?: string } | null>(null);
  const [aba, setAba] = useState<"esquecidos" | "resolvidos">("esquecidos");
  const [abaVis, setAbaVis] = useState<"lista" | "quantitativo">("lista");
  const [busca, setBusca] = useState("");
  const [paginaEsq, setPaginaEsq] = useState(1);
  const POR_PAGINA = 100;
  const [substituir, setSubstituir] = useState(true);
  const [pdfExporting, setPdfExporting] = useState(false);
  const [jpegExporting, setJpegExporting] = useState(false);

  const [marcadorRes, setMarcadorResState] = useState<{ assyst: string; page: number } | null>(null);
  const marcadorResRef = useRef<HTMLTableRowElement>(null);
  const marcadorResNavigated = useRef(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const quantRef = useRef<HTMLDivElement>(null);

  const MARKER_RES_KEY = "redmine-resolvidos-marcador-res";

  useEffect(() => {
    const savedRes = localStorage.getItem(MARKER_RES_KEY);
    if (savedRes) { try { setMarcadorResState(JSON.parse(savedRes)); } catch {} }
  }, []);

  function toggleMarcadorRes(assyst: string, page: number) {
    const key = assyst.toUpperCase();
    if (marcadorRes?.assyst === key) {
      localStorage.removeItem(MARKER_RES_KEY);
      setMarcadorResState(null);
    } else {
      const val = { assyst: key, page };
      localStorage.setItem(MARKER_RES_KEY, JSON.stringify(val));
      setMarcadorResState(val);
    }
  }

  function load(pg = 1, buscaQ = "") {
    setLoading(true);
    const params = new URLSearchParams({ page: String(pg) });
    if (buscaQ) params.set("busca", buscaQ);
    fetch(`/api/redmine-resolvidos?${params}`)
      .then(r => r.json())
      .then((d: Dados) => { setDados(d); setLoading(false); });
  }

  useEffect(() => { load(); }, []);

  useEffect(() => {
    if (aba !== "resolvidos") return;
    const t = setTimeout(() => load(1, busca), 300);
    return () => clearTimeout(t);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [busca, aba]);

  useEffect(() => {
    if (!dados || !marcadorRes || marcadorResNavigated.current) return;
    marcadorResNavigated.current = true;
    setAba("resolvidos");
    load(marcadorRes.page, "");
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dados, marcadorRes]);

  useEffect(() => {
    if (aba === "resolvidos" && marcadorResRef.current) {
      setTimeout(() => marcadorResRef.current?.scrollIntoView({ behavior: "smooth", block: "center" }), 150);
    }
  }, [dados, aba]);

  // ─── dados quantitativos ─────────────────────────────────────────────────
  const totalRedmine = dados?.totalRedmine ?? 0;
  const encontrados = dados?.encontrados ?? [];
  const esquecidos = dados?.esquecidos ?? [];
  const aguardandoEmChamados = dados?.aguardandoEmChamados ?? [];

  const qtdResolvidos = encontrados.length - aguardandoEmChamados.length;
  const qtdAguardando = aguardandoEmChamados.length;
  const qtdNaoResolvidos = esquecidos.length;

  const donutItens: DonutItem[] = [
    { label: "Resolvidos",              value: qtdResolvidos,    cor: "#22c55e" },
    { label: "Aguardando encerramento", value: qtdAguardando,    cor: "#eab308" },
    { label: "Nao resolvidos",          value: qtdNaoResolvidos, cor: "#ef4444" },
  ].filter(d => d.value > 0);

  // ─── PDF ─────────────────────────────────────────────────────────────────
  const gerarPDF = useCallback(() => {
    if (!dados) return;
    setPdfExporting(true);
    try {
      const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });

      doc.setFont("helvetica", "bold");
      doc.setFontSize(16);
      doc.setTextColor(30, 41, 59);
      doc.text("Redmine Resolvidos - Quantitativo", 14, 18);

      doc.setFont("helvetica", "normal");
      doc.setFontSize(9);
      doc.setTextColor(100, 116, 139);
      doc.text(`Total: ${totalRedmine} redmines`, 14, 24);
      doc.text(`Gerado em: ${new Date().toLocaleString("pt-BR")}`, 14, 29);

      // Cards resumo
      const cards = [
        { label: "Total Redmine",   value: String(totalRedmine),     cor: [30,41,59]   as [number,number,number] },
        { label: "Resolvidos",      value: String(qtdResolvidos),    cor: [22,163,74]  as [number,number,number] },
        { label: "Aguardando",      value: String(qtdAguardando),    cor: [161,98,7]   as [number,number,number] },
        { label: "Nao resolvidos",  value: String(qtdNaoResolvidos), cor: [185,28,28]  as [number,number,number] },
      ];
      const CW = 43; const CH = 18; let cxCard = 14;
      for (const c of cards) {
        doc.setFillColor(241, 245, 249);
        doc.roundedRect(cxCard, 34, CW, CH, 2, 2, "F");
        doc.setFontSize(7); doc.setTextColor(100, 116, 139); doc.setFont("helvetica", "normal");
        doc.text(c.label, cxCard + 3, 40);
        doc.setFontSize(14); doc.setTextColor(...c.cor); doc.setFont("helvetica", "bold");
        doc.text(c.value, cxCard + 3, 48);
        cxCard += CW + 3;
      }

      // Donut
      const SZ = 56; const DX = 14; const DY = 60;
      doc.setFontSize(10); doc.setTextColor(30, 41, 59); doc.setFont("helvetica", "bold");
      doc.text("Distribuicao dos Redmines", 14, 58);
      desenharDonutPDF(doc, donutItens, DX, DY, SZ);

      // Legenda ao lado do donut
      const LX = DX + SZ + 6;
      let ly = DY + 6;
      donutItens.forEach((item) => {
        const [r2, g2, b2] = hexToRgb(item.cor ?? "#6366f1");
        doc.setFillColor(r2, g2, b2);
        doc.circle(LX, ly, 2, "F");
        doc.setFontSize(8); doc.setTextColor(30, 41, 59); doc.setFont("helvetica", "normal");
        const pct2 = totalRedmine > 0 ? `${((item.value / totalRedmine) * 100).toFixed(1)}%` : "0%";
        doc.text(`${item.label}: ${item.value} (${pct2})`, LX + 4, ly + 1);
        ly += 9;
      });

      // Tabela resumo
      const tableY = DY + SZ + 10;
      doc.setFontSize(10); doc.setFont("helvetica", "bold"); doc.setTextColor(30, 41, 59);
      doc.text("Resumo", 14, tableY);

      const pct = (v: number) => totalRedmine > 0 ? `${((v / totalRedmine) * 100).toFixed(1)}%` : "0%";

      autoTable(doc, {
        startY: tableY + 4,
        head: [["Categoria", "Quantidade", "Percentual"]],
        body: [
          ["Total Redmine",           String(totalRedmine),     "100%"],
          ["Resolvidos",              String(qtdResolvidos),    pct(qtdResolvidos)],
          ["Aguardando encerramento", String(qtdAguardando),    pct(qtdAguardando)],
          ["Nao resolvidos",          String(qtdNaoResolvidos), pct(qtdNaoResolvidos)],
        ],
        styles: { fontSize: 9, textColor: [30, 41, 59] as [number,number,number] },
        headStyles: { fillColor: [30, 41, 59] as [number,number,number], textColor: [255, 255, 255] as [number,number,number], fontSize: 8 },
        alternateRowStyles: { fillColor: [241, 245, 249] as [number,number,number] },
        margin: { left: 14, right: 14 },
        theme: "striped",
      });

      doc.save("redmine-resolvidos-quantitativo.pdf");
    } finally {
      setPdfExporting(false);
    }
  }, [dados, donutItens, totalRedmine, qtdResolvidos, qtdAguardando, qtdNaoResolvidos]);

  // ─── JPEG ────────────────────────────────────────────────────────────────
  const exportarJPEG = useCallback(async () => {
    if (!quantRef.current) return;
    setJpegExporting(true);
    try {
      const { default: html2canvas } = await import("html2canvas");
      const c2 = await html2canvas(quantRef.current, { backgroundColor: "#0f172a", scale: 2, useCORS: true });
      const a = document.createElement("a");
      a.href = c2.toDataURL("image/jpeg", 0.92);
      a.download = "redmine-resolvidos-quantitativo.jpg";
      a.click();
    } finally {
      setJpegExporting(false);
    }
  }, []);

  async function handleImport() {
    if (selectedFiles.length === 0) return;
    setImporting(true);
    setImportResult(null);
    const texts = await Promise.all(selectedFiles.map(f => f.text()));
    const combined = texts[0] + (texts.length > 1
      ? "\n" + texts.slice(1).map(t => t.split("\n").slice(1).join("\n")).join("\n")
      : "");
    const res = await fetch(`/api/redmine-resolvidos?substituir=${substituir ? "1" : "0"}`, {
      method: "POST",
      headers: { "Content-Type": "text/plain" },
      body: combined,
    });
    const data = await res.json();
    if (res.ok) {
      setImportResult({ count: data.count, skipped: data.skipped });
      setImportModal(false);
      setSelectedFiles([]);
      load();
    } else {
      setImportResult({ error: data.error ?? "Erro ao importar" });
    }
    setImporting(false);
  }

  async function handleLimpar() {
    if (!confirm("Limpar todos os Resolvidos importados?")) return;
    await fetch("/api/redmine-resolvidos", { method: "DELETE" });
    load();
  }

  async function exportXLS() {
    if (!dados) return;
    setXlsExporting(true);
    try {
      const res = await fetch("/api/redmine-resolvidos?export=1");
      const exportData = await res.json();
      const todosResolvidos: Resolvido[] = exportData.resolvidos ?? [];

      function esc(s: string) {
        return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
      }

      const rows = todosResolvidos.map(r => {
        const redmineCell = `<a href="${esc(redmineUrl(r.numeroRedmine))}">${esc(r.numeroRedmine)}</a>`;
        const nums = splitAssyst(r.numerosAssyst);
        const assystCell = nums.length === 0
          ? esc(r.numerosAssyst)
          : nums.map(n => `<a href="${esc(assystUrl(n))}">${esc(n)}</a>`).join("<br>");
        return `<tr>
          <td>${redmineCell}</td>
          <td>${assystCell}</td>
          <td>${esc(r.tipo ?? "")}</td>
          <td>${esc(r.situacao ?? "")}</td>
        </tr>`;
      }).join("");

      const html = `<html xmlns:o="urn:schemas-microsoft-com:office:office"
        xmlns:x="urn:schemas-microsoft-com:office:excel"
        xmlns="http://www.w3.org/TR/REC-html40">
        <head><meta charset="UTF-8">
        <style>td{mso-wrap-text:auto;vertical-align:top;font-size:11pt;} th{background:#1e293b;color:#fff;font-size:11pt;}</style>
        </head><body>
        <table border="1">
          <tr>
            <th>Redmine #</th>
            <th>Nº Assyst</th>
            <th>Tipo</th>
            <th>Situação</th>
          </tr>
          ${rows}
        </table></body></html>`;

      const blob = new Blob([html], { type: "application/vnd.ms-excel;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "redmine-resolvidos.xls";
      a.click();
      URL.revokeObjectURL(url);
    } finally {
      setXlsExporting(false);
    }
  }

  const semResolvidoRaw = dados?.esquecidos ?? [];
  const comResolvido = dados?.encontrados ?? [];
  const resolvidos = dados?.resolvidos ?? [];
  const chamadosMap = dados?.chamadosMap ?? {};

  const buscaLow = busca.toLowerCase();
  const semResolvido = buscaLow
    ? semResolvidoRaw.filter(n => n.toLowerCase().includes(buscaLow))
    : semResolvidoRaw;

  const totalPaginasEsq = Math.max(1, Math.ceil(semResolvido.length / POR_PAGINA));
  const paginaEsqAtual = Math.min(paginaEsq, totalPaginasEsq);
  const semResolvidoPag = semResolvido.slice((paginaEsqAtual - 1) * POR_PAGINA, paginaEsqAtual * POR_PAGINA);

  const totalPaginasRes = dados?.totalPages ?? 1;
  const paginaResAtual = dados?.page ?? 1;
  const resolvidosPag = resolvidos;

  const resolvidosRedmineSet = new Set(dados?.resolvidosRedmineNums ?? []);

  const redmineToAssystMap = new Map<string, Set<string>>();
  for (const r of resolvidos) {
    const key = r.numeroRedmine.trim();
    if (!redmineToAssystMap.has(key)) redmineToAssystMap.set(key, new Set());
    for (const a of splitAssyst(r.numerosAssyst)) redmineToAssystMap.get(key)!.add(a.toUpperCase());
  }

  return (
    <div>
      <div className="flex flex-wrap items-start justify-between gap-3 mb-6">
        <div>
          <h2 className="text-xl font-semibold text-white">Redmine Resolvidos</h2>
          <p className="text-sm text-gray-400 mt-0.5">Comparativo entre Chamados Redmine e Resolvidos</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          {abaVis === "quantitativo" && dados && (
            <>
              <button onClick={gerarPDF} disabled={pdfExporting}
                className="bg-gray-700 hover:bg-gray-600 disabled:opacity-50 text-gray-200 text-sm font-medium px-4 py-2 rounded-lg transition">
                {pdfExporting ? "Gerando..." : "↓ PDF"}
              </button>
              <button onClick={exportarJPEG} disabled={jpegExporting}
                className="bg-gray-700 hover:bg-gray-600 disabled:opacity-50 text-gray-200 text-sm font-medium px-4 py-2 rounded-lg transition">
                {jpegExporting ? "Exportando..." : "↓ JPEG"}
              </button>
            </>
          )}
          {abaVis === "lista" && dados && resolvidos.length > 0 && (
            <>
              <button onClick={exportXLS} disabled={xlsExporting}
                className="bg-gray-700 hover:bg-gray-600 disabled:opacity-50 text-gray-200 text-sm font-medium px-4 py-2 rounded-lg transition">
                {xlsExporting ? "Exportando..." : "↓ Exportar XLS"}
              </button>
              <button onClick={handleLimpar}
                className="bg-gray-700 hover:bg-gray-600 text-gray-300 text-sm font-medium px-4 py-2 rounded-lg transition">
                Limpar resolvidos
              </button>
            </>
          )}
          <button onClick={() => { setImportModal(true); setSelectedFiles([]); setImportResult(null); }}
            className="bg-green-700 hover:bg-green-600 text-white text-sm font-medium px-4 py-2 rounded-lg transition">
            Importar Resolvidos
          </button>
        </div>
      </div>

      {/* Abas Lista / Quantitativo */}
      <div className="flex gap-1 mb-6">
        {(["lista","quantitativo"] as const).map(t => (
          <button key={t} onClick={() => setAbaVis(t)}
            className={`px-4 py-1.5 rounded-lg text-sm font-medium transition ${abaVis === t ? "bg-blue-600 text-white" : "bg-gray-800 text-gray-400 hover:bg-gray-700 hover:text-white"}`}>
            {t === "lista" ? "Lista" : "Quantitativo"}
          </button>
        ))}
      </div>

      {abaVis === "lista" && (
        <>
          <div className="flex items-center gap-3 mb-6 flex-wrap">
            <a href="/redmine-resolvidos/como-funciona" target="_blank" rel="noopener noreferrer"
              className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg bg-blue-900/30 border border-blue-700/40 text-blue-400 hover:bg-blue-800/40 hover:text-blue-300 transition font-medium">
              <span>ℹ</span> Como funciona?
            </a>
          </div>

          {dados && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
              <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
                <p className="text-xs text-gray-400 mb-1">Total Redmine</p>
                <p className="text-3xl font-bold text-white">{dados.totalRedmine}</p>
                {dados.ultimaImportacao && (
                  <p className="text-xs text-blue-400 mt-2">
                    Atualizado: {new Date(dados.ultimaImportacao).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" })}
                  </p>
                )}
              </div>
              <a href="/chamados?filtro=redmine-resolvido"
                className={`rounded-xl p-4 border text-left transition block ${aguardandoEmChamados.length > 0 ? "bg-orange-950/30 border-orange-600 hover:bg-orange-950/50 animate-pulse" : "bg-gray-900 border-gray-800"}`}>
                <p className="text-xs text-gray-400 mb-1">Aguardando encerramento em Chamados</p>
                <p className={`text-3xl font-bold ${aguardandoEmChamados.length > 0 ? "text-orange-400" : "text-white"}`}>{aguardandoEmChamados.length}</p>
                {aguardandoEmChamados.length > 0 && (
                  <p className="text-xs text-orange-500 mt-1">⚡ Ver filtrado em Chamados →</p>
                )}
              </a>
              <button
                onClick={() => { setAba("esquecidos"); setPaginaEsq(1); }}
                className={`rounded-xl p-4 border text-left transition ${aba === "esquecidos" ? "bg-red-900/40 border-red-500 ring-2 ring-red-400 animate-pulse" : semResolvido.length > 0 ? "bg-red-950/30 border-red-700 hover:bg-red-900/20" : "bg-gray-900 border-gray-800"}`}>
                <p className="text-xs text-gray-400 mb-1">Não resolvidos</p>
                <p className={`text-3xl font-bold ${semResolvido.length > 0 ? "text-red-400" : "text-white"}`}>{semResolvido.length}</p>
                {semResolvido.length > 0 && <p className="text-xs text-red-400 mt-1">⚠ Clique para ver</p>}
              </button>
              <button
                onClick={() => { setAba("resolvidos"); }}
                className={`rounded-xl p-4 border text-left transition ${aba === "resolvidos" ? "bg-green-900/40 border-green-500 ring-2 ring-green-400 animate-pulse" : "bg-gray-900 border-gray-800 hover:bg-gray-800"}`}>
                <p className="text-xs text-gray-400 mb-1">Encontrados nos Resolvidos</p>
                <p className="text-3xl font-bold text-green-400">{comResolvido.length}</p>
                <p className="text-xs text-green-600 mt-1">Clique para ver</p>
              </button>
            </div>
          )}

          {dados && (dados.totalResolvidos > 0 || semResolvidoRaw.length > 0) && (
            <div className="mb-4">
              <div className="relative w-fit">
                <input
                  type="text"
                  value={busca}
                  onChange={e => { setBusca(e.target.value); setPaginaEsq(1); }}
                  placeholder="Pesquisar chamado..."
                  className="bg-gray-900 border border-gray-700 text-white text-xs rounded-lg pl-7 pr-7 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 min-w-[220px]"
                />
                <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-500 text-xs pointer-events-none">🔍</span>
                {busca && (
                  <button onClick={() => setBusca("")} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white text-xs">✕</button>
                )}
              </div>
            </div>
          )}

          <div className="bg-gray-900 rounded-xl border border-gray-800 overflow-x-auto">
            {loading ? (
              <p className="px-4 py-8 text-center text-gray-500 text-sm">Carregando...</p>
            ) : !dados || resolvidos.length === 0 ? (
              <p className="px-4 py-12 text-center text-gray-500 text-sm">
                {dados?.totalRedmine === 0
                  ? "Nenhum Chamado Redmine importado ainda. Importe os chamados primeiro."
                  : "Nenhum arquivo de Resolvidos importado. Clique em \"Importar Resolvidos\"."}
              </p>
            ) : aba === "esquecidos" ? (
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-800 text-gray-400 text-xs uppercase tracking-wide">
                    <th className="text-left px-4 py-3">Nº Chamado (Assyst)</th>
                    <th className="text-left px-4 py-3">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {semResolvido.length === 0 ? (
                    <tr><td colSpan={2} className="px-4 py-8 text-center text-green-400 text-sm">Todos os chamados foram resolvidos!</td></tr>
                  ) : semResolvidoPag.map(num => (
                    <tr key={num} className="border-b border-gray-800 last:border-0 bg-red-950/20 border-l-2 border-l-red-600 hover:bg-red-950/30 transition">
                      <td className="px-4 py-3">
                        <a href={assystUrl(num)} target="_blank" rel="noopener noreferrer"
                          className="font-mono text-sm text-blue-400 hover:text-blue-300 hover:underline transition">
                          {num}
                        </a>
                      </td>
                      <td className="px-4 py-3">
                        <span className="inline-flex items-center gap-1 text-xs font-bold px-2 py-0.5 rounded-full bg-red-600 text-white animate-pulse">
                          ⚠ Ainda não resolvido
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <table className="w-full min-w-[900px] text-sm">
                <thead>
                  <tr className="border-b border-gray-800 text-gray-400 text-xs uppercase tracking-wide">
                    <th className="text-left px-4 py-3 whitespace-nowrap">Redmine #</th>
                    <th className="text-left px-4 py-3 whitespace-nowrap">Nº Assyst</th>
                    <th className="text-left px-4 py-3 whitespace-nowrap">Tipo</th>
                    <th className="text-left px-4 py-3 whitespace-nowrap">Situação</th>
                  </tr>
                </thead>
                <tbody>
                  {resolvidosPag.flatMap(r => {
                    const nums = splitAssyst(r.numerosAssyst);
                    const esMarcado = marcadorRes ? nums.some(n => n.toUpperCase() === marcadorRes.assyst) : false;
                    const rows = [];
                    if (esMarcado) {
                      rows.push(
                        <tr key={`div-${r.id}`}>
                          <td colSpan={4} className="px-4 py-2 bg-blue-950/50 border-y border-blue-500/40">
                            <span className="text-xs text-blue-300 font-semibold flex items-center gap-2">
                              📍 Você parou aqui — continue a partir deste chamado
                            </span>
                          </td>
                        </tr>
                      );
                    }
                    rows.push(
                      <tr key={r.id} ref={esMarcado ? marcadorResRef : undefined}
                        className={`border-b border-gray-800 last:border-0 transition border-l-2 ${esMarcado ? "bg-blue-950/20 border-l-blue-500 hover:bg-blue-950/30" : "border-l-transparent hover:bg-gray-800/50"}`}>
                        <td className="px-4 py-3">
                          <a href={redmineUrl(r.numeroRedmine)} target="_blank" rel="noopener noreferrer"
                            className="font-mono text-xs text-blue-400 hover:text-blue-300 hover:underline transition">
                            {r.numeroRedmine}
                          </a>
                        </td>
                        <td className="px-4 py-3 text-xs">
                          {nums.length > 0 ? (
                            <div className="flex flex-col gap-1">
                              {nums.map(n => {
                                const dias = diasAberto(chamadosMap[n.toUpperCase()]);
                                const esMarcadoAssyst = marcadorRes?.assyst === n.toUpperCase();
                                return (
                                  <div key={n} className="flex items-center gap-1.5">
                                    <button onClick={() => toggleMarcadorRes(n, paginaResAtual)}
                                      title={esMarcadoAssyst ? "Remover marcador" : "Marcar posição aqui"}
                                      className={`text-sm leading-none transition shrink-0 ${esMarcadoAssyst ? "text-blue-400 hover:text-gray-500" : "text-gray-700 hover:text-blue-400"}`}>
                                      📍
                                    </button>
                                    <a href={assystUrl(n)} target="_blank" rel="noopener noreferrer"
                                      className={`font-mono hover:underline transition ${esMarcadoAssyst ? "text-blue-300 font-bold" : "text-blue-400 hover:text-blue-300"}`}>
                                      {n}
                                    </a>
                                    {dias !== null && (
                                      <span title="Chamado atrasado" className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-red-600 text-white text-xs font-bold animate-pulse whitespace-nowrap cursor-help">
                                        ⚠ {dias}d
                                      </span>
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          ) : <span className="text-gray-500">—</span>}
                        </td>
                        <td className="px-4 py-3 text-xs text-gray-400 whitespace-nowrap">{r.tipo ?? "—"}</td>
                        <td className="px-4 py-3">
                          {r.situacao ? (
                            <span className="text-xs px-2 py-0.5 rounded-full whitespace-nowrap bg-green-500/20 text-green-400 border border-green-500/30">{r.situacao}</span>
                          ) : "—"}
                        </td>
                      </tr>
                    );
                    return rows;
                  })}
                </tbody>
              </table>
            )}
          </div>

          {aba === "esquecidos" && totalPaginasEsq > 1 && semResolvido.length > 0 && (
            <div className="flex items-center justify-between mt-4 px-1">
              <p className="text-xs text-gray-500">
                Exibindo <span className="text-gray-300">{(paginaEsqAtual - 1) * POR_PAGINA + 1}–{Math.min(paginaEsqAtual * POR_PAGINA, semResolvido.length)}</span> de <span className="text-gray-300">{semResolvido.length}</span> registros
              </p>
              <div className="flex items-center gap-2">
                <button onClick={() => setPaginaEsq(p => Math.max(1, p - 1))} disabled={paginaEsqAtual === 1}
                  className="px-3 py-1.5 text-xs rounded-lg bg-gray-800 hover:bg-gray-700 disabled:opacity-40 text-gray-300 transition">
                  ← Anterior
                </button>
                <span className="text-xs text-gray-400">Página {paginaEsqAtual} de {totalPaginasEsq}</span>
                <button onClick={() => setPaginaEsq(p => Math.min(totalPaginasEsq, p + 1))} disabled={paginaEsqAtual === totalPaginasEsq}
                  className="px-3 py-1.5 text-xs rounded-lg bg-gray-800 hover:bg-gray-700 disabled:opacity-40 text-gray-300 transition">
                  Próxima →
                </button>
              </div>
            </div>
          )}
          {aba === "resolvidos" && totalPaginasRes > 1 && (dados?.totalResolvidos ?? 0) > 0 && (
            <div className="flex items-center justify-between mt-4 px-1">
              <p className="text-xs text-gray-500">
                Exibindo <span className="text-gray-300">{(paginaResAtual - 1) * POR_PAGINA + 1}–{Math.min(paginaResAtual * POR_PAGINA, dados?.totalResolvidos ?? 0)}</span> de <span className="text-gray-300">{dados?.totalResolvidos ?? 0}</span> registros
              </p>
              <div className="flex items-center gap-2">
                <button onClick={() => load(paginaResAtual - 1, busca)} disabled={paginaResAtual === 1}
                  className="px-3 py-1.5 text-xs rounded-lg bg-gray-800 hover:bg-gray-700 disabled:opacity-40 text-gray-300 transition">
                  ← Anterior
                </button>
                <span className="text-xs text-gray-400">Página {paginaResAtual} de {totalPaginasRes}</span>
                <button onClick={() => load(paginaResAtual + 1, busca)} disabled={paginaResAtual === totalPaginasRes}
                  className="px-3 py-1.5 text-xs rounded-lg bg-gray-800 hover:bg-gray-700 disabled:opacity-40 text-gray-300 transition">
                  Próxima →
                </button>
              </div>
            </div>
          )}
        </>
      )}

      {/* ─── QUANTITATIVO ─── */}
      {abaVis === "quantitativo" && (
        <div ref={quantRef}>
          {loading ? (
            <p className="py-12 text-center text-gray-500 text-sm">Carregando...</p>
          ) : !dados ? (
            <p className="py-12 text-center text-gray-500 text-sm">Nenhum dado disponível.</p>
          ) : (
            <>
              {/* Cards */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
                  <p className="text-xs text-gray-400 mb-1">Total Redmine</p>
                  <p className="text-3xl font-bold text-white">{totalRedmine}</p>
                </div>
                <div className="bg-gray-900 border border-green-800/40 rounded-xl p-4">
                  <p className="text-xs text-gray-400 mb-1">Resolvidos</p>
                  <p className="text-3xl font-bold text-green-400">{qtdResolvidos}</p>
                  {totalRedmine > 0 && <p className="text-xs text-gray-500 mt-1">{((qtdResolvidos/totalRedmine)*100).toFixed(1)}%</p>}
                </div>
                <div className={`bg-gray-900 rounded-xl p-4 border ${qtdAguardando > 0 ? "border-yellow-700/60" : "border-gray-800"}`}>
                  <p className="text-xs text-gray-400 mb-1">Aguardando encerramento</p>
                  <p className={`text-3xl font-bold ${qtdAguardando > 0 ? "text-yellow-400" : "text-white"}`}>{qtdAguardando}</p>
                  {totalRedmine > 0 && <p className="text-xs text-gray-500 mt-1">{((qtdAguardando/totalRedmine)*100).toFixed(1)}%</p>}
                </div>
                <div className={`bg-gray-900 rounded-xl p-4 border ${qtdNaoResolvidos > 0 ? "border-red-700/60" : "border-gray-800"}`}>
                  <p className="text-xs text-gray-400 mb-1">Não resolvidos</p>
                  <p className={`text-3xl font-bold ${qtdNaoResolvidos > 0 ? "text-red-400" : "text-white"}`}>{qtdNaoResolvidos}</p>
                  {totalRedmine > 0 && <p className="text-xs text-gray-500 mt-1">{((qtdNaoResolvidos/totalRedmine)*100).toFixed(1)}%</p>}
                </div>
              </div>

              {/* Donut */}
              {donutItens.length > 0 && (
                <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 mb-6">
                  <p className="text-sm font-semibold text-white mb-4">Total Redmine vs Resolvidos</p>
                  <DonutChart itens={donutItens} />
                </div>
              )}

              {totalRedmine === 0 && (
                <p className="py-12 text-center text-gray-500 text-sm">
                  Nenhum Chamado Redmine importado ainda.
                </p>
              )}
            </>
          )}
        </div>
      )}

      {/* Modal Importar */}
      {importModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 px-4">
          <div className="bg-gray-900 border border-gray-800 rounded-xl w-full max-w-md p-6">
            <h3 className="text-base font-semibold text-white mb-1">Importar Redmine Resolvidos</h3>
            <p className="text-xs text-gray-400 mb-3">Selecione o arquivo CSV exportado do Redmine com os chamados resolvidos.</p>
            <div className="mb-3 flex gap-3">
              <label className={`flex-1 flex items-start gap-2 cursor-pointer rounded-lg border p-3 transition ${substituir ? "border-blue-500 bg-blue-950/30" : "border-gray-700 hover:border-gray-600"}`}>
                <input type="radio" name="modo-resolvidos" checked={substituir} onChange={() => setSubstituir(true)} className="accent-blue-500 mt-0.5 shrink-0" />
                <div>
                  <p className="text-xs text-white font-medium">Substituir dados</p>
                  <p className="text-[11px] text-gray-400 mt-0.5">Substitui tudo. Chamados ativos no Assyst são protegidos automaticamente.</p>
                </div>
              </label>
              <label className={`flex-1 flex items-start gap-2 cursor-pointer rounded-lg border p-3 transition ${!substituir ? "border-green-500 bg-green-950/30" : "border-gray-700 hover:border-gray-600"}`}>
                <input type="radio" name="modo-resolvidos" checked={!substituir} onChange={() => setSubstituir(false)} className="accent-green-500 mt-0.5 shrink-0" />
                <div>
                  <p className="text-xs text-white font-medium">Adicionar aos existentes</p>
                  <p className="text-[11px] text-gray-400 mt-0.5">Insere apenas registros novos. Nada é removido. Ideal para lotes históricos.</p>
                </div>
              </label>
            </div>
            <div className="border-2 border-dashed border-gray-700 hover:border-green-600 rounded-lg p-6 text-center cursor-pointer transition"
              onClick={() => fileRef.current?.click()}>
              <p className="text-gray-400 text-sm">
                {selectedFiles.length === 0 ? "Clique para selecionar os arquivos (.csv)" : selectedFiles.length === 1 ? selectedFiles[0].name : `${selectedFiles.length} arquivos selecionados`}
              </p>
              {selectedFiles.length > 1 && <p className="text-xs text-gray-500 mt-1">{selectedFiles.map(f => f.name).join(", ")}</p>}
              {importResult?.error && <p className="text-red-400 text-xs mt-2">{importResult.error}</p>}
            </div>
            <input ref={fileRef} type="file" accept=".csv,.txt" multiple className="hidden" onChange={e => { setSelectedFiles(Array.from(e.target.files ?? [])); setImportResult(null); }} />
            <div className="flex gap-2 mt-4">
              <button onClick={() => { setImportModal(false); setSelectedFiles([]); setImportResult(null); }}
                className="flex-1 bg-gray-800 hover:bg-gray-700 text-gray-300 text-sm rounded-lg py-2 transition">
                Cancelar
              </button>
              <button onClick={handleImport} disabled={selectedFiles.length === 0 || importing}
                className="flex-1 bg-green-700 hover:bg-green-600 disabled:opacity-50 text-white text-sm font-medium rounded-lg py-2 transition">
                {importing ? "Importando..." : "Importar"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

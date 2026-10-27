"use client";

import { useState, useRef } from "react";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

// ─── Cores ────────────────────────────────────────────────────────────────────

const CORES_PRAZO  = ["#ef4444","#eab308","#22c55e"];
const CORES_CHART  = ["#4f8ef7","#34d399","#fb923c","#a78bfa","#f472b6","#38bdf8","#facc15","#4ade80","#e879f9","#2dd4bf"];

const SLA_RULES = [
  { keyword:"Cadastro", display:"Cadastro",     days:2  },
  { keyword:"Migra",    display:"Migracao",     days:15 },
  { keyword:"Orienta",  display:"Orientacao",   days:5  },
  { keyword:"Erro",     display:"Erro ou Falha",days:5  },
];

function hexToRgb(hex: string): [number,number,number] {
  return [parseInt(hex.slice(1,3),16),parseInt(hex.slice(3,5),16),parseInt(hex.slice(5,7),16)];
}

function pdfSafe(s: string) {
  return s.replace(/[^\x00-\xFF]/g,"").replace(/\s+/g," ").trim();
}

function fmtData(iso: string|null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("pt-BR");
}
function fmtImport(iso: string|null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("pt-BR",{dateStyle:"short",timeStyle:"short"});
}

// ─── Donut PDF ────────────────────────────────────────────────────────────────

function desenharDonut(
  doc: jsPDF,
  dados: {label:string;value:number}[],
  total: number,
  ox:number,oy:number,sz:number,
  cores?: string[],
  centroLabel?: string
) {
  const cx=ox+sz/2,cy=oy+sz/2,R=sz/2*0.90,ri=sz/2*0.44,STEPS=64;
  let ang=-Math.PI/2;
  dados.forEach((d,i)=>{
    const frac=d.value/total;
    const sa=ang,ea=ang+frac*2*Math.PI;ang=ea;
    const steps=Math.max(4,Math.ceil(STEPS*frac));
    const pts:[number,number][]=[];
    for(let j=0;j<=steps;j++){const a=sa+(ea-sa)*j/steps;pts.push([cx+R*Math.cos(a),cy+R*Math.sin(a)]);}
    for(let j=steps;j>=0;j--){const a=sa+(ea-sa)*j/steps;pts.push([cx+ri*Math.cos(a),cy+ri*Math.sin(a)]);}
    const pal=cores??CORES_CHART;
    const [r,g,b]=hexToRgb(pal[i%pal.length]);
    doc.setFillColor(r,g,b);doc.setDrawColor(255,255,255);doc.setLineWidth(0.35);
    const lines:[number,number][]=pts.slice(1).map((p,k)=>[p[0]-pts[k][0],p[1]-pts[k][1]]);
    doc.lines(lines,pts[0][0],pts[0][1],[1,1],"FD",true);
    if(frac>=0.03){
      const ma=sa+(ea-sa)/2,lr=(R+ri)/2;
      doc.setFontSize(6.5);doc.setTextColor(255,255,255);doc.setFont("helvetica","bold");
      doc.text(`${(frac*100).toFixed(1)}%`,cx+lr*Math.cos(ma),cy+lr*Math.sin(ma),{align:"center",baseline:"middle"});
    }
  });
  doc.setFillColor(255,255,255);doc.setDrawColor(255,255,255);doc.circle(cx,cy,ri,"F");
  doc.setFontSize(9);doc.setTextColor(30,41,59);doc.setFont("helvetica","bold");
  doc.text(total.toLocaleString("pt-BR"),cx,cy-1.5,{align:"center",baseline:"middle"});
  doc.setFontSize(5);doc.setTextColor(148,163,184);doc.setFont("helvetica","normal");
  doc.text(centroLabel??"CHAMADOS",cx,cy+3.5,{align:"center",baseline:"middle"});
}

// ─── Cards helper ─────────────────────────────────────────────────────────────

type Card = {label:string;value:string|number;cor:[number,number,number];sub?:string};

function desenharCards(doc:jsPDF, cards:Card[], y:number, cardW=43, cardH=18, gap=2, cpr=4): number {
  cards.forEach((c,i)=>{
    const col=i%cpr,row=Math.floor(i/cpr);
    const cx=14+col*(cardW+gap),cy=y+row*(cardH+4);
    doc.setFillColor(241,245,249);doc.roundedRect(cx,cy,cardW,cardH,2,2,"F");
    doc.setFontSize(6);doc.setTextColor(100,116,139);doc.setFont("helvetica","normal");
    doc.text(pdfSafe(c.label),cx+3,cy+5);
    doc.setFontSize(13);doc.setFont("helvetica","bold");doc.setTextColor(c.cor[0],c.cor[1],c.cor[2]);
    doc.text(String(c.value),cx+3,cy+14);
    if(c.sub){
      doc.setFontSize(6);doc.setFont("helvetica","normal");doc.setTextColor(100,116,139);
      doc.text(c.sub,cx+3,cy+cardH-2);
    }
  });
  return y+Math.ceil(cards.length/cpr)*(cardH+4)+4;
}

function cabecalhoSecao(doc:jsPDF,titulo:string,sub:string,y:number): number {
  doc.setFontSize(12);doc.setTextColor(30,41,59);doc.setFont("helvetica","bold");
  doc.text(titulo,14,y);y+=5;
  doc.setFontSize(7);doc.setTextColor(100,116,139);doc.setFont("helvetica","normal");
  doc.text(sub,14,y);
  return y+6;
}

function divisor(doc:jsPDF,y:number): number {
  doc.setDrawColor(200,210,220);doc.setLineWidth(0.3);doc.line(14,y,196,y);
  return y+8;
}

// ─── Seções PDF ───────────────────────────────────────────────────────────────

// 1. Chamados (principal)
type StatsChamados = {
  total:number;
  porEquipe:{equipe:string;total:number;usuarios:{nome:string;total:number}[]}[];
};
function secaoChamados(doc:jsPDF,s:StatsChamados,y:number): number {
  y=cabecalhoSecao(doc,"Chamados",`Total: ${s.total.toLocaleString("pt-BR")} chamados`,y);
  const donutItens=s.porEquipe.map(e=>({label:e.equipe,value:e.total}));
  const donutTotal=donutItens.reduce((a,d)=>a+d.value,0);
  if(donutTotal>0){
    const chartX=14,chartY=y,chartSz=78;
    desenharDonut(doc,donutItens,donutTotal,chartX,chartY,chartSz);
    const legX=chartX+chartSz+5;
    let legY=chartY+5;
    donutItens.forEach((d,i)=>{
      const [r,g,b]=hexToRgb(CORES_CHART[i%CORES_CHART.length]);
      doc.setFillColor(r,g,b);doc.rect(legX,legY-2.8,3.5,3.5,"F");
      const pct=((d.value/donutTotal)*100).toFixed(1);
      doc.setFontSize(7.5);doc.setTextColor(40,40,40);doc.setFont("helvetica","normal");
      doc.text(`${d.label}  ${d.value.toLocaleString("pt-BR")} (${pct}%)`,legX+4.8,legY);
      legY+=6.8;
    });
    y=chartY+chartSz+8;
  }
  for(const eq of s.porEquipe){
    const pct=((eq.total/s.total)*100).toFixed(1);
    const rows=eq.usuarios.map((u,i)=>{
      const over=eq.equipe!=="Supervisao"&&u.nome!=="(Triagem)"&&u.total>50;
      return{cells:[`${i+1}`,pdfSafe(u.nome),over?"ALTO":"",u.total.toLocaleString("pt-BR")],over};
    });
    autoTable(doc,{
      startY:y,
      head:[[{content:`${pdfSafe(eq.equipe)}  -  ${eq.total.toLocaleString("pt-BR")} chamados (${pct}%)`,colSpan:4}]],
      body:rows.map(r=>r.cells),
      columnStyles:{0:{cellWidth:10,halign:"center"},2:{cellWidth:20,halign:"center"},3:{cellWidth:22,halign:"right"}},
      headStyles:{fillColor:[30,41,59],textColor:[200,200,220],fontStyle:"bold",fontSize:9},
      bodyStyles:{fontSize:8.5,textColor:[40,40,40]},
      alternateRowStyles:{fillColor:[248,250,252]},
      margin:{left:14,right:14},
      didParseCell:(data)=>{
        if(data.section!=="body")return;
        const row=rows[data.row.index];
        if(!row?.over)return;
        data.cell.styles.textColor=[180,30,30];
        if(data.column.index===2){data.cell.styles.fontStyle="bold";data.cell.styles.fillColor=[255,235,235];}
      },
      didDrawPage:()=>{y=14;},
    });
    y=(doc as jsPDF&{lastAutoTable:{finalY:number}}).lastAutoTable.finalY+6;
  }
  return y;
}

// 2. Chamados Redmine
type StatsRedmine = {
  totalValidos:number;totalAtraso:number;totalAtencao:number;
  periodoMin:string|null;periodoMax:string|null;ultimaImportacao:string|null;
  porEquipe:{equipe:string;total:number}[];
};
function secaoRedmine(doc:jsPDF,s:StatsRedmine,y:number): number {
  const noPrazo=Math.max(0,s.totalValidos-s.totalAtraso-s.totalAtencao);
  y=cabecalhoSecao(doc,"Chamados Redmine",
    `Periodo: ${fmtData(s.periodoMin)} a ${fmtData(s.periodoMax)}   Atualizado: ${fmtImport(s.ultimaImportacao)}`,y);
  y=desenharCards(doc,[
    {label:"Total",              value:s.totalValidos, cor:[59,130,246]},
    {label:"Em atraso (>=50d)",  value:s.totalAtraso,  cor:[239,68,68]},
    {label:"Em atencao (30-50d)",value:s.totalAtencao, cor:[234,179,8]},
    {label:"No prazo",           value:noPrazo,        cor:[34,197,94]},
  ],y);
  const SZ=62,LX=14,RX=100;
  doc.setFontSize(7.5);doc.setTextColor(60,60,60);doc.setFont("helvetica","bold");
  doc.text("Por equipe",LX+SZ/2,y-2,{align:"center"});
  doc.text("Por prazo", RX+SZ/2,y-2,{align:"center"});
  const donutItens=s.porEquipe.map(e=>({label:e.equipe,value:e.total}));
  const prazoItens=[
    {label:"Em atraso (>=50d)",value:s.totalAtraso},
    {label:"Em atencao (30-50d)",value:s.totalAtencao},
    {label:"No prazo",value:noPrazo},
  ].filter(d=>d.value>0);
  if(donutItens.reduce((a,d)=>a+d.value,0)>0) desenharDonut(doc,donutItens,s.totalValidos,LX,y,SZ);
  if(prazoItens.reduce((a,d)=>a+d.value,0)>0) desenharDonut(doc,prazoItens,s.totalValidos,RX,y,SZ,CORES_PRAZO);
  return y+SZ+8;
}

// 3. Chamados Power BI
type StatsPowerbi = {
  totalValidos:number;totalAtraso:number;totalAtencao:number;
  periodoMin:string|null;periodoMax:string|null;ultimaImportacao:string|null;
  porCategoria:{categoria:string;total:number}[];
};
function secaoPowerbi(doc:jsPDF,s:StatsPowerbi,y:number): number {
  y=cabecalhoSecao(doc,"Chamados Power BI",
    `Periodo: ${fmtData(s.periodoMin)} a ${fmtData(s.periodoMax)}   Atualizado: ${fmtImport(s.ultimaImportacao)}`,y);
  function corCat(cat:string):[number,number,number]{
    if(cat.includes("Erro")||cat.includes("Falha")) return [239,68,68];
    if(cat.includes("Cadastro")) return [56,189,248];
    if(cat.includes("Migra"))    return [251,146,60];
    if(cat.includes("Orienta"))  return [34,197,94];
    return [59,130,246];
  }
  const allCards:Card[]=[
    {label:"Total",value:s.totalValidos,cor:[59,130,246]},
    ...s.porCategoria.map(c=>{
      const rule=SLA_RULES.find(r=>c.categoria.toLowerCase().includes(r.keyword.toLowerCase()));
      return {label:rule?.display??(c.categoria.length>18?c.categoria.slice(0,17)+"…":c.categoria),
              value:c.total,cor:corCat(c.categoria),sub:rule?`>=${rule.days} dias`:undefined};
    }),
  ];
  y=desenharCards(doc,allCards,y,43,23,2,4);
  const donutItens=s.porCategoria.map(c=>{
    const rule=SLA_RULES.find(r=>c.categoria.toLowerCase().includes(r.keyword.toLowerCase()));
    return {label:rule?.display??(c.categoria.length>16?c.categoria.slice(0,15)+"…":c.categoria),value:c.total};
  });
  const dt=donutItens.reduce((a,d)=>a+d.value,0);
  if(dt>0){
    const chartX=14,chartSz=78;
    doc.setFontSize(7.5);doc.setTextColor(60,60,60);doc.setFont("helvetica","bold");
    doc.text("Por categoria",chartX+chartSz/2,y-2,{align:"center"});
    desenharDonut(doc,donutItens,dt,chartX,y,chartSz);
    const legX=chartX+chartSz+5;
    let legY=y+5;
    donutItens.forEach((d,i)=>{
      const [r,g,b]=hexToRgb(CORES_CHART[i%CORES_CHART.length]);
      doc.setFillColor(r,g,b);doc.rect(legX,legY-2.8,3.5,3.5,"F");
      const pct2=((d.value/dt)*100).toFixed(1);
      doc.setFontSize(7.5);doc.setTextColor(40,40,40);doc.setFont("helvetica","normal");
      doc.text(`${d.label}  ${d.value.toLocaleString("pt-BR")} (${pct2}%)`,legX+4.8,legY);
      legY+=6.8;
    });
    y+=chartSz+8;
  }
  return y;
}

// 4. Dnpje Migração
type StatsDnpje = {
  total:number;totalAtraso:number;totalAtencao:number;
  periodoMin:string|null;periodoMax:string|null;ultimaImportacao:string|null;
  porEquipe:{equipe:string;total:number}[];
};
function secaoDnpje(doc:jsPDF,s:StatsDnpje,y:number): number {
  const noPrazo=Math.max(0,s.total-s.totalAtraso-s.totalAtencao);
  y=cabecalhoSecao(doc,"Dnpje Migracao",
    `Periodo: ${fmtData(s.periodoMin)} a ${fmtData(s.periodoMax)}   Atualizado: ${fmtImport(s.ultimaImportacao)}`,y);
  y=desenharCards(doc,[
    {label:"Total",              value:s.total,        cor:[59,130,246]},
    {label:"Em atraso (>=50d)",  value:s.totalAtraso,  cor:[239,68,68]},
    {label:"Em atencao (30-50d)",value:s.totalAtencao, cor:[234,179,8]},
    {label:"No prazo",           value:noPrazo,        cor:[34,197,94]},
  ],y);
  const SZ=62,LX=14,RX=100;
  doc.setFontSize(7.5);doc.setTextColor(60,60,60);doc.setFont("helvetica","bold");
  doc.text("Por equipe",LX+SZ/2,y-2,{align:"center"});
  doc.text("Por prazo", RX+SZ/2,y-2,{align:"center"});
  const donutItens=s.porEquipe.map(e=>({label:e.equipe,value:e.total}));
  const prazoItens=[
    {label:"Em atraso (>=50d)",value:s.totalAtraso},
    {label:"Em atencao (30-50d)",value:s.totalAtencao},
    {label:"No prazo",value:noPrazo},
  ].filter(d=>d.value>0);
  if(donutItens.reduce((a,d)=>a+d.value,0)>0) desenharDonut(doc,donutItens,s.total,LX,y,SZ);
  if(prazoItens.reduce((a,d)=>a+d.value,0)>0) desenharDonut(doc,prazoItens,s.total,RX,y,SZ,CORES_PRAZO);
  return y+SZ+8;
}

// 5. Redmine Resolvidos
type StatsResolvidos = {
  totalRedmine:number;
  encontrados:string[];esquecidos:string[];aguardandoEmChamados:string[];
};
function secaoResolvidos(doc:jsPDF,s:StatsResolvidos,y:number): number {
  const qtdResolvidos=s.encontrados.length-s.aguardandoEmChamados.length;
  const qtdAguardando=s.aguardandoEmChamados.length;
  const qtdNaoResolvidos=s.esquecidos.length;
  y=cabecalhoSecao(doc,"Redmine Resolvidos",`Total: ${s.totalRedmine.toLocaleString("pt-BR")} redmines`,y);
  y=desenharCards(doc,[
    {label:"Total Redmine",  value:s.totalRedmine,    cor:[30,41,59]},
    {label:"Resolvidos",     value:qtdResolvidos,     cor:[22,163,74]},
    {label:"Aguardando",     value:qtdAguardando,     cor:[161,98,7]},
    {label:"Nao resolvidos", value:qtdNaoResolvidos,  cor:[185,28,28]},
  ],y);
  const CORES_RES=["#22c55e","#eab308","#ef4444"];
  const donutItens=[
    {label:"Resolvidos",value:qtdResolvidos},
    {label:"Aguardando",value:qtdAguardando},
    {label:"Nao resolvidos",value:qtdNaoResolvidos},
  ].filter(d=>d.value>0);
  if(donutItens.length>0){
    const chartX=14,chartSz=56;
    doc.setFontSize(7.5);doc.setTextColor(60,60,60);doc.setFont("helvetica","bold");
    doc.text("Distribuicao",chartX+chartSz/2,y-2,{align:"center"});
    desenharDonut(doc,donutItens,s.totalRedmine,chartX,y,chartSz,CORES_RES,"REDMINES");
    const legX=chartX+chartSz+6;
    let legY=y+6;
    donutItens.forEach((item,i)=>{
      const [r2,g2,b2]=hexToRgb(CORES_RES[i%CORES_RES.length]);
      doc.setFillColor(r2,g2,b2);doc.circle(legX,legY,2,"F");
      doc.setFontSize(8);doc.setTextColor(30,41,59);doc.setFont("helvetica","normal");
      const pct2=s.totalRedmine>0?`${((item.value/s.totalRedmine)*100).toFixed(1)}%`:"0%";
      doc.text(`${item.label}: ${item.value} (${pct2})`,legX+4,legY+1);
      legY+=9;
    });
    y+=chartSz+10;
  }
  const pct=(v:number)=>s.totalRedmine>0?`${((v/s.totalRedmine)*100).toFixed(1)}%`:"0%";
  autoTable(doc,{
    startY:y,
    head:[["Categoria","Quantidade","Percentual"]],
    body:[
      ["Total Redmine",String(s.totalRedmine),"100%"],
      ["Resolvidos",String(qtdResolvidos),pct(qtdResolvidos)],
      ["Aguardando encerramento",String(qtdAguardando),pct(qtdAguardando)],
      ["Nao resolvidos",String(qtdNaoResolvidos),pct(qtdNaoResolvidos)],
    ],
    styles:{fontSize:9,textColor:[30,41,59] as [number,number,number]},
    headStyles:{fillColor:[30,41,59] as [number,number,number],textColor:[255,255,255] as [number,number,number],fontSize:8},
    alternateRowStyles:{fillColor:[241,245,249] as [number,number,number]},
    margin:{left:14,right:14},theme:"striped",
  });
  return (doc as jsPDF&{lastAutoTable:{finalY:number}}).lastAutoTable.finalY+6;
}

// 6. Redmine Atribuídos
type StatsAtribuidos = {
  totalGeral:number;emAtrasoTotal:number;emAcompanhamento:number;paraDevolver:number;
  contagemPorPessoa:{nome:string;total:number;emAtraso:number}[];
};
function secaoAtribuidos(doc:jsPDF,s:StatsAtribuidos,y0:number): number {
  let y=cabecalhoSecao(doc,"Redmine Atribuidos",`Total: ${s.totalGeral.toLocaleString("pt-BR")} atribuidos`,y0);
  y=desenharCards(doc,[
    {label:"Total",          value:s.totalGeral,       cor:[30,41,59]},
    {label:"Em atraso",      value:s.emAtrasoTotal,    cor:[185,28,28]},
    {label:"Para devolver",  value:s.paraDevolver,     cor:[161,98,7]},
    {label:"Em acomp.",      value:s.emAcompanhamento, cor:[194,65,12]},
  ],y);
  // Donut por prazo (igual à aba individual)
  const donutPrazo=[
    {label:"Em atraso",    value:s.emAtrasoTotal,    cor:"#ef4444"},
    {label:"Para devolver",value:s.paraDevolver,     cor:"#eab308"},
    {label:"Em acomp.",    value:s.emAcompanhamento, cor:"#fb923c"},
  ].filter(d=>d.value>0);
  if(donutPrazo.length>0){
    const chartX=14,chartSz=52;
    doc.setFontSize(7.5);doc.setTextColor(60,60,60);doc.setFont("helvetica","bold");
    doc.text("Por prazo",chartX+chartSz/2,y-2,{align:"center"});
    desenharDonut(doc,donutPrazo.map(d=>({label:d.label,value:d.value})),s.totalGeral,chartX,y,chartSz,donutPrazo.map(d=>d.cor),"REDMINES");
    const legX=chartX+chartSz+5;
    let legY=y+4;
    donutPrazo.forEach(item=>{
      const [r2,g2,b2]=hexToRgb(item.cor);
      doc.setFillColor(r2,g2,b2);doc.circle(legX,legY,1.8,"F");
      doc.setFontSize(8);doc.setTextColor(30,41,59);doc.setFont("helvetica","normal");
      const p=s.totalGeral>0?`${((item.value/s.totalGeral)*100).toFixed(1)}%`:"0%";
      doc.text(`${item.label}: ${item.value} (${p})`,legX+4,legY+1);
      legY+=8;
    });
    y+=chartSz+8;
  }
  if(s.contagemPorPessoa.length>0){
    doc.setFontSize(9);doc.setFont("helvetica","bold");doc.setTextColor(30,41,59);
    doc.text("Por responsavel",14,y);y+=3;
    autoTable(doc,{
      startY:y,
      head:[["#","Responsavel","Chamados","%","Em atraso"]],
      body:s.contagemPorPessoa.map((p,i)=>[
        String(i+1),pdfSafe(p.nome),String(p.total),
        s.totalGeral>0?`${((p.total/s.totalGeral)*100).toFixed(1)}%`:"0%",
        p.emAtraso>0?String(p.emAtraso):"-",
      ]),
      styles:{fontSize:8,textColor:[30,41,59] as [number,number,number]},
      headStyles:{fillColor:[30,41,59] as [number,number,number],textColor:[255,255,255] as [number,number,number],fontSize:7},
      alternateRowStyles:{fillColor:[241,245,249] as [number,number,number]},
      columnStyles:{0:{cellWidth:8},2:{halign:"center"},3:{halign:"center"},4:{halign:"center",textColor:[185,28,28] as [number,number,number]}},
      margin:{left:14,right:14},theme:"striped",
    });
    y=(doc as jsPDF & {lastAutoTable:{finalY:number}}).lastAutoTable.finalY+6;
  }
  return y;
}

// 7. Produtividade
type StatsProd = {
  totais:{recebidos:number;emAberto:number;pausados:number;resolvidos:number;taxaResolucao:number;tmrHoras:number;tmrDias:number};
};
function secaoProdutividade(doc:jsPDF,s:StatsProd,y:number): number {
  const t=s.totais;
  y=cabecalhoSecao(doc,"Produtividade",`Total recebidos: ${t.recebidos.toLocaleString("pt-BR")}`,y);
  y=desenharCards(doc,[
    {label:"Recebidos",        value:t.recebidos.toLocaleString("pt-BR"),  cor:[30,41,59]},
    {label:"Em Aberto",        value:t.emAberto.toLocaleString("pt-BR"),   cor:[234,179,8]},
    {label:"Pausados",         value:t.pausados.toLocaleString("pt-BR"),   cor:[194,65,12]},
    {label:"Resolvidos",       value:t.resolvidos.toLocaleString("pt-BR"), cor:[22,163,74]},
    {label:"Taxa Resolucao",   value:`${t.taxaResolucao.toFixed(1)}%`,     cor:[59,130,246]},
    {label:"TMR (dias)",       value:String(t.tmrDias||"—"),               cor:[100,116,139]},
  ],y);
  return y;
}

// ─── Seções disponíveis ───────────────────────────────────────────────────────

const SECOES = [
  { key:"chamados",   label:"Chamados",            icon:"🎫", api:"/api/chamados?stats=1" },
  { key:"redmine",    label:"Chamados Redmine",    icon:"🔴", api:"/api/chamados-redmine?stats=1" },
  { key:"powerbi",    label:"Chamados Power BI",   icon:"🟡", api:"/api/chamados-powerbi" },
  { key:"dnpje",      label:"Dnpje Migracao",      icon:"🟠", api:"/api/dnpje-migracao?stats=1" },
  { key:"resolvidos", label:"Redmine Resolvidos",  icon:"🟢", api:"/api/redmine-resolvidos" },
  { key:"atribuidos", label:"Redmine Atribuidos",  icon:"🔵", api:"/api/redmine-atribuidos" },
] as const;

type SecaoKey = typeof SECOES[number]["key"];

// ─── Component ───────────────────────────────────────────────────────────────

export default function RelatorioChamadosPage() {
  const [selecionados,setSelecionados]=useState<Set<SecaoKey>>(new Set(SECOES.map(s=>s.key)));
  const [ordemKeys,setOrdemKeys]=useState<SecaoKey[]>(SECOES.map(s=>s.key));
  const [gerando,setGerando]=useState(false);
  const [erro,setErro]=useState<string|null>(null);
  const dragIdx=useRef<number|null>(null);

  const secoesOrdenadas=ordemKeys.map(k=>SECOES.find(s=>s.key===k)!);

  function toggle(key:SecaoKey){
    setSelecionados(prev=>{const n=new Set(prev);n.has(key)?n.delete(key):n.add(key);return n;});
  }

  function onDragStart(i:number){dragIdx.current=i;}
  function onDragOver(e:React.DragEvent,i:number){
    e.preventDefault();
    if(dragIdx.current===null||dragIdx.current===i)return;
    const novo=[...ordemKeys];
    const[item]=novo.splice(dragIdx.current,1);
    novo.splice(i,0,item);
    dragIdx.current=i;
    setOrdemKeys(novo);
  }
  function onDragEnd(){dragIdx.current=null;}

  async function gerarPDF(){
    if(selecionados.size===0) return;
    setGerando(true);setErro(null);
    try {
      const secoesMap=Object.fromEntries(SECOES.map(s=>[s.key,s])) as Record<SecaoKey,typeof SECOES[number]>;
      const dataMap:Partial<Record<SecaoKey,unknown>>={};
      await Promise.all(
        ordemKeys.filter(k=>selecionados.has(k)).map(async k=>{
          dataMap[k]=await fetch(secoesMap[k].api).then(r=>r.json());
        })
      );

      const doc=new jsPDF({orientation:"portrait",unit:"mm",format:"a4"});
      const geradoEm=new Date().toLocaleString("pt-BR",{dateStyle:"short",timeStyle:"short"});
      doc.setFontSize(16);doc.setTextColor(30,41,59);doc.setFont("helvetica","bold");
      doc.text("Relatorio de Chamados",14,16);
      doc.setFontSize(8);doc.setTextColor(100,116,139);doc.setFont("helvetica","normal");
      doc.text(`Gerado em: ${geradoEm}`,14,23);

      let y=30;
      let primeiro=true;

      function novaSecao(minHeight=80){
        if(!primeiro){
          if(y>297-minHeight){doc.addPage();y=16;}
          else y=divisor(doc,y);
        }
        primeiro=false;
      }

      for(const key of ordemKeys){
        if(!selecionados.has(key)||!dataMap[key])continue;
        if(key==="chamados")      {novaSecao(80); y=secaoChamados(doc,dataMap[key] as StatsChamados,y);}
        if(key==="redmine")       {novaSecao(100);y=secaoRedmine(doc,dataMap[key] as StatsRedmine,y);}
        if(key==="powerbi")       {novaSecao(120);y=secaoPowerbi(doc,dataMap[key] as StatsPowerbi,y);}
        if(key==="dnpje")         {novaSecao(100);y=secaoDnpje(doc,dataMap[key] as StatsDnpje,y);}
        if(key==="resolvidos")    {novaSecao(90); y=secaoResolvidos(doc,dataMap[key] as StatsResolvidos,y);}
        if(key==="atribuidos")    {novaSecao(100);y=secaoAtribuidos(doc,dataMap[key] as StatsAtribuidos,y);}
        if(key==="produtividade") {novaSecao(60); secaoProdutividade(doc,dataMap[key] as StatsProd,y);}
      }

      doc.save(`relatorio-chamados-${new Date().toISOString().slice(0,10)}.pdf`);
    } catch(e) {
      console.error(e);
      setErro("Erro ao buscar dados. Verifique se todos os módulos selecionados têm dados importados.");
    } finally { setGerando(false); }
  }

  return (
    <div>
      <div className="mb-6">
        <h2 className="text-xl font-semibold text-white">Relatório de Chamados</h2>
        <p className="text-sm text-gray-400 mt-0.5">Selecione e arraste para reordenar as seções no PDF</p>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 mb-8">
        {secoesOrdenadas.map((s,i)=>{
          const ativo=selecionados.has(s.key);
          return (
            <div key={s.key}
              draggable
              onDragStart={()=>onDragStart(i)}
              onDragOver={e=>onDragOver(e,i)}
              onDragEnd={onDragEnd}
              className={`flex items-center gap-3 p-3 rounded-xl border-2 transition cursor-grab active:cursor-grabbing select-none
                ${ativo?"bg-blue-900/30 border-blue-500 ring-2 ring-blue-500/20":"bg-gray-900 border-gray-700 hover:border-gray-500"}`}>
              <span className="text-xl">{s.icon}</span>
              <div className="flex-1 min-w-0" onClick={()=>toggle(s.key)}>
                <p className={`font-semibold text-xs leading-tight ${ativo?"text-white":"text-gray-400"}`}>{s.label}</p>
                <p className="text-xs text-gray-500 mt-0.5">{ativo?"Incluído":"Excluído"}</p>
              </div>
              <div className={`w-4 h-4 rounded border-2 flex items-center justify-center shrink-0 cursor-pointer
                ${ativo?"bg-blue-500 border-blue-500":"border-gray-600"}`}
                onClick={()=>toggle(s.key)}>
                {ativo&&<span className="text-white text-xs leading-none">✓</span>}
              </div>
            </div>
          );
        })}
      </div>

      <div className="flex flex-wrap items-center gap-3 mb-4">
        <button onClick={()=>setSelecionados(new Set(SECOES.map(s=>s.key)))}
          className="text-xs text-gray-400 hover:text-white underline">Selecionar todos</button>
        <button onClick={()=>setSelecionados(new Set())}
          className="text-xs text-gray-400 hover:text-white underline">Limpar</button>
        <button onClick={()=>setOrdemKeys(SECOES.map(s=>s.key))}
          className="text-xs text-gray-400 hover:text-white underline">Restaurar ordem</button>
      </div>

      {erro&&(
        <div className="mb-4 px-4 py-3 rounded-lg bg-red-900/30 border border-red-700 text-red-300 text-sm">{erro}</div>
      )}

      <button onClick={gerarPDF} disabled={gerando||selecionados.size===0}
        className="bg-blue-600 hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold px-6 py-3 rounded-xl transition text-sm flex items-center gap-2">
        {gerando?(
          <><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"/>Gerando PDF...</>
        ):(
          <>↓ Gerar PDF — {selecionados.size} {selecionados.size===1?"seção":"seções"}</>
        )}
      </button>
    </div>
  );
}

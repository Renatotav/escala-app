export const cidMap: Record<string, string> = {
  // Infecções respiratórias
  "J00": "Nasofaringite aguda (resfriado comum)",
  "J01": "Sinusite aguda",
  "J02": "Faringite aguda",
  "J03": "Amigdalite aguda",
  "J04": "Laringite e traqueíte agudas",
  "J06": "Infecção aguda das vias aéreas superiores",
  "J09": "Influenza por vírus identificado",
  "J10": "Influenza (gripe) — vírus identificado",
  "J11": "Influenza (gripe) — vírus não identificado",
  "J18": "Pneumonia não especificada",
  "J20": "Bronquite aguda",
  "J22": "Infecção aguda não especificada das vias aéreas inferiores",
  "J45": "Asma",
  "J98": "Transtornos respiratórios outros",

  // Saúde mental
  "F32": "Episódio depressivo",
  "F33": "Transtorno depressivo recorrente",
  "F41": "Outros transtornos ansiosos",
  "F41.0": "Transtorno de pânico",
  "F41.1": "Transtorno de ansiedade generalizada",
  "F41.2": "Transtorno misto ansioso e depressivo",
  "F43": "Reações ao estresse grave e transtornos de adaptação",
  "F43.1": "Transtorno de estresse pós-traumático",
  "F43.2": "Transtorno de adaptação",
  "F48": "Outros transtornos neuróticos",
  "F10": "Transtornos mentais por uso de álcool",
  "F32.0": "Episódio depressivo leve",
  "F32.1": "Episódio depressivo moderado",
  "F32.2": "Episódio depressivo grave",

  // Sistema musculoesquelético
  "M54": "Dorsalgia",
  "M54.4": "Lumbago com ciática",
  "M54.5": "Dor lombar baixa",
  "M79": "Outros transtornos dos tecidos moles",
  "M79.1": "Mialgia",
  "M25": "Outros transtornos articulares",
  "M75": "Lesões do ombro",
  "M65": "Sinovite e tenossinovite",

  // Sistema digestivo
  "K21": "Doença do refluxo gastroesofágico",
  "K29": "Gastrite e duodenite",
  "K35": "Apendicite aguda",
  "K57": "Doença diverticular do intestino",
  "K59": "Outros transtornos funcionais do intestino",
  "K92": "Outras doenças do aparelho digestivo",

  // Sistema cardiovascular
  "I10": "Hipertensão arterial essencial",
  "I20": "Angina pectoris",
  "I21": "Infarto agudo do miocárdio",
  "I48": "Fibrilação e flutter atrial",
  "I50": "Insuficiência cardíaca",

  // Sintomas gerais
  "R51": "Cefaleia",
  "R10": "Dor abdominal",
  "R05": "Tosse",
  "R06": "Anormalidades da respiração",
  "R50": "Febre de causa desconhecida",
  "R53": "Mal-estar e fadiga",
  "R68": "Outros sintomas e sinais gerais",

  // Sistema urinário
  "N39.0": "Infecção do trato urinário",
  "N20": "Cálculo do rim e ureter (pedras nos rins)",
  "N23": "Cólica nefrética",

  // Traumatismos
  "S00": "Traumatismo superficial da cabeça",
  "S20": "Traumatismo superficial do tórax",
  "S60": "Traumatismo superficial do punho e mão",
  "S80": "Traumatismo superficial da perna",

  // Doenças infecciosas
  "A09": "Diarreia e gastroenterite de origem infecciosa",
  "A90": "Dengue",
  "A91": "Dengue hemorrágica",
  "B34": "Doença viral de localização não especificada",
  "B34.9": "Infecção viral não especificada",

  // Outros comuns
  "Z73.0": "Síndrome de esgotamento profissional (Burnout)",
  "Z73": "Problemas relacionados ao estilo de vida",
  "H10": "Conjuntivite",
  "H66": "Otite média",
  "L50": "Urticária",
  "E11": "Diabetes mellitus tipo 2",
  "E66": "Obesidade",
  "G43": "Enxaqueca",
  "G44": "Outras síndromes de cefaleia",
};

export function buscarCid(codigo: string): string | null {
  if (!codigo) return null;
  const upper = codigo.toUpperCase().trim();
  // Busca exata
  if (cidMap[upper]) return cidMap[upper];
  // Busca por prefixo (ex: F32.0 → tenta F32)
  const base = upper.split(".")[0];
  if (cidMap[base]) return cidMap[base];
  return null;
}

export function sugerirCids(query: string): { codigo: string; descricao: string }[] {
  if (!query || query.length < 2) return [];
  const q = query.toUpperCase().trim();
  return Object.entries(cidMap)
    .filter(([k, v]) => k.startsWith(q) || v.toLowerCase().includes(query.toLowerCase()))
    .slice(0, 8)
    .map(([codigo, descricao]) => ({ codigo, descricao }));
}

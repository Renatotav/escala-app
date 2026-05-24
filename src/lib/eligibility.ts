export type Sinal = "VERDE" | "AMARELO" | "VERMELHO";

export function calcularSinal(
  semanasPresencial: number,
  thresholdAmarelo: number,
  thresholdVerde: number
): Sinal {
  if (semanasPresencial >= thresholdVerde) return "VERDE";
  if (semanasPresencial >= thresholdAmarelo) return "AMARELO";
  return "VERMELHO";
}

export const sinalConfig: Record<Sinal, { label: string; bg: string; text: string; dot: string }> = {
  VERDE:    { label: "Elegível remoto",    bg: "bg-green-500/10",  text: "text-green-400",  dot: "bg-green-400" },
  AMARELO:  { label: "Quase elegível",     bg: "bg-yellow-500/10", text: "text-yellow-400", dot: "bg-yellow-400" },
  VERMELHO: { label: "Presencial",         bg: "bg-red-500/10",    text: "text-red-400",    dot: "bg-red-400" },
};

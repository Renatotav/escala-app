export default function AnalisadorChamadosPjePage() {
  return (
    <div className="-mx-2 -mt-14 -mb-4 md:-mx-4 md:-mt-6 md:-mb-6 h-dvh">
      <iframe
        src="/analisador-chamados.html"
        className="w-full h-full border-0"
        title="Analisador de Chamados PJe"
        sandbox="allow-scripts allow-same-origin"
      />
    </div>
  );
}

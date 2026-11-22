const SAFEGUARDS = [
  {
    title: "Isolamento por mandato (RLS)",
    description:
      "Políticas de Row Level Security em todas as tabelas impedem que qualquer gabinete acesse dados de outro.",
  },
  {
    title: "Registro completo de consentimento",
    description:
      "Origem, data, hora e versão do termo ficam salvos em trilha imutável a cada autorização ou revogação.",
  },
  {
    title: "Descadastro imediato",
    description:
      "Todo contato possui link exclusivo para revogar o consentimento em poucos segundos.",
  },
  {
    title: "Minimização de dados",
    description:
      "Sem coleta de CPF, religião, etnia, biometria ou opinião política detalhada.",
  },
  {
    title: "Auditoria de alterações",
    description:
      "Criação de links, edições cadastrais e revogações ficam registradas em log de auditoria.",
  },
  {
    title: "Zero disparo em massa",
    description:
      "Sem envio automático em lote e sem automação não oficial de WhatsApp.",
  },
];

export function Compliance() {
  return (
    <section id="lgpd-seguranca" className="bg-white py-16 sm:py-20">
      <div className="mx-auto max-w-5xl px-4 sm:px-6">
        <div className="rounded-2xl bg-brand-navy px-6 py-10 text-white sm:px-10 sm:py-12">
          <div className="max-w-xl">
            <p className="text-xs font-medium text-white/65">Privacidade</p>
            <h2 className="mt-2 text-2xl font-semibold tracking-tight text-white sm:text-3xl">
              Construído para conformidade desde a arquitetura
            </h2>
          </div>

          <div className="mt-8 grid gap-x-8 gap-y-6 sm:grid-cols-2 lg:grid-cols-3">
            {SAFEGUARDS.map((item) => (
              <div key={item.title} className="border-t border-white/10 pt-4">
                <h3 className="text-sm font-semibold text-white">
                  {item.title}
                </h3>
                <p className="mt-1 text-xs leading-relaxed text-white/70">
                  {item.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

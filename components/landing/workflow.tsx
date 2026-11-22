const STEPS = [
  {
    number: "01",
    title: "Crie o link de cadastro",
    description:
      "Divulgue em atendimentos, reuniões ou redes sociais. O cidadão informa apenas dados mínimos e confirma o consentimento.",
  },
  {
    number: "02",
    title: "Organize por cidade, bairro e tema",
    description:
      "Consulte e filtre sua base com isolamento por mandato garantido em nível de banco de dados.",
  },
  {
    number: "03",
    title: "Parabenize individualmente",
    description:
      "Veja quem faz aniversário hoje entre contatos consentidos e abra o contato individual pelo WhatsApp oficial.",
  },
];

export function Workflow() {
  return (
    <section
      id="como-funciona"
      className="border-y border-border-subtle bg-canvas py-16 sm:py-20"
    >
      <div className="mx-auto max-w-5xl px-4 sm:px-6">
        <div className="max-w-xl">
          <p className="text-xs font-medium text-ink-muted">Como funciona</p>
          <h2 className="mt-2 text-2xl font-semibold tracking-tight text-ink-primary sm:text-3xl">
            Simples no celular, organizado no gabinete
          </h2>
        </div>

        <ol className="mt-10 grid gap-8 md:grid-cols-3">
          {STEPS.map((step) => (
            <li key={step.number} className="space-y-2">
              <span className="text-xs font-semibold text-brand-emerald tabular-nums">
                {step.number}
              </span>
              <h3 className="text-base font-semibold text-ink-primary">
                {step.title}
              </h3>
              <p className="text-sm leading-relaxed text-ink-secondary">
                {step.description}
              </p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}

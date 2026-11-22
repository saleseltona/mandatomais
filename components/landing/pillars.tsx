const PILLARS = [
  {
    title: "Link público com consentimento explícito",
    description:
      "Página própria de cadastro com caixa de consentimento desmarcada por padrão e registro automático de origem, data, hora e versão do termo.",
  },
  {
    title: "Base organizada por cidade, bairro e interesse",
    description:
      "Filtros rápidos por território e tema de atuação, coletando apenas dados mínimos — sem CPF ou dados sensíveis.",
  },
  {
    title: "Aniversariantes do dia no WhatsApp oficial",
    description:
      "Lista diária apenas de contatos consentidos para envio individual e manual, sempre com opção de descadastro.",
  },
  {
    title: "Separação entre Mandato e Campanha",
    description:
      "Estrutura isolada desde o banco de dados para manter registros institucionais separados de bases eleitorais.",
  },
];

export function Pillars() {
  return (
    <section id="recursos" className="bg-white py-16 sm:py-20">
      <div className="mx-auto max-w-5xl px-4 sm:px-6">
        <div className="max-w-xl">
          <p className="text-xs font-medium text-ink-muted">Recursos</p>
          <h2 className="mt-2 text-2xl font-semibold tracking-tight text-ink-primary sm:text-3xl">
            O essencial para a rotina do gabinete
          </h2>
        </div>

        <div className="mt-10 divide-y divide-border-subtle border-y border-border-subtle sm:grid sm:grid-cols-2 sm:gap-x-10 sm:divide-y-0">
          {PILLARS.map((item) => (
            <div key={item.title} className="py-6 sm:border-b sm:border-border-subtle sm:last:border-b-0 sm:[&:nth-last-child(2)]:border-b-0">
              <h3 className="text-base font-semibold text-ink-primary">
                {item.title}
              </h3>
              <p className="mt-1.5 text-sm leading-relaxed text-ink-secondary">
                {item.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

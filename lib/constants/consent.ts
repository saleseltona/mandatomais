import { z } from "zod";

/**
 * Versão padrão do termo de consentimento do Mandato+.
 * Todo contato precisa registrar origem, data, hora e versão do consentimento.
 */
export const CURRENT_CONSENT_VERSION =
  process.env.NEXT_PUBLIC_CONSENT_VERSION ?? "1.0.0";

/**
 * Regra obrigatória: o checkbox de consentimento deve sempre iniciar desmarcado.
 */
export const CONSENT_CHECKBOX_DEFAULT_CHECKED = false as const;

/**
 * Texto institucional de consentimento explícito exibido nos formulários públicos.
 */
export const CONSENT_STATEMENT_PT_BR =
  "Autorizo expressamente o recebimento de comunicações institucionais e informativos deste mandato pelos canais informados, ciente de que posso revogar este consentimento e solicitar descadastro a qualquer momento.";

/**
 * Lista explícita de campos sensíveis proibidos no MVP (Regra 6 e 7).
 */
export const FORBIDDEN_MVP_FIELDS = [
  "cpf",
  "religiao",
  "etnia",
  "biometria",
  "opiniao_politica_detalhada",
] as const;

/**
 * Schema base de validação para consentimento explícito em cadastros públicos.
 */
export const consentInputSchema = z.object({
  consentAccepted: z.literal(true, {
    errorMap: () => ({
      message:
        "É obrigatório confirmar o consentimento explícito para concluir o cadastro.",
    }),
  }),
  consentSource: z
    .string()
    .trim()
    .min(2, "A origem do consentimento deve ser informada."),
  consentVersion: z
    .string()
    .trim()
    .min(1, "A versão do termo de consentimento é obrigatória.")
    .default(CURRENT_CONSENT_VERSION),
  dataScope: z.enum(["mandate", "campaign"]),
});

export type ConsentInput = z.infer<typeof consentInputSchema>;

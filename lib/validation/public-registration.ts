import { z } from "zod";
import { CURRENT_CONSENT_VERSION } from "@/lib/constants/consent";

export function normalizeWhatsapp(raw: string): string {
  return raw.replace(/\D/g, "");
}

export function isValidDayMonth(day: number, month: number): boolean {
  if (!Number.isInteger(day) || !Number.isInteger(month)) return false;
  if (month < 1 || month > 12 || day < 1) return false;
  if (month === 2) return day <= 29;
  if ([4, 6, 9, 11].includes(month)) return day <= 30;
  return day <= 31;
}

const optionalNumberField = (min: number, max: number, label: string) =>
  z.preprocess(
    (val) => {
      if (val === "" || val === null || val === undefined) return null;
      const parsed = Number(val);
      return Number.isNaN(parsed) ? val : parsed;
    },
    z
      .number({ invalid_type_error: `${label} inválido.` })
      .int(`${label} deve ser um número inteiro.`)
      .min(min, `${label} deve estar entre ${min} e ${max}.`)
      .max(max, `${label} deve estar entre ${min} e ${max}.`)
      .nullable()
  );

export const publicRegistrationSchema = z
  .object({
    fullName: z
      .string()
      .trim()
      .min(2, "Informe seu nome completo.")
      .max(120, "O nome pode ter no máximo 120 caracteres."),
    whatsapp: z
      .string()
      .trim()
      .optional()
      .transform((v) => (v ? normalizeWhatsapp(v) : ""))
      .refine(
        (v) => v === "" || (v.length >= 10 && v.length <= 13),
        "Informe um número de WhatsApp válido com DDD."
      ),
    email: z
      .string()
      .trim()
      .optional()
      .transform((v) => (v ? v.toLowerCase() : ""))
      .refine(
        (v) => v === "" || z.string().email().safeParse(v).success,
        "Informe um endereço de e-mail válido."
      ),
    city: z
      .string()
      .trim()
      .min(2, "Informe sua cidade.")
      .max(100, "A cidade pode ter no máximo 100 caracteres."),
    neighborhood: z
      .string()
      .trim()
      .max(100, "O bairro pode ter no máximo 100 caracteres.")
      .optional()
      .transform((v) => v ?? ""),
    instagramHandle: z
      .string()
      .trim()
      .max(60, "Usuário do Instagram muito longo.")
      .optional()
      .transform((v) => v ?? ""),
    birthDay: optionalNumberField(1, 31, "Dia de aniversário"),
    birthMonth: optionalNumberField(1, 12, "Mês de aniversário"),
    interestIds: z.array(z.string().uuid("Interesse inválido.")).default([]),
    consentAccepted: z.literal(true, {
      errorMap: () => ({
        message:
          "Você precisa marcar a caixa de consentimento explícito para concluir o cadastro.",
      }),
    }),
    consentVersion: z.string().trim().min(1).default(CURRENT_CONSENT_VERSION),
  })
  .strict()
  .superRefine((data, ctx) => {
    if (!data.whatsapp && !data.email) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["whatsapp"],
        message: "Informe pelo menos um canal de contato: WhatsApp ou e-mail.",
      });
    }

    const hasDay = data.birthDay !== null;
    const hasMonth = data.birthMonth !== null;
    if (hasDay !== hasMonth) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["birthDay"],
        message: "Para informar seu aniversário, preencha o dia e o mês.",
      });
    } else if (
      hasDay &&
      hasMonth &&
      !isValidDayMonth(data.birthDay!, data.birthMonth!)
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["birthDay"],
        message: "Data de aniversário inválida para o mês selecionado.",
      });
    }
  });

export type PublicRegistrationInput = z.infer<typeof publicRegistrationSchema>;

export const updateContactSchema = z
  .object({
    fullName: z
      .string()
      .trim()
      .min(2, "Informe o nome completo.")
      .max(120, "O nome pode ter no máximo 120 caracteres."),
    whatsapp: z
      .string()
      .trim()
      .optional()
      .transform((v) => (v ? normalizeWhatsapp(v) : ""))
      .refine(
        (v) => v === "" || (v.length >= 10 && v.length <= 13),
        "Informe um WhatsApp válido com DDD."
      ),
    email: z
      .string()
      .trim()
      .optional()
      .transform((v) => (v ? v.toLowerCase() : ""))
      .refine(
        (v) => v === "" || z.string().email().safeParse(v).success,
        "Informe um e-mail válido."
      ),
    city: z
      .string()
      .trim()
      .min(2, "Informe a cidade.")
      .max(100, "A cidade pode ter no máximo 100 caracteres."),
    neighborhood: z
      .string()
      .trim()
      .max(100, "O bairro pode ter no máximo 100 caracteres.")
      .optional()
      .transform((v) => v ?? ""),
    instagramHandle: z
      .string()
      .trim()
      .max(60, "Usuário do Instagram muito longo.")
      .optional()
      .transform((v) => v ?? ""),
    birthDay: optionalNumberField(1, 31, "Dia de aniversário"),
    birthMonth: optionalNumberField(1, 12, "Mês de aniversário"),
    interestIds: z.array(z.string().uuid("Interesse inválido.")).default([]),
  })
  .strict()
  .superRefine((data, ctx) => {
    if (!data.whatsapp && !data.email) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["whatsapp"],
        message: "Mantenha ao menos um canal de contato: WhatsApp ou e-mail.",
      });
    }

    const hasDay = data.birthDay !== null;
    const hasMonth = data.birthMonth !== null;
    if (hasDay !== hasMonth) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["birthDay"],
        message: "Preencha dia e mês juntos para o aniversário.",
      });
    } else if (
      hasDay &&
      hasMonth &&
      !isValidDayMonth(data.birthDay!, data.birthMonth!)
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["birthDay"],
        message: "Data de aniversário inválida para o mês selecionado.",
      });
    }
  });

export const bootstrapTenantSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, "Informe o nome do mandato ou parlamentar.")
    .max(100, "Máximo de 100 caracteres."),
  slug: z
    .string()
    .trim()
    .toLowerCase()
    .min(3, "O identificador deve ter pelo menos 3 caracteres.")
    .max(60, "O identificador pode ter no máximo 60 caracteres.")
    .regex(
      /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
      "Use apenas letras minúsculas, números e hífen (ex.: mandato-maria)."
    ),
  officeTitle: z
    .string()
    .trim()
    .max(80, "Cargo pode ter no máximo 80 caracteres.")
    .optional()
    .transform((v) => v || null),
  city: z
    .string()
    .trim()
    .max(80, "Cidade pode ter no máximo 80 caracteres.")
    .optional()
    .transform((v) => v || null),
  state: z
    .string()
    .trim()
    .toUpperCase()
    .optional()
    .transform((v) => v || null)
    .refine((v) => v === null || /^[A-Z]{2}$/.test(v), "Informe a UF com 2 letras (ex.: SP, MA)."),
});

export const createPublicLinkSchema = z.object({
  title: z
    .string()
    .trim()
    .min(3, "Informe um título com pelo menos 3 caracteres.")
    .max(120, "O título pode ter no máximo 120 caracteres."),
  slug: z
    .string()
    .trim()
    .toLowerCase()
    .min(3, "O identificador do link deve ter pelo menos 3 caracteres.")
    .max(60, "O identificador do link pode ter no máximo 60 caracteres.")
    .regex(
      /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
      "Use apenas letras minúsculas, números e hífen (ex.: gabinete-maria)."
    ),
  description: z
    .string()
    .trim()
    .max(300, "A descrição pode ter no máximo 300 caracteres.")
    .optional()
    .transform((v) => v || null),
  dataScope: z.enum(["mandate", "campaign"], {
    errorMap: () => ({ message: "Selecione o escopo: Mandato ou Campanha." }),
  }),
});

export const loginSchema = z.object({
  email: z.string().trim().email("Informe um e-mail válido."),
  password: z.string().min(6, "A senha deve ter pelo menos 6 caracteres."),
});

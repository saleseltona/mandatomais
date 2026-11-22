"use client";

import { useActionState } from "react";
import { Save } from "lucide-react";
import {
  updateContactAction,
  type UpdateContactActionState,
} from "@/app/painel/actions";
import { Button } from "@/components/ui/button";
import type { ContactWithInterests } from "@/lib/supabase/panel-data";
import type { Interest } from "@/lib/types/database";

const MONTHS = [
  { value: 1, label: "Janeiro" },
  { value: 2, label: "Fevereiro" },
  { value: 3, label: "Março" },
  { value: 4, label: "Abril" },
  { value: 5, label: "Maio" },
  { value: 6, label: "Junho" },
  { value: 7, label: "Julho" },
  { value: 8, label: "Agosto" },
  { value: 9, label: "Setembro" },
  { value: 10, label: "Outubro" },
  { value: 11, label: "Novembro" },
  { value: 12, label: "Dezembro" },
];

const DAYS = Array.from({ length: 31 }, (_, i) => i + 1);

const initialState: UpdateContactActionState = {
  error: null,
  success: null,
};

export function EditContactForm({
  contact,
  scopeInterests,
}: {
  contact: ContactWithInterests;
  scopeInterests: Interest[];
}) {
  const boundAction = updateContactAction.bind(null, contact.id);
  const [state, formAction, pending] = useActionState(
    boundAction,
    initialState
  );

  const selectedInterestIds = new Set(
    (contact.contact_interests ?? []).map((ci) => ci.interest_id)
  );

  return (
    <form action={formAction} className="space-y-4">
      {state.error ? (
        <div
          role="alert"
          className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800"
        >
          {state.error}
        </div>
      ) : null}

      {state.success ? (
        <div
          role="status"
          className="rounded-xl border border-secondary/30 bg-secondary/10 px-4 py-3 text-sm text-secondary"
        >
          {state.success}
        </div>
      ) : null}

      <div>
        <label
          htmlFor="edit-fullName"
          className="block text-xs font-semibold text-primary"
        >
          Nome completo
        </label>
        <input
          id="edit-fullName"
          name="fullName"
          type="text"
          required
          disabled={pending}
          defaultValue={contact.full_name}
          className="mt-1.5 block w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-primary focus:border-primary focus:outline-none"
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label
            htmlFor="edit-whatsapp"
            className="block text-xs font-semibold text-primary"
          >
            WhatsApp (com DDD)
          </label>
          <input
            id="edit-whatsapp"
            name="whatsapp"
            type="tel"
            disabled={pending}
            defaultValue={contact.whatsapp ?? ""}
            className="mt-1.5 block w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-primary focus:border-primary focus:outline-none"
          />
        </div>

        <div>
          <label
            htmlFor="edit-email"
            className="block text-xs font-semibold text-primary"
          >
            E-mail
          </label>
          <input
            id="edit-email"
            name="email"
            type="email"
            disabled={pending}
            defaultValue={contact.email ?? ""}
            className="mt-1.5 block w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-primary focus:border-primary focus:outline-none"
          />
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label
            htmlFor="edit-city"
            className="block text-xs font-semibold text-primary"
          >
            Cidade
          </label>
          <input
            id="edit-city"
            name="city"
            type="text"
            required
            disabled={pending}
            defaultValue={contact.city}
            className="mt-1.5 block w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-primary focus:border-primary focus:outline-none"
          />
        </div>

        <div>
          <label
            htmlFor="edit-neighborhood"
            className="block text-xs font-semibold text-primary"
          >
            Bairro
          </label>
          <input
            id="edit-neighborhood"
            name="neighborhood"
            type="text"
            disabled={pending}
            defaultValue={contact.neighborhood ?? ""}
            className="mt-1.5 block w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-primary focus:border-primary focus:outline-none"
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label
            htmlFor="edit-birthDay"
            className="block text-xs font-semibold text-primary"
          >
            Dia do aniversário
          </label>
          <select
            id="edit-birthDay"
            name="birthDay"
            disabled={pending}
            defaultValue={contact.birth_day ?? ""}
            className="mt-1.5 block w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-primary focus:border-primary focus:outline-none"
          >
            <option value="">Não informado</option>
            {DAYS.map((day) => (
              <option key={day} value={day}>
                {String(day).padStart(2, "0")}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label
            htmlFor="edit-birthMonth"
            className="block text-xs font-semibold text-primary"
          >
            Mês do aniversário
          </label>
          <select
            id="edit-birthMonth"
            name="birthMonth"
            disabled={pending}
            defaultValue={contact.birth_month ?? ""}
            className="mt-1.5 block w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-primary focus:border-primary focus:outline-none"
          >
            <option value="">Não informado</option>
            {MONTHS.map((m) => (
              <option key={m.value} value={m.value}>
                {m.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {scopeInterests.length > 0 ? (
        <fieldset className="space-y-2">
          <legend className="text-xs font-semibold text-primary">
            Temas de interesse
          </legend>
          <div className="flex flex-wrap gap-2">
            {scopeInterests.map((interest) => (
              <label
                key={interest.id}
                className="inline-flex cursor-pointer items-center gap-2 rounded-full border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-primary has-[:checked]:border-secondary has-[:checked]:bg-secondary/10 has-[:checked]:text-secondary"
              >
                <input
                  type="checkbox"
                  name="interestIds"
                  value={interest.id}
                  defaultChecked={selectedInterestIds.has(interest.id)}
                  disabled={pending}
                  className="h-3.5 w-3.5 accent-secondary"
                />
                <span>{interest.name}</span>
              </label>
            ))}
          </div>
        </fieldset>
      ) : null}

      <Button type="submit" variant="primary" size="md" disabled={pending}>
        <Save className="h-4 w-4" aria-hidden="true" />
        {pending ? "Salvando alterações..." : "Salvar alterações"}
      </Button>
    </form>
  );
}

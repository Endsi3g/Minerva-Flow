import * as React from "react";
import { FieldGroup, Field, FieldLabel, Input, FieldSeparator } from "minerva-flow";

// FieldSeparator is an absolutely-positioned divider meant to split two
// <Field>s inside a real <FieldGroup> — it only reads correctly there, so
// it's composed here in context (see design-sync's "compose
// context-required pieces").
export function InFieldGroup() {
  return (
    <div className="w-[320px]">
      <FieldGroup>
        <Field>
          <FieldLabel htmlFor="fs-code">Code promo</FieldLabel>
          <Input id="fs-code" placeholder="BIENVENUE10" />
        </Field>
        <FieldSeparator>OU</FieldSeparator>
        <Field>
          <FieldLabel htmlFor="fs-card">Carte fidélité</FieldLabel>
          <Input id="fs-card" placeholder="Numéro de carte" />
        </Field>
      </FieldGroup>
    </div>
  );
}

import * as React from "react";
import {
  Field,
  FieldLabel,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLegend,
  FieldSet,
  FieldContent,
  FieldTitle,
  Input,
} from "minerva-flow";

export function Default() {
  return (
    <div className="w-[320px]">
      <Field>
        <FieldLabel htmlFor="item-name">Nom du plat</FieldLabel>
        <Input id="item-name" defaultValue="Risotto aux champignons" />
        <FieldDescription>Affiché sur le menu et les factures.</FieldDescription>
      </Field>
    </div>
  );
}

export function WithError() {
  return (
    <div className="w-[320px]">
      <Field data-invalid="true">
        <FieldLabel htmlFor="item-price">Prix</FieldLabel>
        <Input id="item-price" defaultValue="0" aria-invalid />
        <FieldError>Le prix doit être supérieur à 0,00 $.</FieldError>
      </Field>
    </div>
  );
}

export function Horizontal() {
  return (
    <div className="w-[380px]">
      <Field orientation="horizontal">
        <FieldContent>
          <FieldTitle>Disponible à la commande en ligne</FieldTitle>
          <FieldDescription>
            Les clients pourront commander ce plat sur le site.
          </FieldDescription>
        </FieldContent>
      </Field>
    </div>
  );
}

export function EditorForm() {
  return (
    <div className="w-[360px]">
      <FieldSet>
        <FieldLegend>Nouvel article de menu</FieldLegend>
        <FieldGroup>
          <Field>
            <FieldLabel htmlFor="editor-name">Nom du plat</FieldLabel>
            <Input id="editor-name" placeholder="Ex. Burger Minerva" />
          </Field>
          <Field>
            <FieldLabel htmlFor="editor-category">Catégorie</FieldLabel>
            <Input id="editor-category" placeholder="Plat, entrée, dessert…" />
            <FieldDescription>
              Détermine la section du menu affichée aux clients.
            </FieldDescription>
          </Field>
        </FieldGroup>
      </FieldSet>
    </div>
  );
}

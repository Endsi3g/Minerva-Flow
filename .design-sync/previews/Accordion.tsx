import * as React from "react";
import {
  Accordion,
  AccordionItem,
  AccordionTrigger,
  AccordionContent,
  Badge,
} from "minerva-flow";

export function Default() {
  return (
    <Accordion defaultValue={["allergenes"]} className="w-[360px]">
      <AccordionItem value="allergenes">
        <AccordionTrigger>
          <span className="flex items-center gap-2">
            Allergènes déclarés
            <Badge tone="amber">6 articles</Badge>
          </span>
        </AccordionTrigger>
        <AccordionContent>
          Le Burger Minerva contient du gluten, des produits laitiers et des
          œufs. Une version sans gluten est disponible sur demande.
        </AccordionContent>
      </AccordionItem>
      <AccordionItem value="heures">
        <AccordionTrigger>Heures d'ouverture</AccordionTrigger>
        <AccordionContent>
          Mardi au dimanche, 11 h 30 à 22 h. Fermé le lundi.
        </AccordionContent>
      </AccordionItem>
      <AccordionItem value="livraison">
        <AccordionTrigger>Politique de livraison</AccordionTrigger>
        <AccordionContent>
          Livraison via Uber Direct dans un rayon de 8 km, frais de 5,00 $.
        </AccordionContent>
      </AccordionItem>
    </Accordion>
  );
}

export function MultipleOpen() {
  return (
    <Accordion defaultValue={["poste", "pourboires"]} multiple className="w-[360px]">
      <AccordionItem value="poste">
        <AccordionTrigger>
          <span className="flex items-center gap-2">
            Poste — Sam Bouchard
            <Badge tone="green" dot>
              En service
            </Badge>
          </span>
        </AccordionTrigger>
        <AccordionContent>
          Serveur, quart du jeudi 17 h–23 h, section Terrasse.
        </AccordionContent>
      </AccordionItem>
      <AccordionItem value="pourboires">
        <AccordionTrigger>Répartition des pourboires</AccordionTrigger>
        <AccordionContent>
          82,40 $ répartis entre 3 employés selon les heures travaillées.
        </AccordionContent>
      </AccordionItem>
      <AccordionItem value="notes">
        <AccordionTrigger>Notes du gérant</AccordionTrigger>
        <AccordionContent>Aucune note pour ce quart.</AccordionContent>
      </AccordionItem>
    </Accordion>
  );
}

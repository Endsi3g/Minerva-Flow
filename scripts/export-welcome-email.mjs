import { writeFileSync } from "node:fs";
import { renderWelcomeEmail } from "../lib/email/lifecycle-templates.ts";

const html = renderWelcomeEmail({ appUrl: "https://minervaflow.app" }).html.replace(/[ \t]+$/gm, "");

writeFileSync("emails/flow-bienvenue.html", html);
writeFileSync("public/emails/flow-bienvenue.html", html);
console.log("Modèle de bienvenue exporté depuis le shell Minerva Flow partagé.");

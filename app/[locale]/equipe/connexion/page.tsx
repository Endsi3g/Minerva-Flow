import type { Metadata } from "next";
import { TeamLoginCard } from "@/components/team-portal/TeamLoginCard";

export const metadata: Metadata = { title: "Espace équipe — Minerva Flow" };

export default function TeamLoginPage() {
  return <TeamLoginCard />;
}

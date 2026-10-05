import type { Metadata } from "next";
import { Link } from "@/i18n/navigation";
import { getAllBlogPosts } from "@/lib/blog/data";
import { Logo } from "@/components/shell/Logo";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { ArrowRight, Clock, Calendar, Sparkles, TrendingUp, Cpu, Users, MapPin } from "lucide-react";

export async function generateMetadata(): Promise<Metadata> {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://minervaflow.app";

  const title = "Minerva Flow | Conseils & Ratios pour Restaurateurs";
  const description =
    "Guides pratiques pour calculer vos coûts réels, connecter votre caisse Square ou Lightspeed et faire revenir vos clients sans carte papier.";

  return {
    title,
    description,
    alternates: {
      // Articles are written in French only: every locale points to the one French URL.
      canonical: `${baseUrl}/blog`,
    },
    openGraph: {
      title,
      description,
      url: `${baseUrl}/blog`,
      siteName: "Minerva Flow",
      type: "website",
      images: [
        {
          url: "/og.png",
          width: 1200,
          height: 630,
          alt: "Minerva Flow — Blog & Ratios d'Exploitation Restaurant",
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: ["/og.png"],
    },
  };
}

export default async function BlogIndexPage() {
  const posts = await getAllBlogPosts();
  const featuredPost = posts.find((p) => p.featured) || posts[0];
  const regularPosts = posts.filter((p) => p.id !== featuredPost?.id);

  return (
    <div className="min-h-screen bg-mv-cream text-mv-ink">
      {/* Top Luxury Navigation Bar */}
      <header className="sticky top-0 z-40 border-b border-mv-border-soft bg-mv-cream/90 backdrop-blur-md">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3.5 sm:px-6">
          <Link href="/blog" className="transition-opacity hover:opacity-85">
            <Logo size={28} />
          </Link>
          <nav className="flex items-center gap-3 sm:gap-4">
            <Link
              href="/ambassadeurs"
              className="hidden text-[13px] font-medium text-mv-ink-soft transition-colors hover:text-mv-ink sm:inline-block"
            >
              Programme Ambassadeurs
            </Link>
            <Link
              href="/login"
              className="text-[13px] font-medium text-mv-ink-soft transition-colors hover:text-mv-ink"
            >
              Connexion
            </Link>
            <Button href="/sign-up" size="sm" className="shadow-mv-sm">
              Créer mon compte <ArrowRight size={13} className="ml-1" />
            </Button>
          </nav>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-10 sm:px-6 sm:py-16">
        {/* Editorial Hero */}
        <section className="relative space-y-4 pb-10 text-center sm:pb-14">
          <div className="inline-flex items-center gap-2 rounded-full border border-mv-green/20 bg-mv-green-tint/60 px-3.5 py-1 text-[11px] font-semibold tracking-wider text-mv-green-dark uppercase">
            <Sparkles size={13} />
            Conseils pratiques pour restaurateurs
          </div>
          <h1 className="mx-auto max-w-4xl font-display text-4xl leading-tight font-normal text-mv-ink sm:text-5xl lg:text-6xl">
            Gagnez plus sur chaque repas servi.
          </h1>
          <p className="mx-auto max-w-2xl text-[15px] leading-relaxed text-mv-ink-soft sm:text-[16px]">
            Des calculs simples et des méthodes concrètes pour garder vos coûts sous contrôle et faire revenir vos clients.
          </p>

          {/* Pillars Bar */}
          <div className="mt-8 flex flex-wrap items-center justify-center gap-2 sm:gap-3">
            <div className="inline-flex items-center gap-1.5 rounded-xl border border-mv-border-soft bg-mv-surface px-3 py-1.5 text-[12px] font-medium text-mv-ink-soft shadow-xs">
              <TrendingUp size={14} className="text-mv-green-dark" /> Coûts réels &amp; Marges
            </div>
            <div className="inline-flex items-center gap-1.5 rounded-xl border border-mv-border-soft bg-mv-surface px-3 py-1.5 text-[12px] font-medium text-mv-ink-soft shadow-xs">
              <Cpu size={14} className="text-mv-green-dark" /> Caisses Square &amp; Lightspeed
            </div>
            <div className="inline-flex items-center gap-1.5 rounded-xl border border-mv-border-soft bg-mv-surface px-3 py-1.5 text-[12px] font-medium text-mv-ink-soft shadow-xs">
              <Users size={14} className="text-mv-green-dark" /> Cartes de fidélité sur mobile
            </div>
            <div className="inline-flex items-center gap-1.5 rounded-xl border border-mv-border-soft bg-mv-surface px-3 py-1.5 text-[12px] font-medium text-mv-ink-soft shadow-xs">
              <MapPin size={14} className="text-mv-green-dark" /> Google Maps &amp; Avis clients
            </div>
          </div>
        </section>

        {/* Featured Post Card */}
        {featuredPost && (
          <section className="mb-14">
            <Link
              href={`/blog/${featuredPost.slug}`}
              className="group relative block overflow-hidden rounded-3xl border border-mv-border bg-mv-surface shadow-mv-sm transition-all duration-300 hover:border-mv-green/40 hover:shadow-mv-md"
            >
              <div className="grid gap-8 p-6 sm:p-10 lg:grid-cols-12 lg:items-center">
                <div className="space-y-4 lg:col-span-7">
                  <div className="flex flex-wrap items-center gap-2.5">
                    <Badge variant="solid" tone="green" size="sm">
                      À la Une
                    </Badge>
                    <span className="text-[12px] font-medium text-mv-ink-faint">
                      {featuredPost.category}
                    </span>
                    <span className="text-mv-ink-faint">·</span>
                    <span className="inline-flex items-center gap-1 text-[12px] text-mv-ink-faint">
                      <Clock size={13} /> {featuredPost.readTimeMinutes} min de lecture
                    </span>
                  </div>

                  <h2 className="font-display text-2xl font-normal leading-snug text-mv-ink transition-colors group-hover:text-mv-green-dark sm:text-3xl lg:text-4xl">
                    {featuredPost.title}
                  </h2>

                  <p className="text-[14.5px] leading-relaxed text-mv-ink-soft line-clamp-3">
                    {featuredPost.description}
                  </p>

                  {/* Highlights Metrics */}
                  {featuredPost.metrics && (
                    <div className="grid grid-cols-2 gap-3 pt-2 sm:grid-cols-4">
                      {featuredPost.metrics.map((m) => (
                        <div
                          key={m.label}
                          className="rounded-xl border border-mv-border-soft bg-mv-cream-soft/60 p-2.5 text-center"
                        >
                          <div className="font-mono text-[16px] font-semibold text-mv-green-dark">
                            {m.value}
                          </div>
                          <div className="mt-0.5 text-[10.5px] font-medium text-mv-ink-soft">
                            {m.label}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  <div className="inline-flex items-center gap-2 pt-2 text-[13.5px] font-semibold text-mv-green-dark">
                    Lire l’analyse complète <ArrowRight size={15} className="transition-transform group-hover:translate-x-1" />
                  </div>
                </div>

                <div className="relative flex aspect-video w-full items-center justify-center overflow-hidden rounded-2xl border border-mv-border-soft bg-gradient-to-br from-mv-cream-soft via-mv-surface to-mv-green/10 p-6 lg:col-span-5">
                  <div className="text-center">
                    <span className="font-mono text-5xl font-bold tracking-tight text-mv-green-dark sm:text-6xl">
                      ×3,6
                    </span>
                    <p className="mt-2 font-display text-[15px] italic text-mv-ink">
                      Multiplication de la fréquence d’habitués
                    </p>
                    <p className="mt-1 text-[11px] text-mv-ink-faint">
                      Guides rédigés par l’équipe Minerva Flow
                    </p>
                  </div>
                </div>
              </div>
            </Link>
          </section>
        )}

        {/* Regular Articles Grid */}
        <section className="space-y-6">
          <div className="flex items-center justify-between border-b border-mv-border-soft pb-4">
            <h2 className="font-display text-2xl font-normal text-mv-ink sm:text-3xl">
              Articles &amp; Guides Opérationnels
            </h2>
            <span className="font-mono text-[13px] text-mv-ink-faint">
              {posts.length} analyses disponibles
            </span>
          </div>

          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {regularPosts.map((post) => (
              <article
                key={post.id}
                className="group flex flex-col justify-between rounded-2xl border border-mv-border-soft bg-mv-surface p-6 shadow-mv-sm transition-all duration-300 hover:border-mv-green/30 hover:shadow-mv-md"
              >
                <div className="space-y-3.5">
                  <div className="flex items-center justify-between text-[11.5px]">
                    <span className="rounded-md bg-mv-green-tint px-2 py-0.5 font-medium text-mv-green-dark">
                      {post.category}
                    </span>
                    <span className="inline-flex items-center gap-1 text-mv-ink-faint">
                      <Clock size={12} /> {post.readTimeMinutes} min
                    </span>
                  </div>

                  <h3 className="font-display text-xl font-normal leading-snug text-mv-ink transition-colors group-hover:text-mv-green-dark">
                    <Link href={`/blog/${post.slug}`} className="focus:outline-hidden">
                      {post.title}
                    </Link>
                  </h3>

                  <p className="text-[13.5px] leading-relaxed text-mv-ink-soft line-clamp-3">
                    {post.description}
                  </p>
                </div>

                <div className="mt-6 border-t border-mv-border-soft/60 pt-4">
                  <div className="flex items-center justify-between">
                    <span className="inline-flex items-center gap-1.5 text-[11.5px] text-mv-ink-faint">
                      <Calendar size={12} />
                      {new Date(post.publishedAt).toLocaleDateString("fr-CA", {
                        year: "numeric",
                        month: "short",
                        day: "numeric",
                      })}
                    </span>
                    <Link
                      href={`/blog/${post.slug}`}
                      className="inline-flex items-center gap-1 text-[12.5px] font-semibold text-mv-green-dark hover:underline"
                    >
                      Lire <ArrowRight size={13} className="transition-transform group-hover:translate-x-0.5" />
                    </Link>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </section>

        {/* Direct Call to Action Banner */}
        <section className="mt-16 rounded-3xl border border-mv-green/20 bg-gradient-to-br from-mv-green-dark to-[#083526] p-8 text-center text-mv-cream sm:p-12">
          <div className="mx-auto max-w-2xl space-y-4">
            <span className="rounded-full bg-mv-lime/20 px-3 py-1 font-mono text-[11px] font-semibold uppercase tracking-wider text-mv-lime">
              Prêt à voir vos vrais chiffres ?
            </span>
            <h2 className="font-display text-3xl font-normal text-mv-cream sm:text-4xl">
              Reprenez le contrôle de vos marges.
            </h2>
            <p className="text-[14.5px] leading-relaxed text-mv-cream/80">
              Branchez votre caisse Square ou Lightspeed en 2 minutes. Vos habitués reçoivent leur carte directement dans leur téléphone.
            </p>
            <div className="flex flex-wrap items-center justify-center gap-3 pt-3">
              <Button href="/sign-up" variant="lime" size="lg">
                Créer mon compte <ArrowRight size={15} />
              </Button>
              <Button
                href="/demo/calin-cafe"
                variant="outline"
                size="lg"
                className="border-mv-cream/20 bg-mv-green-dark/40 text-mv-cream hover:bg-mv-green-dark/60"
              >
                Voir un exemple de restaurant
              </Button>
            </div>
          </div>
        </section>
      </main>

      {/* Luxury Footer */}
      <footer className="mt-20 border-t border-mv-border-soft bg-mv-surface py-10 text-[12.5px] text-mv-ink-faint">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-4 sm:flex-row sm:px-6">
          <div className="flex items-center gap-2">
            <span>© 2026 Minerva Technologies Inc.</span>
            <span>·</span>
            <span>Montréal (Québec), Canada</span>
          </div>
          <div className="flex items-center gap-4">
            <Link href="/fr/legal/privacy" className="hover:text-mv-ink">
              Confidentialité
            </Link>
            <Link href="/fr/legal/terms" className="hover:text-mv-ink">
              Conditions d’utilisation
            </Link>
            <a href="/llms.txt" className="font-mono text-mv-green-dark hover:underline">
              llms.txt
            </a>
            <a href="/feed.xml" className="hover:text-mv-ink">
              Flux RSS
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}

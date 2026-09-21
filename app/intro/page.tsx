"use client";

import { Bike, Building2, MapPin, Package, Shield, Zap } from "lucide-react";

const FEATURES = [
  {
    icon: MapPin,
    title: "Geolocalización en tiempo real",
    desc: "Ubicación GPS de repartidores visible en mapa interactivo.",
  },
  {
    icon: Package,
    title: "Gestión de pedidos",
    desc: "Creación, asignación y seguimiento con códigos OTP de verificación.",
  },
  {
    icon: Bike,
    title: "PWA para repartidores",
    desc: "App móvil que envía ubicación y gestiona entregas sin instalación.",
  },
  {
    icon: Shield,
    title: "Sistema antifraude",
    desc: "Bloqueo por intentos fallidos y alertas de actividad sospechosa.",
  },
  {
    icon: Building2,
    title: "Multi-empresa",
    desc: "Varias empresas comparten repartidores externos en una sola plataforma.",
  },
  {
    icon: Zap,
    title: "Actualización automática",
    desc: "Dashboard se refresca cada 15 segundos con datos del mapa y pedidos.",
  },
];

export default function IntroPage() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="mx-auto max-w-5xl px-6 py-16 lg:px-8">
        <div className="flex items-center gap-3 mb-12">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary text-primary-foreground">
            <MapPin className="h-6 w-6" />
          </div>
          <div>
            <p className="text-2xl font-bold tracking-tight">Reparto Cañete</p>
            <p className="text-sm text-muted-foreground">Sistema de gestión de deliveries</p>
          </div>
        </div>

        <section className="mb-16">
          <h1 className="text-4xl font-bold tracking-tight leading-tight md:text-5xl">
            Gestión inteligente de
            <br />
            <span className="text-primary">repartidores y pedidos</span>
          </h1>
          <p className="mt-6 max-w-2xl text-lg text-muted-foreground leading-relaxed">
            Plataforma web que permite a los restaurantes de San Vicente de Cañete visualizar
            la ubicación de sus repartidores en tiempo real, asignar pedidos de forma eficiente
            y verificar entregas con códigos de seguridad.
          </p>
          <div className="mt-4 flex items-center gap-2 text-sm text-muted-foreground">
            <span className="h-1.5 w-1.5 rounded-full bg-primary" />
            Proyecto académico — INEL 2026
          </div>
        </section>

        <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map((f) => (
            <div
              key={f.title}
              className="rounded-xl border border-border bg-card p-5 transition hover:shadow-sm"
            >
              <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <f.icon className="h-5 w-5" />
              </div>
              <h3 className="text-sm font-semibold">{f.title}</h3>
              <p className="mt-1 text-sm text-muted-foreground leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </section>

        <section className="mt-16 rounded-xl border border-border bg-card p-8">
          <h2 className="text-xl font-semibold mb-4">Stack técnico</h2>
          <div className="flex flex-wrap gap-2">
            {["Next.js", "TypeScript", "Tailwind CSS", "shadcn/ui", "SQLite", "Leaflet", "PWA", "Service Worker"].map(
              (t) => (
                <span
                  key={t}
                  className="rounded-full border border-border bg-muted/50 px-3 py-1 text-xs font-medium text-muted-foreground"
                >
                  {t}
                </span>
              )
            )}
          </div>
        </section>

        <footer className="mt-16 text-center text-xs text-muted-foreground">
          Reparto Cañete — Feria de Proyectos Académicos — INEL 2026
        </footer>
      </div>
    </div>
  );
}

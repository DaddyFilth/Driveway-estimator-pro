import {
  ArrowRight,
  BarChart3,
  Camera,
  CheckCircle2,
  Clock,
  DollarSign,
  Image as ImageIcon,
  MapPin,
  Ruler,
  Send,
  Shield,
  Sparkles,
  Zap,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

type FeatureButton = {
  title: string;
  detail: string;
  href: string;
  icon: LucideIcon;
  accent: string;
};

type Step = {
  title: string;
  copy: string;
  icon: LucideIcon;
};

const primaryCtaHref = "/estimator?start=upload";
const secondaryCtaHref = "/dashboard";

const featureButtons: FeatureButton[] = [
  {
    title: "Capture",
    detail: "Camera or upload",
    href: "/estimator?feature=capture",
    icon: Camera,
    accent: "#39ff14",
  },
  {
    title: "Measure",
    detail: "AI boundary scan",
    href: "/estimator?feature=measure",
    icon: Ruler,
    accent: "#64d8ff",
  },
  {
    title: "Preview",
    detail: "Live or static view",
    href: "/estimator?feature=preview",
    icon: ImageIcon,
    accent: "#ffb84c",
  },
  {
    title: "Quote",
    detail: "Materials, labor, extras",
    href: "/estimator?feature=quote",
    icon: DollarSign,
    accent: "#d8ffe8",
  },
];

const steps: Step[] = [
  {
    title: "Capture",
    copy: "Start with a driveway photo, then measure and quote.",
    icon: Camera,
  },
  {
    title: "Detect",
    copy: "AI maps the driveway boundary and calculates the square footage.",
    icon: Zap,
  },
  {
    title: "Price",
    copy: "Add material cost, labor cost, and job extras before the final quote.",
    icon: DollarSign,
  },
  {
    title: "Share",
    copy: "Save the accepted job and send a clean project summary.",
    icon: Send,
  },
];

const materials = [
  "Hot Mix Asphalt",
  "Asphalt Millings",
  "Tar & Chip",
  "Gravel",
];

const trustItems = [
  { label: "AI powered measuring", icon: Sparkles },
  { label: "GPS aware pricing", icon: MapPin },
  { label: "Secure device access", icon: Shield },
  { label: "Fast field workflow", icon: Clock },
];

export default function Home() {
  return (
    <main className="min-h-screen overflow-x-hidden bg-[#07100d] text-white">
      <style>{`
        @keyframes landing-rise {
          from { opacity: 0; transform: translateY(18px); }
          to { opacity: 1; transform: translateY(0); }
        }

        @keyframes landing-float {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-8px); }
        }

        @keyframes landing-scan {
          0% { transform: translateY(-80%); opacity: 0; }
          18%, 82% { opacity: 1; }
          100% { transform: translateY(420%); opacity: 0; }
        }

        @keyframes landing-sheen {
          0% { transform: translateX(-120%) skewX(-18deg); opacity: 0; }
          18%, 55% { opacity: 0.42; }
          100% { transform: translateX(220%) skewX(-18deg); opacity: 0; }
        }

        @keyframes landing-border {
          0%, 100% { border-color: rgba(255,255,255,0.10); }
          50% { border-color: rgba(57,255,20,0.42); }
        }

        @media (prefers-reduced-motion: no-preference) {
          .landing-rise { animation: landing-rise 640ms ease both; }
          .landing-float { animation: landing-float 6s ease-in-out infinite; }
          .landing-scan { animation: landing-scan 3.6s ease-in-out infinite; }
          .landing-sheen::after { animation: landing-sheen 3.8s ease-in-out infinite; }
          .landing-border { animation: landing-border 4.2s ease-in-out infinite; }
        }

        .landing-sheen {
          position: relative;
          isolation: isolate;
          overflow: hidden;
        }

        .landing-sheen::after {
          content: "";
          position: absolute;
          inset: -35% auto -35% -45%;
          width: 34%;
          background: linear-gradient(90deg, transparent, rgba(255,255,255,0.78), transparent);
          pointer-events: none;
          z-index: -1;
        }
      `}</style>

      <header className="relative isolate overflow-hidden">
        <div
          aria-hidden="true"
          className="absolute inset-0 bg-cover bg-center"
          style={{
            backgroundImage: "url('/landing-driveway-visual.png')",
          }}
        />
        <div
          aria-hidden="true"
          className="absolute inset-0"
          style={{
            background:
              "linear-gradient(90deg, rgba(7,16,13,0.98) 0%, rgba(7,16,13,0.88) 42%, rgba(7,16,13,0.48) 100%)",
          }}
        />
        <div
          aria-hidden="true"
          className="absolute inset-0 opacity-35"
          style={{
            backgroundImage:
              "linear-gradient(rgba(255,255,255,0.06) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.05) 1px, transparent 1px)",
            backgroundSize: "48px 48px",
          }}
        />
        <div
          aria-hidden="true"
          className="absolute inset-x-0 bottom-0 h-36 bg-gradient-to-t from-[#07100d] to-transparent"
        />

        <nav className="relative z-10 border-b border-white/10 bg-[#07100d]/72 backdrop-blur-md">
          <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-6 lg:px-8">
            <a
              href="/"
              aria-label="DrivewayAI home"
              className="flex min-w-0 items-center gap-3"
            >
              <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg border border-[#39ff14]/35 bg-[#39ff14]/12 shadow-[0_0_28px_rgba(57,255,20,0.24)]">
                <Ruler className="h-5 w-5 text-[#39ff14]" />
              </span>
              <span className="text-base font-black text-white">
                Driveway<span className="text-[#39ff14]">AI</span>
              </span>
            </a>

            <div className="flex items-center gap-2">
              <a
                href={secondaryCtaHref}
                className="inline-flex h-10 items-center justify-center rounded-lg border border-white/12 bg-white/8 px-3 text-sm font-bold text-white transition hover:bg-white/14 focus:outline-none focus:ring-2 focus:ring-[#64d8ff]"
              >
                Saved Projects
              </a>
              <a
                href={primaryCtaHref}
                className="landing-sheen hidden h-10 items-center justify-center gap-2 rounded-lg border border-[#39ff14]/40 bg-[#0f7c43] px-4 text-sm font-black text-white shadow-[0_10px_32px_rgba(57,255,20,0.22)] transition hover:-translate-y-0.5 hover:bg-[#119653] focus:outline-none focus:ring-2 focus:ring-[#d8ffe8] sm:inline-flex"
              >
                Open Estimator
                <ArrowRight className="h-4 w-4" />
              </a>
            </div>
          </div>
        </nav>

        <section className="relative z-10 mx-auto grid min-h-[76svh] max-w-7xl items-center gap-8 px-4 py-10 sm:px-6 sm:py-14 lg:grid-cols-[1.02fr_0.98fr] lg:px-8">
          <div className="landing-rise max-w-2xl">
            <span className="inline-flex items-center gap-2 rounded-lg border border-[#39ff14]/25 bg-[#39ff14]/10 px-3 py-2 text-xs font-black uppercase text-[#d8ffe8]">
              <Sparkles className="h-4 w-4 text-[#39ff14]" />
              AI sales estimator
            </span>

            <h1 className="mt-6 max-w-2xl text-5xl font-black leading-[0.98] text-white sm:text-6xl lg:text-7xl">
              Close driveway jobs faster.
            </h1>

            <p className="mt-5 max-w-xl text-lg font-medium leading-8 text-[#d7e1dc]">
              Capture the driveway, map the surface, preview materials, and
              build the quote while you are still on site.
            </p>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <a
                href={primaryCtaHref}
                className="landing-sheen inline-flex min-h-12 items-center justify-center gap-2 rounded-lg border border-[#39ff14]/40 bg-[#0f7c43] px-6 text-base font-black text-white shadow-[0_18px_48px_rgba(57,255,20,0.26)] transition hover:-translate-y-0.5 hover:bg-[#119653] focus:outline-none focus:ring-2 focus:ring-[#d8ffe8]"
              >
                Open Estimator
                <ArrowRight className="h-5 w-5" />
              </a>
              <a
                href={secondaryCtaHref}
                className="inline-flex min-h-12 items-center justify-center gap-2 rounded-lg border border-white/14 bg-white/9 px-6 text-base font-bold text-white backdrop-blur transition hover:bg-white/15 focus:outline-none focus:ring-2 focus:ring-[#64d8ff]"
              >
                <BarChart3 className="h-5 w-5" />
                Saved Projects
              </a>
            </div>

            <div className="mt-8 grid grid-cols-2 gap-2 sm:grid-cols-4">
              {featureButtons.map(feature => {
                const Icon = feature.icon;

                return (
                  <a
                    key={feature.title}
                    href={feature.href}
                    className="landing-border group rounded-lg border border-white/10 bg-[#07100d]/72 p-3 backdrop-blur-md transition hover:-translate-y-1 hover:border-white/22 hover:bg-white/10 focus:outline-none focus:ring-2 focus:ring-[#64d8ff]"
                  >
                    <span
                      className="mb-3 grid h-9 w-9 place-items-center rounded-lg border"
                      style={{
                        borderColor: `${feature.accent}55`,
                        backgroundColor: `${feature.accent}18`,
                        color: feature.accent,
                      }}
                    >
                      <Icon className="h-5 w-5" />
                    </span>
                    <span className="block text-sm font-black text-white">
                      {feature.title}
                    </span>
                    <span className="mt-1 block text-xs font-semibold text-[#9fb1aa]">
                      {feature.detail}
                    </span>
                  </a>
                );
              })}
            </div>
          </div>

          <div className="landing-rise landing-float relative mx-auto w-full max-w-md lg:max-w-lg">
            <div className="overflow-hidden rounded-lg border border-white/12 bg-[#06110a]/86 shadow-[0_32px_90px_rgba(0,0,0,0.55)] backdrop-blur-md">
              <div className="flex items-center justify-between border-b border-white/10 px-4 py-3">
                <span className="text-sm font-black text-white">
                  Live estimate
                </span>
                <span className="rounded-lg border border-[#39ff14]/30 bg-[#39ff14]/12 px-2.5 py-1 text-xs font-black text-[#d8ffe8]">
                  Ready
                </span>
              </div>

              <div className="relative aspect-[4/3] overflow-hidden">
                <img
                  src="/landing-driveway-visual.png"
                  alt="AI driveway boundary preview"
                  className="h-full w-full object-cover"
                />
                <span className="landing-scan pointer-events-none absolute left-6 right-6 top-1/3 h-0.5 bg-[#64d8ff] shadow-[0_0_18px_rgba(100,216,255,0.9)]" />
                <div className="absolute bottom-4 left-4 right-4 grid grid-cols-3 gap-2">
                  {[
                    ["842", "sq ft"],
                    ["$3.10", "material"],
                    ["18%", "margin"],
                  ].map(item => (
                    <div
                      key={item[1]}
                      className="rounded-lg border border-white/12 bg-[#07100d]/78 px-3 py-2 backdrop-blur"
                    >
                      <span className="block text-lg font-black text-white">
                        {item[0]}
                      </span>
                      <span className="text-xs font-bold text-[#9fb1aa]">
                        {item[1]}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>
      </header>

      <section className="border-y border-white/8 bg-[#0a1511] px-4 py-4 sm:px-6 lg:px-8">
        <div className="mx-auto grid max-w-7xl gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {trustItems.map(item => {
            const Icon = item.icon;

            return (
              <div
                key={item.label}
                className="flex items-center gap-3 rounded-lg border border-white/8 bg-white/6 px-4 py-3"
              >
                <Icon className="h-5 w-5 shrink-0 text-[#64d8ff]" />
                <span className="text-sm font-bold text-[#d7e1dc]">
                  {item.label}
                </span>
              </div>
            );
          })}
        </div>
      </section>

      <section className="px-4 py-12 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <div className="max-w-2xl">
            <span className="text-xs font-black uppercase text-[#ffb84c]">
              Workflow
            </span>
            <h2 className="mt-3 text-3xl font-black text-white sm:text-4xl">
              Everything a salesperson needs. Nothing extra.
            </h2>
          </div>

          <ol className="mt-8 grid gap-3 md:grid-cols-4">
            {steps.map((step, index) => {
              const Icon = step.icon;

              return (
                <li
                  key={step.title}
                  className="landing-border rounded-lg border border-white/10 bg-[#0c1814] p-4 shadow-[0_20px_60px_rgba(0,0,0,0.18)] transition hover:-translate-y-1 hover:bg-[#10231d]"
                >
                  <div className="flex items-center justify-between gap-3">
                    <span className="grid h-10 w-10 place-items-center rounded-lg bg-white/8 text-[#39ff14]">
                      <Icon className="h-5 w-5" />
                    </span>
                    <span className="font-mono text-xs font-black text-white/30">
                      0{index + 1}
                    </span>
                  </div>
                  <h3 className="mt-4 text-lg font-black text-white">
                    {step.title}
                  </h3>
                  <p className="mt-2 text-sm font-medium leading-6 text-[#9fb1aa]">
                    {step.copy}
                  </p>
                </li>
              );
            })}
          </ol>
        </div>
      </section>

      <section className="px-4 pb-12 sm:px-6 lg:px-8">
        <div className="mx-auto grid max-w-7xl gap-6 rounded-lg border border-[#39ff14]/24 bg-[#0b1713] p-5 text-white shadow-[0_28px_80px_rgba(0,0,0,0.28)] md:grid-cols-[1fr_1.2fr] md:p-8">
          <div>
            <span className="text-xs font-black uppercase text-[#39ff14]">
              Materials
            </span>
            <h2 className="mt-3 text-3xl font-black sm:text-4xl">
              Pick the surface. Build the quote.
            </h2>
          </div>

          <div className="grid content-center gap-3 sm:grid-cols-2">
            {materials.map(material => (
              <span
                key={material}
                className="landing-border flex items-center justify-between rounded-lg border border-white/10 bg-white/8 px-4 py-3 text-sm font-black text-white shadow-sm transition hover:-translate-y-0.5 hover:bg-white/12"
              >
                {material}
                <CheckCircle2 className="h-5 w-5 text-[#39ff14]" />
              </span>
            ))}
          </div>
        </div>
      </section>

      <section className="px-4 pb-14 sm:px-6 lg:px-8">
        <div className="mx-auto flex max-w-7xl flex-col items-start justify-between gap-5 border-t border-white/10 pt-8 md:flex-row md:items-center">
          <div>
            <h2 className="text-2xl font-black text-white">
              Open the estimator and start the job.
            </h2>
            <p className="mt-2 max-w-2xl text-sm font-semibold leading-6 text-[#9fb1aa]">
              Fast capture, clean pricing, and a final sales flow that asks
              whether the client accepts before you save the invoice.
            </p>
          </div>
          <a
            href={primaryCtaHref}
            className="landing-sheen inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-lg border border-[#39ff14]/40 bg-[#0f7c43] px-6 text-base font-black text-white shadow-[0_18px_48px_rgba(57,255,20,0.2)] transition hover:-translate-y-0.5 hover:bg-[#119653] focus:outline-none focus:ring-2 focus:ring-[#d8ffe8] sm:w-auto"
          >
            Open Estimator
            <ArrowRight className="h-5 w-5" />
          </a>
        </div>
      </section>

      <footer className="border-t border-white/8 px-4 py-6 sm:px-6 lg:px-8">
        <div className="mx-auto flex max-w-7xl flex-col gap-2 text-sm font-semibold text-[#71857d] sm:flex-row sm:items-center sm:justify-between">
          <span>DrivewayAI &copy; 2026</span>
          <span>AI powered estimates for driveway sales teams.</span>
        </div>
      </footer>
    </main>
  );
}

import Link from "next/link";

const features = [
  {
    icon: "🏗️",
    title: "Build Worlds",
    description: "Place objects, change colors, and create amazing scenes",
  },
  {
    icon: "🤖",
    title: "AI Buddy",
    description: "A friendly helper gives you creative ideas",
  },
  {
    icon: "🎮",
    title: "Explore",
    description: "Walk through worlds you create",
  },
  {
    icon: "🖼️",
    title: "Gallery",
    description: "Save and share your creations",
  },
] as const;

export default function LandingPage() {
  return (
    <main className="min-h-screen flex flex-col">
      {/* Hero Section */}
      <section
        className="flex-1 flex flex-col items-center justify-center px-4 py-16 text-center"
        aria-labelledby="hero-heading"
      >
        <div className="mb-6 text-7xl animate-bounce" aria-hidden="true">
          🌍
        </div>
        <h1
          id="hero-heading"
          className="text-4xl md:text-6xl font-bold mb-4"
          style={{ color: "var(--color-primary)" }}
        >
          Imagine Worlds
        </h1>
        <p className="text-xl md:text-2xl mb-8 max-w-lg" style={{ color: "var(--color-text-muted)" }}>
          Build amazing 3D worlds from your imagination!
        </p>
        <Link
          href="/onboarding"
          className="inline-flex items-center gap-2 px-8 py-4 text-xl font-bold text-white rounded-full hover:scale-105 transition-transform shadow-lg hover:shadow-xl focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-offset-2"
          style={{
            backgroundColor: "var(--color-primary)",
            "--tw-ring-color": "var(--color-primary)",
          } as React.CSSProperties}
        >
          Start Creating ✨
        </Link>
      </section>

      {/* Features Grid */}
      <section
        className="px-4 py-16 max-w-4xl mx-auto w-full"
        aria-label="Platform features"
      >
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          {features.map((feature) => (
            <article
              key={feature.title}
              className="p-6 rounded-2xl shadow-sm hover:shadow-md transition-shadow border border-gray-100"
              style={{ backgroundColor: "var(--color-surface)" }}
            >
              <div className="text-4xl mb-3" aria-hidden="true">
                {feature.icon}
              </div>
              <h3 className="text-lg font-bold mb-1">{feature.title}</h3>
              <p className="text-sm" style={{ color: "var(--color-text-muted)" }}>
                {feature.description}
              </p>
            </article>
          ))}
        </div>
      </section>

      {/* Footer */}
      <footer className="text-center py-6 text-sm" style={{ color: "var(--color-text-muted)" }}>
        Made with imagination and code
      </footer>
    </main>
  );
}

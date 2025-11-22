import Link from "next/link"
import { Button } from "@/components/ui/button"
import { CryptoBackground } from "@/components/crypto-background"
import { ArrowRight, Lock, Zap, Shield } from "lucide-react"
import { LandingWrapper } from "@/components/landing-wrapper"
import { MetricsDashboard } from "@/components/metrics-dashboard"

export default function HomePage() {
  return (
    <LandingWrapper>
      <div className="relative min-h-screen bg-[#050505]">
      <div className="absolute top-0 left-0 right-0 h-screen pointer-events-none overflow-hidden">
        <CryptoBackground />
      </div>

      {/* Grain and dither overlay */}
      <div className="fixed inset-0 grain-texture pointer-events-none z-10" />
      <div className="fixed inset-0 dither-effect pointer-events-none z-10" />

      {/* Header */}
      <header className="relative z-20 border-b border-white/5">
        <nav className="container-padding max-w-7xl mx-auto py-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 border border-accent/50 rounded flex items-center justify-center">
              <Lock className="w-4 h-4 text-accent" />
            </div>
            <span className="text-xl font-bold tracking-tight">Sincerin</span>
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 text-xs font-mono font-semibold border border-accent/30 bg-accent/5 text-accent rounded">
                ALPHA
              </span>
              <span className="px-2 py-0.5 text-xs font-mono font-semibold border border-orange-500/30 bg-orange-500/5 text-orange-400 rounded">
                TESTNET
              </span>
            </div>
          </div>
          <div className="flex items-center gap-8">
            <Link href="#features" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
              Features
            </Link>
            <Link
              href="#how-it-works"
              className="text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              How It Works
            </Link>
            <Link href="#security" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
              Security
            </Link>
            <Button
              asChild
              variant="outline"
              className="border-accent/30 hover:bg-accent/10 hover:border-accent text-foreground bg-transparent"
            >
              <Link href="/app">Launch App</Link>
            </Button>
          </div>
        </nav>
      </header>

      {/* Hero Section */}
      <section className="relative z-20 page-container py-24 lg:py-32">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          {/* Left: Text Content */}
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-accent/30 bg-accent/5 text-xs font-mono text-accent mb-6">
              <div className="w-1.5 h-1.5 bg-accent rounded-full animate-pulse" />
              Zero-Knowledge Privacy Protocol
            </div>

            <h1 className="text-4xl lg:text-6xl font-bold tracking-tight mb-6 text-balance">
              Private Token Transfers
              <br />
              <span className="text-muted-foreground">on Stellar.</span>
            </h1>

            <p className="text-lg text-muted-foreground mb-8 max-w-xl text-pretty leading-relaxed">
              Convert any Stellar token into a private token. Transfer with zero trace using Soroban smart contracts. Full confidentiality through cryptographic privacy layers.
            </p>

            <div className="flex items-center gap-4">
              <Button asChild size="lg" className="bg-foreground text-background hover:bg-foreground/90 group">
                <Link href="/app">
                  Launch App
                  <ArrowRight className="ml-2 w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </Link>
              </Button>
              <Button
                asChild
                size="lg"
                variant="outline"
                className="border-accent/30 hover:bg-accent/10 hover:border-accent bg-transparent"
              >
                <Link href="#how-it-works">Learn More</Link>
              </Button>
            </div>
          </div>

          {/* Right: Metrics Dashboard */}
          <div>
            <MetricsDashboard />
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section id="how-it-works" className="relative z-20 section-container py-24 border-t border-white/5">
          <h2 className="text-3xl lg:text-5xl font-bold text-center mb-4">How It Works</h2>
          <p className="text-center text-muted-foreground mb-16 text-pretty">Three simple steps to complete privacy</p>

          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                number: "01",
                title: "Convert",
                subtitle: "Private Token",
                description:
                  "Deposit your Stellar tokens into the privacy pool. They're converted into confidential representations using zero-knowledge cryptography via Soroban smart contracts.",
                icon: Lock,
              },
              {
                number: "02",
                title: "Transfer",
                subtitle: "Zero-Knowledge Privacy",
                description:
                  "Send private tokens to any Stellar address. All transaction details remain encrypted and untraceable on the Stellar blockchain.",
                icon: Zap,
              },
              {
                number: "03",
                title: "Withdraw",
                subtitle: "Clean Output",
                description:
                  "Withdraw to any Stellar address with no link to the source. Complete transaction privacy guaranteed by cryptographic proofs.",
                icon: Shield,
              },
            ].map((step, i) => (
              <div key={i} className="relative group">
                <div className="absolute inset-0 bg-linear-to-b from-accent/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 rounded-lg" />
                <div className="relative p-8 border border-white/5 rounded-lg dither-effect hover:border-accent/20 transition-all duration-300">
                  <div className="flex items-start gap-4 mb-4">
                    <div className="w-12 h-12 border border-accent/30 rounded-lg flex items-center justify-center bg-accent/5">
                      <step.icon className="w-6 h-6 text-accent" />
                    </div>
                    <div className="text-4xl font-mono font-bold text-accent/20">{step.number}</div>
                  </div>
                  <h3 className="text-2xl font-bold mb-1">{step.title}</h3>
                  <p className="text-sm text-accent mb-3 font-mono">{step.subtitle}</p>
                  <p className="text-muted-foreground text-sm leading-relaxed">{step.description}</p>
                </div>
              </div>
            ))}
          </div>
      </section>

      {/* Features Section */}
      <section id="features" className="relative z-20 section-container py-24 border-t border-white/5">
          <h2 className="text-3xl lg:text-5xl font-bold text-center mb-16">Features</h2>

          <div className="grid md:grid-cols-3 gap-6">
            {[
              {
                title: "Zero-Knowledge Privacy",
                description:
                  "Advanced cryptographic protocols ensure your Stellar transactions remain completely private and untraceable.",
              },
              {
                title: "Any Token, Instantly Private",
                description:
                  "Convert any supported Stellar token into a private equivalent with just a few clicks. No complex setup required.",
              },
              {
                title: "Full Confidentiality Layer",
                description:
                  "Every aspect of your transaction—amount, sender, and recipient—is protected by Soroban-powered encryption.",
              },
            ].map((feature, i) => (
              <div
                key={i}
                className="p-6 border border-white/5 rounded-lg dither-effect hover:border-accent/20 hover:scale-[1.02] transition-all duration-300 group"
              >
                <div className="w-10 h-10 border border-accent/30 rounded flex items-center justify-center mb-4 group-hover:bg-accent/5 transition-all duration-300">
                  <div className="w-2 h-2 bg-accent rounded-full" />
                </div>
                <h3 className="text-xl font-bold mb-2">{feature.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{feature.description}</p>
              </div>
            ))}
          </div>
      </section>

      {/* Security Section */}
      <section id="security" className="relative z-20 content-container py-24 border-t border-white/5 text-center">
          <div className="relative p-12 border border-accent/20 rounded-lg dither-effect bg-accent/5">
            <div className="absolute inset-0 scanline pointer-events-none" />
            <div className="relative">
              <Shield className="w-16 h-16 text-accent mx-auto mb-6" />
              <h2 className="text-3xl lg:text-4xl font-bold mb-4">
                End-to-End Privacy Through
                <br />
                <span className="text-accent">Soroban ZK Cryptography</span>
              </h2>
              <p className="text-muted-foreground max-w-2xl mx-auto leading-relaxed">
                Sincerin Protocol leverages cutting-edge zero-knowledge proofs on Stellar using Soroban smart contracts
                to ensure that your financial privacy is mathematically guaranteed. No trusted parties, no data leaks,
                no compromises.
              </p>
            </div>
          </div>
      </section>

      {/* Footer */}
      <footer className="relative z-20 border-t border-white/5 mt-24">
        <div className="container-padding max-w-7xl mx-auto py-8">
          <div className="flex items-center justify-between text-sm text-muted-foreground">
            <div className="flex items-center gap-2">
              <Lock className="w-4 h-4 text-accent" />
              <span className="font-mono">Sincerin Protocol</span>
            </div>
            <div className="flex items-center gap-6">
              <Link href="#" className="hover:text-foreground transition-colors">
                Docs
              </Link>
              <Link href="#" className="hover:text-foreground transition-colors">
                GitHub
              </Link>
              <Link href="#" className="hover:text-foreground transition-colors">
                Audits
              </Link>
              <Link href="#" className="hover:text-foreground transition-colors">
                Contact
              </Link>
            </div>
          </div>
        </div>
      </footer>
      </div>
    </LandingWrapper>
  )
}
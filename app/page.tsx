import { Header } from "@/components/header"
import { HeroSection } from "@/components/hero-section"
import { GroupShowcaseSection } from "@/components/group-showcase-section"
import { HowItWorksSection } from "@/components/how-it-works-section"
import { Footer } from "@/components/footer"

export default function Home() {
  return (
    <div className="min-h-screen">
      <Header />
      <main>
        <HeroSection />
        <GroupShowcaseSection />
        <HowItWorksSection />
      </main>
      <Footer />
    </div>
  )
}

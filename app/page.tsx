import { Compliance } from "@/components/landing/compliance";
import { Footer } from "@/components/landing/footer";
import { Header } from "@/components/landing/header";
import { Hero } from "@/components/landing/hero";
import { Pillars } from "@/components/landing/pillars";
import { Workflow } from "@/components/landing/workflow";

export default function HomePage() {
  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      <main id="conteudo-principal" className="flex-1">
        <Hero />
        <Pillars />
        <Workflow />
        <Compliance />
      </main>
      <Footer />
    </div>
  );
}

import { Header } from "@/components/header";

export default function BlogLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <main className="antialiased lg:max-w-2xl md:max-w-full mx-4 mb-40 flex flex-col md:flex-row mt-2 sm:mt-8 lg:mx-auto bg-background transition-all duration-300 ease-out">
      <section className="flex-auto min-w-0 mt-6 flex flex-col px-2 md:px-0">
        <Header />
        {children}
      </section>
    </main>
  );
}

import Container from "@/components/shared/container";
import Social from "@/components/social";
import Script from "next/script";

const structuredData = {
  "@context": "https://schema.org",
  "@type": "Person",
  name: "Onurhan Demir",
  jobTitle: "Software Developer",
  worksFor: {
    "@type": "Organization",
    name: "Insider",
  },
  url: "https://onurhan.dev",
  sameAs: [
    "https://github.com/onurhan1337",
    "https://youtube.com/@onurhandev",
    "https://read.cv/onurhan",
  ],
};

export default function About() {
  const paragraphs = [
    <>
      <span className="font-medium decoration-wavy underline decoration-from-font text-emerald-950 decoration-[#f04ff0] dark:text-emerald-50 dark:decoration-[#f04ff0] tracking-tight">
        Poesy
      </span>{" "}
      is a contemporary artist and award-winning social innovator whose
      multidisciplinary practice spans painting, poetry, design, sculpture,
      music, filmmaking, and large-scale installations. Blending technology with
      art, she explores themes of identity, belonging, and cultural synthesis.
    </>,
    `Her works range from capsule fashion lines and mobile games to pavilion-scale
    installations such as The Pirate’s Daughter. Through her whimsical Rooftop
    Cats, she delivers humanitarian messages and inspires audiences worldwide.`,
    `A global creative presence, Poesy is also an accessibility advocate,
    sustainability designer, and founder of initiatives that support international
    artists and marginalized communities. Her projects from blockchain-based
    art provenance to long-running kindness movements consistently merge
    innovation with empathy.`,
  ];


  return (
    <Container
      size="large"
      className="prose prose-zinc dark:prose-invert
      text-zinc-800 dark:text-zinc-200 container animate-enter"
    >
      {paragraphs.map((paragraph, index) => (
        <div
          key={index}
          style={
            { "--stagger": index } as React.CSSProperties & {
              [key: string]: number;
            }
          }
        >
          <p className={index === paragraphs.length - 1 ? "mb-8" : ""}>
            {paragraph}
          </p>
          {index === 0 && <hr />}
        </div>
      ))}
      {/* <Social /> */}
      <Script
        id="structured-data"
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
      />
    </Container>
  );
}

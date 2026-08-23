import Converter from "@/components/Converter";

export default function Home() {
  return (
    <>
      <main>
        <div className="header">
          <h1>Currency Converter</h1>
          <p>
            A Next.js starter powered by the AllRatesToday API — official ECB
            reference rates out of the box, real-time mid-market rates for 160+
            currencies with a free key.
          </p>
        </div>
        <Converter />
      </main>
      <footer>
        <a
          href="https://github.com/AllRates-Today/nextjs-currency-starter"
          target="_blank"
          rel="noopener noreferrer"
        >
          Use this template
        </a>{" "}
        ·{" "}
        <a
          href="https://allratestoday.com/docs/"
          target="_blank"
          rel="noopener noreferrer"
        >
          API docs
        </a>{" "}
        ·{" "}
        <a
          href="https://allratestoday.com/register"
          target="_blank"
          rel="noopener noreferrer"
        >
          Free API key
        </a>
      </footer>
    </>
  );
}

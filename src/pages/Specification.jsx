import { Link } from "react-router-dom";
import "../styles/Specification.css";

const aLevelBiologySpecs = [
  {
    board: "OCR A-Level Biology A",
    code: "H020 / H420",
    intro:
      "Structured around biological molecules, cells, exchange, genetics, ecosystems, and modern biotechnology with strong extended-response coverage.",
    focus: [
      "Module-based coverage from foundations through communication, homeostasis, and genetics.",
      "Practical skills and data analysis are central, alongside long-answer written biology.",
      "Useful for students revising OCR terminology and synoptic links across modules.",
    ],
    href: "https://www.ocr.org.uk/qualifications/as-and-a-level/biology-a-h020-h420-from-2015/",
  },
  {
    board: "AQA A-Level Biology",
    code: "7401 / 7402",
    intro:
      "Covers biological molecules, cells, genetics, variation, exchange, ecology, and control systems with a clear practical endorsement pathway.",
    focus: [
      "Strong emphasis on application, required practicals, and precise exam-board language.",
      "Useful for revising core topics such as respiration, photosynthesis, inheritance, and response.",
      "Designed for students who want revision to line up closely with AQA assessment objectives.",
    ],
    href: "https://www.aqa.org.uk/subjects/science/as-and-a-level/biology-7401-7402",
  },
];

const gcseSpecs = [
  {
    board: "OCR Gateway Combined Science",
    code: "J250",
    intro:
      "Combined route covering Biology, Chemistry, and Physics together under the OCR Gateway GCSE framework.",
    focus: [
      "Useful for combined-science students checking the full OCR Gateway content map in one document.",
      "Helps confirm which biology, chemistry, and physics ideas are included in the shared pathway.",
      "A strong reference point when matching generated questions to official topic coverage.",
    ],
    href: "https://www.ocr.org.uk/qualifications/gcse/gateway-science-suite-combined-science-a-j250-from-2016/",
  },
  {
    board: "OCR Gateway Separate Sciences",
    code: "J247 / J248 / J249",
    intro:
      "Separate Biology, Chemistry, and Physics GCSEs for students taking the full triple-science route under OCR Gateway.",
    focus: [
      "Best for students needing the full subject depth of OCR Gateway Biology, Chemistry, or Physics.",
      "Makes it easier to see where separate-science content goes beyond combined science.",
      "Useful when planning topic-specific revision for the extra detail expected in triple science.",
    ],

    secondaryLinks: [
      {
        label: "Biology A Specification",
        href: "https://www.ocr.org.uk/qualifications/gcse/gateway-science-suite-biology-a-j247-from-2016/",
      },
      {
        label: "Chemistry A Specification",
        href: "https://www.ocr.org.uk/qualifications/gcse/gateway-science-suite-chemistry-a-j248-from-2016/",
      },
      {
        label: "Physics A Specification",
        href: "https://www.ocr.org.uk/qualifications/gcse/gateway-science-suite-physics-a-j249-from-2016/",
      },
    ],
  },
  {
    board: "AQA Combined Science",
    code: "8464",
    intro:
      "AQA Trilogy combined science specification bringing Biology, Chemistry, and Physics together in one GCSE route.",
    focus: [
      "Ideal for students following AQA Combined Science: Trilogy and wanting the official topic list in one place.",
      "Useful for checking how content is balanced across biology, chemistry, and physics papers.",
      "Supports targeted revision when comparing classroom coverage to the published specification.",
    ],
    href: "https://www.aqa.org.uk/subjects/science/gcse/combined-science-trilogy-8464",
  },
  {
    board: "AQA Separate Sciences",
    code: "8461 / 8462 / 8463",
    intro:
      "Full separate GCSE Biology, Chemistry, and Physics specifications for students taking triple science with AQA.",
    focus: [
      "Useful for students who need subject-specific detail beyond the combined science course.",
      "Highlights where separate science includes extra depth, calculations, and extended concepts.",
      "Helps keep revision aligned to the exact AQA pathway being taught in school.",
    ],
    secondaryLinks: [
      {
        label: "Biology Specification",
        href: "https://www.aqa.org.uk/subjects/science/gcse/biology-8461",
      },
      {
        label: "Chemistry Specification",
        href: "https://www.aqa.org.uk/subjects/science/gcse/chemistry-8462",
      },
      {
        label: "Physics Specification",
        href: "https://www.aqa.org.uk/subjects/science/gcse/physics-8463",
      },
    ],
  },
];

function SpecCard({ board, code, intro, focus, href, secondaryLinks = [] }) {
  return (
    <article className="specPage-card">
      <div className="specPage-cardTop">
        <p className="specPage-code">{code}</p>
        <h3>{board}</h3>
      </div>
      <p className="specPage-intro">{intro}</p>
      <ul className="specPage-points">
        {focus.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
      <div className="specPage-links">
        {href && (
          <a
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            className="btn btn--primary"
          >
            View specification
          </a>
        )}
        {secondaryLinks.map((link) => (
          <a
            key={link.href}
            href={link.href}
            target="_blank"
            rel="noopener noreferrer"
            className="btn btn--ghost"
          >
            {link.label}
          </a>
        ))}
      </div>
    </article>
  );
}

export default function Specification() {
  return (
    <div className="specPage-root">
      <section className="specPage-hero">
        <div className="specPage-heroBg" aria-hidden="true" />
        <div className="container specPage-heroInner">
          <div className="specPage-copy">
            <p className="specPage-eyebrow">Specifications</p>
            <h1>
              Official course links, organised by qualification and exam board.
            </h1>
            <p className="specPage-lead">
              This page groups the specification links students actually need,
              separating GCSE science routes from A-Level Biology so revision
              can stay tied to the official course documents.
            </p>
            <div className="specPage-actions">
              <a href="#gcse-specification" className="btn btn--primary">
                GCSE Specification
              </a>
              <a href="#alevel-specification" className="btn btn--ghost">
                A-Level Biology
              </a>
              <Link to="/question-generator" className="btn btn--subtle">
                Go to Generator
              </Link>
            </div>
          </div>
          <aside className="specPage-panel" aria-label="Specification overview">
            <div className="specPage-statCard">
              <span>GCSE</span>
              <strong>OCR Gateway and AQA</strong>
              <p>
                Combined science and separate science routes grouped into one
                clean reference page.
              </p>
            </div>
            <div className="specPage-statCard specPage-statCard--accent">
              <span>A-Level Biology</span>
              <strong>OCR and AQA</strong>
              <p>
                Direct links to the official Biology specifications your topic
                practice should map back to.
              </p>
            </div>
          </aside>
        </div>
      </section>

      <section className="container specPage-section" id="gcse-specification">
        <div className="specPage-heading">
          <p className="specPage-eyebrow">GCSE specification</p>
          <h2>GCSE science routes grouped by board and pathway.</h2>
          <p>
            Combined science and separate science are split out clearly so
            students can check whether they are following the shared route or
            the full triple-science pathway.
          </p>
        </div>
        <div className="specPage-grid specPage-grid--gcse">
          {gcseSpecs.map((spec) => (
            <SpecCard key={spec.board} {...spec} />
          ))}
        </div>
      </section>

      <section className="container specPage-section" id="alevel-specification">
        <div className="specPage-heading">
          <p className="specPage-eyebrow">A-Level Biology specification</p>
          <h2>A-Level Biology boards, side by side.</h2>
          <p>
            OCR and AQA are presented together so students can move from exam
            practice back to the exact board wording, practical expectations,
            and topic structure they are being assessed on.
          </p>
        </div>
        <div className="specPage-grid specPage-grid--alevel">
          {aLevelBiologySpecs.map((spec) => (
            <SpecCard key={spec.board} {...spec} />
          ))}
        </div>
      </section>
    </div>
  );
}

import React from "react";
// If you keep styles per-component:
import "../styles/DevNotes.css";

export default function DevNotes() {
  return (
    <section className="qg-card qg-devnotes" aria-labelledby="devnotes-title">
      <header className="qg-card__header">
        <h3 id="devnotes-title">Developer notes & upcoming features</h3>
        <p className="qg-muted">What I am building next</p>
      </header>

      <ul className="qg-feature-list">
        <li>
          <span className="qg-feature-dot" aria-hidden="true" />
          Ability to select only 6-mark questions
          <span className="qg-badge qg-badge--ocr">OCR</span>
        </li>

        <li>
          <span className="qg-feature-dot" aria-hidden="true" />
          25-mark essay question section
          <span className="qg-badge qg-badge--aqa">AQA</span>
        </li>

        <li>
          <span className="qg-feature-dot" aria-hidden="true" />
          Mini tests mixing different topic areas
          <span className="qg-badge qg-badge--aqa">AQA</span>
          <span className="qg-badge qg-badge--ocr">OCR</span>
        </li>

        <li>
          <span className="qg-feature-dot" aria-hidden="true" />
          Data analysis from graphical data
          <span className="qg-badge qg-badge--aqa">AQA</span>
          <span className="qg-badge qg-badge--ocr">OCR</span>
        </li>

        <li>
          <span className="qg-feature-dot" aria-hidden="true" />
          Modules 3.6, 3.7, 3.8
          <span className="qg-badge qg-badge--aqa">AQA</span>
        </li>

        <li>
          <span className="qg-feature-dot" aria-hidden="true" />
          Cosmetic adjustments and improvements
          <span className="qg-tag">UI/UX</span>
        </li>

        <li>
          <span className="qg-feature-dot" aria-hidden="true" />
          Performance improvements
          <span className="qg-tag">Perf</span>
        </li>

        <li>
          <span className="qg-feature-dot" aria-hidden="true" />
          Chemistry & Physics questions to be added
          <span className="qg-badge qg-badge--aqa">AQA</span>
          <span className="qg-badge qg-badge--ocr">OCR</span>
          <span className="qg-tag qg-tag--soon">Soon</span>
        </li>
      </ul>
    </section>
  );
}

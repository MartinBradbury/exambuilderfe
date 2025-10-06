import { useContext } from "react";
import "../styles/Home.modern.css"; // ⬅️ New modern stylesheet
import { UserContext } from "../context/UserContext";
import bioAlevel from "../assets/home/alevelbio.jpg";
import chemAlevel from "../assets/home/alevelchem.jpg";
import physicsAlevel from "../assets/home/alevelphysics.jpg";
import SubjectCarousel from "../components/Carousel";
import DevNotes from "../components/DevNotes";

export default function Home() {
  const { user } = useContext(UserContext);

  const bioChemPhysAlevel = [
    {
      src: bioAlevel,
      title: "Biology",
      description: "Dive into biological molecules, cells, and genetics.",
    },
    {
      src: chemAlevel,
      title: "Chemistry",
      description: "Explore reactions, structure, and analytical techniques.",
    },
    {
      src: physicsAlevel,
      title: "Physics",
      description: "Understand forces, energy, waves, and fields.",
    },
  ];

  return (
    <div className="home-root">
      {/* Under Construction Banner */}
      <div className="announcement" role="status" aria-live="polite">
        <span className="badge">Alpha v1.0</span>
        <span>
          This site is still under construction — features are rolling out
          gradually.
        </span>
      </div>

      {/* Hero Section */}
      <header className="heroV2">
        <div className="heroV2__bg" aria-hidden="true" />
        <div className="container heroV2__inner">
          <div className="heroV2__copy">
            <h1>
              A-Level Science <span className="accent">Question Generator</span>
            </h1>
            <p className="lead">
              Generate custom exam questions, practise answers, and get instant,
              AI-powered feedback to boost your grades.
            </p>
            <div className="ctaRow">
              {user ? (
                <a href="/question-generator" className="btn btn--primary">
                  Get Started
                </a>
              ) : (
                <a href="/login" className="btn btn--ghost">
                  Log In to Begin
                </a>
              )}
              <a href="#specs" className="btn btn--subtle">
                View Specs
              </a>
            </div>
            <ul className="heroV2__highlights">
              <li>OCR A specifications available</li>
              <li>Long-answer (6-mark) mode</li>
              <li>Instant feedback and marks</li>
            </ul>
          </div>
        </div>
      </header>

      <div>
        <DevNotes />
      </div>

      {/* Features Section */}
      <section
        className="featuresV2 container"
        aria-labelledby="features-title"
      >
        <h2 id="features-title">Why Students Love This</h2>
        <div className="featureGrid">
          <article className="featureCard">
            <div className="featureIcon">🎯</div>
            <h3>Adaptive Generation</h3>
            <p>
              Choose topic, subtopic, and difficulty — even long-answer 6-mark
              questions for realistic exam prep.
            </p>
          </article>

          <article className="featureCard">
            <div className="featureIcon">⚡</div>
            <h3>Instant Feedback</h3>
            <p>
              Receive AI-powered marking with clear strengths and weaknesses to
              focus your study.
            </p>
          </article>

          <article className="featureCard">
            <div className="featureIcon">📈</div>
            <h3>Progress Tracking</h3>
            <p>
              All sessions are saved so you can track your performance and
              improvement over time.
            </p>
          </article>
        </div>
      </section>

      {/* Specifications Section */}
      <section id="specs" className="specsV2 container">
        <h2>OCR Science Specifications</h2>
        <div className="specGridV2">
          <div className="specItem">
            <h3>OCR A-Level Biology (A)</h3>
            <p>
              Biological molecules, cells, enzymes, transport, disease,
              biodiversity, evolution, and gene technologies.
            </p>
            <a
              className="link"
              href="https://www.ocr.org.uk/qualifications/as-and-a-level/biology-a-h020-h420-from-2015/"
              target="_blank"
              rel="noopener noreferrer"
            >
              View Full Specification →
            </a>
          </div>

          <div className="specItem">
            <h3>OCR A-Level Chemistry (A)</h3>
            <p>
              Atomic structure, bonding, periodicity, organic chemistry,
              energetics, redox, and analytical techniques.
            </p>
            <a
              className="link"
              href="https://www.ocr.org.uk/qualifications/as-and-a-level/chemistry-a-h032-h432-from-2015/"
              target="_blank"
              rel="noopener noreferrer"
            >
              View Full Specification →
            </a>
          </div>

          <div className="specItem">
            <h3>OCR A-Level Physics (A)</h3>
            <p>
              Mechanics, materials, waves, electricity, thermal physics, quantum
              phenomena, and nuclear physics.
            </p>
            <a
              className="link"
              href="https://www.ocr.org.uk/qualifications/as-and-a-level/physics-a-h156-h556-from-2015/"
              target="_blank"
              rel="noopener noreferrer"
            >
              View Full Specification →
            </a>
          </div>
        </div>
      </section>

      {/* Subject Carousel */}
      <section className="subjectsV2">
        <div className="container">
          <h2>Explore Subjects</h2>
          <div className="cardsRow">
            <div className="subjectCard">
              <h3>A-Level</h3>
              <SubjectCarousel items={bioChemPhysAlevel} />
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="footerV2">
        <div className="container footerV2__inner">
          <p>© {new Date().getFullYear()} A-Level Bio Questions</p>
          <nav className="footerNav">
            <a className="link" href="/question-generator">
              Generator
            </a>
            <a className="link" href="#specs">
              Specs
            </a>
            {user ? (
              <a className="link" href="/profile">
                Profile
              </a>
            ) : (
              <a className="link" href="/login">
                Login
              </a>
            )}
          </nav>
        </div>
      </footer>
    </div>
  );
}

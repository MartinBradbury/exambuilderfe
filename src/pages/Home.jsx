import { useContext } from "react";
import { Link } from "react-router-dom";
import "../styles/Home.modern.css";
import { UserContext } from "../context/UserContextObject";
import bioAlevel from "../assets/home/alevelbio.jpg";
import chemAlevel from "../assets/home/alevelchem.jpg";
import physicsAlevel from "../assets/home/alevelphysics.jpg";
import SubjectCarousel from "../components/Carousel";
import DevNotes from "../components/DevNotes";

export default function Home() {
  const { user, hasUnlimitedAccess, planType, questionsRemainingToday } =
    useContext(UserContext);

  const bioChemPhysAlevel = [
    {
      src: bioAlevel,
      title: "Biology",
      description:
        "Cell biology, transport, disease, biodiversity, and genetics.",
    },
    {
      src: chemAlevel,
      title: "Chemistry",
      description:
        "Bonding, energetics, redox, organic chemistry, and analysis.",
    },
    {
      src: physicsAlevel,
      title: "Physics",
      description:
        "Mechanics, electricity, waves, thermal physics, and modern topics.",
    },
  ];

  const remainingLabel =
    questionsRemainingToday == null
      ? "Unlimited questions available"
      : `${questionsRemainingToday} question${questionsRemainingToday === 1 ? "" : "s"} left today`;

  const currentPlanLabel = hasUnlimitedAccess
    ? planType === "lifetime"
      ? "Lifetime plan"
      : "Paid plan"
    : `${planType || "free"} plan`;

  return (
    <div className="home-root">
      <div className="announcement" role="status" aria-live="polite">
        <span className="badge">Alpha</span>
        <span>
          OCR and AQA question generation is live now, with more subjects and
          long-answer modes rolling out next.
        </span>
      </div>

      <header className="heroV2">
        <div className="heroV2__bg" aria-hidden="true" />
        <div className="container heroV2__inner">
          <div className="heroV2__copy">
            <p className="heroV2__eyebrow">
              Revision built around real exam practice
            </p>
            <h1>
              Generate science questions, write your answer, and see exactly how
              you would score.
            </h1>
            <p className="lead">
              Exam Builder helps OCR and AQA students practise topic-specific,
              exam-style questions with instant feedback, mark-scheme guidance,
              and saved results across sessions.
            </p>

            <div className="ctaRow">
              {user ? (
                <Link to="/question-generator" className="btn btn--primary">
                  Open Generator
                </Link>
              ) : (
                <Link to="/register" className="btn btn--primary">
                  Start Free
                </Link>
              )}
              <a href="#preview" className="btn btn--subtle">
                See Product Preview
              </a>
              {user ? (
                <Link to="/account" className="btn btn--ghost">
                  {hasUnlimitedAccess ? "View Plan" : "Upgrade Plan"}
                </Link>
              ) : (
                <Link to="/login" className="btn btn--ghost">
                  Log In
                </Link>
              )}
            </div>

            <div className="heroV2__flow" aria-label="How it works">
              <span>1. Choose topic</span>
              <span>2. Answer exam-style questions</span>
              <span>3. Get marks and feedback</span>
            </div>

            <div className="heroV2__proof">
              <div>
                <strong>Supported now</strong>
                <span>OCR and AQA science revision workflows</span>
              </div>
              <div>
                <strong>Question styles</strong>
                <span>Topic drills, mark schemes, and 6-mark practice</span>
              </div>
              <div>
                <strong>Your access</strong>
                <span>
                  {user
                    ? `${currentPlanLabel}, ${remainingLabel}`
                    : "Free plan available to get started"}
                </span>
              </div>
            </div>

            <ul className="heroV2__highlights">
              <li>OCR and AQA science workflows</li>
              <li>Mark-scheme-driven feedback</li>
              <li>Saved sessions and results</li>
            </ul>
          </div>

          <aside
            className="heroV2__panel"
            id="preview"
            aria-label="Product preview"
          >
            <div className="heroPanel heroPanel--question">
              <div className="heroPanel__topline">
                <span className="heroPanel__tag">Live preview</span>
                <span className="heroPanel__meta">OCR Biology • 6 marks</span>
              </div>
              <h2>Question preview</h2>
              <p className="heroPanel__question">
                Explain how the structure of the alveoli helps to maximise gas
                exchange in the lungs.
              </p>
              <ul className="heroPanel__points">
                <li>Large surface area from many alveoli</li>
                <li>Thin walls create a short diffusion path</li>
                <li>
                  Rich capillary network maintains concentration gradients
                </li>
              </ul>
            </div>

            <div className="heroPanel heroPanel--feedback">
              <div className="heroPanel__topline">
                <span className="heroPanel__tag heroPanel__tag--soft">
                  Feedback
                </span>
                <span className="heroPanel__meta">Score example</span>
              </div>
              <div className="heroPanel__score">4 / 6</div>
              <p>
                Strong explanation of surface area and diffusion distance. To
                score higher, mention ventilation and blood flow maintaining the
                gradient.
              </p>
            </div>
          </aside>
        </div>
      </header>

      <section className="proofStrip">
        <div className="container proofStrip__grid">
          <article>
            <strong>Exam-board specific</strong>
            <p>
              Built around OCR and AQA science revision rather than generic quiz
              content.
            </p>
          </article>
          <article>
            <strong>Mark-scheme driven</strong>
            <p>
              Answers are checked against structured points so students can see
              what is missing.
            </p>
          </article>
          <article>
            <strong>Progress saved</strong>
            <p>
              Completed sessions and scores are stored so revision becomes
              trackable over time.
            </p>
          </article>
        </div>
      </section>

      <section className="previewV2 container" aria-labelledby="preview-title">
        <div className="sectionHeading">
          <p className="sectionEyebrow">See the workflow</p>
          <h2 id="preview-title">
            A homepage that shows the product, not just the promise
          </h2>
          <p>
            The core loop is simple: pick a topic, answer a realistic question,
            compare against the mark scheme, then review saved performance
            later.
          </p>
        </div>

        <div className="previewGrid">
          <article className="previewCard previewCard--steps">
            <h3>How students use it</h3>
            <ol className="stepList">
              <li>
                <strong>Pick a topic and subtopic.</strong>
                <span>
                  Drill a single module instead of revising everything at once.
                </span>
              </li>
              <li>
                <strong>Answer exam-style questions.</strong>
                <span>
                  Work through structured questions and longer 6-mark responses.
                </span>
              </li>
              <li>
                <strong>Review feedback immediately.</strong>
                <span>
                  See score, missing points, and where your explanation needs
                  more precision.
                </span>
              </li>
            </ol>
          </article>

          <article className="previewCard previewCard--plans">
            <h3>Plans in practice</h3>
            <div className="planMiniGrid">
              <div className="planMiniCard">
                <span className="planMiniCard__label">Free plan</span>
                <strong>1 generated question per day</strong>
                <p>
                  Enough to test the workflow and practise one focused response
                  daily.
                </p>
              </div>
              <div className="planMiniCard planMiniCard--accent">
                <span className="planMiniCard__label">Paid plan</span>
                <strong>Unlimited question access</strong>
                <p>
                  Use Stripe checkout to unlock more intensive revision sessions
                  and saved progress.
                </p>
              </div>
            </div>
          </article>
        </div>
      </section>

      <section
        className="featuresV2 container"
        aria-labelledby="features-title"
      >
        <div className="sectionHeading sectionHeading--centered">
          <p className="sectionEyebrow">Why it feels useful fast</p>
          <h2 id="features-title">
            Designed around exam outcomes, not generic study tools
          </h2>
        </div>

        <div className="featureGrid">
          <article className="featureCard">
            <div className="featureIcon">🧠</div>
            <h3>Topic-specific drilling</h3>
            <p>
              Move straight into the module or subtopic you need, instead of
              wading through unrelated practice.
            </p>
          </article>

          <article className="featureCard">
            <div className="featureIcon">✍</div>
            <h3>Exam-style writing practice</h3>
            <p>
              Train the skill that matters most: turning subject knowledge into
              marks on longer written responses.
            </p>
          </article>

          <article className="featureCard">
            <div className="featureIcon">📊</div>
            <h3>Saved sessions and review</h3>
            <p>
              Revisit what you answered, what you scored, and which topics keep
              costing you marks.
            </p>
          </article>
        </div>
      </section>

      <section
        className="audienceV2 container"
        aria-labelledby="audience-title"
      >
        <div className="sectionHeading">
          <p className="sectionEyebrow">Who this is for</p>
          <h2 id="audience-title">Built for students revising with purpose</h2>
        </div>
        <div className="audienceGrid">
          <article className="audienceCard">
            <h3>OCR Biology students</h3>
            <p>
              Practise structured responses against the topics you are actually
              tested on.
            </p>
          </article>
          <article className="audienceCard">
            <h3>AQA science revision</h3>
            <p>
              Use the same workflow for chemistry and physics as coverage
              continues to expand.
            </p>
          </article>
          <article className="audienceCard">
            <h3>Students chasing marks</h3>
            <p>
              Focus on what gains marks fastest: better phrasing, better
              structure, better recall.
            </p>
          </article>
        </div>
      </section>

      <section className="roadmapV2 container">
        <div className="roadmapIntro">
          <div className="sectionHeading">
            <p className="sectionEyebrow">What is shipping next</p>
            <h2>Features already in the pipeline</h2>
            <p>
              The product is usable now, but the roadmap is focused on deeper
              exam realism: longer essay modes, mixed-topic mini tests, and more
              chemistry and physics coverage.
            </p>
          </div>
        </div>
        <DevNotes />
      </section>

      <section id="specs" className="specsV2 container">
        <div className="sectionHeading">
          <p className="sectionEyebrow">Specification links</p>
          <h2>Revision should still map back to the official course content</h2>
        </div>
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
              View full specification
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
              View full specification
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
              View full specification
            </a>
          </div>
        </div>
      </section>

      <section className="subjectsV2">
        <div className="container">
          <div className="sectionHeading sectionHeading--centered">
            <p className="sectionEyebrow">Explore subject coverage</p>
            <h2>Current subject direction</h2>
          </div>
          <div className="cardsRow">
            <div className="subjectCard">
              <h3>A-Level Science</h3>
              <p className="subjectCard__intro">
                Browse the subjects currently supported and where question-bank
                expansion is heading next.
              </p>
              <SubjectCarousel items={bioChemPhysAlevel} />
            </div>
          </div>
        </div>
      </section>

      <section className="closingCta">
        <div className="container closingCta__inner">
          <div>
            <p className="sectionEyebrow">Start revising smarter</p>
            <h2>
              Use one question to diagnose a weak spot, or use the paid plan to
              drill properly.
            </h2>
          </div>
          <div className="closingCta__actions">
            {user ? (
              <>
                <Link to="/question-generator" className="btn btn--primary">
                  Go to Generator
                </Link>
                {!hasUnlimitedAccess && (
                  <Link to="/account" className="btn btn--ghost">
                    Upgrade to Paid Plan
                  </Link>
                )}
              </>
            ) : (
              <>
                <Link to="/register" className="btn btn--primary">
                  Create Free Account
                </Link>
                <Link to="/login" className="btn btn--ghost">
                  Log In
                </Link>
              </>
            )}
          </div>
        </div>
      </section>

      <footer className="footerV2">
        <div className="container footerV2__inner">
          <div>
            <p className="footerV2__brand">Exam Builder</p>
            <p className="footerV2__copy">
              Exam-focused science revision with question generation, marking,
              saved sessions, and plan-based access.
            </p>
          </div>
          <nav className="footerNav">
            <Link className="link" to="/question-generator">
              Generator
            </Link>
            <Link className="link" to="/my-results">
              Results
            </Link>
            <Link className="link" to="/account">
              Account
            </Link>
            <a className="link" href="#specs">
              Specs
            </a>
          </nav>
        </div>
      </footer>
    </div>
  );
}

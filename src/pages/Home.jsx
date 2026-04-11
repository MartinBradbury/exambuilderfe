import { useContext, useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import EmailVerificationNotice from "../components/EmailVerificationNotice";
import "../styles/Home.modern.css";
import { UserContext } from "../context/UserContextObject";

export default function Home() {
  const { user, hasUnlimitedAccess, emailVerified } = useContext(UserContext);
  const needsEmailVerification = Boolean(user) && !emailVerified;
  const canUpgrade = Boolean(user) && !hasUnlimitedAccess && emailVerified;
  const isMobileViewport =
    typeof window !== "undefined" &&
    window.matchMedia("(max-width: 800px)").matches;
  const [isMobileHowItWorks, setIsMobileHowItWorks] =
    useState(isMobileViewport);
  const [isHowItWorksOpen, setIsHowItWorksOpen] = useState(!isMobileViewport);
  const [activePreviewSlide, setActivePreviewSlide] = useState(0);
  const previewRailRef = useRef(null);

  const previewSlides = [
    {
      key: "question",
      tag: "Live preview",
      meta: "OCR Biology • 4 marks",
      title: "Question preview",
      content: (
        <>
          <p className="heroPanel__question">
            Explain how the structure of the alveoli helps to maximise gas
            exchange in the lungs. [4 marks]
          </p>
        </>
      ),
    },
    {
      key: "answer",
      tag: "Student answer",
      meta: "Attempt draft",
      title: "Answer preview",
      content: (
        <>
          <p className="heroPanel__answerIntro">
            The alveoli are good for gas exchange because there are lots of
            them, so the lungs have a large surface area. The walls are thin so
            oxygen diffuses quickly.
          </p>
        </>
      ),
    },
    {
      key: "feedback",
      tag: "Feedback",
      meta: "Score example",
      title: "Instant feedback",
      content: (
        <>
          <div className="heroPanel__score">3 / 4</div>
          <p>
            Strong explanation of surface area and diffusion distance. To score
            higher, mention ventilation and blood flow maintaining the gradient.
          </p>
          <ul className="heroPanel__feedbackList">
            <li>Strength: clear use of exam terminology</li>
            <li>Next mark: explain how ventilation maintains the gradient</li>
          </ul>
        </>
      ),
    },
  ];

  useEffect(() => {
    const mediaQuery = window.matchMedia("(max-width: 800px)");

    const syncHowItWorksState = (event) => {
      setIsMobileHowItWorks(event.matches);
      setIsHowItWorksOpen(!event.matches);
    };

    syncHowItWorksState(mediaQuery);
    mediaQuery.addEventListener("change", syncHowItWorksState);

    return () => {
      mediaQuery.removeEventListener("change", syncHowItWorksState);
    };
  }, []);

  const handleHowItWorksLinkClick = () => {
    if (isMobileHowItWorks) {
      setIsHowItWorksOpen(true);
    }
  };

  useEffect(() => {
    if (!isMobileHowItWorks) {
      setActivePreviewSlide(0);
    }
  }, [isMobileHowItWorks]);

  const handlePreviewRailScroll = () => {
    const rail = previewRailRef.current;

    if (!rail) {
      return;
    }

    const slideOffsets = Array.from(rail.children).map(
      (slide) => slide.offsetLeft,
    );

    const nearestIndex = slideOffsets.reduce(
      (closestIndex, offset, index) =>
        Math.abs(offset - rail.scrollLeft) <
        Math.abs(slideOffsets[closestIndex] - rail.scrollLeft)
          ? index
          : closestIndex,
      0,
    );

    setActivePreviewSlide(nearestIndex);
  };

  return (
    <div className="home-root">
      <div className="announcement" role="status" aria-live="polite">
        <span>
          OCR and AQA question generation is now live, with more
          subject-specific questions and long-answer essay modes coming soon.
        </span>
      </div>

      <header className="heroV2">
        <div className="heroV2__bg" aria-hidden="true" />
        <div className="container heroV2__inner">
          <div className="heroV2__copy">
            {/* Hero messaging now prioritises the core student outcome and a single dominant CTA. */}
            <p className="heroV2__eyebrow">Exam practice that improves marks</p>
            <h1>
              Practice real exam questions and get instant marks and feedback.
            </h1>
            <p className="lead">
              Built for OCR and AQA students. Improve your exam performance with
              targeted practice, mark schemes, and progress tracking.
            </p>

            <div className="heroV2__ctaBlock">
              {user ? (
                <Link
                  to="/question-generator"
                  className="btn btn--primary btn--heroPrimary"
                >
                  Start Practising
                </Link>
              ) : (
                <Link
                  to="/register"
                  className="btn btn--primary btn--heroPrimary"
                >
                  Start Practising
                </Link>
              )}
              <a
                href="#how-it-works"
                className="heroV2__secondaryLink"
                onClick={handleHowItWorksLinkClick}
              >
                See how it works →
              </a>
            </div>

            {needsEmailVerification && (
              <EmailVerificationNotice
                className="home-verification-notice"
                title="Billing is locked until you verify your email"
                description="Your free account is active now. Verify your email to unlock paid checkout and unlimited access upgrades."
              />
            )}

            <p className="heroV2__trustNote">
              Designed to reflect real OCR and AQA exam expectations.
            </p>

            {/* Lightweight trust points reduce friction without competing with the primary CTA. */}
            <div
              className="heroV2__trustRow row row-cols-1 row-cols-md-3 g-3"
              aria-label="Key benefits"
            >
              <div className="col">
                <div className="heroV2__trustItem">Instant AI marking</div>
              </div>
              <div className="col">
                <div className="heroV2__trustItem">
                  Aligned with real OCR &amp; AQA mark schemes
                </div>
              </div>
              <div className="col">
                <div className="heroV2__trustItem">
                  Built to reflect real exam expectations
                </div>
              </div>
            </div>
          </div>

          <aside
            className="heroV2__panel"
            id="preview"
            aria-label="Product preview"
          >
            {!isMobileHowItWorks ? (
              <>
                <div className="heroPanel heroPanel--question">
                  <div className="heroPanel__topline">
                    <span className="heroPanel__tag">Live preview</span>
                    <span className="heroPanel__meta">
                      OCR Biology • 4 marks
                    </span>
                  </div>
                  <h2>Question preview</h2>
                  <p className="heroPanel__question">
                    Explain how the structure of the alveoli helps to maximise
                    gas exchange in the lungs. [4 marks]
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
                  <div className="heroPanel__score">3 / 4</div>
                  <p>
                    Strong explanation of surface area and diffusion distance.
                    To score higher, mention ventilation and blood flow
                    maintaining the gradient.
                  </p>
                </div>
              </>
            ) : (
              <div className="heroPreviewMobile">
                <div
                  ref={previewRailRef}
                  className="heroPreviewMobile__rail"
                  onScroll={handlePreviewRailScroll}
                >
                  {previewSlides.map((slide) => (
                    <section
                      key={slide.key}
                      className="heroPreviewMobile__slide"
                      aria-label={slide.title}
                    >
                      <div className="heroPanel heroPanel--mobileSlide">
                        <div className="heroPanel__topline">
                          <span
                            className={
                              slide.key === "feedback"
                                ? "heroPanel__tag heroPanel__tag--soft"
                                : "heroPanel__tag"
                            }
                          >
                            {slide.tag}
                          </span>
                          <span className="heroPanel__meta">{slide.meta}</span>
                        </div>
                        <h2>{slide.title}</h2>
                        {slide.content}
                      </div>
                    </section>
                  ))}
                </div>
                <div className="heroPreviewMobile__footer" aria-hidden="true">
                  <span className="heroPreviewMobile__swipeCue">Swipe →</span>
                  <div className="heroPreviewMobile__dots">
                    {previewSlides.map((slide, index) => (
                      <span
                        key={slide.key}
                        className={
                          index === activePreviewSlide
                            ? "heroPreviewMobile__dot heroPreviewMobile__dot--active"
                            : "heroPreviewMobile__dot"
                        }
                      />
                    ))}
                  </div>
                </div>
              </div>
            )}
          </aside>
        </div>
      </header>

      <section className="proofStrip">
        <div className="container proofStrip__grid">
          <article>
            <strong>Built for OCR and AQA</strong>
            <p>
              Practise with revision workflows designed around the exam boards
              you actually sit.
            </p>
          </article>
          <article>
            <strong>Real feedback, fast</strong>
            <p>
              See where marks were earned and what to improve without waiting
              for manual marking.
            </p>
          </article>
          <article>
            <strong>Revision you can measure</strong>
            <p>
              Track completed sessions and performance trends so every practice
              session moves you forward.
            </p>
          </article>
        </div>
      </section>

      <section
        className="previewV2 container"
        id="how-it-works"
        aria-labelledby="preview-title"
      >
        <div className="sectionHeading sectionHeading--centered">
          <p className="sectionEyebrow">How it works</p>
          <h2 id="preview-title">
            A simple revision flow students can use immediately
          </h2>
          <p>
            Pick a topic, answer exam-style questions, and get fast feedback
            that helps you improve on the next attempt.
          </p>
        </div>

        {isMobileHowItWorks && (
          <button
            type="button"
            className="previewV2__toggle"
            aria-expanded={isHowItWorksOpen}
            aria-controls="how-it-works-content"
            onClick={() => setIsHowItWorksOpen((isOpen) => !isOpen)}
          >
            <span>{isHowItWorksOpen ? "Hide steps" : "Show steps"}</span>
            <span className="previewV2__toggleIcon" aria-hidden="true">
              {isHowItWorksOpen ? "−" : "+"}
            </span>
          </button>
        )}

        {(!isMobileHowItWorks || isHowItWorksOpen) && (
          <div
            className="previewGrid row g-4 align-items-stretch"
            id="how-it-works-content"
          >
            <div className="col-12 col-lg-6">
              <article className="previewCard previewCard--steps h-100">
                <h3>How students use it</h3>
                <ol className="stepList">
                  <li>
                    <strong>1. Choose a topic</strong>
                    <span>
                      Focus on the exact module or subtopic you want to improve.
                    </span>
                  </li>
                  <li>
                    <strong>2. Answer exam-style questions</strong>
                    <span>
                      Practise structured responses and longer written answers
                      in the format that wins marks.
                    </span>
                  </li>
                  <li>
                    <strong>3. Get instant marks and feedback</strong>
                    <span>
                      See your score, the missing points, and what to improve
                      next.
                    </span>
                  </li>
                  <li>
                    <strong>4. Track progress and improvements</strong>
                    <span>
                      Revisit past sessions and see how your scores improve over
                      time.
                    </span>
                  </li>
                </ol>
              </article>
            </div>

            <div className="col-12 col-lg-6">
              <article className="previewCard previewCard--feedback h-100">
                <h3>Designed to mark your answers like a real examiner.</h3>
                <p className="previewCard__intro">
                  The feedback is designed to show how your answer performed
                  against the mark scheme, not just whether it was broadly
                  right.
                </p>
                <ul className="planMiniCard__benefits homeFeatureList">
                  <li>Marked using OCR &amp; AQA-style criteria</li>
                  <li>See exactly where you gain and lose marks</li>
                  <li>Improve your exam technique with targeted feedback</li>
                </ul>
              </article>
            </div>
          </div>
        )}
      </section>

      <section
        className="featuresV2 container"
        aria-labelledby="features-title"
      >
        <div className="sectionHeading sectionHeading--centered">
          <p className="sectionEyebrow">Why students use it</p>
          <h2 id="features-title">
            Built to improve exam performance, not just generate questions
          </h2>
          <p>
            Improve your exam performance with targeted practice and instant
            feedback.
          </p>
          <p className="sectionHeading__socialProof">
            Used by students preparing for OCR and AQA GCSE and A-Level exams.
          </p>
        </div>

        <div className="featureGrid row g-4">
          <div className="col-12 col-md-4">
            <article className="featureCard h-100">
              <h3>Target weak topics</h3>
              <p>
                Revise the exact area that is costing you marks instead of
                working through generic quizzes.
              </p>
            </article>
          </div>

          <div className="col-12 col-md-4">
            <article className="featureCard h-100">
              <h3>Practise exam writing</h3>
              <p>
                Build confidence with structured questions and longer responses
                that reflect real exam pressure.
              </p>
            </article>
          </div>

          <div className="col-12 col-md-4">
            <article className="featureCard h-100">
              <h3>Track progress clearly</h3>
              <p>
                Review saved sessions, spot patterns in your scores, and keep
                your revision focused on improvement.
              </p>
            </article>
          </div>
        </div>
      </section>

      <section
        className="specsTeaserV2 container"
        aria-labelledby="spec-teaser-title"
      >
        <div className="sectionHeading sectionHeading--centered">
          <p className="sectionEyebrow">Specification links</p>
          <h2 id="spec-teaser-title">
            Keep your practice tied to the course content
          </h2>
          <p>
            Use the specification page to align your revision with the topics
            and exam board content you need to cover.
          </p>
        </div>
        <div className="specsTeaserCard">
          <div>
            <strong>GCSE and A-Level Biology specifications</strong>
            <p>
              Browse OCR Gateway combined and separate science, AQA combined and
              separate science, plus OCR and AQA A-Level Biology in one place.
            </p>
          </div>
          <Link to="/specification" className="btn btn--primary">
            Open Specification Page
          </Link>
        </div>
      </section>

      <section className="closingCta">
        <div className="container closingCta__inner">
          <div>
            <p className="sectionEyebrow">Start revising smarter</p>
            <h2>
              {needsEmailVerification
                ? "Verify your email, then start turning practice into better exam answers."
                : canUpgrade
                  ? "Start with focused practice, then upgrade when you want the full revision workflow."
                  : hasUnlimitedAccess
                    ? "Unlimited access is already active on this account."
                    : "Start practising now and build better exam performance one topic at a time."}
            </h2>
            <p className="closingCta__copy">
              Practise exam-style questions, review feedback quickly, and use
              saved progress to keep revision focused on what improves marks.
            </p>
          </div>
          <div className="closingCta__actions">
            {user ? (
              <>
                <Link to="/question-generator" className="btn btn--primary">
                  Start Practising
                </Link>
                {needsEmailVerification ? (
                  <Link to="/account" className="btn btn--ghost">
                    Verify Email
                  </Link>
                ) : (
                  !hasUnlimitedAccess && (
                    <Link to="/account" className="btn btn--ghost">
                      Upgrade for £1.99
                    </Link>
                  )
                )}
              </>
            ) : (
              <>
                <Link to="/register" className="btn btn--primary">
                  Start Practising
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
            <Link className="link" to="/progress">
              Progress
            </Link>
            <Link className="link" to="/account">
              Account
            </Link>
            <Link className="link" to="/terms">
              Terms
            </Link>
            <Link className="link" to="/paid-plan-terms">
              Paid Plan Terms
            </Link>
            <Link className="link" to="/refund-policy">
              Refund Policy
            </Link>
            <Link className="link" to="/specification">
              Specifications
            </Link>
          </nav>
        </div>
      </footer>
    </div>
  );
}

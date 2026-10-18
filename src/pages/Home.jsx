import { useContext, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import EmailVerificationNotice from "../components/EmailVerificationNotice";
import "../styles/Home.modern.css";
import { UserContext } from "../context/UserContextObject";
import founderPhoto from "../assets/home/me.jpeg";

export default function Home() {
  const { user, emailVerified } = useContext(UserContext);
  const needsEmailVerification = Boolean(user) && !emailVerified;

  const isMobileViewport =
    typeof window !== "undefined" &&
    window.matchMedia("(max-width: 800px)").matches;
  const [isMobileHowItWorks, setIsMobileHowItWorks] =
    useState(isMobileViewport);
  const [isHowItWorksOpen, setIsHowItWorksOpen] = useState(!isMobileViewport);

  const feedbackPreviewContent = (
    <div className="heroMarkedPreview">
      <div className="heroMarkedPreview__questionRow">
        <strong>Question 1 of 3</strong>
        <span>33% viewed</span>
      </div>

      <p className="heroMarkedPreview__question">
        <strong>Q1.</strong> Explain how the structure of the alveoli helps to
        maximise gas exchange in the lungs. [4 marks]
      </p>

      <button
        type="button"
        className="heroMarkedPreview__markSchemeBtn"
        disabled
      >
        Show Mark Scheme
      </button>

      <div className="heroMarkedPreview__field">
        <span className="heroMarkedPreview__label">Your Answer</span>
        <div className="heroMarkedPreview__answerBox">
          Large surface area because there are many alveoli. Thin walls create a
          short diffusion distance, and the capillary network helps maintain the
          concentration gradient.
        </div>
      </div>

      <div className="heroMarkedPreview__feedbackBlock">
        <p>
          <strong>Score:</strong> 3 / 4
        </p>
        <p>
          <strong>Feedback:</strong> Strong explanation of surface area and
          diffusion distance. To reach full marks, mention ventilation helping
          to maintain a steep concentration gradient.
        </p>
      </div>

      <div className="heroMarkedPreview__status">Answers Marked</div>

      <div className="heroMarkedPreview__summary">
        <h3>Overall Summary</h3>
        <div className="heroMarkedPreview__summaryGrid">
          <section className="heroMarkedPreview__summaryCard">
            <h4>Strengths</h4>
            <ul>
              <li>Clear explanation of large surface area</li>
              <li>Identifies the short diffusion pathway</li>
            </ul>
          </section>

          <section className="heroMarkedPreview__summaryCard">
            <h4>Improvements</h4>
            <ul>
              <li>Mention ventilation maintaining the gradient</li>
              <li>Link the capillary supply more directly to gas exchange</li>
            </ul>
          </section>
        </div>
      </div>
    </div>
  );

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

  return (
    <div className="home-root">
      <div className="announcement" role="status" aria-live="polite">
        <span>
          Updates: 25 Mark AQA Essay questions now available, plus improved
          feedback and progress tracking.
        </span>
      </div>

      <header className="heroV2">
        <div className="heroV2__bg" aria-hidden="true" />
        <div className="container heroV2__inner">
          <div className="heroV2__copy">
            {/* Hero messaging now prioritises the core student outcome and a single dominant CTA. */}
            <p className="heroV2__eyebrow">
              GCSE & A-LEVEL SCIENCE EXAM PRACTICE
            </p>
            <h1>
              Practise exam questions. Get instant AI marking. Improve your
              grades.
            </h1>
            <p className="lead">
              Prepare for your OCR and AQA exams with AI-generated questions,
              instant marking and personalised feedback. Track your progress and
              focus on the topics that matter.
            </p>

            <div className="heroV2__ctaBlock">
              {!user && (
                <div className="heroV2__ctaMessage">
                  <div className="heroV2__benefits">
                    <span>✓ 2 free question sets daily</span>
                    <span>✓ Free account to save and track progress</span>
                    <span>✓ Unlimited access from £1.99 — no subscription</span>
                  </div>
                  <p className="heroV2__signupPrompt">
                    <strong>Ready to improve your exam technique?</strong>
                    <br />
                    Create your free account and start practising today.
                  </p>
                </div>
              )}

              <div className="heroV2__ctaActions">
                {user ? (
                  <Link
                    to="/question-generator"
                    className="btn btn--primary btn--heroPrimary"
                  >
                    Start Practising
                  </Link>
                ) : (
                  <>
                    <Link
                      to="/register"
                      className="btn btn--primary btn--heroPrimary"
                    >
                      Start Practising Free
                    </Link>
                    <Link to="/login" className="btn btn--ghost btn--heroGhost">
                      Login
                    </Link>
                  </>
                )}
              </div>
            </div>

            {needsEmailVerification && (
              <EmailVerificationNotice
                className="home-verification-notice"
                title="Verify your email when you can"
                description="Your free account is active now. Verifying your email helps you receive account and support updates."
              />
            )}

            {/* Lightweight trust points reduce friction without competing with the primary CTA. */}
            <div
              className="heroV2__trustRow row row-cols-1 row-cols-md-2 g-3"
              aria-label="Key benefits"
            >
              <div className="col">
                <div className="heroV2__trustItem">
                  Track your scores, identify weak topics and monitor your
                  revision progress.
                </div>
              </div>
              <div className="col">
                <div className="heroV2__trustItem">
                  Aligned with real OCR &amp; AQA mark schemes
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
                    <span className="heroPanel__tag">
                      Exam Question Preview
                    </span>
                    <span className="heroPanel__meta">
                      OCR Biology • 4 marks
                    </span>
                  </div>
                  <h2>Question preview</h2>
                  <p className="heroPanel__question">
                    Explain how the structure and function of the alveoli
                    maximise the rate of gas exchange in the lungs.
                    <hr />
                    <span>[4 marks]</span>
                  </p>
                  <div className="heroPanel__attempt">
                    <span className="heroPanel__attemptLabel">
                      Example student attempt
                    </span>
                    <div className="heroPanel__attemptBox">
                      Large surface area because there are many alveoli. Thin
                      walls create a short diffusion distance, and the capillary
                      network helps maintain the concentration gradient.
                    </div>
                  </div>
                </div>

                <div className="heroPanel heroPanel--feedback heroPanel--feedbackCompact">
                  <div className="heroPanel__topline">
                    <span className="heroPanel__tag heroPanel__tag--soft">
                      AI Marking
                    </span>
                    <span className="heroPanel__meta">
                      OCR Biology • 4 marks
                    </span>
                  </div>

                  <h2>Marked answer preview</h2>

                  <div className="compactFeedback">
                    <div className="compactFeedback__score">
                      <strong>3 / 4</strong>
                      <span>Marks awarded</span>
                    </div>

                    <div className="compactFeedback__feedback">
                      <h3>Personalised feedback</h3>
                      <p>
                        Strong explanation of surface area and diffusion
                        distance. To reach full marks, mention how ventilation
                        helps maintain a steep concentration gradient.
                      </p>
                    </div>

                    <div className="compactFeedback__summary">
                      <div className="compactFeedback__summaryCard">
                        <h3>✓ Strengths</h3>
                        <p>
                          Clear explanation of large surface area and thin
                          walls.
                        </p>
                      </div>

                      <div className="compactFeedback__summaryCard">
                        <h3>↗ Improvements</h3>
                        <p>
                          Explain how ventilation maintains the concentration
                          gradient.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </>
            ) : (
              <div className="heroPreviewMobile heroPreviewMobile--stack">
                <section
                  className="heroPanel heroPanel--mobileCompact"
                  aria-label="Question preview"
                >
                  <div className="heroPanel__topline">
                    <span className="heroPanel__tag">Example Question</span>
                    <span className="heroPanel__meta">
                      OCR Biology • 4 marks
                    </span>
                  </div>
                  <p className="heroPanel__question heroPanel__question--compact">
                    Explain how the structure and function of the alveoli
                    maximise the rate of gas exchange in the lungs. [4 marks]
                  </p>
                </section>

                <section
                  className="heroPanel heroPanel--mobileCompact"
                  aria-label="Answer preview"
                >
                  <div className="heroPanel__topline">
                    <span className="heroPanel__tag">Student answer</span>
                    <span className="heroPanel__meta">Attempt draft</span>
                  </div>
                  <p className="heroPanel__answerIntro">
                    Large surface area because there are many alveoli. Thin
                    walls create a short diffusion distance, and the capillary
                    network helps maintain the concentration gradient.
                  </p>
                </section>

                <section
                  className="heroPanel heroPanel--mobileSlide"
                  aria-label="Marked answer preview"
                >
                  <div className="heroPanel__topline">
                    <span className="heroPanel__tag heroPanel__tag--soft">
                      Feedback
                    </span>
                    <span className="heroPanel__meta">
                      Marked answer preview
                    </span>
                  </div>
                  <h2>Marked answer preview</h2>
                  {feedbackPreviewContent}
                </section>
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
      <section className="founderV2 container">
        <div className="sectionHeading sectionHeading--centered">
          <p className="sectionEyebrow">About ExamBuilder</p>
          <h2>Created by an experienced science teacher</h2>
        </div>

        <div className="founderV2__card">
          <div className="founderV2__image">
            <img
              src={founderPhoto}
              alt="Founder of ExamBuilder, a former secondary school science teacher"
              loading="lazy"
            />
          </div>

          <div className="founderV2__content">
            <h3>Teaching experience meets AI technology</h3>

            <p>
              ExamBuilder was developed by a former secondary school science
              teacher with nearly 20 years of classroom experience.
            </p>

            <p>
              Combining educational experience with modern AI technology,
              ExamBuilder helps students practise exam-style questions,
              understand their mistakes and improve their exam technique.
            </p>
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

      <footer className="footerV2">
        <div className="container footerV2__inner">
          <div className="footerV2__column footerV2__column--brand">
            <p className="footerV2__brand">Exam Builder</p>
            <p className="footerV2__copy">
              AI-powered exam practice for OCR &amp; AQA students.
            </p>
            <p className="footerV2__copy">
              Aligned with real exam mark schemes.
            </p>
          </div>

          <nav
            className="footerV2__column footerV2__navGroup"
            aria-label="Product"
          >
            <p className="footerV2__heading">Product</p>
            <Link className="link" to="/question-generator">
              Start Practising
            </Link>
            <Link className="link" to="/progress">
              Progress
            </Link>
            <Link className="link" to="/specification">
              Specifications
            </Link>
          </nav>
          <nav
            className="footerV2__column footerV2__navGroup"
            aria-label="Legal"
          >
            <p className="footerV2__heading">Legal</p>
            <Link className="link" to="/terms">
              Terms
            </Link>
            <Link className="link" to="/privacy-policy">
              Privacy Policy
            </Link>
            <Link className="link" to="/paid-plan-terms">
              Paid Plan Terms
            </Link>
            <Link className="link" to="/refund-policy">
              Refund Policy
            </Link>
          </nav>

          <nav
            className="footerV2__column footerV2__navGroup"
            aria-label="Account"
          >
            <p className="footerV2__heading">Account</p>
            <Link className="link" to="/login">
              Log In
            </Link>
          </nav>
        </div>
        <div className="container footerV2__bottom">
          <p className="footerV2__copyright">
            © 2026 Exam Builder. All rights reserved.
          </p>
          <p className="footerV2__copyright">
            Exam Builder is operated by Martin Bradbury. Contact:{" "}
            <a className="link" href="mailto:enquiry@exambuilder.co.uk">
              enquiry@exambuilder.co.uk
            </a>
          </p>
        </div>
      </footer>
    </div>
  );
}

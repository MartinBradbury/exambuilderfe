import { useContext } from "react";
import "../styles/Home.css";
import { UserContext } from "../context/UserContext";
import bioAlevel from "../assets/home/alevelbio.jpg";
import chemAlevel from "../assets/home/alevelchem.jpg";
import physicsAlevel from "../assets/home/alevelphysics.jpg";
import SubjectCarousel from "../components/Carousel";
import biogcse from "../assets/home/gcsebio.jpg";
import chemgcse from "../assets/home/gcsechem.jpg";
import physicsgcse from "../assets/home/gcsephysics.jpg";

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
      description: "Explore chemical reactions and molecular structures.",
    },

    {
      src: physicsAlevel,
      title: "Physics",
      description: "Understand forces, energy, and the laws of motion.",
    },
  ];

  const bioChemPhysGcse = [
    {
      src: biogcse,
      title: "Biology",
      description: "Dive into biological molecules, cells, and genetics.",
    },

    {
      src: chemgcse,
      title: "Chemistry",
      description: "Explore chemical reactions and molecular structures.",
    },

    {
      src: physicsgcse,
      title: "Physics",
      description: "Understand forces, energy, and the laws of motion.",
    },
  ];

  return (
    <>
      <div>
        <h2 className="construction-card">
          THIS IS STILL IN A BUILD PHASE, MANY FEATURES ARE NOT AVAILABLE YET
        </h2>
      </div>
      <div className="homepage">
        <header className="hero">
          <div className="hero-content">
            <h1>A‑Level Biology Exam Question Generator</h1>

            <p>
              Generate custom exam questions, practice answering them, and get
              instant feedback to boost your grades.
            </p>

            <div className="hero-buttons">
              {user ? (
                <a href="/question-generator" className="btn btn-primary">
                  Get Started
                </a>
              ) : (
                <a href="/login" className="btn btn-secondary">
                  Login
                </a>
              )}
            </div>
          </div>
        </header>

        {/* Specification Info Section */}
        <section className="specification-info">
          <h2>OCR Science Specifications</h2>

          <div className="spec-grid">
            {/* A-Level Specs */}
            <div className="spec-card">
              <h3>OCR A-Level Biology (A)</h3>
              <p>
                Covers biological molecules, cells, enzymes, nucleic acids,
                transport, disease, biodiversity, evolution, communication
                systems, and gene technologies.
              </p>
              <p>
                <a
                  href="https://www.ocr.org.uk/qualifications/as-and-a-level/biology-a-h020-h420-from-2015/"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  View Full Specification →
                </a>
              </p>
            </div>

            <div className="spec-card">
              <h3>OCR A-Level Chemistry (A)</h3>
              <p>
                Includes atomic structure, bonding, periodic table, quantitative
                chemistry, organic chemistry, energetics, redox, and analytical
                techniques.
              </p>
              <p>
                <a
                  href="https://www.ocr.org.uk/qualifications/as-and-a-level/chemistry-a-h032-h432-from-2015/"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  View Full Specification →
                </a>
              </p>
            </div>

            <div className="spec-card">
              <h3>OCR A-Level Physics (A)</h3>
              <p>
                Covers mechanics, materials, waves, electricity, motion, thermal
                physics, quantum phenomena, fields, and nuclear physics.
              </p>
              <p>
                <a
                  href="https://www.ocr.org.uk/qualifications/as-and-a-level/physics-a-h156-h556-from-2015/"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  View Full Specification →
                </a>
              </p>
            </div>

            {/* GCSE Specs */}
            <div className="spec-card">
              <h3>OCR GCSE Biology (Gateway Science A)</h3>
              <p>
                Topics include cells, enzymes, genetics, health, ecosystems,
                evolution, disease, and photosynthesis.
              </p>
              <p>
                <a
                  href="https://www.ocr.org.uk/qualifications/gcse/biology-a-gateway-j247-from-2016/"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  View Full Specification →
                </a>
              </p>
            </div>

            <div className="spec-card">
              <h3>OCR GCSE Chemistry (Gateway Science A)</h3>
              <p>
                Includes atomic structure, periodic table, bonding, chemical
                reactions, rates, equilibrium, and energy changes.
              </p>
              <p>
                <a
                  href="https://www.ocr.org.uk/qualifications/gcse/chemistry-a-gateway-j248-from-2016/"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  View Full Specification →
                </a>
              </p>
            </div>

            <div className="spec-card">
              <h3>OCR GCSE Physics (Gateway Science A)</h3>
              <p>
                Covers motion, forces, energy, waves, electricity, magnetism,
                space, and particle model of matter.
              </p>
              <p>
                <a
                  href="https://www.ocr.org.uk/qualifications/gcse/physics-a-gateway-j249-from-2016/"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  View Full Specification →
                </a>
              </p>
            </div>
          </div>
        </section>

        {/* Carousel Section */}

        <section className="subject-carousel-section">
          <h2 className="section-title">Explore Subjects</h2>

          <div className="carousel-grid">
            <div className="carousel-card alevel-card">
              <h3 className="carousel-heading">A Level</h3>

              <SubjectCarousel items={bioChemPhysAlevel} />
            </div>

            <div className="carousel-card alevel-card">
              <h3 className="carousel-heading">GCSE</h3>

              <SubjectCarousel items={bioChemPhysGcse} />
            </div>
          </div>
        </section>

        <footer className="footer">
          <p>
            © {new Date().getFullYear()} A‑Level Bio Questions. All rights
            reserved.
          </p>
        </footer>
      </div>
    </>
  );
}

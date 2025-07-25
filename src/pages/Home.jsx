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
  );
}

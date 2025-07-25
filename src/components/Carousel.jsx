import React from "react";
import Carousel from "react-bootstrap/Carousel";

/**
 * @param {Array} items - Array of carousel items: { src, title, description }
 */
export default function SubjectCarousel({ items }) {
  return (
    <Carousel>
      {items.map((item, index) => (
        <Carousel.Item key={index}>
          <img className="d-block w-100" src={item.src} alt={item.title} />
          <Carousel.Caption className="carousel-caption-overlay">
            <h3>{item.title}</h3>
            <p>{item.description}</p>
          </Carousel.Caption>
        </Carousel.Item>
      ))}
    </Carousel>
  );
}

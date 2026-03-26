import React from "react";
import "./styles.css";

export default function App() {
  return (
    <div className="app">
      <div className="sidebar">
        <h1>Fam Tech Media</h1>
        <h2>Home Theater Designer</h2>

        <div className="section">
          <label>Room Width</label>
          <input type="number" defaultValue={15} />
        </div>

        <div className="section">
          <label>Room Depth</label>
          <input type="number" defaultValue={22} />
        </div>

        <div className="section">
          <label>Screen Size</label>
          <input type="range" min="75" max="180" defaultValue="120" />
        </div>

        <div className="section">
          <label>Dolby Atmos Layout</label>
          <select>
            <option>5.1.2</option>
            <option>7.1.4</option>
            <option>7.2.4</option>
            <option>9.2.4</option>
          </select>
        </div>
      </div>

      <div className="main">
        <div className="visual">
          <div className="room">
            <div className="screen"></div>

            {/* Speakers */}
            <div className="speaker left"></div>
            <div className="speaker right"></div>
            <div className="speaker center"></div>

            {/* Seating */}
            <div className="seating"></div>
          </div>
        </div>
      </div>
    </div>
  );
}

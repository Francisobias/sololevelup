import React from 'react';
import './HoloTerminal.css';

const HoloTerminal = ({ onClose, potions = [], onUsePotion }) => {
  return (
    <div className="holo-terminal-overlay">
      <div className="holo-terminal">
        <div className="terminal-header">
          <h2>Holographic Inventory Terminal</h2>
          <button className="close-button" onClick={onClose}>✖</button>
        </div>

        <div className="inventory-section">
          <h3>XP Potions</h3>
          {potions && potions.length > 0 ? (
            potions.map((potion, index) => (
              <div key={index} className="potion-card">
                <p><strong>{potion.name}</strong></p>
                <p>XP Boost: +{potion.xpBoost}</p>
                <button className="use-button" onClick={() => onUsePotion(potion)}>
                  Use Potion
                </button>
              </div>
            ))
          ) : (
            <p className="no-potions">No XP potions in inventory</p>
          )}
        </div>
      </div>
    </div>
  );
};

export default HoloTerminal;

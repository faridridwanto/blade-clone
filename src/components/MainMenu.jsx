import React from 'react';
import './MainMenu.css';

const MainMenu = ({ onStartGame }) => {
  return (
    <div className="main-menu">
      <h2>Main Menu</h2>
      <div className="menu-options">
        <button className="menu-button" onClick={onStartGame}>
          Play VS CPU
        </button>
        <button className="menu-button disabled" disabled>
          Play vs Player (Online)
          <span className="unavailable-tag">Coming Soon</span>
        </button>
      </div>
    </div>
  );
};

export default MainMenu;
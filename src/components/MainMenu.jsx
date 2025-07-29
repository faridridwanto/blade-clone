import React, { useState } from 'react';
import './MainMenu.css';

const MainMenu = ({ onStartGame }) => {
  const handlePlayVsCPU = () => {
    onStartGame('cpu');
  };

  const handlePlayVsPlayer = () => {
    onStartGame('player');
  };

  return (
    <div className="main-menu">
      <h2>Main Menu</h2>
      <div className="menu-options">
        <button className="menu-button" onClick={handlePlayVsCPU}>
          Play VS CPU
        </button>
        <button 
          className="menu-button" 
          onClick={handlePlayVsPlayer}
        >
          Play vs Player (Online)
        </button>
      </div>
    </div>
  );
};

export default MainMenu;

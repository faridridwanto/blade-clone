import React, { useState } from 'react';
import GameBoard from './components/GameBoard';
import MainMenu from './components/MainMenu';
import './App.css';

function App() {
  const [gameStarted, setGameStarted] = useState(false);

  const handleStartGame = () => {
    setGameStarted(true);
  };

  const handleBackToMenu = () => {
    setGameStarted(false);
  };

  return (
    <div className="app">
      <header className="app-header">
        <h1>Blade II - Clone</h1>
        {gameStarted && (
          <button className="back-button" onClick={handleBackToMenu}>
            Back to Menu
          </button>
        )}
      </header>
      <main>
        {gameStarted ? (
          <GameBoard />
        ) : (
          <MainMenu onStartGame={handleStartGame} />
        )}
      </main>
      <footer className="app-footer">
        <p>Blade II - Clone</p>
      </footer>
    </div>
  );
}

export default App;

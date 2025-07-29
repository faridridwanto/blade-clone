import React, { useState } from 'react';
import GameBoard from './components/GameBoard';
import MainMenu from './components/MainMenu';
import webSocketService from './services/WebSocketService';
import './App.css';

function App() {
  const [gameStarted, setGameStarted] = useState(false);
  const [gameMode, setGameMode] = useState(null); // 'cpu' or 'player'

  const
    handleStartGame = (mode) => {
      if (mode === 'player') {
        console.log('Player vs Player mode selected, connecting WebSocket.');
        webSocketService.connect();
      }
    setGameMode(mode);
    setGameStarted(true);
  };

  const handleBackToMenu = () => {
    if (gameMode === 'player') {
      console.log('Returning to menu, disconnecting WebSocket.');
      webSocketService.disconnect();
    }
    setGameStarted(false);
    setGameMode(null);
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
          <GameBoard gameMode={gameMode} />
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

import React, { useState, useEffect } from 'react';
import Player from './Player';
import { initializeGame, playCard, applyEffectCard } from '../utils/gameLogic';
import './GameBoard.css';

const GameBoard = () => {
  const [gameState, setGameState] = useState(null);
  const [message, setMessage] = useState('');
  const [gameOver, setGameOver] = useState(false);

  useEffect(() => {
    startNewGame();
  }, []);

  const startNewGame = () => {
    const initialState = initializeGame();
    setGameState(initialState);
    setMessage('Game started! Players draw their first card.');
    setGameOver(false);
  };

  const handlePlayCard = (cardIndex) => {
    if (!gameState || gameOver) return;

    try {
      const result = playCard(gameState, cardIndex);
      setGameState(result.newState);
      setMessage(result.message);
      
      if (result.gameOver) {
        setGameOver(true);
      }
    } catch (error) {
      setMessage(error.message);
    }
  };

  if (!gameState) {
    return <div className="loading">Loading game...</div>;
  }

  return (
    <div className="game-board">
      <div className="game-status">
        <h2 className="game-message">{message}</h2>
        {gameOver && (
          <button className="new-game-btn" onClick={startNewGame}>
            Start New Game
          </button>
        )}
      </div>

      <div className="players-container">
        <Player
          name="Opponent"
          hand={gameState.players[1].hand}
          field={gameState.players[1].field}
          isCurrentPlayer={gameState.currentPlayerIndex === 1}
          canPlay={gameState.currentPlayerIndex === 1 && !gameOver}
          onPlayCard={handlePlayCard}
          totalValue={gameState.players[1].totalValue}
        />

        <div className="game-field">
          <h3>Game Field</h3>
          <div className="field-info">
            <div className="turn-counter">Turn: {gameState.turn}</div>
            <div className="cards-left">
              Cards Left: {gameState.players[0].hand.length} / 10
            </div>
          </div>
        </div>

        <Player
          name="You"
          hand={gameState.players[0].hand}
          field={gameState.players[0].field}
          isCurrentPlayer={gameState.currentPlayerIndex === 0}
          canPlay={gameState.currentPlayerIndex === 0 && !gameOver}
          onPlayCard={handlePlayCard}
          totalValue={gameState.players[0].totalValue}
        />
      </div>
    </div>
  );
};

export default GameBoard;
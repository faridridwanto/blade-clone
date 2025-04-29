import React, { useState, useEffect, useCallback } from 'react';
import Player from './Player';
import { initializeGame, playCard, applyEffectCard, checkPlayerViability, getOpponentCardToPlay } from '../utils/gameLogic';
import './GameBoard.css';

const GameBoard = () => {
  const [gameState, setGameState] = useState(null);
  const [message, setMessage] = useState('');
  const [gameOver, setGameOver] = useState(false);

  const startNewGame = () => {
    const initialState = initializeGame();
    setGameState(initialState);
    setMessage('Game started! Players draw their first card.');
    setGameOver(false);
  };

  useEffect(() => {
    startNewGame();
  }, []);

  const handlePlayCard = useCallback((cardIndex) => {
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
  }, [gameState, gameOver]);

  // Check player viability when current player changes (new turn)
  useEffect(() => {
    if (gameState && !gameOver) {
      // Only check viability at the start of a turn
      const viabilityCheck = checkPlayerViability(gameState);
      if (!viabilityCheck.viable) {
        setGameState(viabilityCheck.newState);
        setMessage(viabilityCheck.message);
        setGameOver(true);
      }
    }
  }, [gameState?.currentPlayerIndex, gameOver]);

  // Automatic opponent play
  useEffect(() => {
    if (gameState && !gameOver && gameState.currentPlayerIndex === 1) {
      // Add a delay to make the opponent's play feel more natural
      const timeoutId = setTimeout(() => {
        // Get the card index for the opponent to play
        const cardIndex = getOpponentCardToPlay(gameState);

        // If a valid card index is returned, play it
        if (cardIndex >= 0) {
          handlePlayCard(cardIndex);
        }
      }, 1000); // 1 second delay

      // Clean up the timeout if the component unmounts or the dependencies change
      return () => clearTimeout(timeoutId);
    }
  }, [gameState, gameState?.currentPlayerIndex, gameOver, handlePlayCard]);

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

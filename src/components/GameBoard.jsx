import React, { useState, useEffect, useCallback, useRef } from 'react';
import Player from './Player';
import Card from './Card';
import { initializeGame, playCard, applyEffectCard, checkPlayerViability, getOpponentCardToPlay } from '../utils/gameLogic';
import { useWebSocket } from '../services/WebSocketService';
import './GameBoard.css';

const GameBoard = ({ gameMode = 'cpu' }) => {
  const [gameState, setGameState] = useState(null);
  const [message, setMessage] = useState('');
  const [gameOver, setGameOver] = useState(false);
  const [showTutorial, setShowTutorial] = useState(false);
  const [showCardLog, setShowCardLog] = useState(false);
  const [waitingForOpponent, setWaitingForOpponent] = useState(false);
  const [waitingForGameState, setWaitingForGameState] = useState(false);

  const { 
    isConnected, 
    isMatchmaking, 
    matchData, 
    gameState: receivedGameState, 
    startMatchmaking, 
    updateGameState 
  } = useWebSocket();

  const opponentFieldRef = useRef(null);
  const playerFieldRef = useRef(null);
  const isPvpMode = gameMode === 'player';

  const startNewGame = () => {
    if (isPvpMode) {
      if (!isConnected) {
        setMessage('Waiting for connection to game server...');
        return;
      }

      setWaitingForOpponent(true);
      setMessage('Finding an opponent...');
      startMatchmaking();
    } else {
      // CPU mode - start game immediately
      const initialState = initializeGame();
      setGameState(initialState);
      setMessage('Game started! Players draw their first card.');
      setGameOver(false);
    }
  };

  // Initialize game based on mode
  useEffect(() => {
    startNewGame();
  }, [isPvpMode, isConnected]);

  // Handle matchmaking result
  useEffect(() => {
    if (isPvpMode && matchData) {
      setWaitingForOpponent(false);

      if (matchData.isFirstPlayer) {
        // Player 1 initiates the game
        const initialState = initializeGame();
        setGameState(initialState);
        setMessage('Match found! You go first.');
        setGameOver(false);

        // Send initial game state to opponent
        updateGameState(initialState);
      } else {
        // Player 2 waits for game state from player 1
        setWaitingForGameState(true);
        setMessage('Match found! Waiting for opponent to start the game...');
      }
    }
  }, [isPvpMode, matchData]);

  // Handle received game state from opponent
  useEffect(() => {
    if (isPvpMode && receivedGameState) {
      setWaitingForGameState(false);

      // If this is the first game state received (initial state)
      if (!gameState) {
        setGameState(receivedGameState);
        setMessage('Game started! Your opponent goes first.');
        setGameOver(false);
      } 
      // If this is an update during the game
      else {
        setGameState(receivedGameState);

        // Determine if it's our turn now
        const isOurTurn = receivedGameState.currentPlayerIndex === 0;
        setMessage(isOurTurn 
          ? 'Your opponent played a card. Your turn!' 
          : 'Waiting for opponent to play...');

        // Check if game is over
        if (receivedGameState.gameOver) {
          setGameOver(true);
          const weWon = receivedGameState.winner === 0;
          setMessage(weWon ? 'You won the match!' : 'Your opponent won the match!');
        }
      }
    }
  }, [isPvpMode, receivedGameState, gameState]);

  const handlePlayCard = useCallback((cardIndex) => {
    if (!gameState || gameOver || (isPvpMode && waitingForOpponent) || (isPvpMode && waitingForGameState)) return;

    try {
      const result = playCard(gameState, cardIndex);

      // Handle animations before updating state
      if (result.newState.animations) {
        const { animations } = result.newState;

        // Apply thunder effect for Bolt card
        if (animations.thunderEffect && animations.targetElement === 'opponentField') {
          const opponentField = document.querySelector('.player-field:first-child .cards-container');
          if (opponentField && opponentField.children.length > 0) {
            const targetCard = opponentField.children[animations.targetCard];
            if (targetCard) {
              targetCard.classList.add('thunder-effect');
              // Remove the class after animation completes
              setTimeout(() => {
                targetCard.classList.remove('thunder-effect');
              }, 500);
            }
          }
        }

        // Apply flash effect for Mirror card
        if (animations.flashEffect && animations.targetElement === 'gameField') {
          const gameField = document.querySelector('.game-field');
          if (gameField) {
            gameField.classList.add('flash-effect');
            // Remove the class after animation completes
            setTimeout(() => {
              gameField.classList.remove('flash-effect');
            }, 500);
          }
        }

        // Apply explosion effect for Blast card
        if (animations.explosionEffect && animations.targetElement === 'opponentHand') {
          const opponentHand = document.querySelector('.player:first-child .cards-container');
          if (opponentHand && opponentHand.children.length > 0) {
            const targetCard = opponentHand.children[animations.targetCard];
            if (targetCard) {
              targetCard.classList.add('explosion-effect');
              // Remove the class after animation completes
              setTimeout(() => {
                targetCard.classList.remove('explosion-effect');
              }, 500);
            }
          }
        }

        // Apply flash effect for Force card
        if (animations.flashEffect && animations.targetElement === 'scorePanel') {
          const scorePanel = document.querySelector('.player-total');
          if (scorePanel) {
            scorePanel.classList.add('flash-effect');
            // Remove the class after animation completes
            setTimeout(() => {
              scorePanel.classList.remove('flash-effect');
            }, 500);
          }
        }

        // Reset animation flags
        result.newState.animations = {
          thunderEffect: false,
          flashEffect: false,
          explosionEffect: false,
          targetCard: null,
          targetElement: null
        };
      }

      // Short delay to allow animations to play before updating state
      setTimeout(() => {
        setGameState(result.newState);
        setMessage(result.message);

        if (result.gameOver) {
          setGameOver(true);

          // Add winner information to the game state
          if (isPvpMode) {
            // In PvP mode, player index 0 is always the local player
            // and player index 1 is always the opponent
            result.newState.winner = result.newState.currentPlayerIndex;
            result.newState.gameOver = true;

            // Send final game state to opponent
            updateGameState(result.newState);
          }
        }

        // In PvP mode, send updated game state to opponent
        else if (isPvpMode) {
          updateGameState(result.newState);
        }
      }, 600);
    } catch (error) {
      setMessage(error.message);
    }
  }, [gameState, gameOver, isPvpMode, waitingForOpponent, waitingForGameState, updateGameState]);

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

  // Automatic opponent play (CPU mode only)
  useEffect(() => {
    if (!isPvpMode && gameState && !gameOver && gameState.currentPlayerIndex === 1) {
      // Add a delay to make the opponent's play feel more natural
      const timeoutId = setTimeout(() => {
        // Get the card index for the opponent to play
        const cardIndex = getOpponentCardToPlay(gameState);

        // If a valid card index is returned, play it
        if (cardIndex >= 0) {
          handlePlayCard(cardIndex);
        } else {
          setMessage('Opponent has no valid moves left! You won the match!');
          setGameState((prevState) => ({
            ...prevState,
            currentPlayerIndex: 0,
          }));
          setGameOver(true);
        }
      }, 1000); // 1 second delay

      // Clean up the timeout if the component unmounts or the dependencies change
      return () => clearTimeout(timeoutId);
    }
  }, [isPvpMode, gameState, gameState?.currentPlayerIndex, gameOver, handlePlayCard]);

  // Auto-scroll to bottom when cards are added to the field
  useEffect(() => {
    if (gameState) {
      // Scroll opponent field to bottom
      if (opponentFieldRef.current) {
        opponentFieldRef.current.scrollTop = opponentFieldRef.current.scrollHeight;
      }

      // Scroll player field to bottom
      if (playerFieldRef.current) {
        playerFieldRef.current.scrollTop = playerFieldRef.current.scrollHeight;
      }
    }
  }, [gameState?.players[0].field, gameState?.players[1].field]);

  // Show loading states
  if (!gameState) {
    return <div className="loading">Loading game...</div>;
  }

  if (isPvpMode && waitingForOpponent) {
    return (
      <div className="loading">
        <div className="loading-spinner"></div>
        <p>Finding an opponent...</p>
        <p>Please wait while we match you with another player.</p>
      </div>
    );
  }

  if (isPvpMode && waitingForGameState) {
    return (
      <div className="loading">
        <div className="loading-spinner"></div>
        <p>Opponent found!</p>
        <p>Waiting for the game to start...</p>
      </div>
    );
  }

  return (
    <div className="game-board">
      {showTutorial && (
        <div className="tutorial-modal-overlay" onClick={() => setShowTutorial(false)}>
          <div className="tutorial-modal" onClick={(e) => e.stopPropagation()}>
            <div className="tutorial-header">
              <h2>How to Play Blade II</h2>
              <button className="close-btn" onClick={() => setShowTutorial(false)}>×</button>
            </div>
            <div className="tutorial-content">
              <h3>Game Objective</h3>
              <p>The goal is to have a higher total value than your opponent. Players take turns playing cards to increase their total value.</p>

              <h3>Card Types</h3>
              <ul>
                <li><strong>Number Cards (1-7):</strong> Add their value to your total.</li>
                <li><strong>Bolt:</strong> Removes the last card placed by your opponent. If it removes a Force card, the opponent's total value is halved.</li>
                <li><strong>Mirror:</strong> Switches the entire field between players, including total values.</li>
                <li><strong>Blast:</strong> Randomly removes one card from your opponent's hand. You get to play another card after using Blast.</li>
                <li><strong>Force:</strong> Doubles your total value. Cannot be played as your first card.</li>
              </ul>

              <h3>Special Rules</h3>
              <ul>
                <li>Number 1 card can recover the last card removed by a Bolt.</li>
                <li>You cannot play an effect card as your last card.</li>
                <li>If both players have equal total value, the field is cleared and new cards are drawn from decks.</li>
                <li>If your remaining cards cannot surpass your opponent's total value, you lose.</li>
              </ul>

              <h3>Game End</h3>
              <p>The game ends when a player has no more cards or when a player's remaining cards cannot surpass the opponent's total value.</p>
            </div>
          </div>
        </div>
      )}

      <div className="game-status">
        <h2 className="game-message">{message}</h2>
        <div className="game-buttons">
          {gameOver && (
            <button className="new-game-btn" onClick={startNewGame}>
              Start New Game
            </button>
          )}
          <button className="tutorial-btn" onClick={() => setShowTutorial(true)}>
            How to Play
          </button>
          <button className="log-btn" onClick={() => setShowCardLog(!showCardLog)}>
            {showCardLog ? 'Hide Log' : 'Show Log'}
          </button>
        </div>
      </div>

      {showCardLog && gameState && gameState.cardPlayLog && (
        <div className="card-log-container">
          <h3>Card Play Log</h3>
          <div className="card-log">
            {gameState.cardPlayLog.length > 0 ? (
              <ul>
                {gameState.cardPlayLog.map((entry, index) => (
                  <li key={index}>{entry}</li>
                ))}
              </ul>
            ) : (
              <p>No cards have been played yet.</p>
            )}
          </div>
        </div>
      )}

      <div className="players-container">
        <Player
          name="Opponent"
          hand={gameState.players[1].hand}
          isCurrentPlayer={gameState.currentPlayerIndex === 1}
          canPlay={gameState.currentPlayerIndex === 1 && !gameOver}
          onPlayCard={handlePlayCard}
          totalValue={gameState.players[1].totalValue}
          gameOver={gameOver}
        />

        <div className="game-field">
          <h3>Game Field</h3>
          <div className="field-info">
            <div className="turn-counter">Turn: {gameState.turn}</div>
            <div className="cards-left">
              <div>Your Cards: {gameState.players[0].deck.length} / 8</div>
              <div>Opponent Cards: {gameState.players[1].deck.length} / 8</div>
            </div>
          </div>

          <div className="players-fields">
            <div className="player-field">
              <h3>Opponent's Field</h3>
              <div className="cards-container" ref={opponentFieldRef}>
                {gameState.players[1].field.length > 0 ? (
                  gameState.players[1].field.map((card, index) => (
                    <Card
                      key={`opponent-field-${index}`}
                      type={card.type}
                      value={card.value}
                      isPlayable={false}
                    />
                  ))
                ) : (
                  <div className="empty-field">No cards on field</div>
                )}
              </div>
            </div>

            <div className="player-field">
              <h3>Your Field</h3>
              <div className="cards-container" ref={playerFieldRef}>
                {gameState.players[0].field.length > 0 ? (
                  gameState.players[0].field.map((card, index) => (
                    <Card
                      key={`your-field-${index}`}
                      type={card.type}
                      value={card.value}
                      isPlayable={false}
                    />
                  ))
                ) : (
                  <div className="empty-field">No cards on field</div>
                )}
              </div>
            </div>
          </div>
        </div>

        <Player
          name="You"
          hand={gameState.players[0].hand}
          isCurrentPlayer={gameState.currentPlayerIndex === 0}
          canPlay={gameState.currentPlayerIndex === 0 && !gameOver}
          onPlayCard={handlePlayCard}
          totalValue={gameState.players[0].totalValue}
          gameOver={gameOver}
        />
      </div>
    </div>
  );
};

export default GameBoard;

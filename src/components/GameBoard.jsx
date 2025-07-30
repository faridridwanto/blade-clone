import React, { useState, useEffect, useCallback, useRef } from 'react';
import Player from './Player';
import Card from './Card';
import { initializeGame, playCard, applyEffectCard, checkPlayerViability, getOpponentCardToPlay } from '../utils/gameLogic';
import { useWebSocket } from '../services/WebSocketService';
import './GameBoard.css';

const GameBoard = ({ gameMode = 'cpu' }) => {
  const [game, setGame] = useState(null);
  const [message, setMessage] = useState('');
  const [showTutorial, setShowTutorial] = useState(false);
  const [showCardLog, setShowCardLog] = useState(false);
  const [waitingForOpponent, setWaitingForOpponent] = useState(false);
  const [waitingForGameState, setWaitingForGameState] = useState(false);

  const { 
    isConnected, 
    matchData,
    gameState: absoluteGameState,
    startMatchmaking, 
    updateGameState 
  } = useWebSocket();

  const opponentFieldRef = useRef(null);
  const playerFieldRef = useRef(null);
  const isPvpMode = gameMode === 'player';
  const gameOver = game?.gameOver || false;

  const startNewGame = useCallback(() => {
    setGame(null);
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
      setGame(initialState);
      setMessage('Game started! Players draw their first card.');
    }
  }, [isPvpMode, isConnected, startMatchmaking]);

  // Initialize game when the component mounts
  useEffect(() => {
    startNewGame();
  }, [startNewGame]);

  // Handle matchmaking result
  useEffect(() => {
    if (isPvpMode && matchData) {
      setWaitingForOpponent(false);
      if (matchData.isFirstPlayer) {
        // Player 1 initiates the game with a relative state
        const initialState = initializeGame();
        setGame(initialState);
        if (matchData.isPlayer1Turn) {
          setMessage('Match found! You go first.');
        } else {
          setWaitingForGameState(true);
          setMessage('Match found! Waiting for opponent to play...');
        }
        // The hook will convert this relative state to absolute before sending
        updateGameState(initialState);
      } else {
        if (!matchData.isPlayer1Turn) {
          setMessage('Match found! You go first.');
        } else {
          setWaitingForGameState(true);
          setMessage('Match found! Waiting for opponent to play...');
        }
      }
    }
  }, [isPvpMode, matchData, updateGameState]);

  // Handle received game state from opponent
  useEffect(() => {
    if (isPvpMode && absoluteGameState && matchData) {
      setWaitingForGameState(false);
      const isPlayer1 = matchData.isFirstPlayer;

      // Translate Absolute Network State to Relative Local State
      const relativeState = {
        // Copy top-level properties (deck, turn, etc.)
        ...absoluteGameState,
        players: [
          // You are always players[0]
          isPlayer1 ? absoluteGameState.player1 : absoluteGameState.player2,
          // Opponent is always players[1]
          isPlayer1 ? absoluteGameState.player2 : absoluteGameState.player1,
        ],
        // Determine whose turn it is from your perspective (0 for you, 1 for opponent)
        currentPlayerIndex: (isPlayer1 === absoluteGameState.isPlayer1Turn) ? 0 : 1,
        winner: null,
      };

      // Remove the absolute properties that have been translated
      delete relativeState.player1;
      delete relativeState.player2;
      delete relativeState.isPlayer1Turn;

      if (relativeState.gameOver && absoluteGameState.winner) {
        const weAreWinner = (isPlayer1 && absoluteGameState.winner === 'player1') || (!isPlayer1 && absoluteGameState.winner === 'player2');
        relativeState.winner = weAreWinner ? 0 : 1;
        setMessage(weAreWinner ? 'You won the match!' : 'Your opponent won the match!');
      } else {
        const isOurTurn = relativeState.currentPlayerIndex === 0;
        setMessage(isOurTurn ? 'Your opponent played a card. Your turn!' : 'Waiting for opponent to play...');
      }

      setGame(relativeState);
    }
  }, [isPvpMode, absoluteGameState, matchData]);

  const handlePlayCard = useCallback((cardIndex) => {
    if (!game || gameOver || (isPvpMode && (waitingForOpponent || waitingForGameState))) return;
    try {
      const result = playCard(game, cardIndex);

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
        setGame(result.newState);
        setMessage(result.message);

        // For PvP, send the new relative state. The hook handles the conversion.
        if (isPvpMode) {
          updateGameState(result.newState);
        }
      }, 600);
    } catch (error) {
      setMessage(error.message);
    }
  }, [game, gameOver, isPvpMode, waitingForOpponent, waitingForGameState, updateGameState]);

  // Check player viability when current player changes (new turn)
  useEffect(() => {
    if (game && !gameOver) {
      // Only check viability at the start of a turn
      const viabilityCheck = checkPlayerViability(game);
      if (!viabilityCheck.viable) {
        setGame(viabilityCheck.newState);
        setMessage(viabilityCheck.message);
        if (isPvpMode) {
          updateGameState(viabilityCheck.newState);
        }
      }
    }
  }, [game, isPvpMode, updateGameState]);

  // Automatic opponent play (CPU mode only)
  useEffect(() => {
    if (!isPvpMode && game && !gameOver && game.currentPlayerIndex === 1) {
      // Add a delay to make the opponent's play feel more natural
      const timeoutId = setTimeout(() => {
        // Get the card index for the opponent to play
        const cardIndex = getOpponentCardToPlay(game);

        // If a valid card index is returned, play it
        if (cardIndex >= 0) {
          handlePlayCard(cardIndex);
        } else {
          setMessage('Opponent has no valid moves left! You won the match!');
          setGame((prevState) => ({
            ...prevState,
            currentPlayerIndex: 0,
            gameOver: true,
          }));
        }
      }, 1000); // 1 second delay

      // Clean up the timeout if the component unmounts or the dependencies change
      return () => clearTimeout(timeoutId);
    }
  }, [isPvpMode, game, game?.currentPlayerIndex, gameOver, handlePlayCard]);

  // Auto-scroll to bottom when cards are added to the field
  useEffect(() => {
    if (game) {
      // Scroll opponent field to bottom
      if (opponentFieldRef.current) {
        opponentFieldRef.current.scrollTop = opponentFieldRef.current.scrollHeight;
      }

      // Scroll player field to bottom
      if (playerFieldRef.current) {
        playerFieldRef.current.scrollTop = playerFieldRef.current.scrollHeight;
      }
    }
  }, [game?.players[0].field, game?.players[1].field]);

  // Show loading states
  if (isPvpMode && (!game || waitingForOpponent || waitingForGameState)) {
    if (waitingForOpponent) return <div className="loading"><div className="loading-spinner"></div><p>Finding an opponent...</p></div>;
    if (waitingForGameState) return <div className="loading"><div className="loading-spinner"></div><p>Opponent found! Waiting for game to start...</p></div>;
    return <div className="loading">Connecting...</div>;
  }
  if (!game) {
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

      {showCardLog && game && game.cardPlayLog && (
        <div className="card-log-container">
          <h3>Card Play Log</h3>
          <div className="card-log">
            {game.cardPlayLog.length > 0 ? (
              <ul>
                {game.cardPlayLog.map((entry, index) => (
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
          hand={game.players[1].hand}
          isCurrentPlayer={game.currentPlayerIndex === 1}
          canPlay={game.currentPlayerIndex === 1 && !gameOver}
          onPlayCard={handlePlayCard}
          totalValue={game.players[1].totalValue}
          gameOver={gameOver}
        />

        <div className="game-field">
          <h3>Game Field</h3>
          <div className="field-info">
            <div className="turn-counter">Turn: {game.turn}</div>
            <div className="cards-left">
              <div>Your Cards: {game.players[0].deck.length} / 8</div>
              <div>Opponent Cards: {game.players[1].deck.length} / 8</div>
            </div>
          </div>

          <div className="players-fields">
            <div className="player-field">
              <h3>Opponent's Field</h3>
              <div className="cards-container" ref={opponentFieldRef}>
                {game.players[1].field.length > 0 ? (
                  game.players[1].field.map((card, index) => (
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
                {game.players[0].field.length > 0 ? (
                  game.players[0].field.map((card, index) => (
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
          hand={game.players[0].hand}
          isCurrentPlayer={game.currentPlayerIndex === 0}
          canPlay={game.currentPlayerIndex === 0 && !gameOver}
          onPlayCard={handlePlayCard}
          totalValue={game.players[0].totalValue}
          gameOver={gameOver}
        />
      </div>
    </div>
  );
};

export default GameBoard;

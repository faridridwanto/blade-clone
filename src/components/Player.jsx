import React from 'react';
import Card from './Card';
import './Player.css';

const Player = ({ 
  name, 
  hand, 
  isCurrentPlayer, 
  canPlay, 
  onPlayCard,
  totalValue,
  gameOver
}) => {
  return (
    <div className={`player ${isCurrentPlayer ? 'current-player' : ''}`}>
      <div className="player-info">
        <h2 className="player-name">{name}</h2>
        <div className="player-total">Total: {totalValue}</div>
        {isCurrentPlayer && <div className="player-turn-indicator">Your Turn</div>}
      </div>


      <div className="player-hand">
        <h3>{isCurrentPlayer ? 'Your Hand' : 'Opponent\'s Hand'}</h3>
        <div className="cards-container">
          {hand.map((card, index) => (
            <Card
              key={`hand-${index}`}
              type={card.type}
              value={card.value}
              isPlayable={canPlay}
              onClick={() => onPlayCard(index)}
              faceDown={name === "Opponent" && !gameOver}
            />
          ))}
        </div>
      </div>
    </div>
  );
};

export default Player;

import React from 'react';
import './Card.css';

const Card = ({ type, value, onClick, isPlayable, faceDown = false }) => {
  // Card types: 'number', 'bolt', 'mirror', 'blast', 'force'

  const getTooltipText = () => {
    if (faceDown) return '';

    switch (type) {
      case 'number':
        if (value === 1) {
          return `Adds ${value} to your total value. If the opponent just used Bolt, it can recover the removed card.`;
        }
        return `Adds ${value} to your total value.`;
      case 'bolt':
        return 'Removes the last card played by your opponent.';
      case 'mirror':
        return 'Swaps the field cards between you and your opponent.';
      case 'blast':
        return 'Remove a random card in your opponent\'s hand. After using it, you can move again.';
      case 'force':
        return 'Doubles your current total value.';
      default:
        return '';
    }
  };

  const getCardContent = () => {
    if (faceDown) {
      return <div className="card-back"></div>;
    }

    switch (type) {
      case 'number':
        return <div className="card-value">{value}</div>;
      case 'bolt':
        return (
          <div className="card-effect">
            <div className="effect-icon">⚡</div>
            <div className="effect-name">Bolt</div>
          </div>
        );
      case 'mirror':
        return (
          <div className="card-effect">
            <div className="effect-icon">🪞</div>
            <div className="effect-name">Mirror</div>
          </div>
        );
      case 'blast':
        return (
          <div className="card-effect">
            <div className="effect-icon">💥</div>
            <div className="effect-name">Blast</div>
          </div>
        );
      case 'force':
        return (
          <div className="card-effect">
            <div className="effect-icon">✨</div>
            <div className="effect-name">Force</div>
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div 
      className={`card ${type} ${isPlayable ? 'playable' : ''} ${faceDown ? 'face-down' : ''}`} 
      onClick={isPlayable ? onClick : undefined}
      title={getTooltipText()}
    >
      {getCardContent()}
    </div>
  );
};

export default Card;

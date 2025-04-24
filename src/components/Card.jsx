import React from 'react';
import './Card.css';

const Card = ({ type, value, onClick, isPlayable }) => {
  // Card types: 'number', 'bolt', 'mirror', 'blast', 'force'
  
  const getCardContent = () => {
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
      className={`card ${type} ${isPlayable ? 'playable' : ''}`} 
      onClick={isPlayable ? onClick : undefined}
    >
      {getCardContent()}
    </div>
  );
};

export default Card;
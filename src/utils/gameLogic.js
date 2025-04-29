// Game constants
const CARD_TYPES = {
  NUMBER: 'number',
  BOLT: 'bolt',
  MIRROR: 'mirror',
  BLAST: 'blast',
  FORCE: 'force'
};

const INITIAL_HAND_SIZE = 10;

// Helper functions
const createDeck = () => {
  const deck = [];

  // Add numbered cards (1-7)
  for (let i = 1; i <= 7; i++) {
    // Add multiple copies of each number based on this table: https://kiseki.fandom.com/wiki/Blade#Cards
    let copies = 0;
    if (i === 1 || i === 7) {copies = 2;}
    if (i === 2 || i === 3 || i === 4) {copies = 5;}
    if (i === 5) {copies = 4;}
    if (i === 6) {copies = 3;}

    for (let j = 0; j < copies; j++) {
      deck.push({ type: CARD_TYPES.NUMBER, value: i });
    }
  }

  // Add effect cards
  const effectTypes = [CARD_TYPES.BOLT, CARD_TYPES.MIRROR, CARD_TYPES.BLAST, CARD_TYPES.FORCE];
  effectTypes.forEach(type => {
    // Add 4 copies of Bolt and Mirror effect card
    if (type === CARD_TYPES.BOLT || type === CARD_TYPES.MIRROR) {
      for (let i = 0; i < 4; i++) {
        deck.push({ type, value: 1 }); // Effect cards have a base value of 1
      }
    }

    // Add 2 copies of Blast and Force effect card
    if (type === CARD_TYPES.BLAST || type === CARD_TYPES.FORCE) {
      for (let i = 0; i < 2; i++) {
        deck.push({ type, value: 1 });
      }
    }

  });

  return deck;
};

const shuffleDeck = (deck) => {
  const shuffled = [...deck];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
};

const drawCards = (deck, count) => {
  return deck.slice(0, count);
};

const calculateTotalValue = (field) => {
  return field.reduce((total, card, index) => {
    // If Force card is the first card in the field, add its value (1)
    // Otherwise, don't add Force card's value to the total
    if (card.type === CARD_TYPES.FORCE) {
      return index === 0 ? total + 1 : total;
    }
    return total + card.value;
  }, 0);
};

// Function to determine the best card for the opponent to play
export const getOpponentCardToPlay = (gameState) => {
  const { players, currentPlayerIndex } = gameState;
  // The current player index is the opponent (since this function is called when it's the opponent's turn)
  const opponentIndex = currentPlayerIndex;
  const playerIndex = opponentIndex === 0 ? 1 : 0;
  const opponent = players[opponentIndex];
  const player = players[playerIndex];

  // If opponent has no cards, return -1
  if (opponent.hand.length === 0) {
    return -1;
  }

  // If opponent has only one card and it's an effect card, they can't play it
  if (opponent.hand.length === 1 && opponent.hand[0].type !== CARD_TYPES.NUMBER) {
    return -1;
  }

  // Check if opponent has only effect cards left
  const hasOnlyEffectCards = opponent.hand.every(card => card.type !== CARD_TYPES.NUMBER);
  if (hasOnlyEffectCards) {
    // Get all effect cards
    const effectCards = opponent.hand;

    // Check if any effect card can help outnumber the player
    // Check if Force card can help outnumber
    const forceCards = effectCards.filter(card => card.type === CARD_TYPES.FORCE);
    if (forceCards.length > 0 && opponent.totalValue * 2 > player.totalValue) {
      return opponent.hand.findIndex(card => card.type === CARD_TYPES.FORCE);
    }

    // Check if Mirror card can help if player's total value is higher
    const mirrorCards = effectCards.filter(card => card.type === CARD_TYPES.MIRROR);
    if (mirrorCards.length > 0 && player.totalValue > opponent.totalValue) {
      return opponent.hand.findIndex(card => card.type === CARD_TYPES.MIRROR);
    }

    // Check if Bolt card can help by removing player's last card
    const boltCards = effectCards.filter(card => card.type === CARD_TYPES.BOLT);
    if (boltCards.length > 0 && player.field.length > 0) {
      const lastPlayerCard = player.field[player.field.length - 1];
      const newPlayerValue = player.totalValue - (lastPlayerCard.type === CARD_TYPES.FORCE ? 0 : lastPlayerCard.value);
      if (opponent.totalValue > newPlayerValue) {
        return opponent.hand.findIndex(card => card.type === CARD_TYPES.BOLT);
      }
    }

    // If no effect card can help, return -1
    return -1;
  }

  // Get all number cards and effect cards
  const numberCards = opponent.hand.filter(card => card.type === CARD_TYPES.NUMBER);
  const effectCards = opponent.hand.filter(card => card.type !== CARD_TYPES.NUMBER);

  // If opponent has only one card left, it must be a number card (already checked above)
  if (opponent.hand.length === 1) {
    return opponent.hand.findIndex(card => card.type === CARD_TYPES.NUMBER);
  }

  // If opponent has only number cards left, find the lowest one that can outnumber the player
  if (effectCards.length === 0) {
    // Sort number cards by value (ascending)
    const sortedNumberCards = [...numberCards].sort((a, b) => a.value - b.value);

    // Find the lowest card that can outnumber the player
    for (const card of sortedNumberCards) {
      if (opponent.totalValue + card.value > player.totalValue) {
        return opponent.hand.findIndex(c => c.type === CARD_TYPES.NUMBER && c.value === card.value);
      }
    }

    // If no card can outnumber the player, return -1 (no valid card to play)
    return -1;
  }

  // If opponent has effect cards, randomly decide whether to play one
  // The probability increases as the number of effect cards increases
  const effectCardProbability = Math.min(0.3 + (effectCards.length / opponent.hand.length) * 0.4, 0.7);
  const playEffectCard = Math.random() < effectCardProbability;

  if (playEffectCard) {
    // Randomly choose between available effect cards
    const blastCards = effectCards.filter(card => card.type === CARD_TYPES.BLAST);
    const otherEffectCards = effectCards.filter(card => card.type !== CARD_TYPES.BLAST);

    // Randomly decide whether to play a Blast card if available
    if (blastCards.length > 0 && Math.random() < 0.4) {
      return opponent.hand.findIndex(card => card.type === CARD_TYPES.BLAST);
    }

    // For other effect cards, prioritize those that can help outnumber the player
    if (otherEffectCards.length > 0) {
      // Check if Force card can help outnumber
      const forceCards = otherEffectCards.filter(card => card.type === CARD_TYPES.FORCE);
      if (forceCards.length > 0 && opponent.totalValue * 2 > player.totalValue) {
        return opponent.hand.findIndex(card => card.type === CARD_TYPES.FORCE);
      }

      // Check if Mirror card can help if player's total value is higher
      const mirrorCards = otherEffectCards.filter(card => card.type === CARD_TYPES.MIRROR);
      if (mirrorCards.length > 0 && player.totalValue > opponent.totalValue) {
        return opponent.hand.findIndex(card => card.type === CARD_TYPES.MIRROR);
      }

      // Check if Bolt card can help by removing player's last card
      const boltCards = otherEffectCards.filter(card => card.type === CARD_TYPES.BOLT);
      if (boltCards.length > 0 && player.field.length > 0) {
        const lastPlayerCard = player.field[player.field.length - 1];
        const newPlayerValue = player.totalValue - (lastPlayerCard.type === CARD_TYPES.FORCE ? 0 : lastPlayerCard.value);
        if (opponent.totalValue > newPlayerValue) {
          return opponent.hand.findIndex(card => card.type === CARD_TYPES.BOLT);
        }
      }

      // If no specific effect card is chosen, pick a random one
      const randomEffectIndex = Math.floor(Math.random() * otherEffectCards.length);
      return opponent.hand.findIndex(card => card === otherEffectCards[randomEffectIndex]);
    }
  }

  // Default strategy: find the lowest number card that can outnumber the player
  // Sort number cards by value (ascending)
  const sortedNumberCards = [...numberCards].sort((a, b) => a.value - b.value);

  // Find the lowest card that can outnumber the player
  for (const card of sortedNumberCards) {
    if (opponent.totalValue + card.value > player.totalValue) {
      return opponent.hand.findIndex(c => c.type === CARD_TYPES.NUMBER && c.value === card.value);
    }
  }

  // If no card can outnumber the player, play the lowest card
  return opponent.hand.findIndex(card => card.type === CARD_TYPES.NUMBER && card.value === sortedNumberCards[0].value);
};

// Game logic functions
export const initializeGame = () => {
  // Create and shuffle a single deck
  const fullDeck = shuffleDeck(createDeck());

  // Split the deck evenly between players (19 cards each)
  const player1AllCards = fullDeck.slice(0, 19);
  const player2AllCards = fullDeck.slice(19, 38);

  // Draw initial hands (10 cards each), leaving 9 cards as deck
  const player1Deck = player1AllCards.slice(INITIAL_HAND_SIZE, 19);
  const player2Deck = player2AllCards.slice(INITIAL_HAND_SIZE, 19);
  const player1Hand = player1AllCards.slice(0, INITIAL_HAND_SIZE);
  const player2Hand = player2AllCards.slice(0, INITIAL_HAND_SIZE);

  // Sort hands: number cards in ascending order first, then effect cards grouped at the end
  const sortHand = (hand) => {
    return [...hand].sort((a, b) => {
      // If both are number cards, sort by value
      if (a.type === CARD_TYPES.NUMBER && b.type === CARD_TYPES.NUMBER) {
        return a.value - b.value;
      }
      // If only a is a number card, it comes first
      if (a.type === CARD_TYPES.NUMBER) {
        return -1;
      }
      // If only b is a number card, it comes first
      if (b.type === CARD_TYPES.NUMBER) {
        return 1;
      }
      // Both are effect cards, keep their original order (grouped together)
      return 0;
    });
  };

  // Apply sorting to both hands
  const sortedPlayer1Hand = sortHand(player1Hand);
  const sortedPlayer2Hand = sortHand(player2Hand);

  // Draw the first card from each player's deck
  const player1FirstCard = player1Deck.shift();
  const player2FirstCard = player2Deck.shift();

  // Determine who goes first (lower number)
  let currentPlayerIndex;
  // Get the effective values for comparison (effect cards count as 1)
  const player1Value = player1FirstCard.value;
  const player2Value = player2FirstCard.value;

  // Lower value goes first, player 1 goes first in a tie
  currentPlayerIndex = player1Value <= player2Value ? 0 : 1;

  return {
    players: [
      {
        hand: sortedPlayer1Hand,
        field: [player1FirstCard],
        deck: player1Deck,
        totalValue: player1FirstCard.value
      },
      {
        hand: sortedPlayer2Hand,
        field: [player2FirstCard],
        deck: player2Deck,
        totalValue: player2FirstCard.value
      }
    ],
    currentPlayerIndex,
    turn: 1,
    lastRemovedCard: null
  };
};

export const applyEffectCard = (gameState, cardType, playerIndex) => {
  // Create a deep copy of the game state to modify
  const newState = JSON.parse(JSON.stringify(gameState));
  const currentPlayerIndex = playerIndex;
  const opponentIndex = currentPlayerIndex === 0 ? 1 : 0;
  const currentPlayer = newState.players[currentPlayerIndex];
  const opponent = newState.players[opponentIndex];

  let message = '';

  // Create a dummy card to represent the effect card
  const effectCard = { type: cardType, value: 1 };

  // Handle different effect card types
  switch (cardType) {
    case CARD_TYPES.BOLT:
      // Remove the last card placed by opponent
      if (opponent.field.length > 0) {
        const removedCard = opponent.field.pop();
        opponent.totalValue -= removedCard.value;

        // Special rule: If Force is the top card in the field and gets hit by Bolt
        if (removedCard.type === CARD_TYPES.FORCE) {
          // Add back the Force card's value since we don't want to subtract it before halving
          opponent.totalValue += removedCard.value;
          // Reduce the opponent's total value by half
          opponent.totalValue = Math.floor(opponent.totalValue / 2);
          message = 'Bolt card removed Force card from opponent\'s field! Opponent\'s total value is reduced by half!';
        } else {
          message = 'Bolt card removed the last card from opponent\'s field!';
        }

        newState.lastRemovedCard = { 
          card: removedCard, 
          removedBy: CARD_TYPES.BOLT 
        };
      } else {
        message = 'Bolt card had no effect (opponent has no cards)';
      }

      // Bolt card is not placed on the field
      break;

    case CARD_TYPES.MIRROR:
      // Switch the entire field between players
      if (currentPlayer.field.length > 0 && opponent.field.length > 0) {
        // Save the fields
        const playerField = [...currentPlayer.field];
        const opponentField = [...opponent.field];

        // Save the total values
        const playerTotalValue = currentPlayer.totalValue;
        const opponentTotalValue = opponent.totalValue;

        // Swap fields
        currentPlayer.field = opponentField;
        opponent.field = playerField;

        // Swap total values instead of recalculating
        currentPlayer.totalValue = opponentTotalValue;
        opponent.totalValue = playerTotalValue;

        message = 'Mirror card switched the entire field!';
      } else {
        message = 'Mirror card had no effect (not enough cards on field)';
      }

      // Mirror card is not placed on the field
      break;

    case CARD_TYPES.BLAST:
      // Randomly remove one card from opponent's hand
      if (opponent.hand.length > 0) {
        const randomIndex = Math.floor(Math.random() * opponent.hand.length);
        opponent.hand.splice(randomIndex, 1);
        message = 'Blast card removed a random card from opponent\'s hand!';
      } else {
        message = 'Blast card had no effect (opponent has no cards)';
      }

      // Blast card is not placed on the field
      break;

    case CARD_TYPES.FORCE:
      // Double the latest total value
      currentPlayer.totalValue *= 2;

      // Add the force card to the field without adding its value to the total
      currentPlayer.field.push(effectCard);
      message = 'Force card doubled your total value!';
      break;

    default:
      throw new Error('Unknown effect card type');
  }

  return {
    newState,
    message
  };
};

// Function to check if a player has any card that can potentially surpass the opponent's total value
export const checkPlayerViability = (gameState) => {
  const { players, currentPlayerIndex } = gameState;
  const currentPlayer = players[currentPlayerIndex];
  const opponentIndex = currentPlayerIndex === 0 ? 1 : 0;
  const opponent = players[opponentIndex];

  // Check if any single card in the player's hand can potentially surpass the opponent's total value
  const canPotentiallySurpass = canPlayerPotentiallySurpass(currentPlayer, opponent, gameState.lastRemovedCard);

  // Check if the current player only has effect cards left
  const hasOnlyEffectCards = currentPlayer.hand.length > 0 && currentPlayer.hand.every(card => card.type !== CARD_TYPES.NUMBER);
  if (hasOnlyEffectCards && !canPotentiallySurpass) {
    // Create a deep copy of the game state to modify
    const newState = JSON.parse(JSON.stringify(gameState));

    // Player automatically loses if they only have effect cards left and none of them can help outnumber the opponent
    const playerName = currentPlayerIndex === 0 ? 'Player' : 'Opponent';
    const loserMessage = `${playerName} only has effect cards left and cannot outnumber the opponent. ${playerName} loses the match!`;
    return {
      newState,
      message: loserMessage,
      gameOver: true,
      viable: false
    };
  }

  if (!canPotentiallySurpass && currentPlayer.hand.length > 0) {
    // Create a deep copy of the game state to modify
    const newState = JSON.parse(JSON.stringify(gameState));

    // Player's remaining cards cannot surpass opponent's total value
    const playerName = currentPlayerIndex === 0 ? 'Player' : 'Opponent';
    const opponentName = currentPlayerIndex === 0 ? 'opponent' : 'player';
    const loserMessage = `${playerName}'s remaining cards cannot surpass ${opponentName}'s total value. ${playerName} loses the match!`;
    return {
      newState,
      message: loserMessage,
      gameOver: true,
      viable: false
    };
  }

  return { viable: true };
};

// Helper function to check if a player can potentially surpass the opponent's total value
export const canPlayerPotentiallySurpass = (player, opponent, lastRemovedCard) => {
  // Check each card individually to see if it can outnumber the opponent's total value if played
  for (const card of player.hand) {
    if (card.type === CARD_TYPES.NUMBER && (player.totalValue + card.value >= opponent.totalValue)) {
      return true;
    }
    // Also check if effect cards can potentially help (like Force doubling the value)
    if (card.type === CARD_TYPES.FORCE && (player.totalValue * 2 >= opponent.totalValue)) {
      return true;
    }
    // Mirror card can swap fields if opponent's total value is higher
    if (card.type === CARD_TYPES.MIRROR && opponent.totalValue > player.totalValue) {
      return true;
    }
    // Bolt card can remove opponent's last card, potentially reducing their total value
    if (card.type === CARD_TYPES.BOLT && opponent.field.length > 0) {
      // Calculate opponent's total value without their last card
      const lastCard = opponent.field[opponent.field.length - 1];
      const newOpponentValue = opponent.totalValue - (lastCard.type === CARD_TYPES.FORCE ? 0 : lastCard.value);
      if (player.totalValue > newOpponentValue) {
        return true;
      }
    }
    // Number 1 card can recover a card removed by Bolt
    if (card.type === CARD_TYPES.NUMBER && card.value === 1 && lastRemovedCard && lastRemovedCard.removedBy === CARD_TYPES.BOLT) {
      return true;
    }
  }

  return false;
};

export const playCard = (gameState, cardIndex) => {
  const { players, currentPlayerIndex, turn, lastRemovedCard } = gameState;
  const currentPlayer = players[currentPlayerIndex];
  const opponentIndex = currentPlayerIndex === 0 ? 1 : 0;
  const opponent = players[opponentIndex];

  // First check if the player has any viable cards
  const viabilityCheck = checkPlayerViability(gameState);
  if (!viabilityCheck.viable) {
    return viabilityCheck;
  }

  // Check if the card index is valid
  if (cardIndex < 0 || cardIndex >= currentPlayer.hand.length) {
    throw new Error('Invalid card index');
  }

  // Get the card to play
  const cardToPlay = currentPlayer.hand[cardIndex];

  // Check if this is the last card, and it's an effect card (not allowed)
  if (currentPlayer.hand.length === 1 && cardToPlay.type !== CARD_TYPES.NUMBER) {
    throw new Error('Cannot play an effect card as the last card');
  }

  // Create a deep copy of the game state to modify
  const newState = JSON.parse(JSON.stringify(gameState));
  const newCurrentPlayer = newState.players[currentPlayerIndex];
  const newOpponent = newState.players[opponentIndex];

  // Remove the card from the hand
  newCurrentPlayer.hand.splice(cardIndex, 1);

  let message = '';

  // Handle different card types
  switch (cardToPlay.type) {
    case CARD_TYPES.NUMBER:
      // Special rule: Number 1 can bring back the last card removed by Bolt
      if (cardToPlay.value === 1 && lastRemovedCard && newState.lastRemovedCard.removedBy === CARD_TYPES.BOLT) {
        newCurrentPlayer.field.push(lastRemovedCard.card);
        newCurrentPlayer.totalValue += lastRemovedCard.card.value;

        // Special rule: If a 1 card recovers a Force card, double the player's total value
        if (lastRemovedCard.card.type === CARD_TYPES.FORCE) {
          newCurrentPlayer.totalValue *= 2;
          const playerName = currentPlayerIndex === 0 ? 'Player' : 'Opponent';
          message = `${playerName} played Number 1 and brought back Force card! ${playerName}'s total value is doubled!`;
        } else {
          const playerName = currentPlayerIndex === 0 ? 'Player' : 'Opponent';
          message = `${playerName} played Number 1 and brought back ${lastRemovedCard.card.type} card!`;
        }

        newState.lastRemovedCard = null;
      } else {
        // Check if this is the opponent and the card doesn't make their total value exceed the player's
        if (currentPlayerIndex === 1 && newCurrentPlayer.totalValue + cardToPlay.value <= newOpponent.totalValue) {
          throw new Error('Opponent cannot play a card that doesn\'t make their total value exceed the player\'s total value');
        }

        // Regular number card
        newCurrentPlayer.field.push(cardToPlay);
        newCurrentPlayer.totalValue += cardToPlay.value;
        const playerName = currentPlayerIndex === 0 ? 'Player' : 'Opponent';
        message = `${playerName} played Number ${cardToPlay.value}`;
        newState.lastRemovedCard = null
      }
      break;

    case CARD_TYPES.BOLT:
      // Prevent using Bolt card if opponent's field is empty
      if (newOpponent.field.length === 0) {
        throw new Error('Cannot use Bolt card when opponent\'s field is empty');
      }

      // Remove the last card placed by an opponent
      const removedCard = newOpponent.field.pop();
      newOpponent.totalValue -= removedCard.value;

      // Special rule: If Force is the top card in the field and gets hit by Bolt
      if (removedCard.type === CARD_TYPES.FORCE) {
        // Add back the Force card's value since we don't want to subtract it before halving
        newOpponent.totalValue += removedCard.value;
        // Reduce the opponent's total value by half
        newOpponent.totalValue = Math.floor(newOpponent.totalValue / 2);
        message = 'Bolt card removed Force card from opponent\'s field! Opponent\'s total value is reduced by half!';
      } else {
        message = 'Bolt card removed the last card from opponent\'s field!';
      }

      newState.lastRemovedCard = { 
        card: removedCard, 
        removedBy: CARD_TYPES.BOLT 
      };
      // Bolt card is not placed on the field
      break;

    case CARD_TYPES.MIRROR:
      // Prevent using Mirror card if opponent's field is empty
      if (newOpponent.field.length === 0) {
        throw new Error('Cannot use Mirror card when opponent\'s field is empty');
      }

      // Switch the entire field between players
      if (newCurrentPlayer.field.length > 0) {
        // Save the fields
        const playerField = [...newCurrentPlayer.field];
        const opponentField = [...newOpponent.field];

        // Reset total values
        newCurrentPlayer.totalValue = 0;
        newOpponent.totalValue = 0;

        // Swap fields
        newCurrentPlayer.field = opponentField;
        newOpponent.field = playerField;

        // Recalculate total values
        newCurrentPlayer.totalValue = calculateTotalValue(newCurrentPlayer.field);
        newOpponent.totalValue = calculateTotalValue(newOpponent.field);

        message = 'Mirror card switched the entire field!';
      } else {
        message = 'Mirror card had no effect (not enough cards on field)';
      }
      // Mirror card is not placed on the field
      newState.lastRemovedCard = null
      break;

    case CARD_TYPES.BLAST:
      // Randomly remove one card from an opponent's hand
      if (newOpponent.hand.length > 0) {
        const randomIndex = Math.floor(Math.random() * newOpponent.hand.length);
        newOpponent.hand.splice(randomIndex, 1);
        message = 'Blast card removed a random card from opponent\'s hand!';
      } else {
        message = 'Blast card had no effect (opponent has no cards)';
      }
      // Blast card is not placed on the field
      break;

    case CARD_TYPES.FORCE:
      // Prevent using Force card as the first card on the field
      if (newCurrentPlayer.field.length === 0) {
        throw new Error('Cannot use Force card as the first card on the field');
      }

      // Double the latest total value
      newCurrentPlayer.totalValue *= 2;

      // Add the force card to the field without adding its value to the total
      newCurrentPlayer.field.push(cardToPlay);
      message = 'Force card doubled your total value!';
      newState.lastRemovedCard = null
      break;

    default:
      throw new Error('Unknown card type');
  }

  // Check if the current player's total value surpasses the opponent's
  const playerWon = newCurrentPlayer.totalValue > newOpponent.totalValue;

  // Check if both players have equal total value
  const isDraw = newCurrentPlayer.totalValue === newOpponent.totalValue;

  // Check if the player has no more cards
  let noMoreCards = newCurrentPlayer.hand.length === 0;
  // If player has only one card left and it's a number card, consider them as having no more cards
  // since they just played their last card
  if (newCurrentPlayer.hand.length === 1 && cardToPlay.type === CARD_TYPES.NUMBER) {
    noMoreCards = true;
  }

  // Determine game over conditions
  let gameOver = false;


  if (isDraw) {
    // Clear the field and take one card from each deck to be the initial field
    message += ' Both players have equal total value. The field is cleared and new cards are drawn from decks!';

    // Clear the fields and reset total values
    newCurrentPlayer.field = [];
    newOpponent.field = [];
    newCurrentPlayer.totalValue = 0;
    newOpponent.totalValue = 0;

    // Take one card from each player's deck to be the initial field
    if (newCurrentPlayer.deck.length > 0) {
      const player1FirstCard = newCurrentPlayer.deck.shift();
      newCurrentPlayer.field.push(player1FirstCard);
      newCurrentPlayer.totalValue += player1FirstCard.value;
    }

    if (newOpponent.deck.length > 0) {
      const player2FirstCard = newOpponent.deck.shift();
      newOpponent.field.push(player2FirstCard);
      newOpponent.totalValue += player2FirstCard.value;
    }

    // Determine who goes first (lower number)
    if (newCurrentPlayer.field.length > 0 && newOpponent.field.length > 0) {
      const currentPlayerFirstCard = newCurrentPlayer.field[0];
      const opponentFirstCard = newOpponent.field[0];

      // Get the actual player indices (not relative to current turn)
      const player1Index = currentPlayerIndex === 0 ? 0 : 1;
      const player2Index = currentPlayerIndex === 0 ? 1 : 0;

      // Get the cards by absolute player index
      const player1Card = player1Index === currentPlayerIndex ? currentPlayerFirstCard : opponentFirstCard;
      const player2Card = player2Index === currentPlayerIndex ? currentPlayerFirstCard : opponentFirstCard;

      // Get the effective values for comparison (effect cards count as 1)
      const player1Value = player1Card.value;
      const player2Value = player2Card.value;

      // Lower value goes first, player1 goes first in a tie (consistent with initial game setup)
      newState.currentPlayerIndex = player1Value <= player2Value ? player1Index : player2Index;

      // Check if the new current player has only effect cards left
      const newCurrentPlayerIndex = newState.currentPlayerIndex;
      const newCurrentPlayerObj = newState.players[newCurrentPlayerIndex];
      const newOpponentIndex = newCurrentPlayerIndex === 0 ? 1 : 0;
      const newOpponentObj = newState.players[newOpponentIndex];
      const hasOnlyEffectCards = newCurrentPlayerObj.hand.length > 0 && 
                                newCurrentPlayerObj.hand.every(card => card.type !== CARD_TYPES.NUMBER);

      if (hasOnlyEffectCards) {
        // Check if any of the effect cards can potentially help the player outnumber the opponent
        const canPotentiallySurpass = canPlayerPotentiallySurpass(newCurrentPlayerObj, newOpponentObj, newState.lastRemovedCard);

        if (!canPotentiallySurpass) {
          // If the new current player has only effect cards left and none of them can help outnumber the opponent, they lose
          const playerName = newCurrentPlayerIndex === 0 ? 'Player' : 'Opponent';
          const opponentName = newCurrentPlayerIndex === 0 ? 'opponent' : 'player';
          message += ` ${playerName} only has effect cards left and cannot outnumber the opponent. ${playerName} loses the match!`;
          return {
            newState,
            message,
            gameOver: true
          };
        }
      }
    }

    return {
      newState,
      message,
      gameOver: false
    };
  }


  if (!playerWon) {
    if (cardToPlay.type === CARD_TYPES.BLAST) {
      // Don't switch turns, just increment turn counter
      newState.turn += 1;
    } else {
      // Check if any single card in the player's hand can potentially surpass the opponent's total value
      const canPotentiallySurpass = canPlayerPotentiallySurpass(newCurrentPlayer, newOpponent, newState.lastRemovedCard);

      if (!canPotentiallySurpass && newCurrentPlayer.hand.length > 0) {
        // Player's remaining cards cannot surpass opponent's total value
        const playerName = currentPlayerIndex === 0 ? 'Player' : 'Opponent';
        const opponentName = currentPlayerIndex === 0 ? 'opponent' : 'player';
        message += ` ${playerName}'s remaining cards cannot surpass ${opponentName}'s total value. ${playerName} loses the match!`;
        gameOver = true;
      } else if (newCurrentPlayer.hand.length === 0) {
        // Current player couldn't surpass opponent's value and has no more cards
        const playerName = currentPlayerIndex === 0 ? 'Player' : 'Opponent';
        message += ` ${playerName} couldn't surpass opponent's value. ${playerName} loses the match!`;
        gameOver = true;
      } else {
        // Current player couldn't surpass opponent's value but still has cards that can potentially surpass
        // Switch to the other player's turn
        newState.currentPlayerIndex = opponentIndex;
        newState.turn += 1;
      }
    }
  } else if (noMoreCards) {
    // Player has no more cards
    if (newOpponent.hand.length > 0) {
      // If opponent has only 1 card left and it's an effect card, they should lose
      if (newOpponent.hand.length === 1 && newOpponent.hand[0].type !== CARD_TYPES.NUMBER) {
        const playerName = currentPlayerIndex === 0 ? 'Player' : 'Opponent';
        const opponentName = currentPlayerIndex === 0 ? 'Opponent' : 'Player';
        message += ` ${playerName} has no more cards. ${opponentName} has only one effect card left. ${playerName} wins!`;
        gameOver = true;
      } else {
        // Check if opponent has any cards that can potentially outnumber the current field
        const opponentCanWin = canPlayerPotentiallySurpass(newOpponent, newCurrentPlayer, newState.lastRemovedCard);

        if (opponentCanWin) {
          // Give the turn to the opponent if they can potentially win
          newState.currentPlayerIndex = opponentIndex;
          newState.turn += 1;
        } else {
          // Opponent can't win, so current player wins
          const playerName = currentPlayerIndex === 0 ? 'Player' : 'Opponent';
          const opponentName = currentPlayerIndex === 0 ? 'Opponent' : 'Player';
          message += ` ${playerName} has no more cards. ${opponentName} cannot outnumber the field. ${playerName} wins!`;
          gameOver = true;
        }
      }
    } else {
      // If opponent also has no cards, current player wins
      const playerName = currentPlayerIndex === 0 ? 'Player' : 'Opponent';
      message += ` ${playerName} has no more cards but won the game! ${playerName} wins!`;
      gameOver = true;
    }
  } else {
    // For Blast card, player gets to play another card
    if (cardToPlay.type === CARD_TYPES.BLAST) {
      // Don't switch turns, just increment turn counter
      newState.turn += 1;
    } else {
      // Switch to the other player's turn for all other cards
      newState.currentPlayerIndex = opponentIndex;
      newState.turn += 1;
    }
  }

  return {
    newState,
    message,
    gameOver
  };
};

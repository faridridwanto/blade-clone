// Test script to verify the fix for Force card value when swapped by Mirror
import { applyEffectCard } from '../src/utils/gameLogic.js';

// Create a test game state with a Force card as the first card in player 0's field
const gameState = {
  players: [
    {
      hand: [],
      field: [
        { type: 'force', value: 1 } // Force card as the first card
      ],
      totalValue: 2 // Force card doubles the value, but since it's the only card, it's 2 * 0 = 0 + 1 = 1
    },
    {
      hand: [],
      field: [
        { type: 'number', value: 3 }
      ],
      totalValue: 3
    }
  ],
  currentPlayerIndex: 1, // Player 1 is the current player
  turn: 1,
  lastRemovedCard: null
};

// Apply the Mirror card effect
const result = applyEffectCard(gameState, 'mirror', 1);

// Check if the Force card value is 1 when swapped to the opponent
console.log('Player 0 field after swap:', result.newState.players[0].field);
console.log('Player 0 total value after swap:', result.newState.players[0].totalValue);
console.log('Player 1 field after swap:', result.newState.players[1].field);
console.log('Player 1 total value after swap:', result.newState.players[1].totalValue);

// Verify that the Force card gives a value of 1 to the opponent when it's the first card
if (result.newState.players[0].totalValue === 3 && result.newState.players[1].totalValue === 1) {
  console.log('TEST PASSED: Force card gives a value of 1 to the opponent when it\'s the first card');
} else {
  console.log('TEST FAILED: Force card should give a value of 1 to the opponent when it\'s the first card');
  console.log('Expected: Player 0 total value = 3, Player 1 total value = 1');
  console.log('Actual: Player 0 total value =', result.newState.players[0].totalValue, 
              ', Player 1 total value =', result.newState.players[1].totalValue);
}

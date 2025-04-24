import { describe, it, expect, vi } from 'vitest';
import { applyEffectCard, initializeGame, playCard } from '../../src/utils/gameLogic';

// Mock Math.random to make tests deterministic
vi.spyOn(Math, 'random').mockImplementation(() => 0.5);

describe('applyEffectCard', () => {
  // Helper function to create a simple game state for testing
  const createTestGameState = () => {
    return {
      players: [
        {
          hand: [
            { type: 'number', value: 2 },
            { type: 'number', value: 3 }
          ],
          field: [
            { type: 'number', value: 1 }
          ],
          totalValue: 1
        },
        {
          hand: [
            { type: 'number', value: 4 },
            { type: 'number', value: 5 }
          ],
          field: [
            { type: 'number', value: 2 }
          ],
          totalValue: 2
        }
      ],
      currentPlayerIndex: 0,
      turn: 1,
      lastRemovedCard: null
    };
  };

  describe('Bolt card effect', () => {
    it('should remove the last card from opponent\'s field', () => {
      const gameState = createTestGameState();
      const result = applyEffectCard(gameState, 'bolt', 0);

      // Check that the opponent's field is empty
      expect(result.newState.players[1].field).toHaveLength(0);

      // Check that the opponent's total value is reduced
      expect(result.newState.players[1].totalValue).toBe(0);

      // Check that the bolt card is NOT added to the player's field
      expect(result.newState.players[0].field).toHaveLength(1);

      // Check that the player's total value is not increased
      expect(result.newState.players[0].totalValue).toBe(1);

      // Check that the lastRemovedCard is set correctly
      expect(result.newState.lastRemovedCard).toEqual({
        card: { type: 'number', value: 2 },
        removedBy: 'bolt'
      });

      // Check the message
      expect(result.message).toBe('Bolt card removed the last card from opponent\'s field!');
    });

    it('should reduce opponent\'s total value by half when removing a Force card', () => {
      const gameState = createTestGameState();
      // Set up a Force card as the last card in opponent's field
      gameState.players[1].field = [
        { type: 'number', value: 3 },
        { type: 'force', value: 1 }
      ];
      // Set opponent's total value to 8 (assuming it was doubled by the Force card)
      gameState.players[1].totalValue = 8;

      const result = applyEffectCard(gameState, 'bolt', 0);

      // Check that the Force card is removed from opponent's field
      expect(result.newState.players[1].field).toHaveLength(1);
      expect(result.newState.players[1].field[0].type).toBe('number');

      // Check that the opponent's total value is reduced by half (8 - 1) / 2 = 3.5, rounded down to 3
      expect(result.newState.players[1].totalValue).toBe(3);

      // Check that the lastRemovedCard is set correctly
      expect(result.newState.lastRemovedCard).toEqual({
        card: { type: 'force', value: 1 },
        removedBy: 'bolt'
      });

      // Check the message
      expect(result.message).toBe('Bolt card removed Force card from opponent\'s field! Opponent\'s total value is reduced by half!');
    });

    it('should have no effect if opponent\'s field is empty', () => {
      const gameState = createTestGameState();
      gameState.players[1].field = [];
      gameState.players[1].totalValue = 0;

      const result = applyEffectCard(gameState, 'bolt', 0);

      // Check that the bolt card is NOT added to the player's field
      expect(result.newState.players[0].field).toHaveLength(1);

      // Check that the player's total value is not increased
      expect(result.newState.players[0].totalValue).toBe(1);

      // Check the message
      expect(result.message).toBe('Bolt card had no effect (opponent has no cards)');
    });
  });

  describe('Mirror card effect', () => {
    it('should switch the last cards on the field', () => {
      const gameState = createTestGameState();
      const result = applyEffectCard(gameState, 'mirror', 0);

      // Check that the cards are switched
      expect(result.newState.players[0].field[0].value).toBe(2);
      expect(result.newState.players[1].field[0].value).toBe(1);

      // Check that the mirror card is NOT added to the player's field
      expect(result.newState.players[0].field).toHaveLength(1);

      // Check that the total values are updated correctly
      expect(result.newState.players[0].totalValue).toBe(2); // 2 (switched)
      expect(result.newState.players[1].totalValue).toBe(1); // 1 (switched)

      // Check the message
      expect(result.message).toBe('Mirror card switched the entire field!');
    });

    it('should have no effect if either field is empty', () => {
      const gameState = createTestGameState();
      gameState.players[1].field = [];
      gameState.players[1].totalValue = 0;

      const result = applyEffectCard(gameState, 'mirror', 0);

      // Check that the mirror card is NOT added to the player's field
      expect(result.newState.players[0].field).toHaveLength(1);

      // Check that the player's total value is not increased
      expect(result.newState.players[0].totalValue).toBe(1);

      // Check the message
      expect(result.message).toBe('Mirror card had no effect (not enough cards on field)');
    });
  });

  describe('Blast card effect', () => {
    it('should remove a random card from opponent\'s hand', () => {
      const gameState = createTestGameState();
      const result = applyEffectCard(gameState, 'blast', 0);

      // Check that a card is removed from opponent's hand
      expect(result.newState.players[1].hand).toHaveLength(1);

      // With Math.random mocked to 0.5, it should remove the card at index 1
      expect(result.newState.players[1].hand[0].value).toBe(4);

      // Check that the blast card is NOT added to the player's field
      expect(result.newState.players[0].field).toHaveLength(1);

      // Check that the player's total value is not increased
      expect(result.newState.players[0].totalValue).toBe(1);

      // Check the message
      expect(result.message).toBe('Blast card removed a random card from opponent\'s hand!');
    });

    it('should have no effect if opponent\'s hand is empty', () => {
      const gameState = createTestGameState();
      gameState.players[1].hand = [];

      const result = applyEffectCard(gameState, 'blast', 0);

      // Check that the blast card is NOT added to the player's field
      expect(result.newState.players[0].field).toHaveLength(1);

      // Check that the player's total value is not increased
      expect(result.newState.players[0].totalValue).toBe(1);

      // Check the message
      expect(result.message).toBe('Blast card had no effect (opponent has no cards)');
    });
  });

  describe('Force card effect', () => {
    it('should double the player\'s total value', () => {
      const gameState = createTestGameState();
      const result = applyEffectCard(gameState, 'force', 0);

      // Check that the force card is added to the player's field
      expect(result.newState.players[0].field).toHaveLength(2);
      expect(result.newState.players[0].field[1].type).toBe('force');

      // Check that the player's total value is doubled
      expect(result.newState.players[0].totalValue).toBe(2); // (1 * 2)

      // Check the message
      expect(result.message).toBe('Force card doubled your total value!');
    });

    it('should work with higher total values', () => {
      const gameState = createTestGameState();
      gameState.players[0].totalValue = 5;

      const result = applyEffectCard(gameState, 'force', 0);

      // Check that the player's total value is doubled
      expect(result.newState.players[0].totalValue).toBe(10); // (5 * 2)
    });
  });

  it('should throw an error for unknown card types', () => {
    const gameState = createTestGameState();
    expect(() => applyEffectCard(gameState, 'unknown', 0)).toThrow('Unknown effect card type');
  });

  it('should not modify the original game state', () => {
    const gameState = createTestGameState();
    const originalState = JSON.parse(JSON.stringify(gameState));

    applyEffectCard(gameState, 'bolt', 0);

    // Check that the original state is not modified
    expect(gameState).toEqual(originalState);
  });
});

describe('playCard', () => {
  // Helper function to create a game state for testing playCard
  const createPlayCardTestState = () => {
    return {
      players: [
        {
          hand: [
            { type: 'number', value: 1 }, // Number 1 card at index 0
            { type: 'number', value: 3 }
          ],
          field: [
            { type: 'number', value: 2 }
          ],
          totalValue: 2,
          deck: []
        },
        {
          hand: [
            { type: 'number', value: 4 },
            { type: 'number', value: 5 }
          ],
          field: [
            { type: 'number', value: 3 }
          ],
          totalValue: 3,
          deck: []
        }
      ],
      currentPlayerIndex: 0,
      turn: 1,
      lastRemovedCard: null
    };
  };

  // Helper function to create a game state for testing draw handling
  const createDrawTestState = () => {
    return {
      players: [
        {
          hand: [
            { type: 'number', value: 3 }
          ],
          field: [
            { type: 'number', value: 2 }
          ],
          totalValue: 2,
          deck: [
            { type: 'number', value: 2 }, // Player 1's next card
            { type: 'number', value: 5 }
          ]
        },
        {
          hand: [
            { type: 'number', value: 4 }
          ],
          field: [
            { type: 'number', value: 2 }
          ],
          totalValue: 5, // Will be equal to player 1's total value after they play their card with value 3
          deck: [
            { type: 'number', value: 3 }, // Player 2's next card
            { type: 'number', value: 6 }
          ]
        }
      ],
      currentPlayerIndex: 0,
      turn: 1,
      lastRemovedCard: null
    };
  };

  describe('Draw handling', () => {
    it('should handle a draw correctly - player with lower card value goes first', () => {
      // Set up game state with equal total values
      const gameState = createDrawTestState();

      // Debug the initial state
      console.log('Initial Player 1 field:', gameState.players[0].field);
      console.log('Initial Player 2 field:', gameState.players[1].field);
      console.log('Initial Player 1 totalValue:', gameState.players[0].totalValue);
      console.log('Initial Player 2 totalValue:', gameState.players[1].totalValue);
      console.log('Initial Player 1 hand:', gameState.players[0].hand);

      // Player 1 plays a card that will result in a draw
      const result = playCard(gameState, 0);

      // Debug the state after playing the card
      console.log('After play - Player 1 field:', result.newState.players[0].field);
      console.log('After play - Player 2 field:', result.newState.players[1].field);
      console.log('After play - Player 1 totalValue:', result.newState.players[0].totalValue);
      console.log('After play - Player 2 totalValue:', result.newState.players[1].totalValue);
      console.log('After play - isDraw:', result.newState.players[0].totalValue === result.newState.players[1].totalValue);

      // Check that the new cards are drawn from the deck
      // The field should have only one card after a draw
      expect(result.newState.players[0].field).toHaveLength(1);
      expect(result.newState.players[1].field).toHaveLength(1);

      // The cards should be the ones from the deck
      expect(result.newState.players[0].field[0].value).toBe(2); // Player 1's next card
      expect(result.newState.players[1].field[0].value).toBe(3); // Player 2's next card

      // Player 1's card value (2) is lower than Player 2's card value (3)
      // So Player 1 should go first
      expect(result.newState.currentPlayerIndex).toBe(0);

      // Check that the message indicates a draw
      expect(result.message).toContain('Both players have equal total value');

      // Check that the game is not over
      expect(result.gameOver).toBe(false);
    });

    it('should handle a draw correctly - player 1 goes first in case of a tie', () => {
      // Set up game state with equal total values
      const gameState = createDrawTestState();

      // Make both players draw the same value card
      gameState.players[0].deck[0].value = 3; // Player 1's next card
      gameState.players[1].deck[0].value = 3; // Player 2's next card

      // Player 1 plays a card that will result in a draw
      const result = playCard(gameState, 0);

      // Debug the state of the fields
      console.log('Player 1 field (tie):', result.newState.players[0].field);
      console.log('Player 2 field (tie):', result.newState.players[1].field);

      // Check that the new cards are drawn from the deck
      expect(result.newState.players[0].field[0].value).toBe(3); // Player 1's next card
      expect(result.newState.players[1].field[0].value).toBe(3); // Player 2's next card

      // Both players have the same card value (3)
      // Player 1 should go first in a tie
      expect(result.newState.currentPlayerIndex).toBe(0);

      // Check that the message indicates a draw
      expect(result.message).toContain('Both players have equal total value');

      // Check that the game is not over
      expect(result.gameOver).toBe(false);
    });

    it('should handle a draw correctly when one player draws an effect card', () => {
      // Set up game state with equal total values
      const gameState = createDrawTestState();

      // Make player 1 draw an effect card (bolt) with value 1
      gameState.players[0].deck[0] = { type: 'bolt', value: 1 };
      // Player 2 draws a number card with value 2
      gameState.players[1].deck[0] = { type: 'number', value: 2 };

      // Player 1 plays a card that will result in a draw
      const result = playCard(gameState, 0);

      // Debug the state of the fields
      console.log('Player 1 field (effect card):', result.newState.players[0].field);
      console.log('Player 2 field (number card):', result.newState.players[1].field);

      // Check that the new cards are drawn from the deck
      expect(result.newState.players[0].field[0].type).toBe('bolt'); // Player 1's effect card
      expect(result.newState.players[1].field[0].type).toBe('number'); // Player 2's number card
      expect(result.newState.players[0].field[0].value).toBe(1); // Effect card value is 1
      expect(result.newState.players[1].field[0].value).toBe(2); // Number card value is 2

      // Player 1's card value (1) is lower than Player 2's card value (2)
      // So Player 1 should go first
      expect(result.newState.currentPlayerIndex).toBe(0);

      // Check that the message indicates a draw
      expect(result.message).toContain('Both players have equal total value');

      // Check that the game is not over
      expect(result.gameOver).toBe(false);
    });
  });

  describe('Number 1 card recovery', () => {
    it('should recover a Force card removed by Bolt and double the player\'s total value', () => {
      // Set up game state with a Force card that was removed by Bolt
      const gameState = createPlayCardTestState();
      gameState.lastRemovedCard = {
        card: { type: 'force', value: 1 },
        removedBy: 'bolt'
      };

      // Play the Number 1 card (index 0)
      const result = playCard(gameState, 0);

      // Check that the Force card is added to the player's field
      expect(result.newState.players[0].field).toHaveLength(2);
      expect(result.newState.players[0].field[1].type).toBe('force');

      // Check that the player's total value is doubled after adding the Force card value
      // Initial value: 2, Force card value: 1, Total: 3, Then doubled: 6
      expect(result.newState.players[0].totalValue).toBe(6);

      // Check that the lastRemovedCard is reset
      expect(result.newState.lastRemovedCard).toBeNull();
    });

    it('should recover a non-Force card removed by Bolt without doubling the player\'s total value', () => {
      // Set up game state with a non-Force card that was removed by Bolt
      const gameState = createPlayCardTestState();
      gameState.lastRemovedCard = {
        card: { type: 'number', value: 4 },
        removedBy: 'bolt'
      };

      // Play the Number 1 card (index 0)
      const result = playCard(gameState, 0);

      // Check that the card is added to the player's field
      expect(result.newState.players[0].field).toHaveLength(2);
      expect(result.newState.players[0].field[1].type).toBe('number');
      expect(result.newState.players[0].field[1].value).toBe(4);

      // Check that the player's total value is increased by the card value but not doubled
      // Initial value: 2, Added card value: 4, Total: 6
      expect(result.newState.players[0].totalValue).toBe(6);

      // Check that the lastRemovedCard is reset
      expect(result.newState.lastRemovedCard).toBeNull();
    });
  });
});

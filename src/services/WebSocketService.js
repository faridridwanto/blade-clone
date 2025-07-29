import { useState, useEffect, useCallback } from 'react';

// Get WebSocket URL from environment variable or use default
const WS_URL = import.meta.env.VITE_WEBSOCKET_URL || 'ws://localhost:8080/ws';

class WebSocketService {
  constructor() {
    this.socket = null;
    this.connectionId = null;
    this.sessionId = null;
    this.opponentConnectionId = null;
    this._isMatchmakingQueued = false; // Flag to track a queued request
    this.callbacks = {
      onOpen: () => {},
      onMessage: () => {},
      onClose: () => {},
      onError: () => {},
      onMatchFound: () => {},
      onGameStateUpdate: () => {},
    };
  }

  // Helper to reset state on new connections or disconnections
  _resetState() {
    this.connectionId = null;
    this.sessionId = null;
    this.opponentConnectionId = null;
    this._isMatchmakingQueued = false;
  }

  isReadyForMatchmaking() {
    return this.socket && this.socket.readyState === WebSocket.OPEN && !!this.connectionId;
  }

  connect() {
    if (this.socket && (this.socket.readyState === WebSocket.OPEN || this.socket.readyState === WebSocket.CONNECTING)) {
      console.log('WebSocket already connected or connecting.');
      return;
    }

    this._resetState();
    this.socket = new WebSocket(WS_URL);

    this.socket.onopen = () => {
      console.log('WebSocket connected');
      this.callbacks.onOpen();
    };

    this.socket.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data);
        console.log('WebSocket message received:', message);

        // Store connection ID from the first message
        if (!this.connectionId && message.to) {
          this.connectionId = message.to;
          console.log('Connection ID set:', this.connectionId);

          // If a matchmaking request was queued, send it now that we are ready.
          if (this._isMatchmakingQueued) {
            console.log('Connection ready, sending queued matchmaking request.');
            this.requestMatchmaking();
          }
        }

        // Handle matchmaking response
        if (message.from === 'Server' && message.to === this.connectionId) {
          try {
            const content = JSON.parse(message.content);
            if (content.session_id && content.player_1_connection_id && content.player_2_connection_id) {
              this.sessionId = content.session_id;
              this.opponentConnectionId = content.player_1_connection_id === this.connectionId
                ? content.player_2_connection_id
                : content.player_1_connection_id;

              const matchDetails = {
                sessionId: this.sessionId,
                opponentConnectionId: this.opponentConnectionId,
                isFirstPlayer: content.player_1_connection_id === this.connectionId
              };

              console.log('Match found:', matchDetails);
              this.callbacks.onMatchFound(matchDetails);
            }
          } catch (e) {
            console.error('Error parsing match found content:', e);
          }
        }

        // Handle game state update from opponent
        if (message.from === this.opponentConnectionId && message.to === this.connectionId) {
          try {
            const content = JSON.parse(message.content);
            if (content.session_id === this.sessionId && content.game_state) {
              console.log('Game state update received:', content.game_state);
              this.callbacks.onGameStateUpdate(content.game_state);
            }
          } catch (e) {
            console.error('Error parsing game state update:', e);
          }
        }

        this.callbacks.onMessage(message);
      } catch (e) {
        console.error('Error handling WebSocket message:', e);
      }
    };

    this.socket.onclose = (event) => {
      if (event.code !== 1006) { // 1006 is "Abnormal Closure"
        console.log('WebSocket disconnected unexpectedly:', event);
      }
      this._resetState(); // Reset state on close
      this.callbacks.onClose(event);
    };

    this.socket.onerror = (error) => {
      console.error('WebSocket error:', error);
      this.callbacks.onError(error);
    };
  }

  disconnect() {
    if (!this.socket) {
      return;
    }

    // 1. Unregister the onclose handler. We are closing the connection
    // deliberately, so we don't want the "unexpected" close logic to run.
    this.socket.onclose = null;

    if (this.socket.readyState === WebSocket.OPEN || this.socket.readyState === WebSocket.CONNECTING) {
      console.log('Closing WebSocket connection deliberately.');
      // 2. Use a standard code for normal closure.
      this.socket.close(1000, 'Client disconnected');
    }

    // 3. Clean up the instance and state immediately.
    this.socket = null;
    this._resetState();

    // 4. Manually trigger the hook's callback so the UI can update.
    // This is crucial because we disabled the automatic onclose handler.
    this.callbacks.onClose({ code: 1000, reason: 'Client disconnected' });
  }

  requestMatchmaking() {
    // If not ready, queue the request instead of failing.
    if (!this.isReadyForMatchmaking()) {
      console.log('WebSocket not ready, queuing matchmaking request.');
      this._isMatchmakingQueued = true;
      return;
    }

    // If we are here, we are ready to send.
    this._isMatchmakingQueued = false; // Ensure queue is cleared

    const message = {
      from: this.connectionId,
      content: JSON.stringify({
        connection_id: this.connectionId,
        type: 'matchmakingRequest'
      })
    };

    console.log('Sending matchmaking request:', message);
    this.socket.send(JSON.stringify(message));
  }

  sendGameState(gameState) {
    if (!this.socket || this.socket.readyState !== WebSocket.OPEN || !this.connectionId || !this.opponentConnectionId) {
      console.error('Cannot send game state: WebSocket not connected or IDs not set');
      return;
    }

    const message = {
      from: this.connectionId,
      to: this.opponentConnectionId,
      content: JSON.stringify({
        session_id: this.sessionId,
        game_state: gameState
      })
    };

    console.log('Sending game state update:', message);
    this.socket.send(JSON.stringify(message));
  }

  setCallbacks(callbacks) {
    this.callbacks = { ...this.callbacks, ...callbacks };
  }
}

// Create a singleton instance
const webSocketService = new WebSocketService();

// React hook for USING the WebSocket service, not managing its connection
export const useWebSocket = () => {// State to mirror the service's state
  const [isConnected, setIsConnected] = useState(webSocketService.socket?.readyState === WebSocket.OPEN);
  const [isMatchmaking, setIsMatchmaking] = useState(false);
  const [matchData, setMatchData] = useState(null);
  const [gameState, setGameState] = useState(null);

  // The core change: useEffect now only subscribes to events.
  // It does NOT control the connection lifecycle.
  useEffect(() => {
    const handleOpen = () => setIsConnected(true);
    const handleClose = () => {
      setIsConnected(false);
      setIsMatchmaking(false);
      setMatchData(null);
    };
    const handleMatchFound = (data) => {
      setIsMatchmaking(false);
      setMatchData(data);
    };
    const handleGameStateUpdate = (newGameState) => {
      setGameState(newGameState);
    };

    // Set the callbacks for this hook instance to update its local state
    webSocketService.setCallbacks({
      onOpen: handleOpen,
      onClose: handleClose,
      onMatchFound: handleMatchFound,
      onGameStateUpdate: handleGameStateUpdate,
    });

    // The cleanup function no longer disconnects the service.
    // The connection is persistent and managed by the application.
    return () => {
      // In a more complex app with multiple hooks listening, you might
      // want to clean up the specific callbacks here, but for now, this is fine.
    };
  }, []); // Empty dependency array means this runs once per component mount

  // The actions no longer include connect/disconnect.
  // Those are now managed at the application level.
  const startMatchmaking = useCallback(() => {
    if (!webSocketService.socket || webSocketService.socket.readyState !== WebSocket.OPEN) {
      console.error('Cannot start matchmaking: WebSocket not connected.');
      return;
    }
    setIsMatchmaking(true);
    webSocketService.requestMatchmaking();
  }, []); // isConnected is removed as a dependency as we check the source of truth directly

  const updateGameState = useCallback((newGameState) => {
    if (webSocketService.socket?.readyState === WebSocket.OPEN && matchData) {
      webSocketService.sendGameState(newGameState);
    }
  }, [matchData]);

  return {
    isConnected,
    isMatchmaking,
    matchData,
    gameState,
    // connect and disconnect are removed from the hook's return value
    startMatchmaking,
    updateGameState,
  };
};

export default webSocketService;
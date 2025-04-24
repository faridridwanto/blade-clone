import React, { useState, useEffect } from 'react';
import GameBoard from './components/GameBoard';
import './App.css';

function App() {
  return (
    <div className="app">
      <header className="app-header">
        <h1>Card Game</h1>
      </header>
      <main>
        <GameBoard />
      </main>
      <footer className="app-footer">
        <p>Card Game - React Implementation</p>
      </footer>
    </div>
  );
}

export default App;
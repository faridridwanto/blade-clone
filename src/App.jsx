import React, { useState, useEffect } from 'react';
import GameBoard from './components/GameBoard';
import './App.css';

function App() {
  return (
    <div className="app">
      <header className="app-header">
        <h1>Blade II - Clone</h1>
      </header>
      <main>
        <GameBoard />
      </main>
      <footer className="app-footer">
        <p>Blade II - Clone</p>
      </footer>
    </div>
  );
}

export default App;
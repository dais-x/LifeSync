import { useState } from 'react';
import './App.css';

function App() {
  const [mode, setMode] = useState('adult');

  const applyAdultTheme = () => {
    document.documentElement.style.setProperty('--bg-color', '#ffffff');
    document.documentElement.style.setProperty('--text-color', '#222222');
    document.documentElement.style.setProperty('--primary-color', '#4caf50');
    setMode('adult');
  };

  const applyChildTheme = () => {
    document.documentElement.style.setProperty('--bg-color', '#fff6e5');
    document.documentElement.style.setProperty('--text-color', '#333333');
    document.documentElement.style.setProperty('--primary-color', '#ff9800');
    setMode('child');
  };

  return (
    <div className="app">
      <header className="header">
        <h2>LifeSync</h2>
        <div className="mode-buttons">
          <button onClick={applyAdultTheme}>Adult</button>
          <button onClick={applyChildTheme}>Child</button>
        </div>
      </header>

      <main className="main">
        <div className="card">To-Do List (coming soon)</div>
        <div className="card">Focus Timer (coming soon)</div>
      </main>
    </div>
  );
}

export default App;

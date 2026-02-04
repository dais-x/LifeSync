// src/App.jsx
import React, { useState } from 'react';
import './App.css';

// Icons
import { FaLeaf, FaCog, FaUserCircle, FaPlus, FaTrash } from 'react-icons/fa';
import { BsGraphUp, BsPencilSquare } from 'react-icons/bs';

function App() {
  // --- STATE MANAGEMENT ---
  const [lists, setLists] = useState([{ id: 1, title: 'List 1', items: [] }]);
  const [inputTexts, setInputTexts] = useState({});
  const [currentView, setCurrentView] = useState('home'); 
  
  const [currentTheme, setCurrentTheme] = useState('orange');

  // --- THEME CONFIGURATIONS ---
  const themes = {
    orange:  { primaryBg: '#ffc04d', accent: '#ffc04d', note: '#ffeebb', bg: '#ffffff', text: '#333333', headerText: '#ffffff', cardBorder: 'transparent' },
    blue:    { primaryBg: '#4d94ff', accent: '#4d94ff', note: '#cce0ff', bg: '#f0f8ff', text: '#333333', headerText: '#ffffff', cardBorder: 'transparent' },
    pink:    { primaryBg: '#ff85b3', accent: '#ff85b3', note: '#ffe6f2', bg: '#fff0f5', text: '#333333', headerText: '#ffffff', cardBorder: 'transparent' },
    teal:    { primaryBg: '#20c997', accent: '#20c997', note: '#e0f2f1', bg: '#e6fffa', text: '#333333', headerText: '#ffffff', cardBorder: 'transparent' },
    magenta: { primaryBg: '#d63384', accent: '#d63384', note: '#f3d9e8', bg: '#fff0f3', text: '#333333', headerText: '#ffffff', cardBorder: 'transparent' },
    violet:  { primaryBg: '#9b59b6', accent: '#9b59b6', note: '#e8daef', bg: '#f3e5f5', text: '#333333', headerText: '#ffffff', cardBorder: 'transparent' },
    

    dark:    { 
      primaryBg: '#20c997',   // Teal Top Header
      accent: '#20c997',      // Teal List Titles (appearing on black bg)
      note: '#20c997',        // Teal Card
      bg: '#000000',          // Black App Background
      text: '#000000',        // Black Text inside the card
      headerText: '#000000',  // Black Text in the Top Header
      cardBorder: 'none' 
    }
  };

  // --- LOGIC ---

  const handleThemeChange = (themeKey) => {
    setCurrentTheme(themeKey);
  };

  const getThemeStyle = () => {
    const theme = themes[currentTheme];
    return {
      '--primary-bg': theme.primaryBg,
      '--accent-color': theme.accent,
      '--note-bg': theme.note,
      '--bg-color': theme.bg,
      '--text-main': theme.text,
      '--header-text': theme.headerText,
      '--card-border': theme.cardBorder
    };
  };

  const addNewList = () => {
    const newListId = lists.length > 0 ? Math.max(...lists.map(l => l.id)) + 1 : 1;
    const newList = { id: newListId, title: `List ${newListId}`, items: [] };
    setLists([...lists, newList]);
  };

  // --- NEW FUNCTION: Updates the list title ---
  const updateListTitle = (id, newTitle) => {
    const updatedLists = lists.map(list => {
      if (list.id === id) {
        return { ...list, title: newTitle };
      }
      return list;
    });
    setLists(updatedLists);
  };

  const deleteList = (id) => {
    setLists(lists.filter(list => list.id !== id));
  };

  const handleInputChange = (listId, value) => {
    setInputTexts({ ...inputTexts, [listId]: value });
  };

  const addItemToList = (listId) => {
    const text = inputTexts[listId];
    if (!text || text.trim() === "") return;
    const updatedLists = lists.map(list => {
      if (list.id === listId) {
        return { ...list, items: [...list.items, { id: Date.now(), text: text, completed: false }] };
      }
      return list;
    });
    setLists(updatedLists);
    setInputTexts({ ...inputTexts, [listId]: "" }); 
  };

  const toggleItemComplete = (listId, itemId) => {
    const updatedLists = lists.map(list => {
      if (list.id === listId) {
        const updatedItems = list.items.map(item => {
          if (item.id === itemId) {
            return { ...item, completed: !item.completed };
          }
          return item;
        });
        return { ...list, items: updatedItems };
      }
      return list;
    });
    setLists(updatedLists);
  };

  return (
    <div className="app" style={getThemeStyle()}>
      
      {/* Header */}
      <header className="header">
        <div className="logo-section" onClick={() => setCurrentView('home')} style={{cursor: 'pointer'}}>
          <h1>LIFESYNC</h1>
          <div className="tagline">
            Let's make life better <FaLeaf size={20} style={{ transform: 'rotate(-20deg)', marginLeft: '5px' }} />
          </div>
        </div>
        
        <div className="header-icons">
          <button className="icon-btn" onClick={() => setCurrentView('home')} title="Dashboard"><BsGraphUp /></button>
          <button className="icon-btn" onClick={() => setCurrentView('settings')} title="Settings"><FaCog /></button>
          <button className="icon-btn" title="Profile"><FaUserCircle /></button>
        </div>
      </header>

      {/* Main Content */}
      <main className="container">
        {currentView === 'home' && (
          <div className="lists-grid">
            {lists.map((list) => (
              <div key={list.id} className="note-wrapper">
                
                {/* --- NEW EDITABLE TITLE --- */}
                <input 
                  className="list-title-input"
                  type="text"
                  value={list.title}
                  onChange={(e) => updateListTitle(list.id, e.target.value)}
                  placeholder="List Title"
                />

                <div className="note-card">
                  <div className="input-group">
                    <input 
                      type="text" 
                      className="note-input-line" 
                      placeholder="Add item..."
                      value={inputTexts[list.id] || ""}
                      onChange={(e) => handleInputChange(list.id, e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && addItemToList(list.id)}
                    />
                    <button className="add-item-btn" onClick={() => addItemToList(list.id)}>
                      <BsPencilSquare />
                    </button>
                  </div>
                  <ul className="todo-list">
                    {list.items.map(item => (
                      <li key={item.id} className="todo-item">
                        <input 
                          type="checkbox" 
                          className="todo-checkbox"
                          checked={item.completed}
                          onChange={() => toggleItemComplete(list.id, item.id)}
                        />
                        <span className={item.completed ? "completed-text" : ""}>{item.text}</span>
                      </li>
                    ))}
                  </ul>
                  <div className="card-footer">
                    <button className="delete-list-btn" onClick={() => deleteList(list.id)}>
                      <FaTrash />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {currentView === 'settings' && (
          <div className="settings-container">
            <h2 className="settings-title">Select Color Theme</h2>
            <div className="theme-grid">
              {Object.keys(themes).map((themeKey) => (
                <button
                  key={themeKey}
                  className={`theme-btn ${currentTheme === themeKey ? 'active' : ''}`}
                  style={{ 
                    backgroundColor: themes[themeKey].accent || themes[themeKey].primaryBg 
                  }}
                  onClick={() => handleThemeChange(themeKey)}
                >
                  {themeKey.toUpperCase()}
                </button>
              ))}
            </div>
          </div>
        )}
      </main>

      {currentView === 'home' && (
        <div className="floating-actions">
          <button className="fab" onClick={addNewList} title="Add New List">
            <FaPlus size={24} color={'#ffffff'} />
          </button>
        </div>
      )}

    </div>
  );
}

export default App;
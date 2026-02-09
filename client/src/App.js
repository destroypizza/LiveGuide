import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Home from './pages/Home';
import Broadcaster from './pages/Broadcaster';
import Viewer from './pages/Viewer';
import './App.css';

function App() {
  return (
    <Router>
      <div className="App">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/b/:streamId" element={<Broadcaster />} />
          <Route path="/v/:streamId" element={<Viewer />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;

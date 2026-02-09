import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Home from './pages/Home';
import BroadcasterPage from './pages/BroadcasterPage';
import ViewerPage from './pages/ViewerPage';
import './App.css';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/b/:streamId" element={<BroadcasterPage />} />
        <Route path="/v/:streamId" element={<ViewerPage />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;

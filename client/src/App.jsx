import { BrowserRouter, Routes, Route } from "react-router-dom";
import HomePage from "./pages/HomePage.jsx";
import BroadcasterPage from "./pages/BroadcasterPage.jsx";
import ViewerPage from "./pages/ViewerPage.jsx";

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/b/:streamId" element={<BroadcasterPage />} />
        <Route path="/v/:streamId" element={<ViewerPage />} />
      </Routes>
    </BrowserRouter>
  );
}

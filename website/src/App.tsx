import { Routes, Route } from "react-router-dom";
import Navbar from "./components/Navbar";
import Footer from "./components/Footer";
import LandingPage from "./components/LandingPage";
import Documentation from "./components/Documentation";
import Manual from "./components/Manual";

export default function App() {
  return (
    <div className="min-h-screen bg-surface text-text-primary overflow-x-hidden">
      <Navbar />
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/docs" element={<Documentation />} />
        <Route path="/docs/:slug" element={<Documentation />} />
        <Route path="/manual" element={<Manual />} />
        <Route path="/manual/:slug" element={<Manual />} />
      </Routes>
      <Footer />
    </div>
  );
}

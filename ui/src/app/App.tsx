import { BrowserRouter, Routes, Route } from "react-router-dom";
import AppContent from "./AppContent";
import { OAuthCallback } from "../features/auth";
import { SearchProvider } from "../shared/contexts/SearchContext";

const App: React.FC = () => (
  <BrowserRouter>
    <Routes>
      {/* Lightweight OAuth callback route - no heavy components */}
      <Route path="/auth/callback" element={<OAuthCallback />} />
      
      {/* All other routes with full app context */}
      <Route path="/*" element={
        <SearchProvider>
          <AppContent />
        </SearchProvider>
      } />
    </Routes>
  </BrowserRouter>
);

export default App;

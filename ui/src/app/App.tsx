import { BrowserRouter, Routes, Route } from "react-router";
import AppContent from "./AppContent";
import { OAuthCallback } from "../features/auth";
import { SearchProvider } from "../shared/contexts/SearchContext";
import { AuthProvider } from "../shared/contexts/AuthContext";

const App: React.FC = () => (
  <BrowserRouter>
    <Routes>
      {/* Lightweight OAuth callback route - no heavy components */}
      <Route path="/auth/callback" element={<OAuthCallback />} />
      {/* All other routes with full app context */}
      <Route
        path="/*"
        element={
          <AuthProvider>
            <SearchProvider>
              <AppContent />
            </SearchProvider>
          </AuthProvider>
        }
      />
    </Routes>
  </BrowserRouter>
);

export default App;

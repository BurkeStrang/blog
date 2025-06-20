import { BrowserRouter } from "react-router-dom";
import AppContent from "./AppContent";
import { SearchProvider } from "../shared/contexts/SearchContext";

const App: React.FC = () => (
  <BrowserRouter>
    <SearchProvider>
      <AppContent />
    </SearchProvider>
  </BrowserRouter>
);

export default App;

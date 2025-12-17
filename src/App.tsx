import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import Upload from "./pages/Upload";
import Editor from "./pages/Editor";

const App = () => (
  <BrowserRouter>
    <Routes>
      <Route path="/" element={<Upload />} />
      <Route path="/editor/:videoId" element={<Editor />} />
      <Route path="*" element={<Navigate to="/" />} />
    </Routes>
  </BrowserRouter>
);

export default App;

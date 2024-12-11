import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Home from './Home';
import './App.css';

const App: React.FC = () => {
  return (
    <BrowserRouter> 
      <div>
        <Routes> 
          <Route index element={<Home />} />
        </Routes>
      </div>
    </BrowserRouter> 
  );
}

export default App;
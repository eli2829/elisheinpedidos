import React from "react";
import "@/App.css";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Layout from "@/components/Layout";
import MonthsList from "@/pages/MonthsList";
import MonthDetail from "@/pages/MonthDetail";
import OrderDetail from "@/pages/OrderDetail";
import NoteDetail from "@/pages/NoteDetail";
import SummaryPage from "@/pages/SummaryPage";

function App() {
  return (
    <div className="App">
      <BrowserRouter>
        <Layout>
          <Routes>
            <Route path="/" element={<MonthsList />} />
            <Route path="/months/:id" element={<MonthDetail />} />
            <Route path="/orders/:id" element={<OrderDetail />} />
            <Route path="/notes/:id" element={<NoteDetail />} />
            <Route path="/summary" element={<SummaryPage />} />
          </Routes>
        </Layout>
      </BrowserRouter>
    </div>
  );
}

export default App;

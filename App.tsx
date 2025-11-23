import React, { useState, useEffect, useRef } from 'react';
import 'leaflet/dist/leaflet.css';
import './App.css';

import Header from './components/Header';
import Sidebar from './components/Sidebar';
import Map from './components/Map';
import type { Zone } from './types/types';
import { PERSONAS } from './data/constants';

export default function App() {
  const [userName, setUserName] = useState('');
  const [personaText, setPersonaText] = useState(PERSONAS[0].desc);
  const [activePersona, setActivePersona] = useState<string | null>(PERSONAS[0].id);
  const [customText, setCustomText] = useState('');
  const [results, setResults] = useState<Zone[]>([]);
  const [selectedZone, setSelectedZone] = useState<Zone | null>(null);
  const [loading, setLoading] = useState(false);
  const [activeFilters, setActiveFilters] = useState<string[]>(['actividades_fisicas', 'vida_nocturna', 'ocio', 'comunicacion']);
  const [themeColor, setThemeColor] = useState<string>(PERSONAS[0].color);
  
  const markerRefs = useRef<Record<number, any>>({});

  useEffect(() => {
    const savedName = localStorage.getItem('restbai_username');
    if (savedName) setUserName(savedName);
  }, []);

  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => { 
    setUserName(e.target.value); localStorage.setItem('restbai_username', e.target.value); 
  };

  const handlePersonaClick = (persona: typeof PERSONAS[0]) => { 
    setPersonaText(persona.desc); 
    setActivePersona(persona.id); 
  };

  const handleCustomTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setCustomText(e.target.value);
    if (activePersona) setActivePersona(null);
  };

  const fetchRecommendations = async (textToSearch: string) => {
    if (!textToSearch.trim()) return;
    setLoading(true);
    setSelectedZone(null); 

    if (activePersona) {
        const persona = PERSONAS.find(p => p.id === activePersona);
        if (persona) setThemeColor(persona.color);
    } else {
        setThemeColor('#d4af37');
    }

    try {
      const [response] = await Promise.all([
        fetch('http://localhost:5000/recommendations', {
          method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ description: textToSearch }) 
        }),
        new Promise(resolve => setTimeout(resolve, 2000))
      ]);

      if (!response.ok) throw new Error('Error servidor');
      const data = await response.json();
      const validZones = Array.isArray(data) ? data.filter((item: any) => item.geometry && item.scores && item.name) : [];
      setResults(validZones);
    } catch (error) {
      console.error(error);
      setResults([]);
    } finally {
      setLoading(false);
    }
  };

  const toggleFilter = (type: string) => {
    setActiveFilters(prev => prev.includes(type) ? prev.filter(f => f !== type) : [...prev, type]);
  };

  const handlePoiListClick = (idx: number) => {
    const marker = markerRefs.current[idx];
    if (marker) marker.openPopup();
  };

  const handleNextZone = () => {
    if (!selectedZone || results.length === 0) return;
    const currentIndex = results.findIndex(z => z.id === selectedZone.id);
    const nextIndex = (currentIndex + 1) % results.length; 
    setSelectedZone(results[nextIndex]);
  };

  const handlePrevZone = () => {
    if (!selectedZone || results.length === 0) return;
    const currentIndex = results.findIndex(z => z.id === selectedZone.id);
    const prevIndex = (currentIndex - 1 + results.length) % results.length; 
    setSelectedZone(results[prevIndex]);
  };

  return (
    <div className="app-container" style={{ '--theme-color': themeColor } as React.CSSProperties}>
      
      <Header 
        userName={userName}
        onNameChange={handleNameChange}
        activePersona={activePersona}
        onPersonaClick={handlePersonaClick}
        personaText={personaText}
        customText={customText}
        onCustomTextChange={handleCustomTextChange}
        onSearch={fetchRecommendations}
        loading={loading}
      />

      <main className="main-grid">
        <Sidebar 
          selectedZone={selectedZone}
          results={results}
          onSelectZone={setSelectedZone}
          onPoiClick={handlePoiListClick}
          themeColor={themeColor}
        />

        <Map 
          selectedZone={selectedZone}
          results={results}
          activeFilters={activeFilters}
          themeColor={themeColor}
          loading={loading}
          onSelectZone={setSelectedZone}
          onToggleFilter={toggleFilter}
          onNextZone={handleNextZone}
          onPrevZone={handlePrevZone}
          markerRefs={markerRefs}
        />
      </main>
    </div>
  );
}
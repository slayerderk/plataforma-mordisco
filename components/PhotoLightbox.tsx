'use client';

import React, { useState, useEffect } from 'react';
import { X, ChevronLeft, ChevronRight, ZoomIn } from 'lucide-react';

interface PhotoLightboxProps {
  photos: string[];
  initialIndex?: number;
  isOpen: boolean;
  onClose: () => void;
}

export default function PhotoLightbox({ photos, initialIndex = 0, isOpen, onClose }: PhotoLightboxProps) {
  const [currentIndex, setCurrentIndex] = useState(initialIndex);

  useEffect(() => {
    setCurrentIndex(initialIndex);
  }, [initialIndex]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return;
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowRight') nextPhoto();
      if (e.key === 'ArrowLeft') prevPhoto();
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, currentIndex, photos.length]);

  if (!isOpen || photos.length === 0) return null;

  const nextPhoto = () => {
    setCurrentIndex((prev) => (prev + 1) % photos.length);
  };

  const prevPhoto = () => {
    setCurrentIndex((prev) => (prev - 1 + photos.length) % photos.length);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/95 backdrop-blur-md flex flex-col items-center justify-between p-4 transition-all">
      {/* Top Header Bar */}
      <div className="w-full flex items-center justify-between text-white py-2 px-4 max-w-6xl">
        <div className="text-sm font-medium text-zinc-300">
          Foto <span className="text-white font-bold">{currentIndex + 1}</span> de{' '}
          <span className="text-white font-bold">{photos.length}</span>
        </div>
        <button
          onClick={onClose}
          className="p-2 rounded-full bg-white/10 hover:bg-white/20 text-white transition-all hover:scale-105"
          aria-label="Cerrar visor"
        >
          <X className="w-6 h-6" />
        </button>
      </div>

      {/* Main Image Display */}
      <div className="relative flex-1 w-full max-w-5xl flex items-center justify-center my-2 select-none">
        {photos.length > 1 && (
          <button
            onClick={prevPhoto}
            className="absolute left-2 md:left-4 z-10 p-3 rounded-full bg-black/50 hover:bg-black/80 text-white border border-white/10 backdrop-blur-sm transition-transform hover:scale-110 active:scale-95"
            aria-label="Foto anterior"
          >
            <ChevronLeft className="w-6 h-6" />
          </button>
        )}

        <div className="max-h-[78vh] max-w-full flex items-center justify-center overflow-hidden rounded-xl">
          <img
            src={photos[currentIndex]}
            alt={`Foto ${currentIndex + 1}`}
            className="max-h-[78vh] max-w-full object-contain rounded-xl shadow-2xl transition-all"
          />
        </div>

        {photos.length > 1 && (
          <button
            onClick={nextPhoto}
            className="absolute right-2 md:right-4 z-10 p-3 rounded-full bg-black/50 hover:bg-black/80 text-white border border-white/10 backdrop-blur-sm transition-transform hover:scale-110 active:scale-95"
            aria-label="Foto siguiente"
          >
            <ChevronRight className="w-6 h-6" />
          </button>
        )}
      </div>

      {/* Bottom Thumbnails Strip */}
      {photos.length > 1 && (
        <div className="w-full max-w-3xl flex items-center justify-center gap-2 overflow-x-auto py-2 px-4">
          {photos.map((photo, idx) => (
            <button
              key={idx}
              onClick={() => setCurrentIndex(idx)}
              className={`relative w-14 h-14 md:w-16 md:h-16 flex-shrink-0 rounded-lg overflow-hidden border-2 transition-all ${
                currentIndex === idx
                  ? 'border-brand-500 scale-105 shadow-md shadow-brand-500/30'
                  : 'border-white/20 opacity-60 hover:opacity-100'
              }`}
            >
              <img src={photo} alt={`Miniatura ${idx + 1}`} className="w-full h-full object-cover" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

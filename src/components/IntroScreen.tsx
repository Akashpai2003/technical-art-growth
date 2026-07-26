import { useState } from 'react';

interface IntroScreenProps {
  onStart: () => void;
}

export function IntroScreen({ onStart }: IntroScreenProps) {
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-[#060812]/90 backdrop-blur-md text-white font-sans">
      <div className="max-w-2xl w-full mx-4 p-8 border border-white/10 bg-black/40 rounded-xl shadow-2xl flex flex-col items-center text-center">
        <h1 className="text-3xl font-light tracking-wide mb-4">Luminescent Bloom</h1>
        
        <p className="text-white/70 leading-relaxed mb-8 max-w-lg">
          Experience a generative digital ecosystem driven by your movements. 
          Use your left hand (open/closed palm) to control the growth and collapse of the plant. 
          Use your right hand (open/closed palm) to control the wind direction and sway the branches.
        </p>

        <div className="w-full aspect-video bg-black/60 border border-white/5 rounded-lg mb-8 flex items-center justify-center overflow-hidden">
          {/* We use a placeholder for the video until one is provided */}
          <div className="text-white/30 text-sm tracking-wider uppercase flex flex-col items-center gap-2">
            <svg className="w-8 h-8 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span>Interactive Demo Video</span>
          </div>
        </div>

        <button 
          onClick={onStart}
          className="px-8 py-3 bg-white text-black font-medium tracking-wide rounded hover:bg-white/90 transition-colors"
        >
          Enter Experience
        </button>
      </div>
    </div>
  );
}

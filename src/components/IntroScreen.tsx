import { Camera, Hand, HandMetal } from 'lucide-react';

interface IntroScreenProps {
  onStart: () => void;
}

export function IntroScreen({ onStart }: IntroScreenProps) {
  return (
    <div 
      className="fixed inset-0 z-[100] flex items-center justify-center bg-white/5 backdrop-blur-sm text-white"
      style={{ fontFamily: '"Geist", sans-serif' }}
    >
      <div className="max-w-md w-full mx-4 p-8 border border-white/20 bg-white/10 rounded-xl shadow-2xl flex flex-col">
        <h1 className="text-xl font-medium mb-3 lowercase text-white">interactive garden</h1>
        
        <p className="text-white/80 leading-relaxed mb-8 lowercase text-sm">
          a small interactive experiment exploring procedural plant growth using hand tracking. move your hands and watch the plant respond in real time.
        </p>

        <div className="flex flex-col gap-5 mb-10">
          <div className="flex items-center gap-4 text-sm text-white/90 lowercase">
            <Camera className="w-5 h-5 shrink-0" />
            <span>allow camera access</span>
          </div>
          <div className="flex items-center gap-4 text-sm text-white/90 lowercase">
            <Hand className="w-5 h-5 shrink-0" />
            <span>open your left hand to grow the plant</span>
          </div>
          <div className="flex items-center gap-4 text-sm text-white/90 lowercase">
            <HandMetal className="w-5 h-5 shrink-0" />
            <span>close your left hand to shrink the plant</span>
          </div>
          <div className="flex items-center gap-4 text-sm text-white/90 lowercase">
            <Hand className="w-5 h-5 shrink-0" />
            <span>open your right hand to bend the plant right</span>
          </div>
          <div className="flex items-center gap-4 text-sm text-white/90 lowercase">
            <HandMetal className="w-5 h-5 shrink-0" />
            <span>close your right hand to bend the plant left</span>
          </div>
        </div>

        <button 
          onClick={onStart}
          className="px-8 py-3 bg-white text-black font-medium tracking-wide rounded hover:bg-white/90 transition-colors lowercase"
        >
          enter experience
        </button>
      </div>
    </div>
  );
}

import { useState, useEffect } from "react";
import { X, ChevronLeft, ChevronRight } from "lucide-react";

interface ImageFullscreenProps {
  images: string[];
  initialIndex: number;
  onClose: () => void;
}

export const ImageFullscreen = ({ images, initialIndex, onClose }: ImageFullscreenProps) => {
  const [current, setCurrent] = useState(initialIndex);

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowLeft") setCurrent((c) => (c - 1 + images.length) % images.length);
      if (e.key === "ArrowRight") setCurrent((c) => (c + 1) % images.length);
    };
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", handleKey);
    return () => { document.body.style.overflow = ""; window.removeEventListener("keydown", handleKey); };
  }, [images.length, onClose]);

  return (
    <div className="fixed inset-0 z-[100] bg-black/95 flex items-center justify-center" onClick={onClose}>
      <button onClick={onClose} className="absolute top-4 right-4 z-10 w-10 h-10 rounded-full bg-foreground/20 flex items-center justify-center text-white hover:bg-foreground/40 transition-colors">
        <X className="w-5 h-5" />
      </button>

      <img
        src={images[current]}
        alt={`Imagem ${current + 1}`}
        className="max-w-[90vw] max-h-[85vh] object-contain select-none"
        onClick={(e) => e.stopPropagation()}
      />

      {images.length > 1 && (
        <>
          <button
            onClick={(e) => { e.stopPropagation(); setCurrent((c) => (c - 1 + images.length) % images.length); }}
            className="absolute left-3 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-foreground/20 flex items-center justify-center text-white hover:bg-foreground/40 transition-colors"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); setCurrent((c) => (c + 1) % images.length); }}
            className="absolute right-3 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-foreground/20 flex items-center justify-center text-white hover:bg-foreground/40 transition-colors"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
          <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex gap-2" onClick={(e) => e.stopPropagation()}>
            {images.map((_, i) => (
              <button key={i} onClick={() => setCurrent(i)} className={`w-2 h-2 rounded-full transition-colors ${i === current ? "bg-white" : "bg-white/40"}`} />
            ))}
          </div>
        </>
      )}
    </div>
  );
};

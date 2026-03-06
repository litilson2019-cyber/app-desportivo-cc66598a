import { useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

interface ProductImageSliderProps {
  images: string[];
  alt: string;
}

export const ProductImageSlider = ({ images, alt }: ProductImageSliderProps) => {
  const [current, setCurrent] = useState(0);
  const list = images.length > 0 ? images : ["https://placehold.co/400x300?text=Sem+Imagem"];

  return (
    <div className="relative aspect-[4/3] w-full overflow-hidden rounded-xl bg-muted">
      <img
        src={list[current]}
        alt={`${alt} ${current + 1}`}
        className="w-full h-full object-cover transition-opacity duration-300"
      />
      {list.length > 1 && (
        <>
          <button
            onClick={(e) => { e.stopPropagation(); setCurrent((c) => (c - 1 + list.length) % list.length); }}
            className="absolute left-1.5 top-1/2 -translate-y-1/2 w-7 h-7 rounded-full bg-background/80 flex items-center justify-center shadow-md hover:bg-background transition-colors"
          >
            <ChevronLeft className="w-4 h-4 text-foreground" />
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); setCurrent((c) => (c + 1) % list.length); }}
            className="absolute right-1.5 top-1/2 -translate-y-1/2 w-7 h-7 rounded-full bg-background/80 flex items-center justify-center shadow-md hover:bg-background transition-colors"
          >
            <ChevronRight className="w-4 h-4 text-foreground" />
          </button>
          <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1">
            {list.map((_, i) => (
              <span
                key={i}
                className={`w-1.5 h-1.5 rounded-full transition-colors ${i === current ? "bg-primary" : "bg-foreground/30"}`}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
};

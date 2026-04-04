import { useRef, useState, useEffect, useCallback } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { ProductCard } from "./ProductCard";

interface Produto {
  id: string;
  nome: string;
  preco: number;
  imagens: string[];
  contacto_link: string | null;
}

export const ProductCarousel = ({ produtos }: { produtos: Produto[] }) => {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [canLeft, setCanLeft] = useState(false);
  const [canRight, setCanRight] = useState(false);

  const checkScroll = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    setCanLeft(el.scrollLeft > 4);
    setCanRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 4);
  }, []);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    checkScroll();
    el.addEventListener("scroll", checkScroll, { passive: true });
    return () => el.removeEventListener("scroll", checkScroll);
  }, [checkScroll]);

  const scroll = (dir: number) => {
    scrollRef.current?.scrollBy({ left: dir * 160, behavior: "smooth" });
  };

  return (
    <div className="relative -mx-4">
      {canLeft && (
        <button
          onClick={() => scroll(-1)}
          className="absolute left-1 top-1/2 -translate-y-1/2 z-10 w-7 h-7 rounded-full bg-background/90 shadow-md flex items-center justify-center hover:bg-background transition-colors"
        >
          <ChevronLeft className="w-4 h-4 text-foreground" />
        </button>
      )}
      {canRight && (
        <button
          onClick={() => scroll(1)}
          className="absolute right-1 top-1/2 -translate-y-1/2 z-10 w-7 h-7 rounded-full bg-background/90 shadow-md flex items-center justify-center hover:bg-background transition-colors"
        >
          <ChevronRight className="w-4 h-4 text-foreground" />
        </button>
      )}
      <div ref={scrollRef} className="overflow-x-auto scrollbar-hide px-4">
        <div className="flex gap-3" style={{ minWidth: "min-content" }}>
          {produtos.map((prod) => (
            <div key={prod.id} className="w-[140px] flex-shrink-0">
              <ProductCard
                id={prod.id}
                nome={prod.nome}
                preco={prod.preco}
                imagens={prod.imagens}
                contactoLink={prod.contacto_link || undefined}
                compact
              />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

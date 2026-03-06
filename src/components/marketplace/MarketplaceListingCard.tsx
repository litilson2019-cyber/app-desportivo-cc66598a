import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { MessageCircle, MapPin } from "lucide-react";
import { ProductImageSlider } from "./ProductImageSlider";
import { formatKz } from "@/lib/formatKz";

interface MarketplaceListingCardProps {
  titulo: string;
  descricao?: string;
  preco: number;
  localizacao?: string;
  categoria: string;
  imagens: string[];
  contactoLink?: string;
}

const categoriaLabels: Record<string, string> = {
  imoveis: "Imóveis",
  veiculos: "Veículos",
  eletronicos: "Eletrónicos / Tecnologia",
  outros: "Outros",
};

export const MarketplaceListingCard = ({
  titulo, descricao, preco, localizacao, categoria, imagens, contactoLink,
}: MarketplaceListingCardProps) => {
  return (
    <Card className="overflow-hidden shadow-soft rounded-xl">
      <ProductImageSlider images={imagens} alt={titulo} />
      <div className="p-3 space-y-2">
        <div className="flex items-center justify-between gap-2">
          <h4 className="font-semibold text-foreground text-sm line-clamp-1 flex-1">{titulo}</h4>
          <span className="text-[10px] px-1.5 py-0.5 rounded bg-secondary text-secondary-foreground flex-shrink-0">
            {categoriaLabels[categoria] || categoria}
          </span>
        </div>
        {descricao && <p className="text-xs text-muted-foreground line-clamp-2">{descricao}</p>}
        <p className="text-sm font-bold text-primary">{formatKz(preco)}</p>
        {localizacao && (
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <MapPin className="w-3 h-3" />
            <span className="line-clamp-1">{localizacao}</span>
          </div>
        )}
        <Button
          size="sm"
          className="w-full gap-1.5 h-8 text-xs"
          onClick={() => contactoLink && window.open(contactoLink, "_blank")}
          disabled={!contactoLink}
        >
          <MessageCircle className="w-3.5 h-3.5" />
          Contactar
        </Button>
      </div>
    </Card>
  );
};

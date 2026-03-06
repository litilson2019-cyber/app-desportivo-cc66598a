import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { MessageCircle } from "lucide-react";
import { ProductImageSlider } from "./ProductImageSlider";
import { formatKz } from "@/lib/formatKz";

interface ProductCardProps {
  nome: string;
  descricao?: string;
  preco: number;
  imagens: string[];
  contactoLink?: string;
}

export const ProductCard = ({ nome, descricao, preco, imagens, contactoLink }: ProductCardProps) => {
  const handleContact = () => {
    if (contactoLink) {
      window.open(contactoLink, "_blank");
    }
  };

  return (
    <Card className="overflow-hidden shadow-soft rounded-xl">
      <ProductImageSlider images={imagens} alt={nome} />
      <div className="p-3 space-y-2">
        <h4 className="font-semibold text-foreground text-sm line-clamp-1">{nome}</h4>
        {descricao && (
          <p className="text-xs text-muted-foreground line-clamp-2">{descricao}</p>
        )}
        <p className="text-sm font-bold text-primary">{formatKz(preco)}</p>
        <Button
          size="sm"
          className="w-full gap-1.5 h-8 text-xs"
          onClick={handleContact}
          disabled={!contactoLink}
        >
          <MessageCircle className="w-3.5 h-3.5" />
          Contactar / Comprar
        </Button>
      </div>
    </Card>
  );
};

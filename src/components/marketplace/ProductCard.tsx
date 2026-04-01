import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { MessageCircle } from "lucide-react";
import { ProductImageSlider } from "./ProductImageSlider";
import { formatKz } from "@/lib/formatKz";
import { useNavigate } from "react-router-dom";

interface ProductCardProps {
  id?: string;
  nome: string;
  descricao?: string;
  preco: number;
  imagens: string[];
  contactoLink?: string;
  compact?: boolean;
}

export const ProductCard = ({ id, nome, descricao, preco, imagens, contactoLink, compact }: ProductCardProps) => {
  const navigate = useNavigate();

  const handleContact = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (contactoLink) {
      window.open(contactoLink, "_blank");
    }
  };

  const handleClick = () => {
    if (id) navigate(`/produto/${id}`);
  };

  if (compact) {
    return (
      <Card className="overflow-hidden shadow-soft rounded-xl cursor-pointer hover:shadow-md transition-shadow" onClick={handleClick}>
        <div className="aspect-square w-full overflow-hidden bg-muted">
          {imagens.length > 0 ? (
            <img src={imagens[0]} alt={nome} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-muted-foreground text-xs">Sem imagem</div>
          )}
        </div>
        <div className="p-2 space-y-1">
          <h4 className="font-semibold text-foreground text-xs line-clamp-1">{nome}</h4>
          <p className="text-xs font-bold text-primary">{formatKz(preco)}</p>
          <Button
            size="sm"
            className="w-full h-6 text-[10px] rounded-md"
            onClick={handleContact}
            disabled={!contactoLink}
          >
            Contactar
          </Button>
        </div>
      </Card>
    );
  }

  return (
    <Card className="overflow-hidden shadow-soft rounded-xl cursor-pointer hover:shadow-md transition-shadow" onClick={handleClick}>
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

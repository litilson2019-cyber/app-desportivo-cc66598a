import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Store, CheckCircle2 } from "lucide-react";
import { useNavigate } from "react-router-dom";

interface StoreCardProps {
  id: string;
  nome: string;
  logoUrl?: string;
  bio?: string;
  verificado?: boolean;
}

export const StoreCard = ({ id, nome, logoUrl, bio, verificado }: StoreCardProps) => {
  const navigate = useNavigate();

  return (
    <Card
      className="p-3 shadow-soft rounded-xl cursor-pointer hover:bg-accent/50 transition-colors"
      onClick={() => navigate(`/loja/${id}`)}
    >
      <div className="flex items-center gap-3">
        <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center overflow-hidden flex-shrink-0">
          {logoUrl ? (
            <img src={logoUrl} alt={nome} className="w-full h-full object-cover" />
          ) : (
            <Store className="w-6 h-6 text-muted-foreground" />
          )}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5">
            <h3 className="font-semibold text-foreground text-sm truncate">{nome}</h3>
            {verificado && (
              <Badge variant="secondary" className="text-[10px] px-1.5 py-0 gap-0.5 flex-shrink-0">
                <CheckCircle2 className="w-3 h-3" /> Verificado
              </Badge>
            )}
          </div>
          {bio && <p className="text-xs text-muted-foreground line-clamp-1">{bio}</p>}
        </div>
      </div>
    </Card>
  );
};

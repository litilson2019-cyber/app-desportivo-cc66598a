import { useUserPlano } from "@/hooks/useUserPlano";
import { useNavigate } from "react-router-dom";
import { AlertCircle, X } from "lucide-react";
import { useEffect, useState } from "react";

export const PlanoExpiracaoBadge = () => {
  const { plano, hasActivePlano } = useUserPlano();
  const navigate = useNavigate();
  const [dismissed, setDismissed] = useState<string | null>(null);

  useEffect(() => {
    setDismissed(sessionStorage.getItem("plano_aviso_dismissed"));
  }, []);

  if (!hasActivePlano || !plano) return null;

  const expira = new Date(plano.expira_em).getTime();
  const agora = Date.now();
  const diasRestantes = Math.ceil((expira - agora) / (1000 * 60 * 60 * 24));

  if (diasRestantes > 3 || diasRestantes < 0) return null;
  if (dismissed === plano.id) return null;

  const handleDismiss = (e: React.MouseEvent) => {
    e.stopPropagation();
    sessionStorage.setItem("plano_aviso_dismissed", plano.id);
    setDismissed(plano.id);
  };

  return (
    <div
      role="button"
      onClick={() => navigate("/planos")}
      className="sticky top-0 z-50 bg-amber-500/95 text-amber-950 px-3 py-2 flex items-center justify-center gap-2 text-xs font-medium cursor-pointer shadow-md"
    >
      <AlertCircle className="w-4 h-4 shrink-0" />
      <span className="text-center">
        Plano <strong>{plano.plano?.nome}</strong> expira em{" "}
        {diasRestantes === 0 ? "menos de 24h" : `${diasRestantes} dia${diasRestantes > 1 ? "s" : ""}`} — toque para renovar
      </span>
      <button onClick={handleDismiss} className="ml-1 p-0.5 hover:bg-amber-950/10 rounded">
        <X className="w-3.5 h-3.5" />
      </button>
    </div>
  );
};

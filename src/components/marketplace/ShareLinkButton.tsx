import { useState } from "react";
import { Share2, Copy, Check, Link2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface ShareLinkButtonProps {
  tipo: "produto" | "loja" | "anuncio";
  itemId: string;
  itemNome: string;
  compact?: boolean;
}

export const ShareLinkButton = ({ tipo, itemId, itemNome, compact }: ShareLinkButtonProps) => {
  const [open, setOpen] = useState(false);
  const [link, setLink] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const { toast } = useToast();

  const generateLink = async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Check existing link
      const { data: existing } = await supabase
        .from("divulgacao_links")
        .select("codigo")
        .eq("user_id", user.id)
        .eq("tipo", tipo)
        .eq("item_id", itemId)
        .eq("ativo", true)
        .maybeSingle();

      if (existing) {
        setLink(`${window.location.origin}/r/${existing.codigo}`);
        return;
      }

      // Generate new code
      const { data: code } = await supabase.rpc("generate_promo_code");

      const { error } = await supabase.from("divulgacao_links").insert({
        user_id: user.id,
        tipo,
        item_id: itemId,
        codigo: code,
      });

      if (error) throw error;
      setLink(`${window.location.origin}/r/${code}`);
    } catch (err) {
      toast({ title: "Erro", description: "Não foi possível gerar o link", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const copyLink = async () => {
    if (!link) return;
    await navigator.clipboard.writeText(link);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    toast({ title: "Link copiado!", description: "Partilhe com os seus amigos para ganhar comissões" });
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (o && !link) generateLink(); }}>
      <DialogTrigger asChild>
        {compact ? (
          <button className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center hover:bg-primary/20 transition-colors">
            <Share2 className="w-3.5 h-3.5 text-primary" />
          </button>
        ) : (
          <Button variant="outline" size="sm" className="gap-1.5 text-xs">
            <Share2 className="w-3.5 h-3.5" />
            Divulgar
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="text-base">Divulgar {tipo === "produto" ? "Produto" : tipo === "loja" ? "Loja" : "Anúncio"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Partilhe o link abaixo e ganhe <span className="font-bold text-primary">5% de comissão</span> em cada venda gerada através do seu link.
          </p>
          <div className="bg-muted rounded-lg p-3 space-y-2">
            <p className="text-xs font-semibold text-foreground truncate">{itemNome}</p>
            {link ? (
              <div className="flex items-center gap-2">
                <div className="flex-1 bg-background rounded-md px-3 py-2 text-xs text-foreground truncate border">
                  <Link2 className="w-3 h-3 inline mr-1.5 text-muted-foreground" />
                  {link}
                </div>
                <Button size="sm" variant="secondary" className="h-8 gap-1" onClick={copyLink}>
                  {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                  {copied ? "Copiado" : "Copiar"}
                </Button>
              </div>
            ) : (
              <p className="text-xs text-muted-foreground animate-pulse">A gerar link...</p>
            )}
          </div>
          <p className="text-[10px] text-muted-foreground">
            Comissões são creditadas no seu saldo de bónus após confirmação da venda.
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
};

import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Plus, Pencil, CreditCard, Building2, Smartphone } from "lucide-react";

interface MetodoDeposito {
  id: string;
  nome: string;
  tipo: string;
  iban: string | null;
  numero_express: string | null;
  titular_conta: string | null;
  ativo: boolean;
  ordem: number;
  created_at: string;
}

export function DepositMethodsManagement() {
  const [metodos, setMetodos] = useState<MetodoDeposito[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingMetodo, setEditingMetodo] = useState<MetodoDeposito | null>(null);
  const [formData, setFormData] = useState({
    nome: "",
    tipo: "transferencia",
    iban: "",
    numero_express: "",
    titular_conta: "",
    ativo: true,
    ordem: 0,
  });

  useEffect(() => {
    fetchMetodos();
  }, []);

  const fetchMetodos = async () => {
    try {
      const { data, error } = await supabase
        .from("metodos_deposito")
        .select("*")
        .order("ordem", { ascending: true });

      if (error) throw error;
      setMetodos(data || []);
    } catch (error) {
      console.error("Error fetching metodos:", error);
      toast.error("Erro ao carregar métodos de depósito");
    } finally {
      setLoading(false);
    }
  };

  const handleOpenModal = (metodo?: MetodoDeposito) => {
    if (metodo) {
      setEditingMetodo(metodo);
      setFormData({
        nome: metodo.nome,
        tipo: metodo.tipo,
        iban: metodo.iban || "",
        numero_express: metodo.numero_express || "",
        titular_conta: metodo.titular_conta || "",
        ativo: metodo.ativo,
        ordem: metodo.ordem,
      });
    } else {
      setEditingMetodo(null);
      setFormData({
        nome: "",
        tipo: "transferencia",
        iban: "",
        numero_express: "",
        titular_conta: "",
        ativo: true,
        ordem: metodos.length,
      });
    }
    setShowModal(true);
  };

  const handleSave = async () => {
    if (!formData.nome) {
      toast.error("Nome é obrigatório");
      return;
    }

    if (formData.tipo === "transferencia" && !formData.iban) {
      toast.error("IBAN é obrigatório para transferência");
      return;
    }

    if (formData.tipo === "express" && !formData.numero_express) {
      toast.error("Número Express é obrigatório");
      return;
    }

    try {
      const payload = {
        nome: formData.nome,
        tipo: formData.tipo,
        iban: formData.tipo === "transferencia" ? formData.iban : null,
        numero_express: formData.tipo === "express" ? formData.numero_express : null,
        titular_conta: formData.titular_conta || null,
        ativo: formData.ativo,
        ordem: formData.ordem,
      };

      if (editingMetodo) {
        const { error } = await supabase
          .from("metodos_deposito")
          .update(payload)
          .eq("id", editingMetodo.id);

        if (error) throw error;
        toast.success("Método atualizado com sucesso");
      } else {
        const { error } = await supabase.from("metodos_deposito").insert(payload);

        if (error) throw error;
        toast.success("Método criado com sucesso");
      }

      setShowModal(false);
      fetchMetodos();
    } catch (error) {
      console.error("Error saving metodo:", error);
      toast.error("Erro ao salvar método");
    }
  };

  const handleToggleActive = async (metodo: MetodoDeposito) => {
    try {
      const { error } = await supabase
        .from("metodos_deposito")
        .update({ ativo: !metodo.ativo })
        .eq("id", metodo.id);

      if (error) throw error;
      toast.success(metodo.ativo ? "Método desativado" : "Método ativado");
      fetchMetodos();
    } catch (error) {
      console.error("Error toggling metodo:", error);
      toast.error("Erro ao atualizar método");
    }
  };

  const getIcon = (tipo: string) => {
    switch (tipo) {
      case "transferencia":
        return <Building2 className="h-5 w-5" />;
      case "express":
        return <Smartphone className="h-5 w-5" />;
      default:
        return <CreditCard className="h-5 w-5" />;
    }
  };

  if (loading) {
    return <div className="text-center py-8">Carregando...</div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="font-semibold">Métodos de Depósito ({metodos.length})</h3>
        <Button onClick={() => handleOpenModal()}>
          <Plus className="h-4 w-4 mr-2" />
          Novo Método
        </Button>
      </div>

      <div className="space-y-3">
        {metodos.map((metodo) => (
          <Card key={metodo.id} className={!metodo.ativo ? "opacity-60" : ""}>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                    {getIcon(metodo.tipo)}
                  </div>
                  <div>
                    <div className="font-medium">{metodo.nome}</div>
                    <div className="text-sm text-muted-foreground capitalize">{metodo.tipo}</div>
                    {metodo.titular_conta && (
                      <div className="text-xs text-muted-foreground">
                        Titular: {metodo.titular_conta}
                      </div>
                    )}
                    {metodo.iban && (
                      <div className="text-xs font-mono text-muted-foreground">
                        IBAN: {metodo.iban}
                      </div>
                    )}
                    {metodo.numero_express && (
                      <div className="text-xs font-mono text-muted-foreground">
                        Express: {metodo.numero_express}
                      </div>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Switch
                    checked={metodo.ativo}
                    onCheckedChange={() => handleToggleActive(metodo)}
                  />
                  <Button size="icon" variant="outline" onClick={() => handleOpenModal(metodo)}>
                    <Pencil className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}

        {metodos.length === 0 && (
          <div className="text-center py-8 text-muted-foreground">
            Nenhum método de depósito cadastrado
          </div>
        )}
      </div>

      {/* Method Modal */}
      <Dialog open={showModal} onOpenChange={setShowModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingMetodo ? "Editar Método" : "Novo Método de Depósito"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Nome do Banco/Serviço *</Label>
              <Input
                value={formData.nome}
                onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
                placeholder="Ex: BAI, BFA, Multicaixa Express"
              />
            </div>

            <div className="space-y-2">
              <Label>Tipo *</Label>
              <Select
                value={formData.tipo}
                onValueChange={(value) => setFormData({ ...formData, tipo: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="transferencia">
                    <div className="flex items-center gap-2">
                      <Building2 className="h-4 w-4" />
                      Transferência Bancária
                    </div>
                  </SelectItem>
                  <SelectItem value="express">
                    <div className="flex items-center gap-2">
                      <Smartphone className="h-4 w-4" />
                      Multicaixa Express
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Nome do Titular da Conta</Label>
              <Input
                value={formData.titular_conta}
                onChange={(e) => setFormData({ ...formData, titular_conta: e.target.value })}
                placeholder="Nome completo do titular"
              />
            </div>

            {formData.tipo === "transferencia" && (
              <div className="space-y-2">
                <Label>IBAN *</Label>
                <Input
                  value={formData.iban}
                  onChange={(e) => setFormData({ ...formData, iban: e.target.value })}
                  placeholder="AO06 0000 0000 0000 0000 0000 0"
                />
              </div>
            )}

            {formData.tipo === "express" && (
              <div className="space-y-2">
                <Label>Número Express *</Label>
                <Input
                  value={formData.numero_express}
                  onChange={(e) => setFormData({ ...formData, numero_express: e.target.value })}
                  placeholder="900 000 000"
                />
              </div>
            )}

            <div className="space-y-2">
              <Label>Ordem</Label>
              <Input
                type="number"
                min="0"
                value={formData.ordem}
                onChange={(e) =>
                  setFormData({ ...formData, ordem: parseInt(e.target.value) || 0 })
                }
              />
            </div>

            <div className="flex items-center justify-between">
              <Label>Ativo</Label>
              <Switch
                checked={formData.ativo}
                onCheckedChange={(checked) => setFormData({ ...formData, ativo: checked })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowModal(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSave}>Salvar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

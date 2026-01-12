import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Plus, Pencil, Trash2, Image, Clock, Link, GripVertical } from "lucide-react";

interface Banner {
  id: string;
  titulo: string | null;
  descricao: string | null;
  imagem_url: string;
  link: string | null;
  ordem: number;
  ativo: boolean;
  duracao_segundos: number;
  created_at: string;
}

export function BannersManagement() {
  const [banners, setBanners] = useState<Banner[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingBanner, setEditingBanner] = useState<Banner | null>(null);
  const [formData, setFormData] = useState({
    titulo: "",
    descricao: "",
    imagem_url: "",
    link: "",
    duracao_segundos: 5,
    ordem: 0,
    ativo: true,
  });

  useEffect(() => {
    fetchBanners();
  }, []);

  const fetchBanners = async () => {
    try {
      const { data, error } = await supabase
        .from("banners")
        .select("*")
        .order("ordem", { ascending: true });

      if (error) throw error;
      setBanners(data || []);
    } catch (error) {
      console.error("Error fetching banners:", error);
      toast.error("Erro ao carregar banners");
    } finally {
      setLoading(false);
    }
  };

  const handleOpenModal = (banner?: Banner) => {
    if (banner) {
      setEditingBanner(banner);
      setFormData({
        titulo: banner.titulo || "",
        descricao: banner.descricao || "",
        imagem_url: banner.imagem_url,
        link: banner.link || "",
        duracao_segundos: banner.duracao_segundos || 5,
        ordem: banner.ordem,
        ativo: banner.ativo,
      });
    } else {
      setEditingBanner(null);
      setFormData({
        titulo: "",
        descricao: "",
        imagem_url: "",
        link: "",
        duracao_segundos: 5,
        ordem: banners.length,
        ativo: true,
      });
    }
    setShowModal(true);
  };

  const handleSave = async () => {
    if (!formData.imagem_url) {
      toast.error("URL da imagem é obrigatório");
      return;
    }

    try {
      if (editingBanner) {
        const { error } = await supabase
          .from("banners")
          .update({
            titulo: formData.titulo || null,
            descricao: formData.descricao || null,
            imagem_url: formData.imagem_url,
            link: formData.link || null,
            duracao_segundos: formData.duracao_segundos,
            ordem: formData.ordem,
            ativo: formData.ativo,
            updated_at: new Date().toISOString(),
          })
          .eq("id", editingBanner.id);

        if (error) throw error;
        toast.success("Banner atualizado com sucesso");
      } else {
        const { error } = await supabase.from("banners").insert({
          titulo: formData.titulo || null,
          descricao: formData.descricao || null,
          imagem_url: formData.imagem_url,
          link: formData.link || null,
          duracao_segundos: formData.duracao_segundos,
          ordem: formData.ordem,
          ativo: formData.ativo,
        });

        if (error) throw error;
        toast.success("Banner criado com sucesso");
      }

      setShowModal(false);
      fetchBanners();
    } catch (error) {
      console.error("Error saving banner:", error);
      toast.error("Erro ao salvar banner");
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Tem certeza que deseja excluir este banner?")) return;

    try {
      const { error } = await supabase.from("banners").delete().eq("id", id);
      if (error) throw error;
      toast.success("Banner excluído com sucesso");
      fetchBanners();
    } catch (error) {
      console.error("Error deleting banner:", error);
      toast.error("Erro ao excluir banner");
    }
  };

  const handleToggleActive = async (banner: Banner) => {
    try {
      const { error } = await supabase
        .from("banners")
        .update({ ativo: !banner.ativo })
        .eq("id", banner.id);

      if (error) throw error;
      toast.success(banner.ativo ? "Banner desativado" : "Banner ativado");
      fetchBanners();
    } catch (error) {
      console.error("Error toggling banner:", error);
      toast.error("Erro ao atualizar banner");
    }
  };

  if (loading) {
    return <div className="text-center py-8">Carregando...</div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="font-semibold">Banners ({banners.length})</h3>
        <Button onClick={() => handleOpenModal()}>
          <Plus className="h-4 w-4 mr-2" />
          Novo Banner
        </Button>
      </div>

      <div className="space-y-3">
        {banners.map((banner) => (
          <Card key={banner.id} className={!banner.ativo ? "opacity-60" : ""}>
            <CardContent className="p-4">
              <div className="flex gap-4">
                <div className="flex items-center">
                  <GripVertical className="h-5 w-5 text-muted-foreground" />
                </div>
                <div className="w-24 h-16 rounded overflow-hidden bg-muted flex-shrink-0">
                  {banner.imagem_url ? (
                    <img
                      src={banner.imagem_url}
                      alt={banner.titulo || "Banner"}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <Image className="h-6 w-6 text-muted-foreground" />
                    </div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-medium truncate">{banner.titulo || "Sem título"}</div>
                  <div className="text-sm text-muted-foreground truncate">
                    {banner.descricao || "Sem descrição"}
                  </div>
                  <div className="flex items-center gap-4 mt-1 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {banner.duracao_segundos}s
                    </span>
                    {banner.link && (
                      <span className="flex items-center gap-1">
                        <Link className="h-3 w-3" />
                        Link
                      </span>
                    )}
                    <span>Ordem: {banner.ordem}</span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Switch
                    checked={banner.ativo}
                    onCheckedChange={() => handleToggleActive(banner)}
                  />
                  <Button size="icon" variant="outline" onClick={() => handleOpenModal(banner)}>
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button size="icon" variant="destructive" onClick={() => handleDelete(banner.id)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}

        {banners.length === 0 && (
          <div className="text-center py-8 text-muted-foreground">
            Nenhum banner cadastrado
          </div>
        )}
      </div>

      {/* Banner Modal */}
      <Dialog open={showModal} onOpenChange={setShowModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingBanner ? "Editar Banner" : "Novo Banner"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Título (opcional)</Label>
              <Input
                value={formData.titulo}
                onChange={(e) => setFormData({ ...formData, titulo: e.target.value })}
                placeholder="Título do banner"
              />
            </div>

            <div className="space-y-2">
              <Label>Descrição (opcional)</Label>
              <Input
                value={formData.descricao}
                onChange={(e) => setFormData({ ...formData, descricao: e.target.value })}
                placeholder="Descrição do banner"
              />
            </div>

            <div className="space-y-2">
              <Label>URL da Imagem *</Label>
              <Input
                value={formData.imagem_url}
                onChange={(e) => setFormData({ ...formData, imagem_url: e.target.value })}
                placeholder="https://exemplo.com/imagem.jpg"
              />
              {formData.imagem_url && (
                <div className="w-full h-32 rounded overflow-hidden bg-muted">
                  <img
                    src={formData.imagem_url}
                    alt="Preview"
                    className="w-full h-full object-cover"
                    onError={(e) => (e.currentTarget.style.display = "none")}
                  />
                </div>
              )}
            </div>

            <div className="space-y-2">
              <Label>Link (opcional)</Label>
              <Input
                value={formData.link}
                onChange={(e) => setFormData({ ...formData, link: e.target.value })}
                placeholder="https://exemplo.com"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Duração (segundos)</Label>
                <Input
                  type="number"
                  min="1"
                  max="30"
                  value={formData.duracao_segundos}
                  onChange={(e) =>
                    setFormData({ ...formData, duracao_segundos: parseInt(e.target.value) || 5 })
                  }
                />
              </div>
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

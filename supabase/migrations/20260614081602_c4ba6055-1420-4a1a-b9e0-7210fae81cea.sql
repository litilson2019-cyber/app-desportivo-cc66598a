CREATE TABLE public.guia_campeonatos (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  categoria TEXT NOT NULL CHECK (categoria IN ('mais_15','mais_25','mais_35','under')),
  bandeira TEXT NOT NULL,
  nome TEXT NOT NULL,
  ordem INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT ON public.guia_campeonatos TO anon, authenticated;
GRANT ALL ON public.guia_campeonatos TO authenticated;
GRANT ALL ON public.guia_campeonatos TO service_role;

ALTER TABLE public.guia_campeonatos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Todos podem ver guia" ON public.guia_campeonatos
  FOR SELECT USING (true);

CREATE POLICY "Admins gerenciam guia" ON public.guia_campeonatos
  FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin') OR has_permission(auth.uid(), 'configuracoes'))
  WITH CHECK (has_role(auth.uid(), 'admin') OR has_permission(auth.uid(), 'configuracoes'));

CREATE TRIGGER set_guia_campeonatos_updated_at
  BEFORE UPDATE ON public.guia_campeonatos
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Seed initial data
INSERT INTO public.guia_campeonatos (categoria, bandeira, nome, ordem) VALUES
('mais_15','🇬🇧','Inglaterra',1),
('mais_15','🇦🇺','Austrália',2),
('mais_15','🇩🇰','Dinamarca',3),
('mais_15','🇫🇮','Finlândia',4),
('mais_15','🇮🇸','Islândia',5),
('mais_15','🇳🇴','Noruega',6),
('mais_15','🇸🇪','Suécia',7),
('mais_15','🇺🇸','EUA',8),
('mais_15','🏴','Escócia',9),
('mais_15','🇮🇪','República da Irlanda',10),
('mais_15','🇳🇱','Países Baixos',11),
('mais_15','🇹🇷','Turquia',12),
('mais_15','🇸🇦','Arábia Saudita',13),
('mais_25','🇬🇧','Inglaterra',1),
('mais_25','🇦🇺','Austrália',2),
('mais_25','🇩🇰','Dinamarca',3),
('mais_25','🇫🇮','Finlândia',4),
('mais_25','🇮🇸','Islândia',5),
('mais_25','🇳🇴','Noruega',6),
('mais_25','🇸🇪','Suécia',7),
('mais_25','🇺🇸','EUA',8),
('mais_25','🏴','Escócia',9),
('mais_35','🇬🇧','Inglaterra',1),
('mais_35','🇦🇺','Austrália',2),
('mais_35','🇩🇰','Dinamarca',3),
('mais_35','🇫🇮','Finlândia',4),
('mais_35','🇮🇸','Islândia',5),
('mais_35','🇳🇴','Noruega',6),
('mais_35','🇸🇪','Suécia',7),
('under','🇦🇷','Primera División Argentina',1),
('under','🇨🇴','Primera A Colômbia',2),
('under','🇺🇾','Primera División Uruguai',3),
('under','🇨🇱','Primera División Chile',4),
('under','🇵🇪','Liga 1 Peru',5),
('under','🇲🇦','Botola Pro Marrocos',6),
('under','🇮🇹','Serie A Itália',7),
('under','🇪🇸','La Liga Espanha',8),
('under','🇯🇵','J1 League Japão',9),
('under','🇨🇳','Super League China',10),
('under','🇷🇺','Premier League Rússia',11),
('under','🇰🇿','Premier League Cazaquistão',12),
('under','🇰🇪','Kenyan Premier League',13),
('under','🇿🇼','Premier Soccer League Zimbabué',14),
('under','🇦🇴','Girabola Angola',15),
('under','🇨🇬','Ligue 1 Congo',16);
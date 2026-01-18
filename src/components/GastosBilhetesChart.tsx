import { useState, useMemo } from "react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { format, subDays, startOfWeek, endOfWeek, eachDayOfInterval, parseISO, startOfDay } from "date-fns";
import { pt } from "date-fns/locale";

interface Bilhete {
  id: string;
  modo: string | null;
  created_at: string;
}

interface SystemConfig {
  preco_modo_arriscado: number;
  preco_modo_seguro: number;
}

interface GastosBilhetesChartProps {
  bilhetes: Bilhete[];
  config: SystemConfig;
}

type PeriodoFiltro = "7dias" | "30dias" | "semana";

export function GastosBilhetesChart({ bilhetes, config }: GastosBilhetesChartProps) {
  const [periodo, setPeriodo] = useState<PeriodoFiltro>("7dias");

  const dadosGrafico = useMemo(() => {
    const hoje = new Date();
    let diasParaMostrar: Date[] = [];
    
    if (periodo === "7dias") {
      diasParaMostrar = eachDayOfInterval({
        start: subDays(hoje, 6),
        end: hoje,
      });
    } else if (periodo === "30dias") {
      diasParaMostrar = eachDayOfInterval({
        start: subDays(hoje, 29),
        end: hoje,
      });
    } else if (periodo === "semana") {
      const inicioSemana = startOfWeek(hoje, { weekStartsOn: 1 });
      const fimSemana = endOfWeek(hoje, { weekStartsOn: 1 });
      diasParaMostrar = eachDayOfInterval({
        start: inicioSemana,
        end: fimSemana,
      });
    }

    const normalizarModo = (m: string | null) => (m ?? "").trim().toLowerCase();
    const isSeguro = (m: string | null) => normalizarModo(m) === "seguro";

    return diasParaMostrar.map((dia) => {
      const bilhetesDoDia = bilhetes.filter((b) => {
        const dataBilhete = startOfDay(parseISO(b.created_at));
        return dataBilhete.getTime() === startOfDay(dia).getTime();
      });

      const modoSeguro = bilhetesDoDia.filter((b) => isSeguro(b.modo)).length;
      const modoRisco = bilhetesDoDia.length - modoSeguro;

      return {
        data: format(dia, periodo === "30dias" ? "dd/MM" : "EEE", { locale: pt }),
        dataCompleta: format(dia, "dd/MM/yyyy", { locale: pt }),
        risco: modoRisco * config.preco_modo_arriscado,
        seguro: modoSeguro * config.preco_modo_seguro,
        bilhetesRisco: modoRisco,
        bilhetesSeguro: modoSeguro,
      };
    });
  }, [bilhetes, periodo, config]);

  const totalPeriodo = useMemo(() => {
    return dadosGrafico.reduce(
      (acc, item) => ({
        risco: acc.risco + item.risco,
        seguro: acc.seguro + item.seguro,
        total: acc.total + item.risco + item.seguro,
      }),
      { risco: 0, seguro: 0, total: 0 }
    );
  }, [dadosGrafico]);

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0]?.payload;
      return (
        <div className="bg-background border border-border rounded-lg p-3 shadow-lg">
          <p className="font-medium text-foreground mb-2">{data?.dataCompleta}</p>
          <div className="space-y-1 text-sm">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-destructive" />
              <span className="text-muted-foreground">Risco:</span>
              <span className="font-medium text-foreground">
                {data?.bilhetesRisco} bilhetes ({data?.risco.toLocaleString()} Kz)
              </span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-success" />
              <span className="text-muted-foreground">Seguro:</span>
              <span className="font-medium text-foreground">
                {data?.bilhetesSeguro} bilhetes ({data?.seguro.toLocaleString()} Kz)
              </span>
            </div>
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <Card className="p-4 mt-4">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
        <h3 className="font-semibold text-foreground text-sm">Gastos por Período</h3>
        <div className="flex gap-2">
          <Button
            variant={periodo === "7dias" ? "default" : "outline"}
            size="sm"
            onClick={() => setPeriodo("7dias")}
            className="text-xs h-8 rounded-lg"
          >
            7 dias
          </Button>
          <Button
            variant={periodo === "semana" ? "default" : "outline"}
            size="sm"
            onClick={() => setPeriodo("semana")}
            className="text-xs h-8 rounded-lg"
          >
            Semana
          </Button>
          <Button
            variant={periodo === "30dias" ? "default" : "outline"}
            size="sm"
            onClick={() => setPeriodo("30dias")}
            className="text-xs h-8 rounded-lg"
          >
            30 dias
          </Button>
        </div>
      </div>

      {/* Resumo do período */}
      <div className="grid grid-cols-3 gap-2 mb-4">
        <div className="bg-destructive/10 rounded-lg p-2 text-center">
          <p className="text-xs text-muted-foreground">Risco</p>
          <p className="font-bold text-destructive text-sm">{totalPeriodo.risco.toLocaleString()} Kz</p>
        </div>
        <div className="bg-success/10 rounded-lg p-2 text-center">
          <p className="text-xs text-muted-foreground">Seguro</p>
          <p className="font-bold text-success text-sm">{totalPeriodo.seguro.toLocaleString()} Kz</p>
        </div>
        <div className="bg-primary/10 rounded-lg p-2 text-center">
          <p className="text-xs text-muted-foreground">Total</p>
          <p className="font-bold text-primary text-sm">{totalPeriodo.total.toLocaleString()} Kz</p>
        </div>
      </div>

      {/* Gráfico */}
      <div className="h-64 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={dadosGrafico}
            margin={{ top: 10, right: 10, left: -10, bottom: 0 }}
          >
            <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
            <XAxis
              dataKey="data"
              tick={{ fontSize: 11 }}
              className="text-muted-foreground"
              tickLine={false}
              axisLine={{ className: "stroke-border" }}
            />
            <YAxis
              tick={{ fontSize: 11 }}
              className="text-muted-foreground"
              tickLine={false}
              axisLine={{ className: "stroke-border" }}
              tickFormatter={(value) => `${(value / 1000).toFixed(0)}k`}
            />
            <Tooltip content={<CustomTooltip />} />
            <Legend
              formatter={(value) => (
                <span className="text-xs text-foreground capitalize">{value}</span>
              )}
            />
            <Bar
              dataKey="risco"
              name="Risco"
              fill="hsl(var(--destructive))"
              radius={[4, 4, 0, 0]}
            />
            <Bar
              dataKey="seguro"
              name="Seguro"
              fill="hsl(var(--success))"
              radius={[4, 4, 0, 0]}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </Card>
  );
}

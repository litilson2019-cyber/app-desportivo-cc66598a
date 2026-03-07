import { Home, Wallet, Hammer, Menu, ShoppingBag, Store } from "lucide-react";
import { NavLink } from "@/components/NavLink";

const navItems = [
  { to: "/", icon: Home, label: "Início" },
  { to: "/fundos", icon: Wallet, label: "Fundos" },
  { to: "/vitrine", icon: Store, label: "Vitrine" },
  { to: "/marketplace", icon: ShoppingBag, label: "Mercado" },
  { to: "/construcao", icon: Hammer, label: "Construção" },
  { to: "/menu", icon: Menu, label: "Menu" },
];

export const BottomNav = () => {
  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-card border-t border-border z-50 shadow-strong">
      <div className="flex justify-around items-center h-16 max-w-lg mx-auto px-2">
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            className="flex flex-col items-center justify-center gap-1 px-2 py-2 rounded-lg transition-all duration-200 text-muted-foreground hover:text-primary"
            activeClassName="text-primary bg-primary/10"
          >
            <item.icon className="w-5 h-5" />
            <span className="text-[10px] font-medium">{item.label}</span>
          </NavLink>
        ))}
      </div>
    </nav>
  );
};

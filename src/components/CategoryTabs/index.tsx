import { Button } from "@/components/ui/button";

// Tipos para as abas
type TabId = "agendamento" | "avaliacoes" | "planos";
const TABS: { id: TabId; label: string }[] = [
  { id: "agendamento", label: "Serviços" },
  { id: "avaliacoes", label: "Avaliações" },
  { id: "planos", label: "Planos" },
  // Adicione novas abas aqui no futuro (ex: 'Produtos', 'Fidelidade')
];

interface CategoryTabsProps {
  activeTab: TabId;
  onTabChange: (tabId: TabId) => void;
}

export function CategoryTabs({ activeTab, onTabChange }: CategoryTabsProps) {
  return (
    // Container que permite rolagem horizontal em telas pequenas
    <div className="border-b border-border overflow-x-auto">
      <div className="flex justify-center px-4" role="tablist">
        {TABS.map((tab) => (
          <Button
            key={tab.id}
            variant="ghost"
            onClick={() => onTabChange(tab.id)}
            role="tab"
            aria-selected={activeTab === tab.id}
            className={`
              py-4 px-4 sm:px-6 rounded-none text-sm sm:text-base font-semibold transition-all
              ${
                activeTab === tab.id
                  ? "border-b-2 border-[var(--loja-theme-color)] text-[var(--loja-theme-color)]"
                  : "text-muted-foreground hover:text-foreground/80"
              }
            `}
          >
            {tab.label}
          </Button>
        ))}
      </div>
    </div>
  );
}

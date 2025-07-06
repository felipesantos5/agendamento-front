import { PlansList } from "@/components/PlansList"; // Importe o novo componente

interface PlansPaneProps {
  barbershopId: string;
}

export function PlansPane({ barbershopId }: PlansPaneProps) {
  return (
    <div className="p-4 sm:p-6 space-y-4">
      <div className="text-center">
        <h2 className="text-2xl font-semibold text-gray-900">Nossos Planos e Pacotes</h2>
        {/* <p className="mt-2 text-muted-foreground max-w-2xl mx-auto">
          Escolha um de nossos planos para ter descontos e benefícios exclusivos em seus agendamentos.
        </p> */}
      </div>

      {/* Aqui você chama o componente, passando o ID da barbearia */}

      <PlansList barbershopId={barbershopId} />
    </div>
  );
}

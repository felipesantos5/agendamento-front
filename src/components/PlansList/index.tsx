import { useEffect, useState } from "react";
import apiClient from "@/services/api";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, Check } from "lucide-react";
import { PriceFormater } from "@/helper/priceFormater";

// Tipagem para um Plano, espelhando o que vem da API
interface Plan {
  _id: string;
  name: string;
  description?: string;
  price: number;
}

// O componente espera receber o ID da barbearia como prop
interface PlansListProps {
  barbershopId: string;
}

export function PlansList({ barbershopId }: PlansListProps) {
  const [plans, setPlans] = useState<Plan[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!barbershopId) return;

    const fetchPlans = async () => {
      try {
        setIsLoading(true);
        const response = await apiClient.get(`/api/barbershops/${barbershopId}/plans`);
        console.log(`a`, response.data);
        setPlans(response.data);
      } catch (error) {
        console.error("Erro ao carregar planos:", error);
        toast.error("Não foi possível carregar os planos.");
      } finally {
        setIsLoading(false);
      }
    };

    fetchPlans();
  }, [barbershopId]);

  if (isLoading) {
    return (
      <div className="flex justify-center p-8">
        <Loader2 className="animate-spin" />
      </div>
    );
  }

  if (plans.length === 0) {
    return <p className="text-center text-muted-foreground p-8">Nenhum plano disponível no momento.</p>;
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {plans.map((plan, index) => (
        <Card
          key={plan._id}
          // Adiciona um destaque sutil para o plano mais popular ou recomendado
          className={index === 1 ? "border-2 border-[var(--loja-theme-color)] shadow-lg" : ""}
        >
          <CardHeader>
            <CardTitle className="text-xl">{plan.name}</CardTitle>
            {plan.description && <CardDescription>{plan.description}</CardDescription>}
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="text-4xl font-bold">
              {PriceFormater(plan.price)}
              <span className="text-lg font-normal text-muted-foreground">/mês</span>
            </div>
            {/* Aqui você pode adicionar uma lista de benefícios do plano no futuro */}
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li className="flex items-center">
                <Check className="h-4 w-4 mr-2 text-green-500" /> Benefício 1
              </li>
              <li className="flex items-center">
                <Check className="h-4 w-4 mr-2 text-green-500" /> Benefício 2
              </li>
            </ul>
          </CardContent>
          <CardFooter>
            {/* A lógica de assinatura será implementada no futuro */}
            <Button className="w-full bg-[var(--loja-theme-color)] hover:bg-[var(--loja-theme-color)]/90">Assinar Plano</Button>
          </CardFooter>
        </Card>
      ))}
    </div>
  );
}

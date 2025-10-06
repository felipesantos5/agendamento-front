import { useEffect, useState, useRef, useMemo } from "react";
import { useParams } from "react-router-dom";
import apiClient from "@/services/api";
import { toast } from "sonner";
import axios from "axios";
import { Barbershop, Service, Barber } from "@/types/barberShop";
import { Loader2 } from "lucide-react";
import { CategoryTabs } from "@/components/CategoryTabs";
import { BookingPane } from "./sections/BookingPane";
import { ShopHeader } from "@/components/ShopHeader/ShopHeader";
import { ReviewsPane } from "./sections/ReviewsPane";
import { ShopInfo } from "@/components/ShopInfo";
import { PlansPane } from "./sections/PlansPane";
import { Plan } from "@/types/plans";
import { CustomerProductsPage } from "./sections/Products";

export type Tab = {
  id: string;
  label: string;
};

// Tipo para controlar a aba ativa
type TabId = "agendamento" | "avaliacoes" | "planos" | "products";

export function Loja() {
  const { slug } = useParams<{ slug: string }>();

  const [barbershop, setBarbershop] = useState<Barbershop | null>(null);
  const [allServices, setAllServices] = useState<Service[]>([]);
  const [allBarbers, setAllBarbers] = useState<Barber[]>([]);

  const [plans, setPlans] = useState<Plan[]>([]);
  const [activeTab, setActiveTab] = useState<TabId>("agendamento");
  const [isLoading, setIsLoading] = useState(true);

  const bookingSectionRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!slug) {
      setIsLoading(false);
      return;
    }

    const fetchAllData = async () => {
      try {
        setIsLoading(true);
        const barbershopResponse = await apiClient.get(`/barbershops/slug/${slug}`);
        const currentBarbershop = barbershopResponse.data;

        if (!currentBarbershop) {
          throw new Error("Barbearia não encontrada");
        }

        setBarbershop(currentBarbershop);
        document.title = `Agendar em ${currentBarbershop.name}`;

        if (currentBarbershop.themeColor) {
          document.documentElement.style.setProperty("--loja-theme-color", currentBarbershop.themeColor);
        }

        const [servicesResponse, barbersResponse, plansResponse] = await Promise.all([
          apiClient.get(`/barbershops/${currentBarbershop._id}/services`),
          apiClient.get(`/barbershops/${currentBarbershop._id}/barbers`),
          apiClient.get(`/api/barbershops/${currentBarbershop._id}/plans`),
        ]);

        setAllServices(servicesResponse.data);
        setAllBarbers(barbersResponse.data);
        setPlans(plansResponse.data);
      } catch (error) {
        if (axios.isAxiosError(error) && error.response?.status === 404) {
          window.location.replace("https://compre.barbeariagendamento.com.br");
        } else {
          console.error("Erro ao carregar dados da barbearia:", error);
          toast.error("Não foi possível carregar os dados da barbearia.");
        }
      } finally {
        setIsLoading(false);
      }
    };

    fetchAllData();
  }, [slug]);

  const visibleTabs = useMemo(() => {
    const tabs: Tab[] = [
      { id: "agendamento", label: "Serviços" },
      { id: "products", label: "Produtos" },
      { id: "planos", label: "Planos" },
      { id: "avaliacoes", label: "Avaliações" },
    ];

    return tabs;
  }, [plans]);

  const handleBookNowClick = () => {
    setActiveTab("agendamento");

    setTimeout(() => {
      bookingSectionRef.current?.scrollIntoView({
        behavior: "smooth",
        block: "center",
      });
    }, 100);
  };

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="h-10 w-10 animate-spin text-gray-700" />
      </div>
    );
  }

  if (!barbershop) {
    return <div className="flex h-screen items-center justify-center">Ocorreu um erro ao carregar esta página.</div>;
  }

  return (
    <div className="bg-background dark:bg-gray-950">
      <div className="max-w-4xl mx-auto">
        <ShopHeader barbershop={barbershop} onBookNowClick={handleBookNowClick} />

        <CategoryTabs activeTab={activeTab} onTabChange={setActiveTab} tabs={visibleTabs} />

        <main>
          <div ref={bookingSectionRef}>
            {activeTab === "agendamento" && <BookingPane barbershop={barbershop} allServices={allServices} allBarbers={allBarbers} />}
          </div>

          {activeTab === "avaliacoes" && <ReviewsPane barbershopId={barbershop._id} />}

          {activeTab === "planos" && <PlansPane barbershopId={barbershop._id} />}

          {activeTab === "products" && <CustomerProductsPage />}
        </main>
        <ShopInfo barbershop={barbershop} availability={barbershop.workingHours} />
      </div>
    </div>
  );
}

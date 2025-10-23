import React, { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom"; // Importar useLocation
import apiClient from "@/services/api";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { ChevronLeft, Check } from "lucide-react";
import ServiceSelection from "@/components/serviceSelection";
import DateTimeSelection from "@/components/dataTimeSelection";
import PersonalInfo from "@/components/personalInfo";
import { Service, Barber, Barbershop } from "@/types/barberShop";

// Definindo as props que o componente receberá da página principal
interface BookingPaneProps {
  barbershop: Barbershop;
  allServices: Service[];
  allBarbers: Barber[];
}

const initialFormData = {
  service: "",
  barber: "",
  date: "",
  time: "",
  name: "",
  phone: "",
};

// ***** NOVO: Interface para os dados de remarcação *****
interface RescheduleState {
  rescheduleData?: {
    originalBookingId: string;
    serviceId: string;
    barberId: string;
  };
}
// ****************************************************

export function BookingPane({
  barbershop,
  allServices,
  allBarbers,
}: BookingPaneProps) {
  const navigate = useNavigate();
  const location = useLocation(); // Hook para acessar o state da navegação
  const { slug } = useParams<{ slug: string }>();

  // ***** NOVO: Tenta pegar os dados de remarcação do state *****
  const rescheduleInfo = (location.state as RescheduleState)?.rescheduleData;
  // **********************************************************

  const [formData, setFormData] = useState(() => {
    // Se houver dados de remarcação, inicializa o form com eles
    if (rescheduleInfo) {
      return {
        ...initialFormData,
        service: rescheduleInfo.serviceId,
        barber: rescheduleInfo.barberId,
      };
    }
    return initialFormData; // Senão, começa vazio
  });

  // ***** NOVO: Define o passo inicial com base nos dados de remarcação *****
  const [currentStep, setCurrentStep] = useState(() => {
    // Se está remarcando (já tem serviço e barbeiro), começa no passo 2
    return rescheduleInfo ? 2 : 1;
  });
  // ********************************************************************

  const [isSubmitting, setIsSubmitting] = useState(false);
  const totalSteps = 3;

  // Lógica de avanço automático (sem alterações)
  useEffect(() => {
    if (currentStep === 1 && formData.service && formData.barber) {
      setCurrentStep(2);
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
    // Verifica se pode avançar do Passo 2 (Data e Hora) para o Passo 3 (Dados Pessoais)
    // ADICIONADO: !rescheduleInfo para não avançar automaticamente se estiver remarcando
    //             e a data/hora ainda não foi escolhida PELO USUÁRIO.
    else if (
      currentStep === 2 &&
      formData.date &&
      formData.time &&
      !rescheduleInfo
    ) {
      setCurrentStep(3);
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
    // Se estiver remarcando E já selecionou data/hora, avança para o passo 3
    else if (
      currentStep === 2 &&
      formData.date &&
      formData.time &&
      rescheduleInfo
    ) {
      setCurrentStep(3);
      window.scrollTo({ top: 0, behavior: "smooth" });
      // Limpa a informação de remarcação do estado para evitar re-avanço indesejado
      // É uma abordagem, outra seria só verificar se já avançou uma vez.
      if (
        location.state &&
        (location.state as RescheduleState).rescheduleData
      ) {
        navigate(location.pathname, { state: {}, replace: true });
      }
    }
    // Dependência rescheduleInfo adicionada
  }, [
    formData,
    currentStep,
    rescheduleInfo,
    navigate,
    location.pathname,
    location.state,
  ]);

  const updateFormData = (data: Partial<typeof formData>) => {
    setFormData((prev) => ({ ...prev, ...data }));
  };

  // Lógica de voltar (sem alterações)
  const handlePrevious = () => {
    const prevStep = currentStep - 1;
    if (prevStep >= 1) {
      // Se estamos voltando do passo 3 para o 2, limpamos a seleção de 'hora'.
      if (currentStep === 3) {
        updateFormData({ time: "" });
      }
      // Se estamos voltando do passo 2 para o 1 E NÃO ESTAMOS REMARCANDO, limpamos o barbeiro.
      // Se estiver remarcando, não limpamos para manter a pré-seleção.
      if (currentStep === 2 && !rescheduleInfo) {
        // <- Adicionada condição !rescheduleInfo
        updateFormData({ barber: "" });
      }

      setCurrentStep(prevStep);
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  // Nomes selecionados (sem alterações)
  const selectedServiceName = useMemo(
    () => allServices.find((s) => s._id === formData.service)?.name,
    [allServices, formData.service]
  );
  const selectedBarberName = useMemo(
    () => allBarbers.find((b) => b._id === formData.barber)?.name,
    [allBarbers, formData.barber]
  );

  // Lógica de submissão (PRECISA AJUSTAR PARA REMARCAÇÃO NO FUTURO)
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    const { service, barber, date, time, name, phone } = formData;
    if (!service || !barber || !date || !time || !name || !phone) {
      toast.error("Por favor, preencha todos os campos obrigatórios.");
      setIsSubmitting(false);
      return;
    }

    // ***** AJUSTE POTENCIAL AQUI para chamar endpoint de remarcação se rescheduleInfo existir *****
    // Por enquanto, mantém a criação de um novo agendamento.
    // O ideal seria o backend ter uma rota PUT /bookings/:id/reschedule ou similar
    // Ou a rota POST aceitar um parâmetro opcional `rescheduledFromBookingId`
    // E o backend se encarregaria de cancelar o antigo e criar o novo atomicamente.

    const bookingPayload = {
      barber: barber,
      service: service,
      time: new Date(`${date}T${time}:00`).toISOString(),
      customer: {
        name: name,
        phone: phone.replace(/\D/g, ""),
      },
      // Adiciona o ID original se estiver remarcando (backend precisa suportar isso)
      ...(rescheduleInfo && {
        originalBookingId: rescheduleInfo.originalBookingId,
      }),
    };

    try {
      let endpoint = `/barbershops/${barbershop._id}/bookings`;
      let method: "post" | "put" = "post"; // Assume POST por padrão

      // EXEMPLO: Se existir um endpoint específico para remarcar
      // if (rescheduleInfo) {
      //   endpoint = `/barbershops/${barbershop._id}/bookings/${rescheduleInfo.originalBookingId}/reschedule`;
      //   method = 'put'; // Ou POST, dependendo da API
      //   // Ajustar payload se necessário para a rota de remarcação
      //   bookingPayload = { newTime: bookingPayload.time };
      // }

      const bookingResponse = await apiClient[method](endpoint, bookingPayload);

      if (bookingResponse.status === 201 || bookingResponse.status === 200) {
        // 200 para PUT/update
        const newBooking = bookingResponse.data;

        // Se estava remarcando, talvez mostrar uma mensagem diferente
        const successMessage = rescheduleInfo
          ? "Seu horário foi remarcado com sucesso!"
          : "Agendamento confirmado!";

        toast.success(successMessage); // Exibe a mensagem de sucesso antes de navegar

        // Navega para sucesso (sem alterações na passagem de state por enquanto)
        navigate(`/${slug}/agendamento-sucesso`, {
          replace: true,
          state: {
            bookingDetails: {
              customerName: name,
              serviceName: selectedServiceName,
              barberName: selectedBarberName,
              date: date,
              time: time,
              barbershopName: barbershop.name,
            },
            newBookingId: newBooking._id,
            barbershopId: barbershop._id,
            paymentsEnabled: barbershop.paymentsEnabled,
            barbershopSlug: barbershop.slug,
          },
        });
      }
    } catch (err: any) {
      const errorMsg =
        err.response?.data?.error ??
        (rescheduleInfo ? "Erro ao remarcar." : "Erro ao agendar.");
      toast.error(`${errorMsg} Tente outro horário.`);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Texto do botão (sem alterações)
  const submitButtonText = barbershop.paymentsEnabled
    ? isSubmitting
      ? rescheduleInfo
        ? "Remarcando..."
        : "Gerando Pagamento..." // Ajusta texto do loading
      : rescheduleInfo
      ? "Confirmar Remarcação"
      : "Pagar e Agendar" // Ajusta texto padrão
    : isSubmitting
    ? rescheduleInfo
      ? "Remarcando..."
      : "Agendando..." // Ajusta texto do loading
    : rescheduleInfo
    ? "Confirmar Remarcação"
    : "Confirmar Agendamento"; // Ajusta texto padrão

  return (
    <div className="p-4 pb-8 md:p-6 lg:p-8 mt-1">
      <form onSubmit={handleSubmit} className="flex h-full flex-col">
        <div className="flex-grow">
          {currentStep === 1 && (
            <ServiceSelection
              services={allServices}
              barbers={allBarbers}
              selectedService={formData.service}
              selectedBarber={formData.barber}
              onSelectService={
                (serviceId) =>
                  updateFormData({ service: serviceId, barber: "" }) // Limpa barbeiro ao trocar serviço
              }
              onSelectBarber={(barberId) =>
                updateFormData({ barber: barberId })
              }
            />
          )}

          {currentStep === 2 && (
            <DateTimeSelection
              formData={formData}
              updateFormData={updateFormData}
              barbershopId={barbershop._id}
              selectedBarber={formData.barber}
              selectedServiceId={formData.service}
            />
          )}

          {currentStep === 3 && (
            <PersonalInfo
              formData={formData}
              updateFormData={updateFormData}
              serviceNameDisplay={selectedServiceName}
              barberNameDisplay={selectedBarberName}
            />
          )}
        </div>

        <div className="mt-8 flex justify-between">
          <Button
            type="button"
            variant="outline"
            onClick={handlePrevious}
            // Esconde o botão Voltar no Passo 1 OU se estiver no Passo 2 VINDO de remarcação
            className={`transition-all ${
              currentStep === 1 || (currentStep === 2 && !!rescheduleInfo)
                ? "hidden"
                : "visible"
            }`}
          >
            <ChevronLeft className="mr-1 h-4 w-4" />
            Voltar
          </Button>

          {currentStep === totalSteps && (
            <Button
              type="submit"
              disabled={
                isSubmitting ||
                !formData.name ||
                !formData.phone ||
                formData.phone.length < 11
              } // Adiciona validação básica
              className="bg-[var(--loja-theme-color)] hover:bg-[var(--loja-theme-color)]/90 ml-auto" // Adicionado ml-auto para alinhar à direita se o Voltar sumir
            >
              {submitButtonText}
              <Check className="ml-1 h-4 w-4" />
            </Button>
          )}
        </div>
      </form>
    </div>
  );
}

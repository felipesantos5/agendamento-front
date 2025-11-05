// src/pages/loja/sections/BookingPane.tsx
import React, { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom"; // Importar useLocation
import apiClient from "@/services/api";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { ChevronLeft, Check } from "lucide-react";
import ServiceSelection from "@/components/serviceSelection";
import DateTimeSelection from "@/components/dataTimeSelection";
import PersonalInfo from "@/components/personalInfo";
import { Barber, Barbershop } from "@/types/barberShop";
import { Service } from "@/types/Service";

// ... (interfaces e estado inicial permanecem os mesmos) ...
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

export function BookingPane({ barbershop, allServices, allBarbers }: BookingPaneProps) {
  // ... (hooks e estados permanecem os mesmos) ...
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

  // ... (useEffect de avanço automático e updateFormData permanecem os mesmos) ...
  useEffect(() => {
    if (currentStep === 1 && formData.service && formData.barber) {
      setCurrentStep(2);
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
    // Verifica se pode avançar do Passo 2 (Data e Hora) para o Passo 3 (Dados Pessoais)
    // ADICIONADO: !rescheduleInfo para não avançar automaticamente se estiver remarcando
    //             e a data/hora ainda não foi escolhida PELO USUÁRIO.
    else if (currentStep === 2 && formData.date && formData.time && !rescheduleInfo) {
      setCurrentStep(3);
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
    // Se estiver remarcando E já selecionou data/hora, avança para o passo 3
    else if (currentStep === 2 && formData.date && formData.time && rescheduleInfo) {
      setCurrentStep(3);
      window.scrollTo({ top: 0, behavior: "smooth" });
      // Limpa a informação de remarcação do estado para evitar re-avanço indesejado
      // É uma abordagem, outra seria só verificar se já avançou uma vez.
      if (location.state && (location.state as RescheduleState).rescheduleData) {
        navigate(location.pathname, { state: {}, replace: true });
      }
    }
    // Dependência rescheduleInfo adicionada
  }, [formData, currentStep, rescheduleInfo, navigate, location.pathname, location.state]);

  const updateFormData = (data: Partial<typeof formData>) => {
    setFormData((prev) => ({ ...prev, ...data }));
  };

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

  const selectedServiceName = useMemo(() => allServices.find((s) => s._id === formData.service)?.name, [allServices, formData.service]);
  const selectedBarberName = useMemo(() => allBarbers.find((b) => b._id === formData.barber)?.name, [allBarbers, formData.barber]);

  // Lógica de submissão (handleSubmit)
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    const { service, barber, date, time, name, phone } = formData;
    if (!service || !barber || !date || !time || !name || !phone) {
      toast.error("Por favor, preencha todos os campos obrigatórios.");
      setIsSubmitting(false);
      return;
    }

    const selectedService = allServices.find((s) => s._id === service);
    if (!selectedService) {
      toast.error("Serviço selecionado inválido.");
      setIsSubmitting(false);
      return;
    }

    const serviceDuration = selectedService.duration;
    const formattedAddress = `${barbershop.address.rua}, ${barbershop.address.numero} - ${barbershop.address.bairro}, ${barbershop.address.cidade}/${barbershop.address.estado}`;

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

      // ... (lógica de remarcação, se houver, permanece) ...
      // if (rescheduleInfo) { ... }

      const bookingResponse = await apiClient[method](endpoint, bookingPayload);

      // Se o backend retornou 201 (criado com sucesso, seja por plano ou não)
      if (bookingResponse.status === 201 || bookingResponse.status === 200) {
        // 200 para PUT/update
        const newBooking = bookingResponse.data;

        // Verifica se o pagamento foi por crédito de plano (o backend deve retornar isso)
        // Se o paymentStatus for 'plan_credit', o agendamento já está confirmado.
        const isPlanCredit = newBooking.paymentStatus === "plan_credit";

        const successMessage = rescheduleInfo
          ? "Seu horário foi remarcado com sucesso!"
          : isPlanCredit
          ? "Agendamento confirmado (crédito do plano)!"
          : "Agendamento confirmado!";

        toast.success(successMessage); // Exibe a mensagem de sucesso antes de navegar

        // Se for crédito de plano, NÃO precisa ir para a página de pagamento.
        // Se os pagamentos estiverem habilitados E NÃO for crédito de plano, vai para o pagamento.
        const shouldGoToPayment = barbershop.paymentsEnabled && !isPlanCredit;

        // Navega para sucesso
        navigate(`/${slug}/agendamento-sucesso`, {
          replace: true,
          state: {
            bookingDetails: {
              customerName: name,
              serviceName: selectedServiceName,
              barberName: selectedBarberName,
              date: date, // YYYY-MM-DD
              time: time, // HH:MM
              barbershopName: barbershop.name,
              // --- NOVOS DADOS ---
              serviceDuration: serviceDuration, // Passa a duração
              barbershopAddress: formattedAddress, // Passa o endereço formatado
              // -------------------
            },
            newBookingId: newBooking._id,
            barbershopId: barbershop._id,
            // ATUALIZADO: Só habilita pagamento se a loja permite E não foi usado crédito de plano
            paymentsEnabled: shouldGoToPayment,
            barbershopSlug: barbershop.slug,
          },
        });
      }
    } catch (err: any) {
      //
      // MODIFICAÇÃO: Tratamento de Erro (Incluindo 403)
      //
      console.error("Erro no agendamento:", err);
      let errorMsg = rescheduleInfo ? "Erro ao remarcar." : "Erro ao agendar.";

      if (err.response) {
        // Erro 403 (Forbidden) específico para créditos de plano
        if (err.response.status === 403) {
          errorMsg = err.response.data?.error || "Este serviço é exclusivo para assinantes e você não possui créditos válidos.";
          // Mostra o erro 403 de forma clara
          toast.error("Agendamento não permitido", {
            description: errorMsg,
            duration: 5000,
          });
        } else {
          // Outros erros da API (ex: 409 Conflito de horário)
          errorMsg = err.response.data?.error || errorMsg;
          toast.error(`${errorMsg} Tente outro horário.`);
        }
      } else {
        // Erros de rede ou outros
        toast.error(`${errorMsg} Tente outro horário.`);
      }
      // FIM DA MODIFICAÇÃO
    } finally {
      setIsSubmitting(false);
    }
  };

  // ... (submitButtonText e o JSX de retorno permanecem os mesmos) ...
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
                (serviceId) => updateFormData({ service: serviceId, barber: "" }) // Limpa barbeiro ao trocar serviço
              }
              onSelectBarber={(barberId) => updateFormData({ barber: barberId })}
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
            className={`transition-all ${currentStep === 1 || (currentStep === 2 && !!rescheduleInfo) ? "hidden" : "visible"}`}
          >
            <ChevronLeft className="mr-1 h-4 w-4" />
            Voltar
          </Button>

          {currentStep === totalSteps && (
            <Button
              type="submit"
              disabled={isSubmitting || !formData.name || !formData.phone || formData.phone.length < 11} // Adiciona validação básica
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

import React, { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
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

export function BookingPane({
  barbershop,
  allServices,
  allBarbers,
}: BookingPaneProps) {
  const navigate = useNavigate();
  const { slug } = useParams<{ slug: string }>();

  const [formData, setFormData] = useState(initialFormData);
  const [currentStep, setCurrentStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const totalSteps = 3;

  // ... (useEffect e outras funções permanecem iguais)
  useEffect(() => {
    // Verifica se pode avançar do Passo 1 (Serviço e Barbeiro) para o Passo 2 (Data e Hora)
    if (currentStep === 1 && formData.service && formData.barber) {
      setCurrentStep(2);
      window.scrollTo({ top: 0, behavior: "smooth" }); // Rola para o topo
    }
    // Verifica se pode avançar do Passo 2 (Data e Hora) para o Passo 3 (Dados Pessoais)
    else if (currentStep === 2 && formData.date && formData.time) {
      setCurrentStep(3);
      window.scrollTo({ top: 0, behavior: "smooth" }); // Rola para o topo
    }
  }, [formData, currentStep]);

  const updateFormData = (data: Partial<typeof formData>) => {
    setFormData((prev) => ({ ...prev, ...data }));
  };

  const handlePrevious = () => {
    const prevStep = currentStep - 1;
    if (prevStep >= 1) {
      // --- LÓGICA ADICIONADA ---
      // Se estamos voltando do passo 3 para o 2, limpamos a seleção de 'hora'.
      // Isso impede o auto-avanço imediato de volta para o passo 3.
      if (currentStep === 3) {
        updateFormData({ time: "" });
      }

      // Se estamos voltando do passo 2 para o 1, limpamos a seleção de 'barbeiro'.
      // Isso impede o auto-avanço imediato de volta para o passo 2.
      if (currentStep === 2) {
        updateFormData({ barber: "" });
      }
      // --------------------------

      setCurrentStep(prevStep);
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  // Encontra os nomes selecionados para exibir no resumo
  const selectedServiceName = useMemo(
    () => allServices.find((s) => s._id === formData.service)?.name,
    [allServices, formData.service]
  );
  const selectedBarberName = useMemo(
    () => allBarbers.find((b) => b._id === formData.barber)?.name,
    [allBarbers, formData.barber]
  );

  // ALTERADO: Lógica de submissão do formulário
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    const { service, barber, date, time, name, phone } = formData;
    if (!service || !barber || !date || !time || !name || !phone) {
      toast.error("Por favor, preencha todos os campos obrigatórios.");
      setIsSubmitting(false);
      return;
    }

    const bookingPayload = {
      barber: barber,
      service: service,
      time: new Date(`${date}T${time}:00`).toISOString(),
      customer: {
        name: name,
        phone: phone.replace(/\D/g, ""), // Salva apenas os dígitos
      },
    };

    try {
      // 1. Cria o agendamento
      const bookingResponse = await apiClient.post(
        `/barbershops/${barbershop._id}/bookings`,
        bookingPayload
      );

      // 2. Se o agendamento foi criado com sucesso, navega para a página de sucesso
      if (bookingResponse.status === 201) {
        const newBooking = bookingResponse.data;

        // 3. Navega passando TODOS os dados necessários para a próxima página
        navigate(`/${slug}/agendamento-sucesso`, {
          replace: true,
          state: {
            // Detalhes para exibição na tela
            bookingDetails: {
              customerName: name,
              serviceName: selectedServiceName,
              barberName: selectedBarberName,
              date: date,
              time: time,
              barbershopName: barbershop.name,
            },
            // Dados para a funcionalidade de pagamento
            newBookingId: newBooking._id, // << NOVO: ID do agendamento
            barbershopId: barbershop._id, // << NOVO: ID da barbearia
            paymentsEnabled: barbershop.paymentsEnabled, // << NOVO: Flag de pagamento
            barbershopSlug: barbershop.slug,
          },
        });
      }
    } catch (err: any) {
      toast.error(
        err.response?.data?.error ?? "Erro ao agendar. Tente outro horário."
      );
    } finally {
      setIsSubmitting(false);
    }

    // O finally foi movido para dentro do try/catch para não ser executado durante o redirecionamento
  };

  // NOVO: Define o texto do botão com base na necessidade de pagamento
  const submitButtonText = barbershop.paymentsEnabled
    ? isSubmitting
      ? "Gerando Pagamento..."
      : "Pagar e Agendar"
    : isSubmitting
    ? "Agendando..."
    : "Confirmar Agendamento";

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
              onSelectService={(serviceId) =>
                updateFormData({ service: serviceId })
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
            className={`transition-all ${
              currentStep === 1 ? "hidden" : "visible"
            }`}
          >
            <ChevronLeft className="mr-1 h-4 w-4" />
            Voltar
          </Button>

          {currentStep === totalSteps && (
            <Button
              type="submit"
              disabled={isSubmitting}
              className="bg-[var(--loja-theme-color)] hover:bg-[var(--loja-theme-color)]/90"
            >
              {/* ALTERADO: Usa o texto dinâmico do botão */}
              {submitButtonText}
              <Check className="ml-1 h-4 w-4" />
            </Button>
          )}
        </div>
      </form>
    </div>
  );
}

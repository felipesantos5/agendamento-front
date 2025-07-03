import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import apiClient from "@/services/api";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { ChevronLeft, Check } from "lucide-react";
import ServiceSelection from "@/components/serviceSelection";
import DateTimeSelection from "@/components/dataTimeSelection";
import PersonalInfo from "@/components/personalInfo";
import { Service, Barber, Barbershop } from "@/types/barberShop";
import { motion } from "framer-motion";

const stepAnimation = {
  initial: { opacity: 0, x: 20 },
  animate: { opacity: 1, x: 0 },
  exit: { opacity: 0, x: -20 },
  transition: { duration: 0.3, ease: "easeInOut" },
};

// Definindo as props que o componente receberá da página principal
interface BookingPaneProps {
  barbershop: Barbershop;
  allServices: Service[];
  allBarbers: Barber[];
}

// Estado inicial do formulário para facilitar o reset
const initialFormData = {
  service: "",
  barber: "",
  date: "",
  time: "",
  name: "",
  phone: "",
};

export function BookingPane({ barbershop, allServices, allBarbers }: BookingPaneProps) {
  const navigate = useNavigate();

  // Todos os estados que antes estavam em Loja.tsx agora vivem aqui
  const [formData, setFormData] = useState(initialFormData);
  const [currentStep, setCurrentStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const totalSteps = 3;

  useEffect(() => {
    // Verifica se pode avançar do Passo 1 (Serviço e Barbeiro) para o Passo 2 (Data e Hora)
    if (currentStep === 1 && formData.service && formData.barber) {
      console.log("Avançando para o passo 2...");
      setCurrentStep(2);
      window.scrollTo({ top: 0, behavior: "smooth" }); // Rola para o topo
    }
    // Verifica se pode avançar do Passo 2 (Data e Hora) para o Passo 3 (Dados Pessoais)
    else if (currentStep === 2 && formData.date && formData.time) {
      console.log("Avançando para o passo 3...");
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

  // Lógica de submissão do formulário
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
      const response = await apiClient.post(`/barbershops/${barbershop._id}/bookings`, bookingPayload);

      if (response.status === 201 && barbershop) {
        navigate("/agendamento-sucesso", {
          replace: true,
          state: {
            bookingDetails: {
              barbershopName: barbershop.name,
              customerName: name,
              serviceName: selectedServiceName || "Serviço Indisponível",
              barberName: selectedBarberName || "Profissional Indisponível",
              date: date,
              time: time,
            },
            barbershopSlug: barbershop.slug,
          },
        });
      }
    } catch (err: any) {
      toast.error(err.response?.data?.error ?? "Erro ao agendar. Tente outro horário.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Encontra os nomes selecionados para exibir no resumo
  const selectedServiceName = useMemo(() => allServices.find((s) => s._id === formData.service)?.name, [allServices, formData.service]);
  const selectedBarberName = useMemo(() => allBarbers.find((b) => b._id === formData.barber)?.name, [allBarbers, formData.barber]);

  return (
    <div className="p-4 pb-8md:p-6 lg:p-8 mt-1">
      <form onSubmit={handleSubmit} className="flex h-full flex-col">
        {/* Indicador de Passos */}
        {/* <div className="mb-6 md:mb-8">
          <StepIndicator currentStep={currentStep} highestCompletedStep={highestCompletedStep} onStepClick={handleStepClick} />
        </div> */}

        {/* Conteúdo do Passo Atual */}
        <div className="flex-grow">
          {currentStep === 1 && (
            // <motion.div key="step1" {...stepAnimation}>
            <ServiceSelection
              services={allServices}
              barbers={allBarbers}
              selectedService={formData.service}
              selectedBarber={formData.barber}
              onSelectService={(serviceId) => updateFormData({ service: serviceId })}
              onSelectBarber={(barberId) => updateFormData({ barber: barberId })}
            />
            // </motion.div>
          )}

          {currentStep === 2 && (
            <motion.div key="step2" {...stepAnimation}>
              <DateTimeSelection
                formData={formData}
                updateFormData={updateFormData}
                barbershopId={barbershop._id}
                selectedBarber={formData.barber}
                selectedServiceId={formData.service}
              />
            </motion.div>
          )}

          {currentStep === 3 && (
            <motion.div key="step3" {...stepAnimation}>
              <PersonalInfo
                formData={formData}
                updateFormData={updateFormData}
                serviceNameDisplay={selectedServiceName}
                barberNameDisplay={selectedBarberName}
              />
            </motion.div>
          )}
        </div>

        <div className="mt-8 flex justify-between">
          <Button
            type="button"
            variant="outline"
            onClick={handlePrevious}
            className={`transition-all ${currentStep === 1 ? "invisible" : "visible"}`}
          >
            <ChevronLeft className="mr-1 h-4 w-4" />
            Voltar
          </Button>

          {/* O botão Próximo foi removido. O botão de Confirmar só aparece no último passo. */}
          {currentStep === totalSteps && (
            <Button type="submit" disabled={isSubmitting} className="bg-[var(--loja-theme-color)] hover:bg-[var(--loja-theme-color)]/90">
              {isSubmitting ? "Agendando..." : "Confirmar Agendamento"}
              <Check className="ml-1 h-4 w-4" />
            </Button>
          )}
        </div>
      </form>
    </div>
  );
}

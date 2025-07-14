import { useState, useEffect, useMemo, useRef } from "react";
import { Calendar, Clock, ChevronLeft, ChevronRight } from "lucide-react";
import axios from "axios";
import { API_BASE_URL } from "@/config/BackendUrl";
import { useHolidays } from "@/hooks/useHolidays";
import { Spinner } from "../ui/spinnerLoading";
import { AnimatePresence, motion } from "framer-motion";
import { toast } from "sonner";
import apiClient from "@/services/api";

const sectionAnimation = {
  initial: { opacity: 0, x: 50 }, // Começa invisível e 50px à direita
  animate: { opacity: 1, x: 0 }, // Anima para visível e na posição original
  exit: { opacity: 0, x: -50 }, // Anima para invisível e 50px à esquerda ao sair
  transition: { duration: 0.3, ease: "easeInOut" },
};

interface TimeSlot {
  time: string;
  isBooked: boolean;
}

interface ApiResponse {
  isHoliday: boolean;
  holidayName?: string;
  slots: TimeSlot[];
}

interface DateTimeSelectionProps {
  formData: {
    date: string;
    time: string;
    [key: string]: string;
  };
  updateFormData: (data: Partial<{ date: string; time: string }>) => void;
  barbershopId: string | undefined;
  selectedBarber: string | undefined;
  selectedServiceId: string | undefined;
}

export default function DateTimeSelection({
  formData,
  updateFormData,
  barbershopId,
  selectedBarber,
  selectedServiceId,
}: DateTimeSelectionProps) {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [timeSlots, setTimeSlots] = useState<TimeSlot[]>([]);
  const [loadingTimes, setLoadingTimes] = useState(false);
  const [holidayMessage, setHolidayMessage] = useState<string | null>(null);
  const [scrollIntent, setScrollIntent] = useState(false);

  const [fullyBookedDays, setFullyBookedDays] = useState<Set<string>>(
    new Set()
  );

  const { isHoliday, getHolidayName } = useHolidays();

  const timeSlotsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Esta função só executa se NENHUMA data já estiver selecionada
    if (!formData.date) {
      const today = new Date();

      // Formata a data de hoje para "YYYY-MM-DD"
      const year = today.getFullYear();
      const month = String(today.getMonth() + 1).padStart(2, "0");
      const day = String(today.getDate()).padStart(2, "0");
      const todayDateString = `${year}-${month}-${day}`;

      // Verifica se hoje não é um feriado e nem um dia no passado (o que não seria, mas é uma boa prática)
      const dayNumber = today.getDate();
      if (!isDayHoliday(dayNumber) && !isDateInPast(dayNumber)) {
        // Se hoje for um dia válido, atualiza o formulário com a data de hoje
        updateFormData({ date: todayDateString });
      }
    }
  }, []);

  useEffect(() => {
    const fetchTimeSlots = async () => {
      if (formData.date && selectedBarber && barbershopId) {
        setLoadingTimes(true);
        setTimeSlots([]);
        setHolidayMessage(null);

        try {
          const response = await axios.get(
            `${API_BASE_URL}/barbershops/${barbershopId}/barbers/${selectedBarber}/free-slots`,
            {
              params: { date: formData.date, serviceId: selectedServiceId },
            }
          );

          const data: ApiResponse = response.data;

          if (data.isHoliday) {
            setHolidayMessage(`Esta data é feriado: ${data.holidayName}`);
            setTimeSlots([]);
          } else {
            setTimeSlots(data.slots || response.data); // Compatibilidade com resposta antiga
          }
        } catch (error) {
          console.error("Erro ao buscar horários:", error);
        } finally {
          setLoadingTimes(false);
        }
      } else {
        setTimeSlots([]);
        setHolidayMessage(null);
      }
    };
    fetchTimeSlots();
  }, [formData.date, selectedBarber, barbershopId, selectedServiceId]);

  useEffect(() => {
    // Só busca se tivermos as informações necessárias
    if (!barbershopId || !selectedBarber || !selectedServiceId) {
      return;
    }

    const fetchMonthlyAvailability = async () => {
      try {
        const response = await apiClient.get(
          `/barbershops/${barbershopId}/bookings/${selectedBarber}/monthly-availability`,
          {
            params: {
              year: currentMonth.getFullYear(),
              month: currentMonth.getMonth() + 1,
              serviceId: selectedServiceId,
            },
          }
        );
        setFullyBookedDays(new Set(response.data.unavailableDays));
      } catch (error) {
        console.error("Erro ao buscar disponibilidade do mês", error);
        toast.error("Não foi possível verificar a disponibilidade do mês.");
      }
    };

    fetchMonthlyAvailability();
    // Depende dessas variáveis para refazer a busca quando o mês, barbeiro ou serviço mudar
  }, [currentMonth, selectedBarber, selectedServiceId, barbershopId]);

  const isDayFullyBooked = (day: number) => {
    const dateString = `${year}-${String(month + 1).padStart(2, "0")}-${String(
      day
    ).padStart(2, "0")}`;
    return fullyBookedDays.has(dateString);
  };

  useEffect(() => {
    // A condição para rolar continua a mesma: intenção do usuário + dados carregados
    setTimeout(() => {
      if (scrollIntent && !loadingTimes) {
        const targetElement = timeSlotsRef.current;

        if (targetElement) {
          const elementPosition =
            targetElement.getBoundingClientRect().top + window.scrollY;

          const offset = 390;

          window.scrollTo({
            top: elementPosition - offset,
            behavior: "smooth",
          });
        }

        setScrollIntent(false);
      }
    });
  }, [loadingTimes, scrollIntent]);

  const filteredAndVisibleSlots = useMemo(() => {
    const today = new Date();
    const todayString = `${today.getFullYear()}-${String(
      today.getMonth() + 1
    ).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;

    if (formData.date !== todayString) {
      return timeSlots;
    }

    const currentHour = today.getHours();
    const currentMinute = today.getMinutes();
    const currentTimeInMinutes = currentHour * 60 + currentMinute;

    return timeSlots.filter((slot) => {
      const [slotHour, slotMinute] = slot.time.split(":").map(Number);
      const slotTimeInMinutes = slotHour * 60 + slotMinute;
      return slotTimeInMinutes > currentTimeInMinutes;
    });
  }, [timeSlots, formData.date]);

  const getDaysInMonth = (year: number, month: number) =>
    new Date(year, month + 1, 0).getDate();
  const getFirstDayOfMonth = (year: number, month: number) =>
    new Date(year, month, 1).getDay();

  const year = currentMonth.getFullYear();
  const month = currentMonth.getMonth();
  const daysInMonth = getDaysInMonth(year, month);
  const firstDayOfMonth = getFirstDayOfMonth(year, month);
  const monthNames = [
    "Janeiro",
    "Fevereiro",
    "Março",
    "Abril",
    "Maio",
    "Junho",
    "Julho",
    "Agosto",
    "Setembro",
    "Outubro",
    "Novembro",
    "Dezembro",
  ];
  const days = Array(firstDayOfMonth)
    .fill(null)
    .concat(Array.from({ length: daysInMonth }, (_, i) => i + 1));

  const handlePrevMonth = () => setCurrentMonth(new Date(year, month - 1, 1));
  const handleNextMonth = () => setCurrentMonth(new Date(year, month + 1, 1));

  const handleDateSelect = (day: number) => {
    const selectedDate = `${year}-${String(month + 1).padStart(
      2,
      "0"
    )}-${String(day).padStart(2, "0")}`;

    // if (isHoliday(selectedDate)) {
    //   const holidayName = getHolidayName(selectedDate);
    //   alert(`Esta data é feriado (${holidayName}) e não está disponível para agendamento.`);
    //   return;
    // }

    updateFormData({ date: selectedDate, time: "" });
    setScrollIntent(true);
  };

  const isDateInPast = (day: number) => {
    const today = new Date();
    const selectedDate = new Date(year, month, day);
    return (
      selectedDate <
      new Date(today.getFullYear(), today.getMonth(), today.getDate())
    );
  };

  const isDayHoliday = (day: number) => {
    const dateString = `${year}-${String(month + 1).padStart(2, "0")}-${String(
      day
    ).padStart(2, "0")}`;
    return isHoliday(dateString);
  };

  return (
    <AnimatePresence mode="wait">
      <motion.div
        className="space-y-4 md:space-y-6"
        initial={sectionAnimation.initial}
        animate={sectionAnimation.animate}
        exit={sectionAnimation.exit}
        // transition={sectionAnimation.transition}
      >
        <div>
          <h2 className="text-2xl font-semibold text-gray-900 text-center">
            Escolha a Data e Hora
          </h2>
        </div>

        <div className="lg:flex gap-8 md:min-h-[450px]">
          <div className="space-y-4 lg:w-full">
            <div className="flex items-center justify-between">
              <label className="flex items-center text-base font-medium text-gray-700">
                <Calendar className="mr-2 h-4 w-4" />
                Selecione a Data
              </label>
              <div className="flex items-center space-x-2">
                <button
                  type="button"
                  onClick={handlePrevMonth}
                  className="rounded-md p-1 text-gray-500 hover:bg-gray-100 cursor-pointer"
                >
                  <ChevronLeft className="h-7 w-7" />
                </button>
                <span className="text-base font-medium">
                  {monthNames[month]} {year}
                </span>
                <button
                  type="button"
                  onClick={handleNextMonth}
                  className="rounded-md p-1 text-gray-500 hover:bg-gray-100 cursor-pointer"
                >
                  <ChevronRight className="h-7 w-7" />
                </button>
              </div>
            </div>

            <div className="overflow-hidden rounded-lg border border-gray-200">
              <div className="grid grid-cols-7 bg-gray-50 text-center">
                {["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"].map(
                  (day) => (
                    <div
                      key={day}
                      className="py-2 text-xs font-medium text-gray-500"
                    >
                      {day}
                    </div>
                  )
                )}
              </div>
              <div className="grid grid-cols-7 gap-px bg-gray-200">
                {days.map((day, index) => (
                  <div
                    key={index}
                    className={`bg-white p-2 ${
                      !day ? "cursor-default" : "cursor-pointer"
                    }`}
                  >
                    {day && (
                      <button
                        type="button"
                        disabled={
                          isDateInPast(day) ||
                          isDayHoliday(day) ||
                          isDayFullyBooked(day)
                        }
                        onClick={() => handleDateSelect(day)}
                        className={`
        mx-auto flex h-8 w-8 items-center justify-center rounded-full text-sm relative transition-colors
        ${
          // 1. Estilo para dias que já passaram: Riscado e cinza
          isDayFullyBooked(day)
            ? "text-gray-400 cursor-not-allowed line-through"
            : isDateInPast(day)
            ? "text-gray-400 cursor-not-allowed line-through decoration-2"
            : // 2. Estilo para feriados: Fundo vermelho claro e texto vermelho
            isDayHoliday(day)
            ? "bg-red-100 text-red-500 font-semibold cursor-not-allowed"
            : // 3. Estilo para o dia atualmente selecionado
            formData.date ===
              `${year}-${String(month + 1).padStart(2, "0")}-${String(
                day
              ).padStart(2, "0")}`
            ? "bg-[var(--loja-theme-color)] text-white"
            : // 4. Estilo padrão para dias disponíveis
              "hover:bg-[var(--loja-theme-color)]/30 cursor-pointer"
        }
    `}
                        title={
                          isDayFullyBooked(day)
                            ? "Horários esgotados para este dia"
                            : isDateInPast(day)
                            ? "Data indisponível"
                            : isDayHoliday(day)
                            ? `Feriado: ${getHolidayName(
                                `${year}-${String(month + 1).padStart(
                                  2,
                                  "0"
                                )}-${String(day).padStart(2, "0")}`
                              )}`
                            : undefined
                        }
                      >
                        {day}

                        {/* Mantemos o ponto vermelho como um indicador extra apenas para feriados */}
                        {isDayHoliday(day) && !isDateInPast(day) && (
                          <div className="absolute -top-1 -right-1 w-2 h-2 bg-red-500 rounded-full"></div>
                        )}
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div ref={timeSlotsRef} className="space-y-4 lg:mt-0 lg:w-full mt-4">
            <label className="flex items-center text-sm md:text-base font-medium text-gray-700">
              <Clock className="mr-2 h-4 w-4" />
              Selecione o Horário
            </label>

            {!selectedBarber && (
              <p className="text-xs text-[var(--loja-theme-color)]">
                Por favor, selecione um barbeiro na etapa anterior.
              </p>
            )}
            {!formData.date && selectedBarber && (
              <p className="text-sm text-gray-500 md:text-base">
                Por favor, selecione uma data primeiro.
              </p>
            )}

            {holidayMessage && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-md">
                <p className="text-sm text-red-700 font-medium">
                  🎉 {holidayMessage}
                </p>
                <p className="text-xs text-red-600 mt-1">
                  Escolha outra data para continuar com o agendamento.
                </p>
              </div>
            )}

            <div
              className={`flex min-h-[180px] items-baseline justify-center w-full ${
                filteredAndVisibleSlots.length === 0 && "min-h-auto"
              }`}
            >
              {loadingTimes ? (
                <Spinner />
              ) : (
                <motion.div
                  className="grid grid-cols-4 gap-2 sm:grid-cols-4 w-full"
                  key="slots"
                  // variants={containerVariants}
                  initial="hidden"
                  animate="visible"
                >
                  {filteredAndVisibleSlots.length > 0
                    ? filteredAndVisibleSlots.map((slot) => (
                        <button
                          key={slot.time}
                          type="button"
                          disabled={slot.isBooked}
                          onClick={() => updateFormData({ time: slot.time })}
                          className={`rounded-md border p-2 text-center text-sm transition-colors cursor-pointer ${
                            formData.time === slot.time && !slot.isBooked
                              ? "border-[var(--loja-theme-color)] bg-[var(--loja-theme-color)]/10 text-[var(--loja-theme-color)] font-semibold"
                              : slot.isBooked
                              ? "cursor-not-allowed border-gray-200 bg-gray-100 text-gray-400 line-through"
                              : "border-gray-200 hover:border-[var(--loja-theme-color)] hover:bg-[var(--loja-theme-color)]/20"
                          }`}
                        >
                          {slot.time}
                        </button>
                      ))
                    : formData.date &&
                      !holidayMessage && (
                        <p className="col-span-full text-sm text-gray-500">
                          Nenhum horário disponível para este dia.
                        </p>
                      )}
                </motion.div>
              )}
            </div>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}

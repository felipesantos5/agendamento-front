import { useEffect, useMemo, useState } from "react";
import { useCustomerAuth } from "@/contexts/CustomerAuthContext";
import apiClient from "@/services/api";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import { format, isPast } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  Calendar,
  Clock,
  Home,
  Loader2,
  LogOut,
  Scissors,
  User,
} from "lucide-react";
import { Link, useNavigate } from "react-router-dom";

// Supondo uma tipagem para o agendamento populado
interface PopulatedBooking {
  _id: string;
  barbershop: { _id: string; name: string; slug: string; logoUrl: string };
  barber: { name: string };
  service: { name: string; price: number };
  time: string;
  status: "booked" | "confirmed" | "completed" | "canceled";
}

export function MyBookingsPage() {
  const { customer, logout } = useCustomerAuth();
  const navigate = useNavigate();
  const [bookings, setBookings] = useState<PopulatedBooking[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Função para buscar os agendamentos
  const fetchBookings = async () => {
    try {
      const response = await apiClient.get<PopulatedBooking[]>(
        "/api/auth/customer/me/bookings"
      );
      setBookings(response.data);
    } catch (error) {
      console.error("Erro ao buscar agendamentos:", error);
      toast.error("Não foi possível carregar seus agendamentos.");
    } finally {
      setIsLoading(false);
    }
  };

  console.log(`bookings`, bookings);

  useEffect(() => {
    fetchBookings();
  }, []);

  // Separa os agendamentos em "próximos" e "passados"
  const { upcomingBookings, pastBookings } = useMemo(() => {
    const upcoming = bookings.filter((b) => !isPast(new Date(b.time)));
    const past = bookings.filter((b) => isPast(new Date(b.time)));
    return { upcomingBookings: upcoming, pastBookings: past };
  }, [bookings]);

  // Paginação para o histórico
  const [historyPage, setHistoryPage] = useState(1);
  const historyPerPage = 5;
  const totalHistoryPages = Math.ceil(pastBookings.length / historyPerPage);
  const paginatedPastBookings = pastBookings.slice(
    (historyPage - 1) * historyPerPage,
    historyPage * historyPerPage
  );

  // Função para cancelar um agendamento
  const handleCancelBooking = async (booking: PopulatedBooking) => {
    try {
      await apiClient.put(
        `/barbershops/${booking.barbershop._id}/bookings/${booking._id}/cancel`
      );
      toast.success("Agendamento cancelado com sucesso!");
      // Atualiza a lista localmente para refletir a mudança instantaneamente
      setBookings((prev) =>
        prev.map((b) =>
          b._id === booking._id ? { ...b, status: "canceled" } : b
        )
      );
    } catch (error) {
      toast.error("Ocorreu um erro ao cancelar o agendamento.");
    }
  };

  const handleLogout = () => {
    logout();
    navigate("/entrar");
    toast.info("Você foi desconectado.");
  };

  const getStatusInfo = (
    status: PopulatedBooking["status"],
    isHistory = false
  ) => {
    if (isHistory && (status === "booked" || status === "confirmed")) {
      return { text: "Realizado", className: "bg-blue-100 text-blue-800" };
    }
    switch (status) {
      case "completed":
        return { text: "Concluído", className: "bg-green-100 text-green-800" };
      case "canceled":
        return { text: "Cancelado", className: "bg-red-100 text-red-800" };
      default:
        return { text: "Agendado", className: "bg-blue-100 text-blue-800" };
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-[var(--loja-theme-color)]" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 dark:bg-gray-900 text-gray-800 dark:text-gray-200">
      <div className="max-w-3xl mx-auto p-4 md:p-6 space-y-10">
        {/* --- NOVO HEADER --- */}
        <header className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl md:text-4xl font-bold">
              Meus Agendamentos
            </h1>
            <p className="text-muted-foreground">
              Olá, {customer?.name?.split(" ")[0]}!
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate(-1)}
              className="text-sm font-semibold hover:underline cursor-pointer"
            >
              ← Voltar
            </Button>
            <Button variant="ghost" size="icon" onClick={handleLogout}>
              <LogOut className="h-5 w-5" />
              <span className="sr-only">Sair</span>
            </Button>
          </div>
        </header>

        {/* --- SEÇÃO DE PRÓXIMOS AGENDAMENTOS COM NOVO CARD --- */}
        <section>
          <h2 className="text-2xl font-semibold mb-4 border-b pb-2">
            Próximos
          </h2>
          {upcomingBookings.length > 0 ? (
            <div className="space-y-6">
              {upcomingBookings.map((booking) => {
                const statusInfo = getStatusInfo(booking.status);
                const canBeCancelled =
                  booking.status === "booked" || booking.status === "confirmed";
                return (
                  <Card
                    key={booking._id}
                    className="bg-white dark:bg-gray-800 shadow-md transition-all hover:shadow-lg gap-0 group-hover:ring-2 group-hover:ring-blue-200 cursor-pointer"
                    onClick={(e) => {
                      if ((e.target as HTMLElement).closest("button")) return;
                      navigate(`/${booking.barbershop.slug}`);
                    }}
                  >
                    <CardHeader className="p-4 sm:p-6">
                      <div className="flex justify-between items-start gap-4">
                        <div className="flex items-center gap-2">
                          <img
                            src={booking.barbershop.logoUrl}
                            alt="logo barbearia"
                            className="w-24"
                          />
                          <CardTitle className="text-xl md:text-2xl group-hover:underline">
                            {booking.barbershop.name}
                          </CardTitle>
                        </div>
                        <Badge className={`${statusInfo.className} border`}>
                          {statusInfo.text}
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent className="p-4 sm:p-6 space-y-4 text-sm sm:text-base">
                      <div className="flex items-center gap-3">
                        <Scissors className="h-5 w-5 text-muted-foreground" />
                        <span className="font-semibold">
                          {booking.service.name}
                        </span>
                      </div>
                      <div className="flex items-center gap-3">
                        <User className="h-5 w-5 text-muted-foreground" />
                        <span>
                          com <strong>{booking.barber.name}</strong>
                        </span>
                      </div>
                      <div className="flex items-center gap-3">
                        <Calendar className="h-5 w-5 text-muted-foreground" />
                        <span>
                          {format(
                            new Date(booking.time),
                            "EEEE, dd 'de' MMMM",
                            { locale: ptBR }
                          )}
                        </span>
                      </div>
                      <div className="flex items-center gap-3">
                        <Clock className="h-5 w-5 text-muted-foreground" />
                        <span>
                          às{" "}
                          <strong>
                            {format(new Date(booking.time), "HH:mm")}h
                          </strong>
                        </span>
                      </div>
                    </CardContent>
                    {canBeCancelled && (
                      <CardFooter className="p-4 sm:p-6 bg-gray-50 dark:bg-gray-800/50 border-t">
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button
                              variant="destructive"
                              className="w-full sm:w-auto"
                            >
                              Cancelar Agendamento
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>
                                Você tem certeza?
                              </AlertDialogTitle>
                              <AlertDialogDescription>
                                Esta ação irá cancelar o seu agendamento para o
                                serviço de{" "}
                                <strong>{booking.service.name}</strong> no dia{" "}
                                <strong>
                                  {format(
                                    new Date(booking.time),
                                    "dd/MM/yyyy 'às' HH:mm",
                                    { locale: ptBR }
                                  )}
                                </strong>
                                .
                                <br />
                                <br />
                                Esta ação não pode ser desfeita.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>
                                Manter Agendamento
                              </AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() => handleCancelBooking(booking)}
                                className="bg-destructive text-destructive-foreground hover:bg-destructive/90 text-white"
                              >
                                Sim, Cancelar
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </CardFooter>
                    )}
                  </Card>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-10 px-4 border-2 border-dashed rounded-lg">
              <Home className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-semibold">
                Nenhum agendamento futuro
              </h3>
              <p className="mt-1 text-sm text-gray-500">
                Que tal marcar um novo horário?
              </p>
            </div>
          )}
        </section>

        {/* --- SEÇÃO DE HISTÓRICO COM NOVO CARD --- */}
        <section>
          <h2 className="text-2xl font-semibold mb-4 border-b pb-2">
            Histórico
          </h2>
          {pastBookings.length > 0 ? (
            <>
              <div className="space-y-4">
                {paginatedPastBookings.map((booking) => {
                  const statusInfo = getStatusInfo(booking.status, true);
                  return (
                    <Card
                      key={booking._id}
                      className="bg-white dark:bg-gray-800 shadow-md transition-all hover:shadow-lg gap-0 group-hover:ring-2 group-hover:ring-blue-200 cursor-pointer"
                      onClick={(e) => {
                        if ((e.target as HTMLElement).closest("button")) return;
                        navigate(`/${booking.barbershop.slug}`);
                      }}
                    >
                      <CardHeader className="p-4 sm:p-6">
                        <div className="flex justify-between items-start gap-4">
                          <div className="flex items-center gap-2">
                            <img
                              src={booking.barbershop.logoUrl}
                              alt="logo barbearia"
                              className="w-24"
                            />
                            <CardTitle className="text-xl md:text-2xl group-hover:underline">
                              {booking.barbershop.name}
                            </CardTitle>
                          </div>
                          <Badge className={`${statusInfo.className} border`}>
                            {statusInfo.text}
                          </Badge>
                        </div>
                      </CardHeader>
                      <CardContent className="p-4 sm:p-6 space-y-4 text-sm sm:text-base">
                        <div className="flex items-center gap-3">
                          <Scissors className="h-5 w-5 text-muted-foreground" />
                          <span className="font-semibold">
                            {booking.service.name}
                          </span>
                        </div>
                        <div className="flex items-center gap-3">
                          <User className="h-5 w-5 text-muted-foreground" />
                          <span>
                            com <strong>{booking.barber.name}</strong>
                          </span>
                        </div>
                        <div className="flex items-center gap-3">
                          <Calendar className="h-5 w-5 text-muted-foreground" />
                          <span>
                            {format(
                              new Date(booking.time),
                              "EEEE, dd 'de' MMMM",
                              { locale: ptBR }
                            )}
                          </span>
                        </div>
                        <div className="flex items-center gap-3">
                          <Clock className="h-5 w-5 text-muted-foreground" />
                          <span>
                            às{" "}
                            <strong>
                              {format(new Date(booking.time), "HH:mm")}h
                            </strong>
                          </span>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
              {/* Paginação */}
              {totalHistoryPages > 1 && (
                <div className="flex justify-center items-center gap-2 mt-6">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setHistoryPage((p) => Math.max(1, p - 1))}
                    disabled={historyPage === 1}
                  >
                    Anterior
                  </Button>
                  <span className="mx-2 text-sm">
                    Página {historyPage} de {totalHistoryPages}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      setHistoryPage((p) => Math.min(totalHistoryPages, p + 1))
                    }
                    disabled={historyPage === totalHistoryPages}
                  >
                    Próxima
                  </Button>
                </div>
              )}
            </>
          ) : (
            <p className="text-sm text-muted-foreground">
              Você ainda não possui histórico de agendamentos.
            </p>
          )}
        </section>
      </div>
    </div>
  );
}

import { useEffect, useMemo, useState } from "react";
import { useCustomerAuth } from "@/contexts/CustomerAuthContext";
import apiClient from "@/services/api";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
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
import { Calendar, Clock, Home, Loader2, LogOut, Scissors, Store, User } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";

// Supondo uma tipagem para o agendamento populado
interface PopulatedBooking {
  _id: string;
  barbershop: { _id: string; name: string; slug: string };
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
      const response = await apiClient.get<PopulatedBooking[]>("/api/auth/customer/me/bookings");
      console.log(`response`, response.data);
      setBookings(response.data);
    } catch (error) {
      console.error("Erro ao buscar agendamentos:", error);
      toast.error("Não foi possível carregar seus agendamentos.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchBookings();
  }, []);

  // Separa os agendamentos em "próximos" e "passados"
  const { upcomingBookings, pastBookings } = useMemo(() => {
    const upcoming = bookings.filter((b) => !isPast(new Date(b.time)));
    const past = bookings.filter((b) => isPast(new Date(b.time)));
    return { upcomingBookings: upcoming, pastBookings: past };
  }, [bookings]);

  // Função para cancelar um agendamento
  const handleCancelBooking = async (booking: PopulatedBooking) => {
    try {
      await apiClient.put(`/barbershops/${booking.barbershop._id}/bookings/${booking._id}/cancel`);
      toast.success("Agendamento cancelado com sucesso!");
      // Atualiza a lista localmente para refletir a mudança instantaneamente
      setBookings((prev) => prev.map((b) => (b._id === booking._id ? { ...b, status: "canceled" } : b)));
    } catch (error) {
      toast.error("Ocorreu um erro ao cancelar o agendamento.");
    }
  };

  const handleLogout = () => {
    logout();
    navigate("/entrar");
    toast.info("Você foi desconectado.");
  };

  const getStatusInfo = (status: PopulatedBooking["status"]) => {
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
            <h1 className="text-3xl md:text-4xl font-bold">Meus Agendamentos</h1>
            <p className="text-muted-foreground">Olá, {customer?.name?.split(" ")[0]}!</p>
          </div>
          <Button variant="ghost" size="icon" onClick={handleLogout}>
            <LogOut className="h-5 w-5" />
            <span className="sr-only">Sair</span>
          </Button>
        </header>

        {/* --- SEÇÃO DE PRÓXIMOS AGENDAMENTOS COM NOVO CARD --- */}
        <section>
          <h2 className="text-2xl font-semibold mb-4 border-b pb-2">Próximos</h2>
          {upcomingBookings.length > 0 ? (
            <div className="space-y-6">
              {upcomingBookings.map((booking) => {
                const statusInfo = getStatusInfo(booking.status);
                const canBeCancelled = booking.status === "booked" || booking.status === "confirmed";
                return (
                  <Card key={booking._id} className="bg-white dark:bg-gray-800 shadow-md transition-all hover:shadow-lg">
                    <CardHeader className="p-4 sm:p-6">
                      <div className="flex justify-between items-start gap-4">
                        {/* Link para a página da barbearia */}
                        <Link to={`/${booking.barbershop.slug}`} className="flex items-center gap-2 group">
                          <Store className="h-5 w-5 text-muted-foreground group-hover:text-[var(--loja-theme-color)]" />
                          <CardTitle className="text-xl md:text-2xl group-hover:underline">{booking.barbershop.name}</CardTitle>
                        </Link>
                        <Badge className={`${statusInfo.className} border`}>{statusInfo.text}</Badge>
                      </div>
                    </CardHeader>
                    <CardContent className="p-4 sm:p-6 space-y-4 text-sm sm:text-base">
                      <div className="flex items-center gap-3">
                        <Scissors className="h-5 w-5 text-muted-foreground" />
                        <span className="font-semibold">{booking.service.name}</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <User className="h-5 w-5 text-muted-foreground" />
                        <span>
                          com <strong>{booking.barber.name}</strong>
                        </span>
                      </div>
                      <div className="flex items-center gap-3">
                        <Calendar className="h-5 w-5 text-muted-foreground" />
                        <span>{format(new Date(booking.time), "EEEE, dd 'de' MMMM", { locale: ptBR })}</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <Clock className="h-5 w-5 text-muted-foreground" />
                        <span>
                          às <strong>{format(new Date(booking.time), "HH:mm")}h</strong>
                        </span>
                      </div>
                    </CardContent>
                    {canBeCancelled && (
                      <CardFooter className="p-4 sm:p-6 bg-gray-50 dark:bg-gray-800/50 border-t">
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="destructive" className="w-full sm:w-auto">
                              Cancelar Agendamento
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>{/* ... seu AlertDialogContent ... */}</AlertDialogContent>
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
              <h3 className="mt-2 text-sm font-semibold">Nenhum agendamento futuro</h3>
              <p className="mt-1 text-sm text-gray-500">Que tal marcar um novo horário?</p>
            </div>
          )}
        </section>

        {/* --- SEÇÃO DE HISTÓRICO COM NOVO CARD --- */}
        <section>
          <h2 className="text-2xl font-semibold mb-4 border-b pb-2">Histórico</h2>
          {pastBookings.length > 0 ? (
            <div className="space-y-4">
              {pastBookings.map((booking) => {
                const statusInfo = getStatusInfo(booking.status);
                return (
                  <Card key={booking._id} className="bg-white/70 dark:bg-gray-800/70 opacity-80">
                    <CardHeader className="p-4">
                      <div className="flex justify-between items-center">
                        <div>
                          <p className="font-bold">{booking.service.name}</p>
                          <p className="text-sm text-muted-foreground">{booking.barbershop.name}</p>
                        </div>
                        <Badge className={`${statusInfo.className} border`}>{statusInfo.text}</Badge>
                      </div>
                    </CardHeader>
                    <CardFooter className="p-4 border-t">
                      <p className="text-xs text-muted-foreground">{format(new Date(booking.time), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}</p>
                    </CardFooter>
                  </Card>
                );
              })}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">Você ainda não possui histórico de agendamentos.</p>
          )}
        </section>
      </div>
    </div>
  );
}

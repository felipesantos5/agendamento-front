import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import apiClient from "@/services/api";
import { toast } from "sonner";
import { useCustomerAuth } from "@/contexts/CustomerAuthContext";

// Imports de UI
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Star, Loader2 } from "lucide-react";

// Tipagem para uma avaliação recebida da API
interface Review {
  _id: string;
  rating: number;
  comment?: string;
  customer: { name: string };
  createdAt: string;
}

// Componente para renderizar as estrelas de forma visual
const StarRating = ({ rating, setRating, interactive = false }: { rating: number; setRating?: (r: number) => void; interactive?: boolean }) => (
  <div className="flex gap-1 text-yellow-400">
    {[...Array(5)].map((_, i) => {
      const ratingValue = i + 1;
      return (
        <Star
          key={i}
          size={interactive ? 32 : 20}
          className={`
            ${interactive ? "cursor-pointer" : ""}
            ${ratingValue <= rating ? "fill-current" : "text-gray-300"}
          `}
          onClick={() => interactive && setRating?.(ratingValue)}
        />
      );
    })}
  </div>
);

// Prop para receber o ID da barbearia da página principal `Loja`
interface ReviewsPaneProps {
  barbershopId: string;
}

export function ReviewsPane({ barbershopId }: ReviewsPaneProps) {
  const { isAuthenticated } = useCustomerAuth(); // Verifica se o cliente está logado

  const [reviews, setReviews] = useState<Review[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Estados para o formulário de nova avaliação
  const [myRating, setMyRating] = useState(5);
  const [myComment, setMyComment] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchReviews = async () => {
    if (!barbershopId) return;
    try {
      setIsLoading(true);
      const response = await apiClient.get(`api/barbershops/${barbershopId}/reviews`);
      setReviews(response.data);
    } catch (error) {
      toast.error("Erro ao buscar avaliações.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchReviews();
  }, [barbershopId]);

  const handleSubmitReview = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      // Faz a chamada POST para a rota que ajustamos
      await apiClient.post(`api/barbershops/${barbershopId}/reviews`, {
        rating: myRating,
        comment: myComment,
      });

      toast.success("Obrigado pela sua avaliação!");
      // Limpa o formulário e recarrega a lista
      setMyComment("");
      setMyRating(5);
      fetchReviews();
    } catch (error) {
      toast.error("Ocorreu um erro ao enviar sua avaliação.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center p-10">
        <Loader2 className="animate-spin" />
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 space-y-8">
      <div className="space-y-4">
        {reviews.map((review) => (
          <Card key={review._id} className="gap-2 py-3">
            <CardHeader className="gap-0 px-3">
              <div className="flex justify-between items-center">
                <span className="font-semibold">{review.customer.name}</span>
                <StarRating rating={review.rating} />
              </div>
              <CardDescription>{new Date(review.createdAt).toLocaleDateString("pt-BR")}</CardDescription>
            </CardHeader>
            {review.comment && (
              <CardContent className="px-3">
                <p className="text-muted-foreground italic">"{review.comment}"</p>
              </CardContent>
            )}
          </Card>
        ))}
      </div>

      {/* Formulário para Nova Avaliação (só para usuários logados) */}
      {isAuthenticated ? (
        <div>
          <CardTitle className="mb-4">Deixe sua avaliação</CardTitle>
          <div>
            <form onSubmit={handleSubmitReview} className="space-y-4">
              <div className="flex flex-col">
                <StarRating rating={myRating} setRating={setMyRating} interactive />
              </div>
              <div>
                <Label htmlFor="comment">Seu comentário (opcional)</Label>
                <Textarea
                  id="comment"
                  value={myComment}
                  onChange={(e) => setMyComment(e.target.value)}
                  placeholder="Conte como foi sua experiência..."
                  className="mt-1"
                />
              </div>
              <Button type="submit" disabled={isSubmitting} className="w-full">
                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Enviar Avaliação
              </Button>
            </form>
          </div>
        </div>
      ) : (
        <div className="text-center p-4 border-2 border-dashed rounded-lg">
          <p className="text-muted-foreground">
            <Link to="/entrar" className="font-bold text-[var(--loja-theme-color)] underline">
              Faça seu login
            </Link>{" "}
            para deixar uma avaliação.
          </p>
        </div>
      )}
    </div>
  );
}

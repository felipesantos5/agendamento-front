import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import { toast } from "sonner";
import apiClient from "@/services/api";
import { API_BASE_URL } from "@/config/BackendUrl";
import { useCustomerAuth } from "@/contexts/CustomerAuthContext";
import { Loader2 } from "lucide-react";

export function CustomerLoginPage() {
  const [step, setStep] = useState<"enterPhone" | "enterOtp">("enterPhone");
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const { login } = useCustomerAuth();
  const navigate = useNavigate();

  const handleRequestOtp = async () => {
    if (phone.length < 10) {
      toast.error("Por favor, insira um número de telefone válido com DDD.");
      return;
    }
    setIsLoading(true);
    try {
      await apiClient.post(`${API_BASE_URL}/api/auth/customer/request-otp`, { phone });
      toast.success("Código enviado!", { description: "Verifique seu WhatsApp e insira o código abaixo." });
      setStep("enterOtp");
    } catch (error: any) {
      toast.error(error.response?.data?.error || "Falha ao enviar o código.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyOtp = async () => {
    if (otp.length < 6) {
      toast.error("O código deve ter 6 dígitos.");
      return;
    }
    setIsLoading(true);
    try {
      const response = await apiClient.post(`${API_BASE_URL}/api/auth/customer/verify-otp`, { phone, otp });
      const { token, customer } = response.data;

      login(token, customer); // Salva o token e dados no contexto
      toast.success(`Bem-vindo de volta, ${customer.name}!`);

      // Redireciona para a página de "Minha Conta" ou para o início
      navigate("/meus-agendamentos");
    } catch (error: any) {
      toast.error(error.response?.data?.error || "Falha ao verificar o código.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-100 p-4">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle className="text-2xl">Acessar ou Criar Conta</CardTitle>
          <CardDescription>
            {step === "enterPhone" ? "Use seu número de WhatsApp para acessar seu histórico e agendar." : "Enviamos um código para seu WhatsApp."}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {step === "enterPhone" && (
            <div className="space-y-2">
              <Label htmlFor="phone">Nº de WhatsApp com DDD</Label>
              <Input
                id="phone"
                type="tel"
                placeholder="(48) 99999-9999"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                disabled={isLoading}
              />
            </div>
          )}

          {step === "enterOtp" && (
            <div className="space-y-4 flex flex-col items-center">
              <Label htmlFor="otp">Digite o código de 6 dígitos</Label>
              <InputOTP maxLength={6} value={otp} onChange={setOtp}>
                <InputOTPGroup>
                  <InputOTPSlot index={0} />
                  <InputOTPSlot index={1} />
                  <InputOTPSlot index={2} />
                  <InputOTPSlot index={3} />
                  <InputOTPSlot index={4} />
                  <InputOTPSlot index={5} />
                </InputOTPGroup>
              </InputOTP>
              <Button type="button" variant="link" size="sm" className="p-0 h-auto" onClick={() => setStep("enterPhone")}>
                Usar outro número?
              </Button>
            </div>
          )}

          <Button type="button" className="w-full" disabled={isLoading} onClick={step === "enterPhone" ? handleRequestOtp : handleVerifyOtp}>
            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {step === "enterPhone" ? "Enviar Código" : "Confirmar e Entrar"}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

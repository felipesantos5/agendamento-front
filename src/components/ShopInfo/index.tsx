import { MapPin, Instagram } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Barbershop, Availability } from "@/types/barberShop"; // Importando suas tipagens

// Ícone do WhatsApp
const WhatsAppIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" className="fill-[var(--loja-theme-color)]">
    <path d="M12.01,2C6.5,2,2.02,6.48,2.02,11.99c0,1.76,0.46,3.48,1.34,4.99l-1.36,4.99l5.1-1.34c1.45,0.8,3.09,1.23,4.79,1.23h0.01c5.5,0,9.98-4.48,9.98-9.99c0-5.52-4.48-9.99-9.98-9.99z M12.01,4c4.42,0,8,3.58,8,8c0,4.42-3.58,8-8,8c-1.55,0-3.04-0.44-4.33-1.25l-0.35-0.21l-3.1,0.81l0.83-3.03l-0.23-0.36c-0.86-1.32-1.32-2.86-1.32-4.43C4.02,7.58,7.59,4,12.01,4z M8.48,7.38c-0.17,0-0.33,0.05-0.46,0.18c-0.13,0.13-0.54,0.54-0.54,1.51c0,0.97,0.55,1.91,0.63,2.02c0.08,0.11,1.58,2.5,3.78,3.35c1.8,0.7,2.2,0.6,2.6,0.5c0.4-0.1,1.2-0.5,1.4-0.9c0.2-0.4,0.2-0.8,0.1-0.9c-0.1-0.1-0.2-0.2-0.4-0.3c-0.2-0.1-1.2-0.6-1.4-0.7c-0.2-0.1-0.3-0.1-0.5,0.1c-0.2,0.2-0.6,0.7-0.7,0.9c-0.1,0.1-0.2,0.2-0.4,0.1c-0.2-0.1-1-0.4-1.9-1.2c-0.7-0.6-1.2-1.4-1.3-1.6c-0.1-0.2,0-0.3,0.1-0.4c0.1-0.1,0.2-0.2,0.4-0.4c0.1-0.1,0.2-0.2,0.2-0.4c0-0.1,0-0.3-0.1-0.4c-0.1-0.1-0.6-1.4-0.8-1.9C9.11,7.46,8.95,7.38,8.78,7.38H8.48z" />
  </svg>
);

// A interface de props agora espera o objeto barbershop e a disponibilidade
interface ShopInfoProps {
  barbershop: Barbershop;
  availability: Availability[];
}

export function ShopInfo({ barbershop, availability }: ShopInfoProps) {
  // Monta o endereço completo e o link para o Google Maps
  const fullAddress = `${barbershop.address.rua}, ${barbershop.address.numero} - ${barbershop.address.bairro}, ${barbershop.address.cidade}/${barbershop.address.estado}`;
  const googleMapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(fullAddress)}`;

  // Formata os links de redes sociais
  const whatsappLink = barbershop.contact ? `https://wa.me/55${barbershop.contact.replace(/\D/g, "")}` : null;
  const instagramLink = barbershop.instagram ? `https://instagram.com/${barbershop.instagram.replace("@", "")}` : null;

  // Descobre o nome do dia da semana atual para destacar
  const todayName = new Date().toLocaleDateString("pt-BR", { weekday: "long" });

  return (
    <div className="space-y-6 px-4 mt-16 text-gray-600">
      <h2 className="text-gray-700 text-xl font-semibold mb-6">Detalhes do estabelecimento</h2>
      <section className="space-y-2">
        <h3 className="text-lg font-semibold">Localização</h3>
        <div className="flex items-start justify-between gap-4">
          <p className="">{fullAddress}</p>
          <a
            href={googleMapsUrl}
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Ver no mapa"
            className="flex-shrink-0 p-2 rounded-full   transition-colors"
          >
            <MapPin className="h-5 w-5 text-[var(--loja-theme-color)]" />
          </a>
        </div>
      </section>

      <hr className="border-gray-200" />

      {/* Seção de Horário de Atendimento */}
      <section className="space-y-3">
        <h3 className="text-lg font-semibold">Horário de atendimento</h3>
        <div className="space-y-2 ">
          {availability.map((wh) => (
            <div key={wh.day} className="flex justify-between items-center">
              <span className="flex items-center gap-2">
                {wh.day}
                {wh.day.toLowerCase() === todayName.toLowerCase() && (
                  <Badge className="bg-[var(--loja-theme-color)] text-white px-2 py-0.5 text-xs">Hoje</Badge>
                )}
              </span>
              <span className="font-mono">{`${wh.start} - ${wh.end}`}</span>
            </div>
          ))}
        </div>
      </section>

      {/* A Seção de Pagamentos foi REMOVIDA, pois não existe no schema */}

      <hr className="border-gray-200" />

      {/* Seção de Redes Sociais */}
      <section className="space-y-3">
        <h3 className="text-lg font-semibold">Redes Sociais</h3>
        <div className="flex items-center gap-3">
          {whatsappLink && (
            <a href={whatsappLink} target="_blank" rel="noopener noreferrer" aria-label="WhatsApp" className="p-3 rounded-full    transition-colors">
              <WhatsAppIcon />
            </a>
          )}
          {instagramLink && (
            <a
              href={instagramLink}
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Instagram"
              className="p-3 rounded-full    transition-colors"
            >
              <Instagram className="text-[var(--loja-theme-color)]" />
            </a>
          )}
        </div>
      </section>
    </div>
  );
}

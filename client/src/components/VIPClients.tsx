import { useEffect, useState } from "react";
import { Crown, Sparkles } from "lucide-react";

interface VIPClient {
  id: number;
  name: string;
  delay: number;
}

const VIP_CLIENTS: VIPClient[] = [
  { id: 1, name: "محمد الأحمري", delay: 0 },
  { id: 2, name: "فهد العتيبي", delay: 0.1 },
  { id: 3, name: "سلطان الدوسري", delay: 0.2 },
];

export function VIPClients() {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    setIsVisible(true);
  }, []);

  return (
    <section className="relative w-full py-16 px-4 bg-gradient-to-b from-[#0a0a0a] to-[#141414] overflow-hidden">
      {/* Background decorative elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-[#c9a84c]/5 rounded-full blur-3xl" />
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-[#c9a84c]/5 rounded-full blur-3xl" />
      </div>

      <div className="relative max-w-6xl mx-auto">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="flex items-center justify-center gap-3 mb-4">
            <Sparkles className="w-6 h-6 text-[#c9a84c]" />
            <h2 className="text-3xl md:text-4xl font-black text-white">عملاء VIP</h2>
            <Crown className="w-6 h-6 text-[#c9a84c]" />
          </div>
          <p className="text-sm md:text-base text-gray-400">أفضل عملائنا الموثوقين والمميزين</p>
        </div>

        {/* VIP Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-8">
          {VIP_CLIENTS.map((client, index) => (
            <div
              key={client.id}
              className={`relative group transition-all duration-700 ${
                isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
              }`}
              style={{
                transitionDelay: isVisible ? `${client.delay}s` : "0s",
              }}
            >
              {/* Card Container with 3D effect */}
              <div className="relative h-80 md:h-96">
                {/* Glow effect */}
                <div className="absolute inset-0 bg-gradient-to-br from-[#c9a84c]/20 to-transparent rounded-2xl blur-xl group-hover:blur-2xl transition-all duration-500 opacity-0 group-hover:opacity-100" />

                {/* Main Card */}
                <div className="relative h-full bg-gradient-to-br from-[#1a1a1a] to-[#0f0f0f] border-2 border-[#c9a84c]/30 rounded-2xl p-6 md:p-8 overflow-hidden group-hover:border-[#c9a84c]/60 transition-all duration-500 transform group-hover:-translate-y-2 group-hover:shadow-2xl"
                  style={{
                    boxShadow: "0 20px 50px rgba(201, 168, 76, 0.1)",
                  }}
                >
                  {/* Top accent line */}
                  <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-[#c9a84c] to-transparent" />

                  {/* Crown Icon */}
                  <div className="flex justify-center mb-6">
                    <div className="relative">
                      <div className="absolute inset-0 bg-[#c9a84c]/20 rounded-full blur-lg group-hover:blur-xl transition-all duration-500" />
                      <Crown className="w-12 h-12 text-[#c9a84c] relative z-10 drop-shadow-lg" />
                    </div>
                  </div>

                  {/* VIP Badge */}
                  <div className="text-center mb-6">
                    <div className="inline-block px-4 py-1 bg-[#c9a84c]/10 border border-[#c9a84c]/30 rounded-full mb-3">
                      <span className="text-xs font-bold text-[#c9a84c] uppercase tracking-widest">VIP عضو</span>
                    </div>
                    <div className="w-12 h-1 bg-gradient-to-r from-transparent via-[#c9a84c] to-transparent mx-auto" />
                  </div>

                  {/* Client Name */}
                  <div className="text-center mb-6 flex-1 flex items-center justify-center">
                    <h3 className="text-2xl md:text-3xl font-black text-white text-center group-hover:text-[#c9a84c] transition-colors duration-500">
                      {client.name}
                    </h3>
                  </div>

                  {/* Bottom accent line */}
                  <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-[#c9a84c] to-transparent" />

                  {/* Hover shine effect */}
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent transform -skew-x-12 group-hover:translate-x-full transition-transform duration-1000 pointer-events-none" />
                </div>

                {/* Decorative corner elements */}
                <div className="absolute top-2 left-2 w-3 h-3 border-t-2 border-l-2 border-[#c9a84c]/40 group-hover:border-[#c9a84c] transition-colors duration-500" />
                <div className="absolute top-2 right-2 w-3 h-3 border-t-2 border-r-2 border-[#c9a84c]/40 group-hover:border-[#c9a84c] transition-colors duration-500" />
                <div className="absolute bottom-2 left-2 w-3 h-3 border-b-2 border-l-2 border-[#c9a84c]/40 group-hover:border-[#c9a84c] transition-colors duration-500" />
                <div className="absolute bottom-2 right-2 w-3 h-3 border-b-2 border-r-2 border-[#c9a84c]/40 group-hover:border-[#c9a84c] transition-colors duration-500" />
              </div>

              {/* Floating particles on hover */}
              <div className="absolute inset-0 pointer-events-none">
                {[...Array(3)].map((_, i) => (
                  <div
                    key={i}
                    className="absolute w-1 h-1 bg-[#c9a84c] rounded-full opacity-0 group-hover:opacity-100 transition-all duration-500"
                    style={{
                      left: `${20 + i * 30}%`,
                      top: `${30 + i * 20}%`,
                      animation: isVisible ? `float 3s ease-in-out infinite` : "none",
                      animationDelay: `${i * 0.3}s`,
                    }}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Bottom decorative line */}
        <div className="mt-12 flex items-center gap-4">
          <div className="flex-1 h-px bg-gradient-to-r from-transparent via-[#c9a84c]/30 to-transparent" />
          <Sparkles className="w-5 h-5 text-[#c9a84c]/50" />
          <div className="flex-1 h-px bg-gradient-to-r from-transparent via-[#c9a84c]/30 to-transparent" />
        </div>
      </div>

      {/* Animation styles */}
      <style>{`
        @keyframes float {
          0%, 100% {
            transform: translateY(0px) translateX(0px);
            opacity: 0;
          }
          50% {
            transform: translateY(-20px) translateX(10px);
            opacity: 1;
          }
        }
      `}</style>
    </section>
  );
}

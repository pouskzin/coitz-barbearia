import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Scissors, Clock, MapPin, Instagram } from 'lucide-react';
import { cn } from '../lib/utils';

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-[var(--color-brand-base)] text-[var(--color-brand-text)] selection:bg-[var(--color-brand-amber)] selection:text-[var(--color-brand-base)] font-sans">
      
      {/* Navbar */}
      <nav className="fixed w-full z-50 top-0 border-b border-[var(--color-brand-border)] bg-[var(--color-brand-base)]/80 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2">
            <img src="/logo.jpg?v=3" alt="Coitz Barbearia Logo" className="h-16 w-auto object-contain mix-blend-screen" />
          </Link>
          <Link to="/book" className="hidden sm:inline-flex items-center justify-center bg-[var(--color-brand-amber)] hover:bg-[var(--color-brand-amber-hover)] text-[var(--color-brand-base)] font-display text-xl px-6 py-2 uppercase tracking-wide transition-transform hover:scale-105 active:scale-95">
            AGENDAR AGORA
          </Link>
        </div>
      </nav>

      {/* Hero Section */}
      <main className="pt-32 pb-16 px-6 max-w-7xl mx-auto">
        <div className="grid lg:grid-cols-2 gap-12 items-center min-h-[70vh]">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: "easeOut" }}
            className="flex flex-col gap-6"
          >
            <div className="inline-flex items-center gap-3 border border-[var(--color-brand-border)] bg-[var(--color-brand-surface)] px-4 py-2 w-max self-start rounded-sm">
              <span className="w-2 h-2 rounded-full bg-[var(--color-brand-lime)] animate-pulse" />
              <span className="font-mono text-sm tracking-widest uppercase text-[var(--color-brand-muted)]">HORÁRIOS DISPONÍVEIS</span>
            </div>
            
            <h1 className="font-display text-6xl sm:text-7xl lg:text-8xl leading-[0.9] uppercase tracking-tight">
              O PADRÃO <br/>
              <span className="text-[var(--color-brand-amber)]">QUE VOCÊ</span><br/>
              RESPEITA
            </h1>
            
            <p className="text-lg text-[var(--color-brand-muted)] max-w-md font-sans">
              Barbearia de alta performance. Cortes impecáveis, ambiente de vestiário e energia de quem faz acontecer.
            </p>
            
            <div className="pt-4 flex flex-col sm:flex-row gap-4">
              <Link to="/book" className="inline-flex items-center justify-center bg-[var(--color-brand-amber)] hover:bg-[var(--color-brand-amber-hover)] text-[var(--color-brand-base)] font-display text-2xl px-8 py-4 uppercase tracking-wide transition-transform hover:scale-105 active:scale-95">
                BORA MARCAR SEU HORÁRIO
              </Link>
            </div>
          </motion.div>

          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.6, delay: 0.2, ease: "easeOut" }}
            className="relative aspect-square sm:aspect-video lg:aspect-square bg-[var(--color-brand-surface)] border border-[var(--color-brand-border)] flex items-center justify-center overflow-hidden"
          >
             <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'radial-gradient(circle at 2px 2px, white 1px, transparent 0)', backgroundSize: '24px 24px' }}></div>
             <img src="/logo.jpg?v=3" alt="Coitz Logo" className="relative z-10 w-3/4 h-3/4 object-contain opacity-90 mix-blend-screen" />
             <div className="absolute bottom-4 right-4 bg-[var(--color-brand-base)] px-3 py-1 border border-[var(--color-brand-border)] font-mono text-xs z-20">JACAREZINHO / PR</div>
          </motion.div>
        </div>

        {/* Services */}
        <section className="py-24">
          <div className="flex items-end justify-between mb-12 border-b border-[var(--color-brand-border)] pb-6">
            <h2 className="font-display text-5xl uppercase">Serviços</h2>
            <span className="font-mono text-[var(--color-brand-muted)] hidden sm:inline-block">/ TABELA OFICIAL</span>
          </div>
          
          <div className="grid sm:grid-cols-2 gap-6">
            <ServiceCard num="01" title="CORTE E SOBRANCELHA" price="35,00" />
            <ServiceCard num="02" title="CORTE E BARBA" price="45,00" />
          </div>
        </section>

        {/* Team */}
        <section className="py-24 border-t border-[var(--color-brand-border)]">
           <h2 className="font-display text-5xl uppercase mb-12">O TIME</h2>
           <div className="grid sm:grid-cols-2 gap-8">
             <TeamCard name="FELIPE COITINHO" role="DONO / FUNDADOR" imageUrl="/felipe.jpg?v=3" />
             <TeamCard name="OTÁVIO LAVORATTO" role="SÓCIO / BARBEIRO" imageUrl="/otavio.jpg?v=3" />
           </div>
        </section>

        {/* Info */}
        <section className="py-24 border-t border-[var(--color-brand-border)] grid md:grid-cols-3 gap-12">
           <div>
             <div className="flex items-center gap-3 mb-4 text-[var(--color-brand-amber)]">
               <MapPin size={24} />
               <h3 className="font-display text-2xl uppercase">LOCALIZAÇÃO</h3>
             </div>
             <p className="font-sans text-[var(--color-brand-muted)]">
               Avenida Doutor João de Aguiar, 500<br/>
               Jacarezinho / PR
             </p>
           </div>
           
           <div>
             <div className="flex items-center gap-3 mb-4 text-[var(--color-brand-amber)]">
               <Clock size={24} />
               <h3 className="font-display text-2xl uppercase">HORÁRIOS</h3>
             </div>
             <ul className="font-sans text-[var(--color-brand-muted)] space-y-1">
               <li className="flex justify-between border-b border-[var(--color-brand-border)]/50 pb-1">
                 <span>Seg – Sex</span> <span className="font-mono text-[var(--color-brand-text)]">09:00 - 20:00</span>
               </li>
               <li className="flex justify-between border-b border-[var(--color-brand-border)]/50 pb-1">
                 <span>Sábado</span> <span className="font-mono text-[var(--color-brand-text)]">09:00 - 18:00</span>
               </li>
               <li className="flex justify-between pb-1">
                 <span>Domingo</span> <span className="font-mono text-red-500">FECHADO</span>
               </li>
             </ul>
           </div>
           
           <div>
             <div className="flex items-center gap-3 mb-4 text-[var(--color-brand-amber)]">
               <Instagram size={24} />
               <h3 className="font-display text-2xl uppercase">CONTATO</h3>
             </div>
             <p className="font-sans text-[var(--color-brand-muted)] mb-2">
               WhatsApp direto
             </p>
             <p className="font-mono text-xl text-[var(--color-brand-text)]">
               +55 43 9197-0920
             </p>
           </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="bg-[var(--color-brand-surface)] border-t border-[var(--color-brand-border)] py-12 px-6">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-6">
          <img src="/logo.jpg?v=3" alt="Coitz Logo" className="h-20 w-auto object-contain opacity-80 mix-blend-screen" />
          <p className="font-mono text-xs text-[var(--color-brand-muted)] text-center md:text-right">
            CANCELAMENTOS APENAS COM 2H DE ANTECEDÊNCIA.<br/>
            © {new Date().getFullYear()} COITZ BARBEARIA. ALL RIGHTS RESERVED.
          </p>
        </div>
      </footer>
    </div>
  );
}

function ServiceCard({ num, title, price }: { num: string, title: string, price: string }) {
  return (
    <div className="group bg-[var(--color-brand-surface)] border border-[var(--color-brand-border)] p-8 flex flex-col gap-8 transition-colors hover:border-[var(--color-brand-amber)] relative overflow-hidden">
      <div className="absolute top-0 right-0 p-4 font-mono text-[var(--color-brand-muted)] text-sm">
        Nº {num}
      </div>
      <div className="font-display text-3xl uppercase pr-12 text-[var(--color-brand-text)] group-hover:text-[var(--color-brand-amber)] transition-colors">
        {title}
      </div>
      <div className="flex items-baseline gap-2 mt-auto">
        <span className="font-mono text-[var(--color-brand-muted)] text-sm">R$</span>
        <span className="font-display text-5xl">{price}</span>
      </div>
    </div>
  );
}

function TeamCard({ name, role, imageUrl }: { name: string, role: string, imageUrl?: string }) {
  return (
    <div className="flex flex-col gap-4">
      <div className="aspect-[3/4] bg-[var(--color-brand-surface)] border border-[var(--color-brand-border)] flex items-center justify-center overflow-hidden relative">
        {imageUrl ? (
          <img src={imageUrl} alt={name} className="w-full h-full object-cover grayscale hover:grayscale-0 transition-all duration-500" referrerPolicy="no-referrer" />
        ) : (
          <div className="font-display text-6xl text-[var(--color-brand-base)] opacity-50">PRO</div>
        )}
      </div>
      <div>
        <h3 className="font-display text-3xl uppercase">{name}</h3>
        <p className="font-mono text-sm text-[var(--color-brand-amber)]">{role}</p>
      </div>
    </div>
  );
}

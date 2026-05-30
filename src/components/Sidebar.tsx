"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";

const navItems = [
  { href: "/", label: "Dashboard", icon: "⊞" },
  { href: "/colaboradores", label: "Colaboradores", icon: "👥" },
  { href: "/escala", label: "Escala", icon: "📅" },
  { href: "/banco-horas", label: "Banco de Horas", icon: "⏱" },
  { href: "/plantoes", label: "Plantões & Folgas", icon: "🔔" },
  { href: "/configuracoes", label: "Configurações", icon: "⚙" },
];

function NavLinks({ onClose }: { onClose?: () => void }) {
  const pathname = usePathname();
  const router = useRouter();

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  }

  return (
    <>
      <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
        {navItems.map((item) => {
          const active = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onClose}
              className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors ${
                active ? "bg-blue-600 text-white font-medium" : "text-gray-400 hover:text-white hover:bg-gray-800"
              }`}
            >
              <span className="text-base leading-none">{item.icon}</span>
              {item.label}
            </Link>
          );
        })}
      </nav>
      <div className="px-3 py-4 border-t border-gray-800">
        <button
          onClick={handleLogout}
          className="flex items-center gap-3 w-full px-3 py-2 rounded-lg text-sm text-gray-400 hover:text-white hover:bg-gray-800 transition-colors"
        >
          <span className="text-base leading-none">↩</span>
          Sair
        </button>
      </div>
    </>
  );
}

export function Sidebar() {
  const [open, setOpen] = useState(false);

  return (
    <>
      {/* Hamburger button — mobile only */}
      <button
        onClick={() => setOpen(true)}
        className="md:hidden fixed top-3 left-3 z-40 bg-gray-900 border border-gray-700 text-white p-2 rounded-lg leading-none"
        aria-label="Menu"
      >
        ☰
      </button>

      {/* Mobile overlay */}
      {open && (
        <div className="md:hidden fixed inset-0 bg-black/60 z-40" onClick={() => setOpen(false)} />
      )}

      {/* Mobile sidebar */}
      <aside className={`md:hidden fixed left-0 top-0 h-full w-60 bg-gray-900 border-r border-gray-800 flex flex-col z-50 transition-transform duration-200 ${open ? "translate-x-0" : "-translate-x-full"}`}>
        <div className="flex items-center justify-between px-5 py-5 border-b border-gray-800">
          <div>
            <h1 className="text-sm font-semibold text-white leading-tight">Gestão de Escalas</h1>
            <p className="text-xs text-gray-500 mt-0.5">Painel administrativo</p>
          </div>
          <button onClick={() => setOpen(false)} className="text-gray-400 hover:text-white text-lg leading-none">✕</button>
        </div>
        <NavLinks onClose={() => setOpen(false)} />
      </aside>

      {/* Desktop sidebar */}
      <aside className="hidden md:flex flex-col w-60 shrink-0 bg-gray-900 border-r border-gray-800 h-screen sticky top-0">
        <div className="px-5 py-5 border-b border-gray-800">
          <h1 className="text-sm font-semibold text-white leading-tight">Gestão de Escalas</h1>
          <p className="text-xs text-gray-500 mt-0.5">Painel administrativo</p>
        </div>
        <NavLinks />
      </aside>
    </>
  );
}

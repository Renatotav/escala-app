"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";

type NavItem = {
  href: string;
  label: string;
  icon?: string;
  dot?: string;
};

const navItems: NavItem[] = [
  { href: "/", label: "Dashboard", icon: "⊞" },
  { href: "/colaboradores", label: "Colaboradores", icon: "👥" },
  { href: "/agenda", label: "Agenda", icon: "📅" },
  { href: "/escala", label: "Escala", icon: "🔁" },
  { href: "/atestados", label: "Atestados", icon: "🩺" },
  { href: "/declaracoes", label: "Declarações Médicas", icon: "📄" },
  { href: "/triagem", label: "Triagem", icon: "📋" },
  { href: "/banco-horas", label: "Banco de Horas", icon: "⏱" },
  { href: "/chamados", label: "Chamados", icon: "🎫" },
  { href: "/chamados-redmine", label: "Chamados Redmine", icon: "🔴" },
  { href: "/redmine-resolvidos", label: "Redmine Resolvidos", icon: "🟢" },
  { href: "/redmine-atribuidos", label: "Redmine Atribuídos", icon: "🔵" },
  { href: "/plantoes", label: "Plantões & Folgas", icon: "🔔" },
  { href: "/configuracoes", label: "Configurações", icon: "⚙" },
];

function NavLinks({ onClose, collapsed }: { onClose?: () => void; collapsed?: boolean }) {
  const pathname = usePathname();
  const router = useRouter();

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  }

  return (
    <>
      <nav className="flex-1 px-2 py-4 space-y-0.5 overflow-y-auto">
        {navItems.map((item) => {
          const active = item.href === "/"
            ? pathname === "/"
            : pathname === item.href || pathname.startsWith(item.href + "/");
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onClose}
              title={collapsed ? item.label : undefined}
              className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors ${
                collapsed ? "justify-center" : ""
              } ${
                active ? "bg-blue-600 text-white font-medium" : "text-gray-400 hover:text-white hover:bg-gray-800"
              }`}
            >
              {item.dot ? (
                <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${item.dot}`} />
              ) : (
                <span className={`text-base leading-none text-center shrink-0 ${!collapsed ? "w-4" : ""}`}>
                  {item.icon}
                </span>
              )}
              {!collapsed && <span className="truncate">{item.label}</span>}
            </Link>
          );
        })}
      </nav>
      <div className="px-2 py-4 border-t border-gray-800">
        <button
          onClick={handleLogout}
          title={collapsed ? "Sair" : undefined}
          className={`flex items-center gap-3 w-full px-3 py-2 rounded-lg text-sm text-gray-400 hover:text-white hover:bg-gray-800 transition-colors ${collapsed ? "justify-center" : ""}`}
        >
          <span className="text-base leading-none shrink-0">↩</span>
          {!collapsed && "Sair"}
        </button>
      </div>
    </>
  );
}

export function Sidebar() {
  const [open, setOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem("sidebar-collapsed");
    if (saved === "true") setCollapsed(true);
  }, []);

  function toggleCollapsed() {
    const next = !collapsed;
    setCollapsed(next);
    localStorage.setItem("sidebar-collapsed", String(next));
  }

  return (
    <>
      {/* Hambúrguer mobile */}
      <button
        onClick={() => setOpen(true)}
        className="md:hidden fixed top-3 left-3 z-40 bg-gray-900 border border-gray-700 text-white p-2 rounded-lg leading-none"
        aria-label="Menu"
      >
        ☰
      </button>

      {/* Overlay mobile */}
      {open && (
        <div className="md:hidden fixed inset-0 bg-black/60 z-40" onClick={() => setOpen(false)} />
      )}

      {/* Sidebar mobile */}
      <aside className={`md:hidden fixed left-0 top-0 h-full w-60 bg-gray-900 border-r border-gray-800 flex flex-col z-50 transition-transform duration-200 ${open ? "translate-x-0" : "-translate-x-full"}`}>
        <div className="flex items-center justify-between px-4 py-4 border-b border-gray-800">
          <div className="flex items-center gap-3">
            <img src="/Logo-PJe-Símbolo.svg" alt="PJe" className="w-9 h-9 shrink-0" />
            <div>
              <h1 className="text-xs font-semibold text-white leading-tight">Gestão da Coordenadoria de Atendimento do PJe</h1>
              <p className="text-xs text-gray-500 mt-0.5">Painel administrativo</p>
            </div>
          </div>
          <button onClick={() => setOpen(false)} className="text-gray-400 hover:text-white text-lg leading-none ml-2 shrink-0">✕</button>
        </div>
        <NavLinks onClose={() => setOpen(false)} />
      </aside>

      {/* Sidebar desktop */}
      <aside className={`hidden md:flex flex-col shrink-0 bg-gray-900 border-r border-gray-800 h-dvh sticky top-0 relative transition-all duration-200 ${collapsed ? "w-16" : "w-60"}`}>
        {/* Cabeçalho */}
        {collapsed ? (
          <div className="flex justify-center py-3 border-b border-gray-800">
            <img src="/Logo-PJe-Símbolo.svg" alt="PJe" className="w-8 h-8" />
          </div>
        ) : (
          <div className="flex items-center gap-3 px-4 py-4 border-b border-gray-800">
            <img src="/Logo-PJe-Símbolo.svg" alt="PJe" className="w-9 h-9 shrink-0" />
            <div>
              <h1 className="text-xs font-semibold text-white leading-tight">Gestão da Coordenadoria de Atendimento do PJe</h1>
              <p className="text-xs text-gray-500 mt-0.5">Painel administrativo</p>
            </div>
          </div>
        )}

        <NavLinks collapsed={collapsed} />

        {/* Botão recolher na borda direita */}
        <button
          onClick={toggleCollapsed}
          title={collapsed ? "Expandir menu" : "Recolher menu"}
          className="absolute -right-3 top-1/2 -translate-y-1/2 w-6 h-6 bg-gray-700 hover:bg-blue-600 border border-gray-600 rounded-full flex items-center justify-center text-gray-300 hover:text-white text-xs font-bold transition-colors z-10 shadow-lg"
        >
          {collapsed ? "›" : "‹"}
        </button>
      </aside>
    </>
  );
}

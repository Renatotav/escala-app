"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { List, X, SignOut, CaretLeft, CaretRight } from "@phosphor-icons/react";

type NavItem = {
  href: string;
  label: string;
  icon: string;
};

type NavGroup = {
  label: string;
  items: NavItem[];
};

const navGroups: NavGroup[] = [
  {
    label: "Equipe",
    items: [
      { href: "/", label: "Dashboard", icon: "⊞" },
      { href: "/colaboradores", label: "Colaboradores", icon: "👥" },
      { href: "/agenda", label: "Agenda", icon: "📅" },
      { href: "/escala", label: "Escala", icon: "🔁" },
      { href: "/atestados", label: "Atestados", icon: "🩺" },
      { href: "/declaracoes", label: "Declarações", icon: "📄" },
      { href: "/banco-horas", label: "Banco de Horas", icon: "⏱" },
    ],
  },
  {
    label: "Suporte",
    items: [
      { href: "/triagem", label: "Triagem", icon: "📋" },
      { href: "/chamados", label: "Chamados", icon: "🎫" },
      { href: "/produtividade", label: "Produtividade", icon: "📊" },
      { href: "/chamados-redmine", label: "Chamados Redmine", icon: "🔴" },
      { href: "/chamados-powerbi", label: "Chamados Powerbi", icon: "🟡" },
      { href: "/dnpje-migracao", label: "Dnpje Migração", icon: "🟠" },
      { href: "/redmine-resolvidos", label: "Redmine Resolvidos", icon: "🟢" },
      { href: "/redmine-atribuidos", label: "Redmine Atribuídos", icon: "🔵" },
    ],
  },
  {
    label: "Relatórios",
    items: [
      { href: "/relatorio-chamados", label: "Relatório Chamados", icon: "📄" },
      { href: "/relatorio-mensal", label: "Relatório Mensal", icon: "📅" },
      { href: "/plantoes", label: "Plantões & Folgas", icon: "🔔" },
    ],
  },
  {
    label: "Sistema",
    items: [
      { href: "/configuracoes", label: "Configurações", icon: "⚙" },
    ],
  },
];

function NavLinks({ onClose, collapsed }: { onClose?: () => void; collapsed?: boolean }) {
  const pathname = usePathname();
  const router = useRouter();

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  }

  function isActive(href: string) {
    return href === "/" ? pathname === "/" : pathname === href || pathname.startsWith(href + "/");
  }

  return (
    <>
      <nav className="flex-1 px-2 py-3 overflow-y-auto" aria-label="Navegação principal">
        {navGroups.map((group) => (
          <div key={group.label} className="mb-1">
            {!collapsed ? (
              <p className="px-3 pt-3 pb-1 text-[10px] font-semibold text-gray-600 uppercase tracking-widest select-none">
                {group.label}
              </p>
            ) : (
              <div className="py-1 mx-2 border-t border-gray-800" />
            )}
            <div className="space-y-0.5">
              {group.items.map((item) => {
                const active = isActive(item.href);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={onClose}
                    title={item.label}
                    aria-current={active ? "page" : undefined}
                    className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors ${
                      collapsed ? "justify-center" : ""
                    } ${
                      active
                        ? "bg-blue-600 text-white font-medium"
                        : "text-gray-400 hover:text-white hover:bg-gray-800"
                    }`}
                  >
                    <span className="text-base leading-none text-center shrink-0 w-4" aria-hidden="true">
                      {item.icon}
                    </span>
                    {!collapsed && <span className="truncate">{item.label}</span>}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      <div className="px-2 py-4 border-t border-gray-800">
        <button
          onClick={handleLogout}
          title="Sair"
          className={`flex items-center gap-3 w-full px-3 py-2 rounded-lg text-sm text-gray-400 hover:text-white hover:bg-gray-800 transition-colors ${collapsed ? "justify-center" : ""}`}
        >
          <SignOut size={16} aria-hidden="true" />
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
    try {
      const saved = localStorage.getItem("sidebar-collapsed");
      if (saved === "true") setCollapsed(true);
    } catch {}
  }, []);

  function toggleCollapsed() {
    const next = !collapsed;
    setCollapsed(next);
    try { localStorage.setItem("sidebar-collapsed", String(next)); } catch {}
  }

  return (
    <>
      {/* Hambúrguer mobile */}
      <button
        onClick={() => setOpen(true)}
        className="md:hidden fixed top-3 left-3 z-40 bg-gray-900 border border-gray-700 text-white p-2 rounded-lg leading-none"
        aria-label="Abrir menu de navegação"
      >
        <List size={18} aria-hidden="true" />
      </button>

      {/* Overlay mobile */}
      {open && (
        <div
          className="md:hidden fixed inset-0 bg-black/60 z-40"
          onClick={() => setOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Sidebar mobile */}
      <aside
        className={`md:hidden fixed left-0 top-0 h-full w-60 bg-gray-900 border-r border-gray-800 flex flex-col z-50 transition-transform duration-200 ${open ? "translate-x-0" : "-translate-x-full"}`}
        aria-label="Menu de navegação"
      >
        <div className="flex items-center justify-between px-4 py-4 border-b border-gray-800">
          <div className="flex items-center gap-3">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/Logo-PJe-Símbolo.svg" alt="PJe" className="w-9 h-9 shrink-0" />
            <div>
              <h1 className="text-xs font-semibold text-white leading-tight">Gestão da Coordenadoria de Atendimento do PJe</h1>
              <p className="text-xs text-gray-400 mt-0.5">Painel administrativo</p>
            </div>
          </div>
          <button
            onClick={() => setOpen(false)}
            className="text-gray-400 hover:text-white ml-2 shrink-0"
            aria-label="Fechar menu"
          >
            <X size={18} aria-hidden="true" />
          </button>
        </div>
        <NavLinks onClose={() => setOpen(false)} />
      </aside>

      {/* Sidebar desktop */}
      <aside
        className={`hidden md:flex flex-col shrink-0 bg-gray-900 border-r border-gray-800 h-dvh sticky top-0 relative transition-all duration-200 ${collapsed ? "w-16" : "w-60"}`}
        aria-label="Menu de navegação"
      >
        {collapsed ? (
          <div className="flex justify-center items-center py-2 border-b border-gray-800">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/Logo-PJe-Símbolo.svg" alt="PJe" className="w-14 h-14" />
          </div>
        ) : (
          <div className="flex items-center gap-3 px-4 py-4 border-b border-gray-800">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/Logo-PJe-Símbolo.svg" alt="PJe" className="w-9 h-9 shrink-0" />
            <div>
              <h1 className="text-xs font-semibold text-white leading-tight">Gestão da Coordenadoria de Atendimento do PJe</h1>
              <p className="text-xs text-gray-400 mt-0.5">Painel administrativo</p>
            </div>
          </div>
        )}

        <NavLinks collapsed={collapsed} />

        <button
          onClick={toggleCollapsed}
          title={collapsed ? "Expandir menu" : "Recolher menu"}
          className="absolute -right-3 top-1/2 -translate-y-1/2 w-6 h-6 bg-gray-700 hover:bg-blue-600 border border-gray-600 rounded-full flex items-center justify-center text-gray-300 hover:text-white transition-colors z-10 shadow-lg"
        >
          {collapsed
            ? <CaretRight size={10} weight="bold" aria-hidden="true" />
            : <CaretLeft size={10} weight="bold" aria-hidden="true" />
          }
        </button>
      </aside>
    </>
  );
}

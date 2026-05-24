"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";

const navItems = [
  { href: "/", label: "Dashboard", icon: "⊞" },
  { href: "/colaboradores", label: "Colaboradores", icon: "👥" },
  { href: "/lancamento", label: "Lançamento", icon: "📋" },
  { href: "/escala", label: "Escala", icon: "📅" },
  { href: "/banco-horas", label: "Banco de Horas", icon: "⏱" },
  { href: "/folgas", label: "Folgas", icon: "🏖" },
  { href: "/relatorio", label: "Relatórios", icon: "📊" },
  { href: "/configuracoes", label: "Configurações", icon: "⚙" },
];

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  }

  return (
    <aside className="flex flex-col w-60 shrink-0 bg-gray-900 border-r border-gray-800 h-screen sticky top-0">
      <div className="px-5 py-5 border-b border-gray-800">
        <h1 className="text-sm font-semibold text-white leading-tight">
          Gestão de Escalas
        </h1>
        <p className="text-xs text-gray-500 mt-0.5">Painel administrativo</p>
      </div>

      <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
        {navItems.map((item) => {
          const active =
            item.href === "/"
              ? pathname === "/"
              : pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors ${
                active
                  ? "bg-blue-600 text-white font-medium"
                  : "text-gray-400 hover:text-white hover:bg-gray-800"
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
    </aside>
  );
}

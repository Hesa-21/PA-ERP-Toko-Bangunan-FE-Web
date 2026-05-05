"use client"

import type * as React from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  BarChart3,
  Building2,
  Calculator,
  ChevronDown,
  FileText,
  Home,
  LogOut,
  ShoppingCart,
  UserCheck,
} from "lucide-react"

import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Separator } from "@/components/ui/separator"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
} from "@/components/ui/sidebar"
import { useAuth } from "@/hooks/use-auth"
import { canView, type ModuleKey, type Role } from "@/lib/auth/rbac"

type NavItem = {
  title: string
  url: string
  icon: React.ComponentType<React.SVGProps<SVGSVGElement>>
  module: ModuleKey
}

type NavSection = {
  label: string
  items: NavItem[]
}

const NAVIGATION_SECTIONS: NavSection[] = [
  {
    label: "Menu Utama",
    items: [
      { title: "Dasbor", url: "/dashboard", icon: Home, module: "dashboard" },
      { title: "Kasir (Buat Transaksi)", url: "/pos", icon: Calculator, module: "pos" },
    ],
  },
  {
    label: "Stok",
    items: [{ title: "Master Data Produk", url: "/products", icon: BarChart3, module: "categories" }],
  },
  {
    label: "Transaksi",
    items: [{ title: "Penjualan (Monitoring)", url: "/sales", icon: ShoppingCart, module: "sales" }],
  },
  {
    label: "Manajemen",
    items: [{ title: "Pengguna", url: "/users", icon: UserCheck, module: "users" }],
  },
  {
    label: "Laporan",
    items: [{ title: "Laporan Penjualan", url: "/reports/sales", icon: FileText, module: "reports.sales" }],
  },
]

function getUserInitials(name?: string): string {
  const parts = (name ?? "")
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)

  if (parts.length === 0) return "U"
  return parts.map((part) => part[0]?.toUpperCase() ?? "").join("")
}

function isItemActive(pathname: string, url: string): boolean {
  if (pathname === url) return true
  return pathname.startsWith(`${url}/`)
}

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const pathname = usePathname()
  const { user, logout } = useAuth()
  const role: Role = ((user?.role as Role | undefined) ?? "viewer")

  const sections = NAVIGATION_SECTIONS.map((section) => ({
    ...section,
    items: section.items.filter((item) => canView(role, item.module)),
  })).filter((section) => section.items.length > 0)

  const userInitials = getUserInitials(user?.name)

  return (
    <Sidebar collapsible="icon" {...props}>
      <SidebarHeader>
        <div className="flex flex-col items-center px-2 py-2">
          <div className="bg-blue-600 p-1 rounded-lg flex items-center justify-center">
            <Building2 className="h-4 w-4 text-white" />
          </div>
          <div className="mt-2 flex flex-col items-center group-data-[collapsible=icon]:hidden">
            <h2 className="font-bold text-gray-900 text-base whitespace-nowrap">ERP System</h2>
            <p className="text-xs text-gray-600 whitespace-nowrap">Toko Retail Bahan Bangunan</p>
          </div>
        </div>
      </SidebarHeader>
      <SidebarContent>
        {sections.map((section) => (
          <SidebarGroup key={section.label}>
            <SidebarGroupLabel>{section.label}</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {section.items.map((item) => (
                  <SidebarMenuItem key={item.url}>
                    <SidebarMenuButton asChild isActive={isItemActive(pathname, item.url)}>
                      <Link href={item.url}>
                        <item.icon />
                        <span>{item.title}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ))}
      </SidebarContent>
      <SidebarFooter>
        <Separator className="mx-2 mb-2 w-auto bg-sidebar-border" />
        <div className="px-2 py-2 w-full">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                suppressHydrationWarning
                aria-label="Menu akun"
                className="relative flex items-center justify-between gap-3 rounded-md w-full px-2 py-2 border border-transparent hover:border-gray-300 hover:shadow-lg hover:bg-gray-50 transition-shadow transition-colors transform hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-300 data-[state=open]:border-blue-300 data-[state=open]:bg-blue-50 group group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:px-0 group-data-[collapsible=icon]:gap-0"
              >
                <div className="flex items-center gap-3">
                  <Avatar className="group-data-[collapsible=icon]:h-8 group-data-[collapsible=icon]:w-8">
                    <AvatarFallback>{userInitials}</AvatarFallback>
                  </Avatar>
                  <div className="flex flex-col text-left min-w-0 group-data-[collapsible=icon]:hidden">
                    <span className="text-sm font-semibold truncate">{user?.name || "Pengguna"}</span>
                    {user?.email && <span className="text-xs text-gray-600 truncate">{user.email}</span>}
                  </div>
                </div>
                <ChevronDown className="absolute right-3 top-2 h-4 w-4 text-gray-500 dark:text-white group-hover:text-blue-600 group-data-[collapsible=icon]:hidden" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-56">
              <div className="px-3 py-2">
                <div className="flex items-center gap-3">
                  <Avatar>
                    <AvatarFallback>{userInitials}</AvatarFallback>
                  </Avatar>
                  <div className="flex flex-col">
                    <span className="text-sm font-semibold">{user?.name || "Pengguna"}</span>
                    {user?.email && <span className="text-xs text-gray-600">{user.email}</span>}
                  </div>
                </div>
              </div>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onSelect={(event) => {
                  event.preventDefault()
                  void logout()
                }}
              >
                <LogOut className="h-4 w-4 mr-2" />
                Keluar
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  )
}

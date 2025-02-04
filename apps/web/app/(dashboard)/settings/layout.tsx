// app/settings/layout.tsx
'use client';
import React from 'react';
import {
  SidebarProvider,
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
} from '@/components/ui/sidebar';
import { User2, Bell, CreditCard, List } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

const menuItems = [
  { icon: User2, label: 'My Profile', href: '/settings/myprofile' },
  { icon: Bell, label: 'Notifications', href: '/settings/notifications' },
  { icon: CreditCard, label: 'Billing', href: '/settings/billing' },
  { icon: List, label: 'Picklist', href: '/settings/picklists' },
];

export default function SettingsLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="min-h-screen w-full">
      <div className="p-4">
        <div className="relative min-h-[600px] overflow-hidden rounded-xl border bg-card">
          <SidebarProvider defaultOpen={true}>
            <div className="flex w-full">
              <div className="relative">
                <Sidebar
                  className="!absolute !h-full !w-64 border-r bg-sidebar"
                  variant="inset"
                  collapsible="none"
                >
                  <SidebarContent>
                    <SidebarGroup>
                      <SidebarGroupLabel className="px-2 pt-4 mb-6 text-2xl font-semibold">
                        Settings
                      </SidebarGroupLabel>
                      <SidebarGroupContent>
                        <SidebarMenu>
                          {menuItems.map(item => (
                            <SidebarMenuItem key={item.label}>
                              <SidebarMenuButton
                                asChild
                                isActive={pathname === item.href}
                                className="hover:bg-accent/50"
                              >
                                <Link href={item.href} className="text-lg text-textPrimary">
                                  <item.icon className="h-4 w-4" />
                                  <span>{item.label}</span>
                                </Link>
                              </SidebarMenuButton>
                            </SidebarMenuItem>
                          ))}
                        </SidebarMenu>
                      </SidebarGroupContent>
                    </SidebarGroup>
                  </SidebarContent>
                </Sidebar>
              </div>

              <div className="flex-1 pl-64 w-full">
                <div className="p-6 w-full">{children}</div>
              </div>
            </div>
          </SidebarProvider>
        </div>
      </div>
    </div>
  );
}

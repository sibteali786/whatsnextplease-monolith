"use client";

import React from "react";
import {
  Tabs as UITabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";

export type Tab = {
  tabName: string;
  tabValue: string;
  tabContent: React.ReactNode;
};

export interface ClientTabsProps {
  tabs: Tab[];
  defaultValue: string;
}

export const DynamicTabs: React.FC<ClientTabsProps> = ({
  tabs,
  defaultValue,
}) => {
  return (
    <UITabs defaultValue={defaultValue}>
      <TabsList className="mb-4">
        {tabs.map((tab) => (
          <TabsTrigger key={tab.tabValue} value={tab.tabValue}>
            {tab.tabName}
          </TabsTrigger>
        ))}
      </TabsList>
      {tabs.map((tab) => (
        <TabsContent key={tab.tabValue} value={tab.tabValue}>
          {tab.tabContent}
        </TabsContent>
      ))}
    </UITabs>
  );
};

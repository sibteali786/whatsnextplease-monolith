import React, { ReactElement } from 'react';
import { render, RenderOptions } from '@testing-library/react';
import { ThemeProvider } from '@/components/themeProvider';

// All the providers that are required for testing
const AllProviders = ({ children }: { children: React.ReactNode }) => {
  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
      {children}
    </ThemeProvider>
  );
};

// Custom render method that includes providers
const customRender: (
  ui: ReactElement,
  options?: Omit<RenderOptions, 'wrapper'>
) => ReturnType<typeof render> = (ui, options) => render(ui, { wrapper: AllProviders, ...options });

// Re-export everything from testing-library
export * from '@testing-library/react';

// Override render method
export { customRender as render };

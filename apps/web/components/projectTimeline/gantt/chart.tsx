/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';

import { useEffect, useRef } from 'react';
import Gantt from 'frappe-gantt';
import { useTheme } from 'next-themes';

export type GanttTask = {
  id: string;
  name: string;
  start: string; // YYYY-MM-DD
  end: string; // YYYY-MM-DD
  progress: number; // required
  dependencies: string; // required, empty string if none
  custom_class?: string;
};

type Props = {
  tasks: GanttTask[];
};

const lightThemeVars: Record<string, string> = {
  '--g-arrow-color': '#1f2937',
  '--g-bar-color': '#fff',
  '--g-bar-border': '#fff',
  '--g-tick-color-thick': '#ededed',
  '--g-tick-color': '#f3f3f3',
  '--g-actions-background': '#f3f3f3',
  '--g-border-color': '#ebeff2',
  '--g-text-muted': '#7c7c7c',
  '--g-text-light': '#fff',
  '--g-text-dark': '#171717',
  '--g-progress-color': '#dbdbdb',
  '--g-handle-color': '#37352f',
  '--g-weekend-label-color': '#dcdce4',
  '--g-expected-progress': '#c4c4e9',
  '--g-header-background': '#fff',
  '--g-row-color': '#fdfdfd',
  '--g-row-border-color': '#c7c7c7',
  '--g-today-highlight': '#37352f',
  '--g-popup-actions': '#ebeff2',
  '--g-weekend-highlight-color': '#f7f7f7',
};

const darkThemeVars: Record<string, string> = {
  '--g-arrow-color': 'rgba(109, 40, 217, 0.5)',
  '--g-bar-color': 'rgba(109, 40, 217, 1)',
  '--g-bar-border': 'rgba(109, 40, 217, 1)',
  '--g-tick-color-thick': 'rgba(255, 255, 255, 0.2)',
  '--g-tick-color': 'rgba(255, 255, 255, 0.1)',
  '--g-actions-background': '#030712',
  '--g-border-color': 'rgba(255, 255, 255, 0.1)',
  '--g-text-muted': 'rgba(255, 255, 255, 0.5)',
  '--g-text-light': '#ffffff',
  '--g-text-dark': '#ffffff',
  '--g-progress-color': 'rgba(109, 40, 217, 0.7)',
  '--g-handle-color': 'rgba(255, 255, 255, 0.5)',
  '--g-weekend-label-color': 'rgba(255, 255, 255, 0.2)',
  '--g-expected-progress': 'rgba(109, 40, 217, 0.3)',
  '--g-header-background': '#030712',
  '--g-row-color': '#030712',
  '--g-row-border-color': 'rgba(255, 255, 255, 0.1)',
  '--g-today-highlight': 'rgba(109, 40, 217, 0.5)',
  '--g-popup-actions': 'rgba(109, 40, 217, 0.2)',
  '--g-weekend-highlight-color': 'rgba(255, 255, 255, 0.05)',
};

const Chart = ({ tasks }: Props) => {
  const { resolvedTheme } = useTheme();
  const ganttRef = useRef<HTMLDivElement>(null);
  const ganttInstance = useRef<any>(null);

  const adjustColumnWidth = (gantt: any) => {
    if (!ganttRef.current) return;

    const containerWidth = ganttRef.current.offsetWidth;

    // Set different column width based on view mode
    let columnWidth = 70; // default fallback
    if (gantt.options.view_mode === 'Day') {
      columnWidth = 50;
    } else {
      columnWidth = 100; // Week / Month
    }

    // Optionally adjust to fill container width
    const totalColumns = gantt.date_diff_in_days * 1.2; // slight buffer
    columnWidth = Math.max(columnWidth, containerWidth / totalColumns);

    gantt.options.column_width = columnWidth;
    gantt.refresh(gantt.tasks);

    // Reset scroll
    if (gantt.ganttBody) {
      gantt.ganttBody.scrollRight = 0;
      gantt.ganttBody.scrollTop = 0;
    }
  };
  const applyTheme = (mode: 'dark' | 'light') => {
    if (!ganttRef.current) return;

    const vars = mode === 'dark' ? darkThemeVars : lightThemeVars;

    Object.entries(vars).forEach(([key, value]) => {
      ganttRef.current!.style.setProperty(key, value);
    });
  };
  useEffect(() => {
    if (!ganttRef.current) return;

    ganttRef.current.innerHTML = '';

    const tasksWithLabel = tasks.map(task => ({
      ...task,
      custom_class: 'task-with-label',
    }));

    const gantt = new Gantt(ganttRef.current, tasksWithLabel, {
      view_mode: 'Day',
      view_modes: ['Day', 'Week', 'Month'],
      date_format: 'YYYY-MM-DD',
      dependencies: false,
      highlight_weekends: true,
      popup_on: 'click',
      readonly: false,
      view_mode_select: true,
      show_progress: false,

      container_height: 600,
      header_height: 60,
      lower_header_height: 50,
      bar_height: 30,
      padding: 24,
      column_width: 70,
      infinite_padding: false,

      popup: ({ task }: { task: any }) => {
        const startDate = new Date(task.start);

        // 👇 subtract 1 day for display
        const endDate = new Date(task.end);
        endDate.setDate(endDate.getDate() - 1);

        const start = startDate.toLocaleDateString('en-US', {
          month: 'short',
          day: 'numeric',
        });

        const end = endDate.toLocaleDateString('en-US', {
          month: 'short',
          day: 'numeric',
        });

        const days =
          Math.round((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1;

        return `
    <div class="custom-details">
      <p><strong>${task.name}</strong></p>
      <p>${start} - ${end} (${days} Days)</p>
    </div>
  `;
      },
    });

    ganttInstance.current = gantt;
    // Adjust column width for full container width
    adjustColumnWidth(gantt);

    // Re-adjust on window resize
    const handleResize = () => adjustColumnWidth(gantt);
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      if (ganttRef.current) {
        ganttRef.current.innerHTML = '';
      }
    };
  }, [tasks]);
  useEffect(() => {
    if (!ganttRef.current || !ganttInstance.current) return;

    const mode: 'dark' | 'light' = resolvedTheme === 'dark' ? 'dark' : 'light';

    applyTheme(mode);

    // Force Frappe Gantt to re-read CSS variables
    ganttInstance.current.refresh(ganttInstance.current.tasks);
  }, [resolvedTheme]);

  return (
    <>
      <div ref={ganttRef} />
    </>
  );
};

export default Chart;

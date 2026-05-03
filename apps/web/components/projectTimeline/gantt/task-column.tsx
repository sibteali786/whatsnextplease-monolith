'use client';

import { useEffect, useRef, useState } from 'react';
import { GanttTask, ChartHandle } from './chart';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { TooltipArrow, TooltipPortal } from '@radix-ui/react-tooltip';
import { useTheme } from 'next-themes';
import { TaskType } from '@prisma/client';
type Props = {
  tasks: GanttTask[];
  chartRef: React.RefObject<ChartHandle>;
  loadMore: () => void;
  hasMore: boolean;
};

//const HEADER_HEIGHT = 105; // your known header height
//const ROW_HEIGHT = 54; // 30 bar_height + 24 padding (from your config)

const TaskColumn = ({ tasks, chartRef, loadMore, hasMore }: Props) => {
  const columnRef = useRef<HTMLDivElement>(null);
  const { resolvedTheme } = useTheme();

  const isSyncingRef = useRef(false);
  const [headerHeight, setHeaderHeight] = useState(0);
  const [rowHeight, setRowHeight] = useState(0);

  /**
   * Dynamically read dimensions from Frappe
   */
  const readGanttLayout = () => {
    const header = document.querySelector('.grid-header') as HTMLElement;
    const firstRow = document.querySelector('.grid-row') as SVGRectElement;

    if (header) {
      setHeaderHeight(header.offsetHeight);
    }

    if (firstRow) {
      const box = firstRow.getBBox();
      setRowHeight(box.height);
    }
  };

  const ganttContainerRef = useRef<HTMLElement | null>(null);
  const scrollHandlerRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    const observer = new MutationObserver(() => {
      const ganttContainer = document.querySelector('.gantt-container') as HTMLElement;

      if (ganttContainer && columnRef.current && !ganttContainerRef.current) {
        ganttContainerRef.current = ganttContainer;

        const onGanttScroll = () => {
          if (isSyncingRef.current) return;

          isSyncingRef.current = true;
          columnRef.current!.scrollTop = ganttContainer.scrollTop;
          isSyncingRef.current = false;
        };

        scrollHandlerRef.current = onGanttScroll;
        ganttContainer.addEventListener('scroll', onGanttScroll);

        observer.disconnect();
      }
    });

    observer.observe(document.body, { childList: true, subtree: true });

    return () => {
      observer.disconnect();

      if (ganttContainerRef.current && scrollHandlerRef.current) {
        ganttContainerRef.current.removeEventListener('scroll', scrollHandlerRef.current);
      }

      ganttContainerRef.current = null;
      scrollHandlerRef.current = null;
    };
  }, [tasks]);

  const handleScroll = () => {
    const ganttContainer = ganttContainerRef.current;

    if (!ganttContainer || !columnRef.current) return;
    if (isSyncingRef.current) return;

    isSyncingRef.current = true;
    ganttContainer.scrollTop = columnRef.current.scrollTop;
    isSyncingRef.current = false;

    const { scrollTop, scrollHeight, clientHeight } = columnRef.current;

    const threshold = 200;

    if (scrollHeight - scrollTop - clientHeight < threshold) {
      if (hasMore) {
        loadMore();
      }
    }
  };

  /**
   * Wait for Gantt to render before reading layout
   */
  useEffect(() => {
    const timeout = setTimeout(() => {
      readGanttLayout();
    }, 50); // small delay to allow SVG render

    const resizeObserver = new ResizeObserver(() => {
      readGanttLayout();
    });

    const ganttContainer = document.querySelector('.gantt-container');
    if (ganttContainer) {
      resizeObserver.observe(ganttContainer);
    }

    return () => {
      clearTimeout(timeout);
      resizeObserver.disconnect();
    };
  }, [tasks]);

  return (
    <div
      ref={columnRef}
      onScroll={handleScroll}
      className="custom-scrollbar-task-column"
      style={{
        minWidth: 250,
        width: 250,
        overflowY: 'auto',
        height: 600,
        borderRight: '1px solid #e5e7eb',
        position: 'absolute',
        left: 0,
        zIndex: 10000,
        paddingBottom: '30px',
      }}
    >
      {/* Spacer for header alignment */}
      <div
        style={{ height: headerHeight }}
        className={`border-b flex items-end pl-3 pb-1 sticky top-0 z-50 ${resolvedTheme === 'dark' ? 'bg-background' : 'bg-white'}`}
      >
        <p className="text-base font-semibold">Task Name</p>
      </div>

      {tasks.map(task => {
        const type = task.type;
        const bgColor =
          type === TaskType.EXTERNAL
            ? 'bg-primary'
            : type === TaskType.INTERNAL
              ? 'bg-blue-500 hover:bg-blue-600'
              : 'bg-blue-100 text-blue-800 hover:bg-blue-200';

        return (
          <button
            key={'gantt-task-column-' + task.id}
            onClick={() => {
              chartRef.current?.scrollToTask(task.id);
            }}
            type="button"
            style={{
              height: rowHeight || 50,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '0 12px',

              cursor: 'pointer',
            }}
            className="border-b w-full text-left bg-transparent hover:bg-primary/10 focus-visible:outline focus-visible:outline-2 transition-colors duration-300"
          >
            <div className="flex flex-col gap-1">
              <p className="font-medium text-sm line-clamp-1">{task?.name}</p>
              <Badge className={`py-0.5 px-1 text-[10px] w-fit ${bgColor}`}>
                {task?.categoryName ?? 'Uncategorized'}
              </Badge>
            </div>
            {task?.assignedTo && (
              <TooltipProvider>
                <Tooltip delayDuration={250}>
                  <TooltipTrigger asChild>
                    <Avatar className="h-6 w-6 rounded-lg">
                      <AvatarImage
                        src={task?.assignedTo?.avatarUrl || 'https://github.com/shadcn.png'}
                        alt={task?.assignedTo?.firstName ?? 'avatar'}
                        className="rounded-full"
                      />
                      <AvatarFallback className="rounded-full text-xs">
                        {task?.assignedTo?.firstName} {task?.assignedTo?.lastName}
                      </AvatarFallback>
                    </Avatar>
                  </TooltipTrigger>
                  <TooltipPortal>
                    <TooltipContent
                      side="top"
                      align="center"
                      className="bg-gray-800 text-white text-xs rounded px-2 py-1 shadow-lg"
                    >
                      {task.assignedTo.firstName} {task.assignedTo.lastName}
                      <TooltipArrow className="fill-gray-800" />
                    </TooltipContent>
                  </TooltipPortal>
                </Tooltip>
              </TooltipProvider>
            )}
          </button>
        );
      })}
    </div>
  );
};

export default TaskColumn;

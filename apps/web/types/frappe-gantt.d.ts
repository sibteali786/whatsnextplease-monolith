declare module 'frappe-gantt' {
  export type GanttTask = {
    id: string;
    name: string;
    start: string;
    end: string;
    progress?: number;
    dependencies?: string;
    custom_class?: string;
  };
  export type PopupArgs = {
    task: GanttTask;
    chart: any;
    get_title: () => HTMLElement;
    get_subtitle: () => HTMLElement;
    get_details: () => HTMLElement;
    set_title: (html: string | HTMLElement) => void;
    set_subtitle: (html: string | HTMLElement) => void;
    set_details: (html: string | HTMLElement) => void;
    add_action: (html: string | HTMLElement, callback: () => void) => void;
  };
  export type GanttOptions = {
    // VIEW
    view_mode?: 'Day' | 'Week' | 'Month';
    view_modes?: Array<'Day' | 'Week' | 'Month'>;
    date_format?: string;
    language?: string;
    readonly?: boolean;
    view_mode_select?: boolean;
    show_expected_progress?: boolean;
    // SIZING & LAYOUT
    header_height?: number;
    infinite_padding?: boolean;

    lower_header_height?: number;

    container_height?: number;
    column_width?: number;
    step?: number;
    bar_height?: number;
    bar_corner_radius?: number;
    arrow_curve?: number;
    padding?: number;
    show_progress?: boolean;
    // BEHAVIOR
    popup_on?: 'click' | 'hover' | 'none';
    highlight_weekends?: boolean;
    dependencies?: boolean;

    // EVENTS
    on_click?: (task: GanttTask, event?: MouseEvent) => void;
    on_date_change?: (task: GanttTask, start: string, end: string) => void;
    on_progress_change?: (task: GanttTask, progress: number) => void;
    on_view_change?: (mode: string) => void;

    // NEW POPUP API
    popup?: (args: PopupArgs) => false | void | string;

    // Deprecated / legacy
    custom_popup_html?: (task: GanttTask) => string;
  };

  export default class Gantt {
    constructor(element: HTMLElement, tasks: GanttTask[], options?: GanttOptions);
  }
}

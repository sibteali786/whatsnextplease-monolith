// Add these interfaces to your existing types/tasks.ts file

export interface TaskLink {
  id: string;
  url: string;
  title: string | null;
  faviconUrl: string | null;
  source: 'MANUAL' | 'COMMENT';
  sourceCommentId: string | null;
  addedById: string;
  addedByType: 'USER' | 'CLIENT';
  createdAt: string;
  updatedAt: string;
  sourceComment?: {
    id: string;
    content: string;
    createdAt: string;
    authorUser?: {
      firstName: string;
      lastName: string;
    };
    authorClient?: {
      contactName: string | null;
      companyName: string;
    };
  };
}

export interface TaskLinkResponse {
  success: boolean;
  links?: TaskLink[];
  link?: TaskLink;
  count?: number;
  message?: string;
  error?: string;
}

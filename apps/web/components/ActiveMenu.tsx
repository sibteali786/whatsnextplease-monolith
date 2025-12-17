import { cn } from '@/lib/utils';

export const ActiveMenu = (props: {
  pathname: string;
  activePath: string;
  isCollapsed?: boolean;
}) => {
  // Match exactly if pathname is root "/"
  if (props.pathname === '/' && props.activePath === '/') {
    return (
      <div
        className={cn(
          'h-16 bg-purple-600 rounded-r-md transition-all duration-300',
          props.isCollapsed
            ? 'w-1 border-r-2 border-purple-600'
            : 'w-2 border-r-4 border-purple-600'
        )}
      />
    );
  }

  // For other paths, check if activePath starts with pathname (to handle nested paths)
  if (props.pathname !== '/' && props.activePath.startsWith(props.pathname)) {
    return (
      <div
        className={cn(
          'h-16 bg-purple-600 rounded-r-md transition-all duration-300',
          props.isCollapsed
            ? 'w-1 border-r-2 border-purple-600'
            : 'w-2 border-r-4 border-purple-600'
        )}
      />
    );
  }

  return null;
};

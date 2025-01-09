export const ActiveMenu = (props: { pathname: string; activePath: string }) => {
  // Match exactly if pathname is root "/"
  if (props.pathname === "/" && props.activePath === "/") {
    return (
      <div className="h-20 bg-purple-600 w-2 border-r-4 border-purple-600 rounded-r-md"></div>
    );
  }

  // For other paths, check if activePath starts with pathname (to handle nested paths)
  if (props.pathname !== "/" && props.activePath.startsWith(props.pathname)) {
    return (
      <div className="h-20 bg-purple-600 w-2 border-r-4 border-purple-600 rounded-r-md"></div>
    );
  }

  return null; // Return nothing if the conditions are not met
};

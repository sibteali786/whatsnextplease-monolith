import * as React from 'react';
import Link from 'next/link';
import { type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';
import { buttonVariants } from './button';

export interface LinkButtonProps
  extends React.AnchorHTMLAttributes<HTMLAnchorElement>,
    VariantProps<typeof buttonVariants> {
  href: string;
  external?: boolean;
  prefetch?: boolean;
}

const LinkButton = React.forwardRef<HTMLAnchorElement, LinkButtonProps>(
  ({ className, variant, size, href, external, prefetch, children, ...props }, ref) => {
    const buttonClasses = cn(buttonVariants({ className, variant, size }));

    // External links should use regular anchor tag and open in a new tab
    if (external) {
      return (
        <a
          href={href}
          className={buttonClasses}
          ref={ref}
          target="_blank"
          rel="noopener noreferrer"
          {...props}
        >
          {children}
        </a>
      );
    }

    // Internal links use Next.js Link component
    return (
      <Link href={href} className={buttonClasses} ref={ref} prefetch={prefetch} {...props}>
        {children}
      </Link>
    );
  }
);

LinkButton.displayName = 'LinkButton';

export { LinkButton };

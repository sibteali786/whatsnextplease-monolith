import Link from 'next/link';
import { Button } from './ui/button';
import { PlusCircle, AlertCircle, FileText } from 'lucide-react';
import { cva } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const callToActionVariants = cva(
  'flex flex-col items-center justify-center gap-6 rounded-xl border p-8 text-center transition-all hover:border-primary/50 hover:shadow-md',
  {
    variants: {
      variant: {
        default: 'bg-card border-border',
        primary: 'bg-primary/5 border-primary/20',
        destructive: 'bg-destructive/5 border-destructive/20',
        warning: 'bg-warning/5 border-warning/20',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  }
);

interface CallToActionProps extends React.HTMLAttributes<HTMLDivElement> {
  link: string;
  title: string;
  action: string;
  helperText?: string;
  description: string;
  variant?: 'default' | 'primary' | 'destructive' | 'warning';
  iconType?: 'plus' | 'alert' | 'file';
  buttonVariant?: 'default' | 'outline' | 'secondary' | 'link' | 'ghost';
}

export function CallToAction({
  link,
  action,
  title,
  helperText,
  description,
  className,
  variant = 'default',
  iconType = 'plus',
  buttonVariant = 'default',
  ...props
}: CallToActionProps) {
  // Select icon based on iconType
  const IconComponent =
    iconType === 'alert' ? AlertCircle : iconType === 'file' ? FileText : PlusCircle;

  return (
    <div className={cn(callToActionVariants({ variant }), className)} {...props}>
      <div className="rounded-full bg-primary/10 p-4 text-primary">
        <IconComponent className="h-10 w-10" />
      </div>

      <div className="space-y-2">
        <h3 className="text-xl font-semibold">{title}</h3>
        <p className="text-muted-foreground">{description}</p>
        {helperText && <p className="text-sm text-muted-foreground/70">{helperText}</p>}
      </div>

      <Button variant={buttonVariant} size="lg" className="mt-2" asChild>
        <Link href={link}>
          <PlusCircle className="mr-2 h-4 w-4" />
          {action}
        </Link>
      </Button>
    </div>
  );
}

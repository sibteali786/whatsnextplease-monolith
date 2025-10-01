import { BadgeCheck, ChevronsUpDown, Copy, CreditCard, LogOut } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '../ui/dropdown-menu';
import { signout, UserState } from '@/utils/user';
import { useSecureAvatar } from '@/hooks/useAvatarFromS3';
import { useRouter } from 'next/navigation';

interface NavUserProps {
  user: UserState;
}

const SecureAvatar = ({
  url,
  alt,
  className,
}: {
  url: string | null;
  alt: string;
  className?: string;
}) => {
  const { imageUrl, isLoading } = useSecureAvatar(url);

  return (
    <Avatar className={className || 'h-8 w-8 rounded-lg'}>
      <AvatarImage src={imageUrl} alt={alt} className="rounded-lg" />
      <AvatarFallback className="rounded-lg">
        {isLoading ? <span className="animate-pulse">...</span> : alt.substring(0, 2).toUpperCase()}
      </AvatarFallback>
    </Avatar>
  );
};

export const NavUser: React.FC<NavUserProps> = ({ user }) => {
  const router = useRouter();
  return (
    <div>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <div className="flex gap-2 items-center cursor-pointer">
            <SecureAvatar url={user.avatarUrl} alt={user.name ?? 'avatar'} />
            <div className="grid flex-1 text-left text-sm leading-tight">
              <span className="truncate font-semibold">{user.name}</span>
              <span className="truncate text-xs">{user.email}</span>
            </div>
            <ChevronsUpDown className="ml-auto size-4" />
          </div>
        </DropdownMenuTrigger>
        <DropdownMenuContent
          className="w-[--radix-dropdown-menu-trigger-width] min-w-56 rounded-lg"
          align="start"
          sideOffset={4}
        >
          <DropdownMenuLabel className="p-0 font-normal">
            <div className="flex items-center gap-2 px-1 py-1.5 text-sm">
              <SecureAvatar url={user.avatarUrl} alt={user.name ?? 'avatar'} />
              <div className="grid flex-1 text-left leading-tight">
                <span className="truncate font-semibold">{user.name}</span>
                <span className="truncate text-xs">{user.email}</span>
              </div>
            </div>
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuGroup>
            <DropdownMenuItem onClick={() => router.push('/settings/myprofile')}>
              <BadgeCheck className="mr-2" />
              Account
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => router.push('/settings/billing')}>
              <CreditCard className="mr-2" />
              Billing
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => navigator.clipboard.writeText(user.id)}>
              <Copy className="mr-2" />
              Copy User Id
            </DropdownMenuItem>
          </DropdownMenuGroup>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={() => signout()}>
            <LogOut className="mr-2" />
            Log out
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
};

export default NavUser;

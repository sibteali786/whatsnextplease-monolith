import { Bell, ListChecks, MessageSquareText, Search } from "lucide-react";
import { Input } from "./ui/input";
import { ModeToggle } from "@/utils/modeToggle";
import { NavUser } from "./common/NavUser";
import { getCurrentUser } from "@/utils/user";
import Link from "next/link";
import { Button } from "./ui/button";
import { ActiveVerticalMenu } from "./common/ActiveVerticalMenu";

const TopBar = async () => {
  const user = await getCurrentUser();
  return (
    <header className="h-16 bg-white dark:bg-black border flex items-center px-4 sticky top-[24px] rounded-full left-[50%] z-10 ">
      <div className="flex-grow">
        <div className="relative ml-auto flex-1 md:grow-0">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground ml-2" />
          <Input
            type="search"
            placeholder="Search..."
            className="w-full rounded-full bg-background pl-12 md:w-[200px] lg:w-[336px]"
          />
        </div>
        {/* Placeholder for search bar or any top actions */}
      </div>
      <div className="flex flex-row gap-6 items-center justify-around">
        <div className="flex flex-col items-center">
          <ActiveVerticalMenu activePath="/taskOfferings" />
          <Link href="/taskOfferings">
            <Button variant="ghost">
              <ListChecks size={24} className="text-textPrimary" />
            </Button>
          </Link>
        </div>
        <Button variant={"ghost"}>
          <MessageSquareText size={24} className="text-textPrimary" />
        </Button>
        <ModeToggle />
        <div className="flex flex-col items-center">
          <ActiveVerticalMenu activePath="/notifications" />
          <Link href={`/notifications/${user.id}`}>
            <Button variant={"ghost"}>
              <Bell size={24} className="text-textPrimary" />
            </Button>
          </Link>
        </div>
        <div className="ml-auto flex items-center gap-2">
          {/* Profile / Logout options */}
          <NavUser user={user} />
        </div>
        <div className="w-10"></div>
      </div>
    </header>
  );
};

export default TopBar;

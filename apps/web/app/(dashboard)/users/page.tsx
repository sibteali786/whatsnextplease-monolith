import Search from "@/components/Search";
import { Button } from "@/components/ui/button";
import { getUserIds } from "@/utils/userTools";
import { PlusCircle } from "lucide-react";
import Link from "next/link";
import { DataTable } from "./data-table";
import getUsers from "@/db/repositories/users/getUsers";

const fetchUsers = async (cursor: string | null, pageSize: number) => {
  "use server";

  const { users, nextCursor, totalCount } = await getUsers({
    cursor: cursor,
    pageSize: pageSize, // Change page size as required
  });
  return { users, nextCursor, totalCount };
};

export default async function Users() {
  const userIds = await getUserIds();
  return (
    <div className="container mx-auto py-4">
      <div className="flex flex-row justify-between items-center">
        <Search placeholder="Search titles" />
        <Button className="gap-2">
          <PlusCircle />
          <Link href="users/adduser">Add User</Link>
        </Button>
      </div>
      <DataTable fetchData={fetchUsers} userIds={userIds} />
    </div>
  );
}

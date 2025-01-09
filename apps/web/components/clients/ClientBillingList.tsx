import { BillingTable } from "@/components/clients/billing-table";
import { getInvoicesByClientId } from "@/db/repositories/clients/getInvoicesByClientId";
import { getBillingIdsByClientId } from "@/utils/clientActions";

const fetchInvoices = async (
  clientId: string,
  cursor: string | null,
  pageSize: number,
) => {
  "use server";
  const { invoices, success, hasNextCursor, nextCursor, totalCount, message } =
    await getInvoicesByClientId(clientId as string, cursor, pageSize);
  return { invoices, success, hasNextCursor, nextCursor, totalCount, message };
};

export default async function ClientBillingList({
  clientId,
}: {
  clientId: string;
}) {
  const billingIds = await getBillingIdsByClientId(clientId);
  return (
    <div>
      <BillingTable
        fetchData={fetchInvoices}
        billingIds={billingIds.billingIds ?? []}
      />
    </div>
  );
}

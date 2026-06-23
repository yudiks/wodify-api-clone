import { describe, expect, it } from "vitest";
import { prisma } from "@/lib/db";
import { POST as createClient } from "@/app/api/v1/clients/route";
import { GET as listInvoices } from "@/app/api/v1/invoices/route";
import { GET as getInvoice } from "@/app/api/v1/invoices/[id]/route";
import { GET as getTransaction } from "@/app/api/v1/transactions/[id]/route";
import { GET as listDiscounts } from "@/app/api/v1/discounts/route";
import { ctx, makeRequest } from "./helpers";

describe("Financials API", () => {
  it("lists and searches invoices, gets a transaction, lists discounts", async () => {
    const client = await createClient(
      makeRequest("/api/v1/clients", { method: "POST", body: { firstName: "Bill", lastName: "Payer" } })
    ).then((r) => r.json());

    const invoice = await prisma.invoice.create({
      data: { clientId: client.id, amount: 50, status: "Paid" },
    });
    await prisma.transaction.create({
      data: { invoiceId: invoice.id, amount: 50, method: "Card", status: "Completed" },
    });
    await prisma.discount.create({ data: { name: "10% Off", type: "Percent", value: 10 } });

    const list = await listInvoices(makeRequest("/api/v1/invoices")).then((r) => r.json());
    expect(list.total).toBe(1);

    const searched = await listInvoices(
      makeRequest(`/api/v1/invoices?q=${encodeURIComponent("status|eq|'Paid'")}`)
    ).then((r) => r.json());
    expect(searched.total).toBe(1);

    const gotInvoice = await getInvoice(makeRequest(`/api/v1/invoices/${invoice.id}`), ctx(invoice.id));
    expect(gotInvoice.status).toBe(200);

    const missingInvoice = await getInvoice(makeRequest("/api/v1/invoices/999999"), ctx(999999));
    expect(missingInvoice.status).toBe(404);

    const transaction = await prisma.transaction.findFirstOrThrow();
    const gotTransaction = await getTransaction(makeRequest(`/api/v1/transactions/${transaction.id}`), ctx(transaction.id));
    expect(gotTransaction.status).toBe(200);

    const discounts = await listDiscounts(makeRequest("/api/v1/discounts")).then((r) => r.json());
    expect(discounts.total).toBe(1);
    expect(discounts.data[0].name).toBe("10% Off");
  });
});

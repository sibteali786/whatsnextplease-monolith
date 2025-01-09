// mocks/invoiceMocks.ts

export const mockInvoices = [
  {
    id: "invoice1",
    invoiceNumber: "INV-001",
    date: new Date("2023-01-01"),
    amount: 1000.5,
    status: "PAID",
    task: {
      taskCategory: {
        categoryName: "Consulting",
      },
    },
  },
  {
    id: "invoice2",
    invoiceNumber: "INV-002",
    date: new Date("2023-02-01"),
    amount: 2000.75,
    status: "PENDING",
    task: {
      taskCategory: {
        categoryName: "Development",
      },
    },
  },
  {
    id: "invoice3",
    invoiceNumber: "INV-003",
    date: new Date("2023-03-01"),
    amount: 3000.25,
    status: "OVERDUE",
    task: {
      taskCategory: {
        categoryName: "Maintenance",
      },
    },
  },
];

export const expectedInvoices = mockInvoices.map((invoice) => ({
  id: invoice.id,
  invoiceNumber: invoice.invoiceNumber,
  date: invoice.date,
  amount: invoice.amount.toString(),
  status: invoice.status,
  task: {
    categoryName: invoice.task.taskCategory.categoryName,
  },
}));

export const singleMockInvoice = {
  id: "invoice1",
  invoiceNumber: "INV-001",
  date: new Date("2023-01-01"),
  amount: 1000.5,
  status: "PAID",
  task: {
    taskCategory: {
      categoryName: "Consulting",
    },
  },
};

export const singleExpectedInvoice = {
  id: singleMockInvoice.id,
  invoiceNumber: singleMockInvoice.invoiceNumber,
  date: singleMockInvoice.date,
  amount: singleMockInvoice.amount.toString(),
  status: singleMockInvoice.status,
  task: {
    categoryName: singleMockInvoice.task.taskCategory.categoryName,
  },
};

import type { ResourceConfig } from "@/components/ResourceManager";

export const resourceConfigs: ResourceConfig[] = [
  {
    title: "Leads",
    basePath: "/api/v1/leads",
    columns: [
      { key: "id", label: "ID" },
      { key: "firstName", label: "First name" },
      { key: "lastName", label: "Last name" },
      { key: "email", label: "Email" },
      { key: "source", label: "Source" },
      { key: "createdDate", label: "Created" },
    ],
    fields: [
      { key: "firstName", label: "First name", type: "text", required: true },
      { key: "lastName", label: "Last name", type: "text", required: true },
      { key: "email", label: "Email", type: "text" },
      { key: "phone", label: "Phone", type: "text" },
      { key: "source", label: "Source", type: "text" },
    ],
  },
  {
    title: "Clients",
    basePath: "/api/v1/clients",
    columns: [
      { key: "id", label: "ID" },
      { key: "firstName", label: "First name" },
      { key: "lastName", label: "Last name" },
      { key: "email", label: "Email" },
      { key: "isActive", label: "Active" },
      { key: "isSuspended", label: "Suspended" },
    ],
    fields: [
      { key: "firstName", label: "First name", type: "text", required: true },
      { key: "lastName", label: "Last name", type: "text", required: true },
      { key: "email", label: "Email", type: "text" },
      { key: "phone", label: "Phone", type: "text" },
    ],
    deletable: false,
    useMemberModal: true,
  },
  {
    title: "Membership Templates",
    basePath: "/api/v1/membership-templates",
    columns: [
      { key: "id", label: "ID" },
      { key: "name", label: "Name" },
      { key: "description", label: "Description" },
      { key: "price", label: "Price" },
    ],
    fields: [
      { key: "name", label: "Name", type: "text", required: true },
      { key: "description", label: "Description", type: "text" },
      { key: "price", label: "Price", type: "number" },
    ],
  },
  {
    title: "Memberships",
    basePath: "/api/v1/memberships",
    columns: [
      { key: "id", label: "ID" },
      {
        key: "clientId",
        label: "Client",
        nameLookup: {
          basePath: "/api/v1/clients",
          render: (row) => `${row.firstName} ${row.lastName}`,
        },
        linkToResource: "Clients",
      },
      {
        key: "templateId",
        label: "Membership template",
        nameLookup: {
          basePath: "/api/v1/membership-templates",
          render: (row) => String(row.name),
        },
        linkToResource: "Membership Templates",
      },
      { key: "isActive", label: "Active" },
      { key: "autoRenew", label: "Auto-renew" },
    ],
    fields: [
      {
        key: "clientId",
        label: "Client",
        type: "lookup",
        required: true,
        lookup: {
          placeholder: "Search clients by name…",
          fetchOptions: async (query) => {
            const filter = (field: string) =>
              fetch(`/api/v1/clients?q=${field}|like|'${encodeURIComponent(query)}'`).then((r) => r.json());
            const [byFirst, byLast] = await Promise.all([filter("firstName"), filter("lastName")]);
            const byId = new Map<number, { firstName: string; lastName: string }>();
            for (const c of [...(byFirst.data ?? []), ...(byLast.data ?? [])]) {
              byId.set(c.id, c);
            }
            return [...byId.entries()].map(([id, c]) => ({
              id,
              label: `${c.firstName} ${c.lastName}`,
            }));
          },
        },
      },
      {
        key: "templateId",
        label: "Membership template",
        type: "lookup",
        required: true,
        lookup: {
          placeholder: "Search membership templates…",
          fetchOptions: async (query) => {
            const res = await fetch(
              `/api/v1/membership-templates?q=name|like|'${encodeURIComponent(query)}'`
            ).then((r) => r.json());
            return (res.data ?? []).map((t: { id: number; name: string; price: number | null }) => ({
              id: t.id,
              label: t.price != null ? `${t.name} ($${t.price})` : t.name,
            }));
          },
        },
      },
    ],
    deletable: false,
  },
  {
    title: "Invoices",
    basePath: "/api/v1/invoices",
    columns: [
      { key: "id", label: "ID" },
      {
        key: "clientId",
        label: "Client",
        nameLookup: {
          basePath: "/api/v1/clients",
          render: (row) => `${row.firstName} ${row.lastName}`,
        },
        linkToResource: "Clients",
      },
      { key: "amount", label: "Amount" },
      { key: "status", label: "Status" },
      { key: "issueDate", label: "Issued" },
    ],
    fields: [],
    creatable: false,
    deletable: false,
  },
  {
    title: "Discounts",
    basePath: "/api/v1/discounts",
    columns: [
      { key: "id", label: "ID" },
      { key: "name", label: "Name" },
      { key: "type", label: "Type" },
      { key: "value", label: "Value" },
      { key: "isActive", label: "Active" },
    ],
    fields: [],
    creatable: false,
    deletable: false,
  },
  {
    title: "Coaches",
    basePath: "/api/v1/coaches",
    columns: [
      { key: "id", label: "ID" },
      { key: "firstName", label: "First name" },
      { key: "lastName", label: "Last name" },
      { key: "email", label: "Email" },
      { key: "phone", label: "Phone" },
    ],
    fields: [
      { key: "firstName", label: "First name", type: "text", required: true },
      { key: "lastName", label: "Last name", type: "text", required: true },
      { key: "email", label: "Email", type: "text" },
      { key: "phone", label: "Phone", type: "text" },
    ],
  },
  {
    title: "Classes",
    basePath: "/api/v1/classes",
    columns: [
      { key: "id", label: "ID" },
      { key: "name", label: "Name" },
      { key: "program", label: "Program" },
      { key: "startDateTime", label: "Start" },
      { key: "endDateTime", label: "End" },
      { key: "capacity", label: "Capacity" },
      {
        key: "coachId",
        label: "Coach",
        nameLookup: {
          basePath: "/api/v1/coaches",
          render: (row) => `${row.firstName} ${row.lastName}`,
        },
        linkToResource: "Coaches",
      },
    ],
    fields: [
      { key: "name", label: "Name", type: "text", required: true },
      { key: "program", label: "Program", type: "text" },
      { key: "startDateTime", label: "Start", type: "datetime", required: true },
      { key: "endDateTime", label: "End", type: "datetime", required: true },
      { key: "capacity", label: "Capacity", type: "number" },
      { key: "location", label: "Location", type: "text" },
      {
        key: "coachId",
        label: "Coach",
        type: "lookup",
        lookup: {
          placeholder: "Search coaches by name…",
          fetchOptions: async (query) => {
            const filter = (field: string) =>
              fetch(`/api/v1/coaches?q=${field}|like|'${encodeURIComponent(query)}'`).then((r) => r.json());
            const [byFirst, byLast] = await Promise.all([filter("firstName"), filter("lastName")]);
            const byId = new Map<number, { firstName: string; lastName: string }>();
            for (const c of [...(byFirst.data ?? []), ...(byLast.data ?? [])]) {
              byId.set(c.id, c);
            }
            return [...byId.entries()].map(([id, c]) => ({
              id,
              label: `${c.firstName} ${c.lastName}`,
            }));
          },
        },
      },
    ],
    deletable: false,
  },
  {
    title: "Reservations",
    basePath: "/api/v1/reservations",
    columns: [
      { key: "id", label: "ID" },
      {
        key: "classId",
        label: "Class",
        nameLookup: {
          basePath: "/api/v1/classes",
          render: (row) => String(row.name),
        },
        linkToResource: "Classes",
      },
      {
        key: "clientId",
        label: "Client",
        nameLookup: {
          basePath: "/api/v1/clients",
          render: (row) => `${row.firstName} ${row.lastName}`,
        },
        linkToResource: "Clients",
      },
      { key: "status", label: "Status" },
    ],
    fields: [],
    creatable: false,
    deletable: false,
  },
  {
    title: "Sign-ins",
    basePath: "/api/v1/sign-ins",
    columns: [
      { key: "id", label: "ID" },
      {
        key: "classId",
        label: "Class",
        nameLookup: {
          basePath: "/api/v1/classes",
          render: (row) => String(row.name),
        },
        linkToResource: "Classes",
      },
      {
        key: "clientId",
        label: "Client",
        nameLookup: {
          basePath: "/api/v1/clients",
          render: (row) => `${row.firstName} ${row.lastName}`,
        },
        linkToResource: "Clients",
      },
      { key: "signedInAt", label: "Signed in" },
    ],
    fields: [],
    creatable: false,
    deletable: false,
  },
  {
    title: "Workouts",
    basePath: "/api/v1/workouts",
    columns: [
      { key: "id", label: "ID" },
      { key: "name", label: "Name" },
      { key: "type", label: "Type" },
      { key: "description", label: "Description" },
    ],
    fields: [
      { key: "name", label: "Name", type: "text", required: true },
      { key: "type", label: "Type", type: "text" },
      { key: "description", label: "Description", type: "text" },
      { key: "components", label: "Components", type: "text" },
    ],
  },
];

"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";

type Client = {
  id: string;
  name: string;
};

type Service = {
  id: string;
  ref: string;
  name: string;
  detail: string | null;
  includes: string | null;
  price: number | null;
  notes: string | null;
};

type BudgetItem = {
  serviceId: string;
  quantity: number;
};

export default function OrcamentosPage() {
  const router = useRouter();

  const [clients, setClients] = useState<Client[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [selectedClient, setSelectedClient] = useState("");
  const [items, setItems] = useState<BudgetItem[]>([]);
  const [successMessage, setSuccessMessage] = useState("");

  async function loadData() {
    const { data: userData } = await supabase.auth.getUser();

    if (!userData.user) {
      router.push("/login");
      return;
    }

    const { data: clientsData } = await supabase
      .from("clients")
      .select("id, name")
      .order("name", { ascending: true });

    const { data: servicesData } = await supabase
      .from("services")
      .select("*")
      .order("ref", { ascending: true });

    if (clientsData) setClients(clientsData);
    if (servicesData) setServices(servicesData);
  }

  function addItem() {
    setItems([...items, { serviceId: "", quantity: 1 }]);
  }

  function updateItem(index: number, field: keyof BudgetItem, value: string) {
    const updatedItems = [...items];

    updatedItems[index] = {
      ...updatedItems[index],
      [field]: field === "quantity" ? Number(value) : value,
    };

    setItems(updatedItems);
  }

  function removeItem(index: number) {
    setItems(items.filter((_, itemIndex) => itemIndex !== index));
  }

  function getService(serviceId: string) {
    return services.find((service) => service.id === serviceId);
  }

  const subtotal = items.reduce((total, item) => {
    const service = getService(item.serviceId);

    if (!service || service.price === null) return total;

    return total + service.price * item.quantity;
  }, 0);

  async function saveBudget() {
    if (!selectedClient || items.length === 0) {
      alert("Seleciona um cliente e pelo menos um serviço.");
      return;
    }

    const { data: budgetData, error: budgetError } = await supabase
      .from("budgets")
      .insert({
        client_id: selectedClient,
        subtotal_services: subtotal,
        total: subtotal,
        status: "rascunho",
      })
      .select()
      .single();

    if (budgetError || !budgetData) {
      alert(budgetError?.message);
      return;
    }

    const budgetItems = items.flatMap((item) => {
  const service = getService(item.serviceId);

  if (!service || service.price === null) return [];

  return [
    {
      budget_id: budgetData.id,
      service_id: service.id,
      quantity: item.quantity,
      unit_price: service.price,
      subtotal: service.price * item.quantity,
    },
  ];
});

    const { error: itemsError } = await supabase
      .from("budget_items")
      .insert(budgetItems);

    if (itemsError) {
      alert(itemsError.message);
      return;
    }

    setSelectedClient("");
    setItems([]);
    setSuccessMessage("Orçamento guardado com sucesso.");
  }

  useEffect(() => {
    loadData();
  }, []);

  return (
    <main className="min-h-screen bg-slate-950 p-4 text-white md:p-8">
      <div className="mx-auto max-w-7xl">
        <div className="rounded-3xl bg-white p-6 text-slate-950 shadow-xl">
          <p className="text-sm font-medium uppercase tracking-[0.3em] text-sky-500">
            Financeiro
          </p>

          <h1 className="mt-2 text-4xl font-bold tracking-tight md:text-5xl">
            Orçamentos
          </h1>

          {successMessage && (
            <div className="mt-6 rounded-2xl bg-sky-400 px-5 py-4 font-semibold text-slate-950">
              {successMessage}
            </div>
          )}

          <div className="mt-8 flex flex-wrap gap-3">
            <a
              href="/"
              className="rounded-2xl border border-slate-200 px-5 py-3 text-sm font-bold text-slate-950 transition hover:bg-slate-100"
            >
              Dashboard
            </a>

            <a
              href="/aprovacoes"
              className="rounded-2xl border border-slate-200 px-5 py-3 text-sm font-bold text-slate-950 transition hover:bg-slate-100"
            >
              Aprovações
            </a>

            <a
              href="/calendario"
              className="rounded-2xl border border-slate-200 px-5 py-3 text-sm font-bold text-slate-950 transition hover:bg-slate-100"
            >
              Calendário
            </a>

            <a
              href="/orcamentos"
              className="rounded-2xl bg-sky-400 px-5 py-3 text-sm font-bold text-slate-950 transition hover:bg-sky-300"
            >
              Orçamentos
            </a>
          </div>
        </div>

        <section className="mt-8 rounded-3xl bg-white p-6 text-slate-950 shadow-xl">
          <h2 className="text-2xl font-bold">
            Criar orçamento
          </h2>

          <div className="mt-6 grid gap-4">
            <select
              className="rounded-2xl border border-slate-200 bg-slate-50 p-4"
              value={selectedClient}
              onChange={(e) => setSelectedClient(e.target.value)}
            >
              <option value="">Seleciona um cliente</option>

              {clients.map((client) => (
                <option key={client.id} value={client.id}>
                  {client.name}
                </option>
              ))}
            </select>

            <div className="grid gap-4">
              {items.map((item, index) => {
                const service = getService(item.serviceId);

                return (
                  <div
                    key={index}
                    className="grid gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-4 md:grid-cols-[1fr_120px_120px]"
                  >
                    <select
                      className="rounded-2xl border border-slate-200 bg-white p-3"
                      value={item.serviceId}
                      onChange={(e) =>
                        updateItem(index, "serviceId", e.target.value)
                      }
                    >
                      <option value="">Seleciona serviço</option>

                      {services.map((service) => (
                        <option key={service.id} value={service.id}>
                          {service.ref} — {service.name} —{" "}
                          {service.price === null
                            ? "Consultar"
                            : `${service.price}€`}
                        </option>
                      ))}
                    </select>

                    <input
                      type="number"
                      min="1"
                      className="rounded-2xl border border-slate-200 bg-white p-3"
                      value={item.quantity}
                      onChange={(e) =>
                        updateItem(index, "quantity", e.target.value)
                      }
                    />

                    <button
                      onClick={() => removeItem(index)}
                      className="rounded-2xl bg-red-600 px-4 py-3 font-semibold text-white"
                    >
                      Remover
                    </button>

                    {service && (
                      <div className="md:col-span-3 rounded-2xl bg-white p-4 text-sm text-slate-600">
                        <p>
                          <strong>Detalhe:</strong>{" "}
                          {service.detail || "Sem detalhe"}
                        </p>

                        <p>
                          <strong>Inclui:</strong>{" "}
                          {service.includes || "Sem informação"}
                        </p>

                        <p>
                          <strong>Subtotal:</strong>{" "}
                          {service.price === null
                            ? "Consultar"
                            : `${service.price * item.quantity}€`}
                        </p>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            <button
              onClick={addItem}
              className="rounded-2xl border border-slate-200 px-5 py-4 font-bold transition hover:bg-slate-100"
            >
              Adicionar serviço
            </button>

            <div className="rounded-2xl bg-sky-50 p-5">
              <p className="text-sm font-semibold text-sky-600">
                Total estimado
              </p>

              <p className="mt-1 text-4xl font-black">
                {subtotal}€
              </p>
            </div>

            <button
              onClick={saveBudget}
              className="rounded-2xl bg-sky-400 px-5 py-4 font-bold text-slate-950 transition hover:bg-sky-300"
            >
              Guardar orçamento
            </button>
          </div>
        </section>
      </div>
    </main>
  );
}
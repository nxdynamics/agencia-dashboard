"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

type Client = {
  videos_this_month?: number;
  id: string;
  name: string;
  email: string | null;
  plan_id: string | null;
plans: {
  name: string;
  monthly_price: number;
  videos_per_week: number;
  videos_per_month: number;
} | null;
};

type Plan = {
  id: string;
  name: string;
  monthly_price: number;
  videos_per_week: number;
  videos_per_month: number;
};

type Video = {
  video_note: string | null;
caption_note: string | null;
  scheduled_date: string | null;
  id: string;
  title: string;
  status: string;
  client_id: string;
  video_url: string | null;
  caption: string | null;
  video_approval: string;
  caption_approval: string;
  client_comment: string | null;
  clients: {
    name: string;
  } | null;
};

export default function Home() {
  const [plans, setPlans] = useState<Plan[]>([]);
const [selectedPlan, setSelectedPlan] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [clientPassword, setClientPassword] = useState("");
  const [editingVideoId, setEditingVideoId] = useState<string | null>(null);

const [editingVideoTitle, setEditingVideoTitle] = useState("");
const [editingVideoCaption, setEditingVideoCaption] = useState("");
const [editingVideoDate, setEditingVideoDate] = useState("");
const [editingVideoClient, setEditingVideoClient] = useState("");
  const [editingClientId, setEditingClientId] = useState<string | null>(null);
const [editingClientName, setEditingClientName] = useState("");
const [editingClientEmail, setEditingClientEmail] = useState("");
  const [scheduledDate, setScheduledDate] = useState("");
  const router = useRouter();
  const [userEmail, setUserEmail] = useState("");
  const [userRole, setUserRole] = useState("");
  const [profileClientId, setProfileClientId] = useState<string | null>(null);
  const [clients, setClients] = useState<Client[]>([]);
  const [videos, setVideos] = useState<Video[]>([]);
  

  const [clientName, setClientName] = useState("");
  const [clientEmail, setClientEmail] = useState("");

  const [videoTitle, setVideoTitle] = useState("");
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [caption, setCaption] = useState("");
  const [selectedClient, setSelectedClient] = useState("");

async function loadPlans() {
  const { data } = await supabase
    .from("plans")
    .select("*")
    .order("monthly_price", { ascending: true });

  if (data) setPlans(data);
}

  async function loadClients() {
  const { data: clientsData } = await supabase
    .from("clients")
    .select(`
      *,
      plans (
        name,
        monthly_price,
        videos_per_week,
        videos_per_month
      )
    `)
    .order("created_at", { ascending: false });

  if (!clientsData) return;

  const startOfMonth = new Date();
  startOfMonth.setDate(1);
  startOfMonth.setHours(0, 0, 0, 0);

  const { data: videosData } = await supabase
    .from("videos")
    .select("client_id, created_at")
    .gte("created_at", startOfMonth.toISOString());

  const clientsWithCounts = clientsData.map((client) => {
    const videosThisMonth =
      videosData?.filter((video) => video.client_id === client.id).length || 0;

    return {
      ...client,
      videos_this_month: videosThisMonth,
    };
  });

  setClients(clientsWithCounts);
}

  async function loadVideos(role?: string, clientId?: string | null) {
  let query = supabase
    .from("videos")
    .select(`
      *,
      clients (
        name
      )
    `)
    .order("created_at", { ascending: false });

  if (role === "client" && clientId) {
    query = query.eq("client_id", clientId);
  }

  const { data, error } = await query;

  if (error) {
    alert(error.message);
    return;
  }

  if (data) setVideos(data as Video[]);
}

  async function addClient(e: React.FormEvent) {
  e.preventDefault();

  if (!clientName.trim() || !clientEmail || !clientPassword) {
    return;
  }

  const { data: clientData, error: clientError } = await supabase
    .from("clients")
    .insert({
  name: clientName,
  email: clientEmail,
  plan_id: selectedPlan || null,
})
    .select()
    .single();

  if (clientError || !clientData) {
    alert(clientError?.message);
    return;
  }

  const { data: authData, error: authError } =
    await supabase.auth.signUp({
      email: clientEmail,
      password: clientPassword,
    });

  if (authError || !authData.user) {
    alert(authError?.message);
    return;
  }

  const { error: profileError } = await supabase
    .from("profiles")
    .insert({
      id: authData.user.id,
      role: "client",
      client_id: clientData.id,
    });

  if (profileError) {
    alert(profileError.message);
    return;
  }

  setClientName("");
  setClientEmail("");
  setClientPassword("");
  setSelectedPlan("");

  loadClients();
  setSuccessMessage("Cliente criado com sucesso.");
}

  async function addVideo(e: React.FormEvent) {
  e.preventDefault();

  if (!videoTitle || !selectedClient) return;

  let uploadedVideoUrl: string | null = null;

  if (videoFile) {
    const fileName = `${Date.now()}-${videoFile.name}`;

    const { error: uploadError } = await supabase.storage
      .from("videos")
      .upload(fileName, videoFile);

    if (uploadError) {
      alert(uploadError.message);
      return;
    }

    const {
      data: { publicUrl },
    } = supabase.storage
      .from("videos")
      .getPublicUrl(fileName);

    uploadedVideoUrl = publicUrl;
  }

  const { error } = await supabase.from("videos").insert({
    title: videoTitle,
    client_id: selectedClient,
    video_url: uploadedVideoUrl,
    caption: caption || null,
    scheduled_date: scheduledDate || null,
    status: "nao_feito",
    video_approval: "pendente",
    caption_approval: "pendente",
  });

  if (!error) {
    setVideoTitle("");
    setCaption("");
    setScheduledDate("");
    setSelectedClient("");
    setVideoFile(null);

    
    loadVideos();
    setSuccessMessage("Vídeo adicionado com sucesso.");
  } else {
    alert(error.message);
  }
}

  async function updateStatus(videoId: string, status: string) {
    await supabase
      .from("videos")
      .update({ status })
      .eq("id", videoId);

    loadVideos();
  }

  function approvalLabel(value: string) {
    if (value === "aprovado") return "Aprovado";
    if (value === "alteracoes") return "Pediu alterações";
    return "Pendente";
  }
async function deleteVideo(video: Video) {
  const confirmDelete = confirm(
    "Tens a certeza que queres eliminar este vídeo?"
  );

  if (!confirmDelete) return;

  if (video.video_url) {
    const fileName = video.video_url.split("/").pop();

    if (fileName) {
      await supabase.storage
        .from("videos")
        .remove([fileName]);
    }
  }

  const { error } = await supabase
    .from("videos")
    .delete()
    .eq("id", video.id);

  if (error) {
    alert(error.message);
    return;
  }

  loadVideos(userRole, profileClientId);
}
  useEffect(() => {
  async function checkUser() {
    const { data } = await supabase.auth.getUser();

    if (!data.user) {
      router.push("/login");
      return;
    }

    setUserEmail(data.user.email || "");

    const { data: profile } = await supabase
      .from("profiles")
      .select("role, client_id")
      .eq("id", data.user.id)
      .single();

    setUserRole(profile?.role || "client");
    if (profile?.role === "client") {
  router.push("/calendario");
  return;
}
    setProfileClientId(profile?.client_id || null);

    loadClients();
    loadPlans();

    loadVideos(
      profile?.role || "client",
      profile?.client_id || null
    );
  }

  checkUser();
}, []);

 function videosByDate() {
  const grouped: Record<string, Video[]> = {};

  videos.forEach((video) => {
    const date = video.scheduled_date || "Sem data";

    if (!grouped[date]) {
      grouped[date] = [];
    }

    grouped[date].push(video);
  });

  return grouped;
}
async function updateClient() {
  if (!editingClientId) return;

  const { error } = await supabase
    .from("clients")
    .update({
      name: editingClientName,
      email: editingClientEmail || null,
    })
    .eq("id", editingClientId);

  if (error) {
    alert(error.message);
    return;
  }

  setEditingClientId(null);
  setEditingClientName("");
  setEditingClientEmail("");
  loadClients();
  setSuccessMessage("Cliente atualizado com sucesso.");
}
async function updateVideo() {
  if (!editingVideoId) return;

  const { error } = await supabase
    .from("videos")
    .update({
      title: editingVideoTitle,
      caption: editingVideoCaption || null,
      scheduled_date: editingVideoDate || null,
      client_id: editingVideoClient || null,
    })
    .eq("id", editingVideoId);

  if (error) {
    alert(error.message);
    return;
  }

  setEditingVideoId(null);

  loadVideos(userRole, profileClientId);
}
return (
  <main className="min-h-screen bg-slate-950 p-4 text-white md:p-8">
    <div className="mx-auto max-w-7xl">
      <div className="rounded-3xl bg-white p-6 text-slate-950 shadow-xl">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-sm font-medium uppercase tracking-[0.3em] text-sky-500">
              Plataforma interna
            </p>

            <h1 className="mt-2 text-4xl font-bold tracking-tight md:text-5xl">
              Agência Dashboard
            </h1>

            <div className="mt-4 flex flex-wrap gap-3 text-sm text-slate-300">
              <span className="rounded-full border border-slate-200 bg-white/5 px-4 py-2">
                Sessão: {userEmail}
              </span>

              <span className="rounded-full border border-slate-200 bg-white/5 px-4 py-2">
                Cargo: {userRole}
              </span>
            </div>
          </div>

          <button
            onClick={async () => {
              await supabase.auth.signOut();
              router.push("/login");
            }}
            className="rounded-2xl bg-slate-950 px-5 py-3 font-semibold text-white transition hover:bg-slate-800"
          >
            Logout
          </button>
        </div>
{successMessage && (
  <div className="mt-6 rounded-2xl bg-sky-400 px-5 py-4 font-semibold text-slate-950">
    {successMessage}
  </div>
)}
        <div className="mt-8 flex flex-wrap gap-3">
          <a
            href="/"
            className="rounded-2xl bg-white px-5 py-3 text-sm font-semibold text-slate-950"
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
  href="/conta"
  className="rounded-2xl border border-slate-200 px-5 py-3 text-sm font-bold text-slate-950 transition hover:bg-slate-100"
>
  Conta
</a>
        </div>
      </div>

      {userRole === "admin" && (
        <div className="mt-8 grid gap-6 lg:grid-cols-2">
          <form
            onSubmit={addClient}
            className="rounded-3xl border border-slate-200 bg-white p-6 text-slate-950 shadow-xl"
          >
            <h2 className="text-2xl font-bold">
              Adicionar cliente
            </h2>

            <p className="mt-1 text-sm text-slate-500">
              Cria um novo cliente para associar vídeos e aprovações.
            </p>

            <div className="mt-6 flex flex-col gap-4">
              <input
                className="rounded-2xl border border-slate-200 bg-slate-50 p-4 outline-none transition focus:border-slate-900"
                placeholder="Nome do cliente"
                value={clientName}
                onChange={(e) => setClientName(e.target.value)}
              />
              <input
  type="password"
  className="rounded-2xl border border-slate-200 bg-slate-50 p-4 outline-none transition focus:border-slate-900"
  placeholder="Password inicial"
  value={clientPassword}
  onChange={(e) => setClientPassword(e.target.value)}
/>

              <input
                className="rounded-2xl border border-slate-200 bg-slate-50 p-4 outline-none transition focus:border-slate-900"
                placeholder="Email do cliente"
                value={clientEmail}
                onChange={(e) => setClientEmail(e.target.value)}
              />
<select
  className="rounded-2xl border border-slate-200 bg-slate-50 p-4 outline-none transition focus:border-slate-900"
  value={selectedPlan}
  onChange={(e) => setSelectedPlan(e.target.value)}
>
  <option value="">Seleciona um plano</option>

  {plans.map((plan) => (
    <option key={plan.id} value={plan.id}>
      {plan.name} — {plan.monthly_price}€
    </option>
  ))}
</select>
              <button
                className="rounded-2xl bg-slate-950 px-5 py-4 font-semibold text-white transition hover:bg-slate-800"
                type="submit"
              >
                Guardar cliente
              </button>
            </div>
          </form>

          <form
            onSubmit={addVideo}
            className="rounded-3xl border border-slate-200 bg-white p-6 text-slate-950 shadow-xl"
          >
            <h2 className="text-2xl font-bold">
              Adicionar vídeo
            </h2>

            <p className="mt-1 text-sm text-slate-500">
              Agenda uma publicação e associa-a ao cliente certo.
            </p>

            <div className="mt-6 flex flex-col gap-4">
              <input
                className="rounded-2xl border border-slate-200 bg-slate-50 p-4 outline-none transition focus:border-slate-900"
                placeholder="Título do vídeo"
                value={videoTitle}
                onChange={(e) => setVideoTitle(e.target.value)}
              />

              <input
                type="file"
                accept="video/*,image/*"
                className="rounded-2xl border border-slate-200 bg-slate-50 p-4"
                onChange={(e) =>
                  setVideoFile(e.target.files?.[0] || null)
                }
              />

              <textarea
                className="min-h-28 rounded-2xl border border-slate-200 bg-slate-50 p-4 outline-none transition focus:border-slate-900"
                placeholder="Legenda"
                value={caption}
                onChange={(e) => setCaption(e.target.value)}
              />

              <input
                type="date"
                className="rounded-2xl border border-slate-200 bg-slate-50 p-4 outline-none transition focus:border-slate-900"
                value={scheduledDate}
                onChange={(e) => setScheduledDate(e.target.value)}
              />

              <select
                className="rounded-2xl border border-slate-200 bg-slate-50 p-4 outline-none transition focus:border-slate-900"
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

              <button
                className="rounded-2xl bg-slate-950 px-5 py-4 font-semibold text-white transition hover:bg-slate-800"
                type="submit"
              >
                Guardar vídeo
              </button>
            </div>
          </form>
        </div>
      )}

      <section className="mt-8">
  <div className="mb-5">
    <p className="text-sm font-medium uppercase tracking-[0.25em] text-slate-500">
      Clientes
    </p>

    <h2 className="text-3xl font-bold">
      Lista de clientes
    </h2>
  </div>

  <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
    {clients.map((client) => (
  <div
    key={client.id}
    className="rounded-3xl border border-slate-200 bg-white p-5 text-slate-950 shadow-xl"
  >
    {editingClientId === client.id ? (
      <div className="space-y-3">
        <input
          className="w-full rounded-2xl border border-slate-200 bg-slate-50 p-3"
          value={editingClientName}
          onChange={(e) => setEditingClientName(e.target.value)}
        />

        <input
          className="w-full rounded-2xl border border-slate-200 bg-slate-50 p-3"
          value={editingClientEmail}
          onChange={(e) => setEditingClientEmail(e.target.value)}
        />

        <div className="flex gap-2">
          <button
            onClick={updateClient}
            className="rounded-2xl bg-slate-950 px-4 py-2 font-semibold text-white"
          >
            Guardar
          </button>

          <button
            onClick={() => setEditingClientId(null)}
            className="rounded-2xl border border-slate-200 px-4 py-2 font-semibold"
          >
            Cancelar
          </button>
        </div>
      </div>
    ) : (
      <>
        <h3 className="text-xl font-bold">
          {client.name}
        </h3>

        <p className="mt-2 text-slate-600">
          {client.email || "Sem email"}
        </p>
<div className="mt-4 rounded-2xl bg-sky-50 p-4">
  <p className="text-sm font-semibold text-sky-600">
    Plano
  </p>

  <p className="mt-1 font-bold text-slate-950">
    {client.plans?.name || "Sem plano"}
  </p>

  {client.plans && (
    <p className="mt-1 text-sm text-slate-600">
      {client.plans.monthly_price}€/mês · {client.plans.videos_per_week} vídeos/semana · {client.plans.videos_per_month} vídeos/mês
    </p>
  )}
</div>
{client.plans && (
  <div className="mt-4">
    <div className="flex items-center justify-between text-sm">
      <span className="font-semibold text-slate-700">
        Vídeos este mês
      </span>

      <span className="font-bold text-slate-950">
        {client.videos_this_month || 0} / {client.plans.videos_per_month}
      </span>
    </div>

    <div className="mt-2 h-3 overflow-hidden rounded-full bg-slate-200">
      <div
        className="h-full rounded-full bg-sky-400"
        style={{
          width: `${Math.min(
            ((client.videos_this_month || 0) / client.plans.videos_per_month) *
              100,
            100
          )}%`,
        }}
      />
    </div>

    {(client.videos_this_month || 0) > client.plans.videos_per_month && (
      <p className="mt-2 text-sm font-semibold text-red-600">
        Cliente ultrapassou o plano contratado.
      </p>
    )}
  </div>
)}
        <button
          onClick={() => {
            setEditingClientId(client.id);
            setEditingClientName(client.name);
            setEditingClientEmail(client.email || "");
          }}
          className="mt-4 rounded-2xl border border-slate-200 px-4 py-2 font-semibold"
        >
          Editar cliente
        </button>
      </>
    )}
  </div>
))}

    {clients.length === 0 && (
      <div className="rounded-3xl border border-slate-200 bg-white/5 p-10 text-center text-sky-500">
        Ainda não existem clientes.
      </div>
    )}
  </div>
</section>
    </div>
  </main>
);
}
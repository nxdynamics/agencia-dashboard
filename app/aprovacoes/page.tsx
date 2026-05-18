"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

type Video = {
  video_note: string | null;
caption_note: string | null;
    status: string;
    scheduled_date: string | null;
  id: string;
  title: string;
  video_url: string | null;
  caption: string | null;
  video_approval: string;
  caption_approval: string;
  client_comment: string | null;
  clients: {
    name: string;
  } | null;
};
type Client = {
  id: string;
  name: string;
};

export default function AprovacoesPage() {
    const [editingVideoFile, setEditingVideoFile] = useState<File | null>(null);
    const [clients, setClients] = useState<Client[]>([]);
const [editingVideoClient, setEditingVideoClient] = useState("");
    const [editingVideoId, setEditingVideoId] = useState<string | null>(null);

const [editingVideoTitle, setEditingVideoTitle] = useState("");
const [editingVideoCaption, setEditingVideoCaption] = useState("");
const [editingVideoDate, setEditingVideoDate] = useState("");
    const router = useRouter();

const [userEmail, setUserEmail] = useState("");
const [userRole, setUserRole] = useState("");
  const [videos, setVideos] = useState<Video[]>([]);
  const [successMessage, setSuccessMessage] = useState("");
  const [comments, setComments] = useState<Record<string, string>>({});

  async function loadClients() {
  const { data } = await supabase
    .from("clients")
    .select("id, name")
    .order("name", { ascending: true });

  if (data) setClients(data);
}
  async function loadVideos() {
  const { data: userData } = await supabase.auth.getUser();

  if (!userData.user) {
    router.push("/login");
    return;
  }

  setUserEmail(userData.user.email || "");

  const { data: profile } = await supabase
    .from("profiles")
    .select("role, client_id")
    .eq("id", userData.user.id)
    .single();

  setUserRole(profile?.role || "client");

  let query = supabase
    .from("videos")
    .select(`
      *,
      clients (
        name
      )
    `)
    .order("created_at", { ascending: false });

  if (profile?.role === "client") {
  query = query
    .eq("client_id", profile.client_id)
    .eq("status", "feito");
}

  const { data } = await query;

  if (data) setVideos(data as Video[]);
}

async function updateApproval(
  videoId: string,
  field: "video_approval" | "caption_approval",
  value: "aprovado" | "alteracoes"
) {
  await supabase
    .from("videos")
    .update({ [field]: value })
    .eq("id", videoId);

  loadVideos();
  setSuccessMessage("Atualizado com sucesso.");
}

async function saveComment(videoId: string) {
  await supabase
    .from("videos")
    .update({
      client_comment: comments[videoId] || "",
    })
    .eq("id", videoId);

  loadVideos();
  setSuccessMessage("Atualizado com sucesso.");
}
async function updateVideo() {
  if (!editingVideoId) return;

  let newVideoUrl: string | null = null;

  if (editingVideoFile) {
    const fileName = `${Date.now()}-${editingVideoFile.name}`;

    const { error: uploadError } = await supabase.storage
      .from("videos")
      .upload(fileName, editingVideoFile);

    if (uploadError) {
      alert(uploadError.message);
      return;
    }

    const {
      data: { publicUrl },
    } = supabase.storage
      .from("videos")
      .getPublicUrl(fileName);

    newVideoUrl = publicUrl;
  }

  const updateData: {
    title: string;
    caption: string | null;
    scheduled_date: string | null;
    client_id: string | null;
    video_url?: string;
  } = {
    title: editingVideoTitle,
    caption: editingVideoCaption || null,
    scheduled_date: editingVideoDate || null,
    client_id: editingVideoClient || null,
  };

  if (newVideoUrl) {
    updateData.video_url = newVideoUrl;
  }

  const { error } = await supabase
    .from("videos")
    .update(updateData)
    .eq("id", editingVideoId);

  if (error) {
    alert(error.message);
    return;
  }

  setEditingVideoId(null);
  setEditingVideoTitle("");
  setEditingVideoCaption("");
  setEditingVideoDate("");
  setEditingVideoClient("");
  setEditingVideoFile(null);

  loadVideos();
  setSuccessMessage("Vídeo atualizado com sucesso.");
}
async function updateStatus(videoId: string, status: string) {
  const { error } = await supabase
    .from("videos")
    .update({ status })
    .eq("id", videoId);

  if (error) {
    alert(error.message);
    return;
  }

  loadVideos();
  setSuccessMessage("Vídeo atualizado com sucesso.");
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

  loadVideos();
  setSuccessMessage("Vídeo apagado com sucesso.");
}
useEffect(() => {
  loadClients();
loadVideos();
}, []);

  return (
    <main className="min-h-screen bg-slate-950 p-4 text-white md:p-8">
      <div className="mx-auto max-w-7xl">
        <div className="rounded-3xl bg-white p-6 text-slate-950 shadow-xl">
  <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
    <div>
      <p className="text-sm font-medium uppercase tracking-[0.3em] text-sky-500">
        Feedback
      </p>

      <h1 className="mt-2 text-4xl font-bold tracking-tight md:text-5xl">
        Aprovações
      </h1>

      <div className="mt-4 flex flex-wrap gap-3 text-sm text-slate-700">
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
      className="rounded-2xl border border-slate-200 px-5 py-3 text-sm font-semibold text-slate-950 transition hover:bg-slate-100"
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
        <p className="mt-2 text-gray-600">
          Veja o vídeo, leia a legenda e aprove ou peça alterações.
        </p>

        <div className="mt-8 grid gap-6">
          {videos.map((video) => (
            <div
              key={video.id}
              className="rounded-3xl border border-slate-200 bg-white p-6 text-slate-950 shadow-xl"
            >
              <h2 className="text-2xl font-bold">
                {video.title}
              </h2>
              {userRole === "admin" && (
  <button
    onClick={() => {
      setEditingVideoId(video.id);
      setEditingVideoTitle(video.title);
      setEditingVideoCaption(video.caption || "");
      setEditingVideoDate(video.scheduled_date || "");
      setEditingVideoClient(
  clients.find((client) => client.name === video.clients?.name)?.id || ""
);
    }}
    className="mt-3 rounded-2xl border border-slate-200 px-4 py-2 font-semibold"
  >
    Editar vídeo
  </button>
)}
{userRole === "admin" && (
  <button
    onClick={() => deleteVideo(video)}
    className="mt-3 rounded-2xl bg-red-600 px-4 py-2 font-semibold text-white transition hover:bg-red-700"
  >
    Eliminar vídeo
  </button>
)}
{editingVideoId === video.id && (
  <div className="mt-4 space-y-3 rounded-2xl border border-slate-200 bg-slate-50 p-4">
    <input
      className="w-full rounded-2xl border border-slate-200 bg-white p-3"
      value={editingVideoTitle}
      onChange={(e) => setEditingVideoTitle(e.target.value)}
      placeholder="Título"
    />

    <textarea
      className="min-h-28 w-full rounded-2xl border border-slate-200 bg-white p-3"
      value={editingVideoCaption}
      onChange={(e) => setEditingVideoCaption(e.target.value)}
      placeholder="Legenda"
    />

    <input
      type="date"
      className="w-full rounded-2xl border border-slate-200 bg-white p-3"
      value={editingVideoDate}
      onChange={(e) => setEditingVideoDate(e.target.value)}
    />
<select
  className="w-full rounded-2xl border border-slate-200 bg-white p-3"
  value={editingVideoClient}
  onChange={(e) => setEditingVideoClient(e.target.value)}
>
  <option value="">Seleciona um cliente</option>

  {clients.map((client) => (
    <option key={client.id} value={client.id}>
      {client.name}
    </option>
  ))}
</select>
<input
  type="file"
  accept="video/*"
  className="w-full rounded-2xl border border-slate-200 bg-white p-3"
  onChange={(e) => setEditingVideoFile(e.target.files?.[0] || null)}
/>
    <div className="flex gap-2">
      <button
        onClick={updateVideo}
        className="rounded-2xl bg-sky-400 text-slate-950 hover:bg-sky-300 px-4 py-2 font-semibold text-white"
      >
        Guardar alterações
      </button>

      <button
        onClick={() => setEditingVideoId(null)}
        className="rounded-2xl border border-slate-200 px-5 py-3 text-sm font-semibold text-slate-950 transition hover:bg-slate-100"
      >
        Cancelar
      </button>
    </div>
  </div>
)}

              <p className="mt-1 text-gray-600">
                Cliente: {video.clients?.name || "Sem cliente"}
              </p>
              <p className="text-gray-600">
                Data: {video.scheduled_date || "Sem data"}
                </p>

              {video.video_url && (
                <video
                  controls
                  className="mt-5 w-full rounded-xl"
                >
                  <source src={video.video_url} />
                </video>
              )}

              <div className="mt-6">
                <h3 className="font-semibold">
                  Legenda
                </h3>

                <p className="mt-2 whitespace-pre-wrap rounded-xl bg-gray-50 p-4 text-gray-700">
                  {video.caption || "Sem legenda."}
                </p>
                {userRole === "admin" && (
  <div className="mt-4 grid gap-4 md:grid-cols-2">
    <div className="rounded-xl bg-sky-50 p-4">
      <h3 className="font-semibold text-slate-950">
        Nota do vídeo
      </h3>

      <p className="mt-2 whitespace-pre-wrap text-slate-700">
        {video.video_note || "Sem nota do vídeo."}
      </p>
    </div>

    <div className="rounded-xl bg-sky-50 p-4">
      <h3 className="font-semibold text-slate-950">
        Nota da legenda
      </h3>

      <p className="mt-2 whitespace-pre-wrap text-slate-700">
        {video.caption_note || "Sem nota da legenda."}
      </p>
    </div>
  </div>
)}
              </div>

              <div className="mt-6 grid gap-4 md:grid-cols-2">
                <div className="rounded-xl border p-4">
                  <h3 className="font-semibold">
                    Aprovação do vídeo
                  </h3>

                  <p className="mt-1 text-sm text-gray-600">
                    Estado: {video.video_approval}
                  </p>
                  {userRole === "admin" && (
  <select
    className="mt-3 rounded-2xl border border-slate-200 bg-white p-3 text-slate-950"
    value={video.status}
    onChange={(e) => updateStatus(video.id, e.target.value)}
  >
    <option value="nao_feito">Não feito</option>
    <option value="feito">Feito</option>
  </select>
)}

                  <div className="mt-4 flex gap-3">
                    <button
                      onClick={() =>
                        updateApproval(
                          video.id,
                          "video_approval",
                          "aprovado"
                        )
                      }
                      className="rounded-lg bg-black px-4 py-2 text-white"
                    >
                      Aprovar vídeo
                    </button>

                    <button
                      onClick={() =>
                        updateApproval(
                          video.id,
                          "video_approval",
                          "alteracoes"
                        )
                      }
                      className="rounded-lg border px-4 py-2"
                    >
                      Pedir alterações
                    </button>
                  </div>
                </div>

                <div className="rounded-xl border p-4">
                  <h3 className="font-semibold">
                    Aprovação da legenda
                  </h3>

                  <p className="mt-1 text-sm text-gray-600">
                    Estado: {video.caption_approval}
                  </p>

                  <div className="mt-4 flex gap-3">
                    <button
                      onClick={() =>
                        updateApproval(
                          video.id,
                          "caption_approval",
                          "aprovado"
                        )
                      }
                      className="rounded-lg bg-black px-4 py-2 text-white"
                    >
                      Aprovar legenda
                    </button>

                    <button
                      onClick={() =>
                        updateApproval(
                          video.id,
                          "caption_approval",
                          "alteracoes"
                        )
                      }
                      className="rounded-lg border px-4 py-2"
                    >
                      Pedir alterações
                    </button>
                  </div>
                </div>
              </div>

              <div className="mt-6">
                <h3 className="font-semibold">
                  Comentário
                </h3>

                <textarea
                  className="mt-2 min-h-28 w-full rounded-xl border p-3"
                  placeholder="Escreva aqui o comentário..."
                  value={comments[video.id] ?? video.client_comment ?? ""}
                  onChange={(e) =>
                    setComments({
                      ...comments,
                      [video.id]: e.target.value,
                    })
                  }
                />

                <button
                  onClick={() => saveComment(video.id)}
                  className="mt-3 rounded-lg bg-black px-5 py-3 text-white"
                >
                  Guardar comentário
                </button>
              </div>
            </div>
          ))}

          {videos.length === 0 && (
            <p className="text-gray-500">
              Ainda não existem vídeos para aprovação.
            </p>
          )}
        </div>
      </div>
    </main>
  );
}
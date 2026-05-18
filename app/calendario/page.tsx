"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";

type Video = {
    video_approval: string;
caption_approval: string;
video_note: string | null;
caption_note: string | null;
  id: string;
  title: string;
  status: string;
  scheduled_date: string | null;
  video_url: string | null;
  caption: string | null;
  clients: {
    name: string;
  } | null;
};

export default function CalendarioPage() {
  const router = useRouter();
const [videoNotes, setVideoNotes] = useState<Record<string, string>>({});
const [captionNotes, setCaptionNotes] = useState<Record<string, string>>({});
  const [videos, setVideos] = useState<Video[]>([]);
  const [successMessage, setSuccessMessage] = useState("");
  const [selectedDate, setSelectedDate] = useState("");
  const [userRole, setUserRole] = useState("");
  const [userEmail, setUserEmail] = useState("");

  const [currentDate, setCurrentDate] = useState(new Date());

const year = currentDate.getFullYear();
const month = currentDate.getMonth();

  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const daysInMonth = lastDay.getDate();
  const startDay = firstDay.getDay();

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
      .not("scheduled_date", "is", null)
      .order("scheduled_date", { ascending: true });

    if (profile?.role === "client") {
      query = query
        .eq("client_id", profile.client_id)
        .eq("status", "feito");
    }

    const { data } = await query;

    if (data) setVideos(data as Video[]);
  }

  function formatDate(day: number) {
    return `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
  }

  function videosForDate(date: string) {
    return videos.filter((video) => video.scheduled_date === date);
  }
async function updateApproval(
  videoId: string,
  field: "video_approval" | "caption_approval",
  value: "aprovado" | "alterações"
) {
  await supabase
    .from("videos")
    .update({ [field]: value })
    .eq("id", videoId);

  loadVideos();
}
async function saveNotes(videoId: string) {
  await supabase
    .from("videos")
    .update({
      video_note: videoNotes[videoId] || "",
      caption_note: captionNotes[videoId] || "",
    })
    .eq("id", videoId);

  loadVideos();
  setSuccessMessage("Atualizado com sucesso.");
}
  useEffect(() => {
    loadVideos();
  }, []);

  const monthName = currentDate.toLocaleDateString("pt-PT", {
  month: "long",
  year: "numeric",
});

  const selectedVideos = selectedDate ? videosForDate(selectedDate) : [];

 return (
  <main className="min-h-screen bg-slate-950 p-4 text-white md:p-8">
    <div className="mx-auto max-w-7xl">
      <div className="rounded-3xl bg-white p-6 text-slate-950 shadow-xl">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-sm font-medium uppercase tracking-[0.3em] text-sky-500">
              Planeamento
            </p>

            <h1 className="mt-2 text-4xl font-bold tracking-tight md:text-5xl">
              Calendário
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
          {userRole === "admin" && (
            <>
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
            </>
          )}

          <a
            href="/calendario"
            className="rounded-2xl bg-white px-5 py-3 text-sm font-semibold text-slate-950"
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

      <div className="mt-8 rounded-3xl bg-white p-5 text-slate-950 shadow-xl md:p-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <button
            onClick={() =>
              setCurrentDate(new Date(year, month - 1, 1))
            }
            className="rounded-2xl border border-slate-200 px-5 py-3 font-semibold transition hover:bg-slate-100"
          >
            ← Mês anterior
          </button>

          <h2 className="text-center text-3xl font-bold capitalize">
            {monthName}
          </h2>

          <button
            onClick={() =>
              setCurrentDate(new Date(year, month + 1, 1))
            }
            className="rounded-2xl border border-slate-200 px-5 py-3 font-semibold transition hover:bg-slate-100"
          >
            Próximo mês →
          </button>
        </div>

        <div className="mt-8 grid grid-cols-7 gap-2 text-center text-xs font-bold uppercase tracking-wide text-sky-500 md:text-sm">
          <div>Dom</div>
          <div>Seg</div>
          <div>Ter</div>
          <div>Qua</div>
          <div>Qui</div>
          <div>Sex</div>
          <div>Sáb</div>
        </div>

        <div className="mt-3 grid grid-cols-7 gap-2">
          {Array.from({ length: startDay }).map((_, index) => (
            <div key={`empty-${index}`} />
          ))}

          {Array.from({ length: daysInMonth }).map((_, index) => {
            const day = index + 1;
            const date = formatDate(day);
            const count = videosForDate(date).length;

            return (
              <button
                type="button"
                key={date}
                onClick={() => setSelectedDate(date)}
                className={`min-h-24 rounded-2xl border p-2 text-left transition md:min-h-28 md:p-3 ${
                  selectedDate === date
                    ? "border-slate-950 bg-slate-950 text-white"
                    : "border-slate-200 bg-slate-50 hover:bg-slate-100"
                }`}
              >
                <p className="text-lg font-bold">{day}</p>

                {count > 0 ? (
                  <p
                    className={`mt-2 inline-block rounded-full px-2 py-1 text-xs font-semibold ${
                      selectedDate === date
                        ? "bg-white text-slate-950"
                        : "bg-slate-950 text-white"
                    }`}
                  >
                    {count} publicação{count > 1 ? "ões" : ""}
                  </p>
                ) : (
                  <p
                    className={`mt-2 text-xs ${
                      selectedDate === date
                        ? "text-slate-300"
                        : "text-sky-500"
                    }`}
                  >
                    Sem publicações
                  </p>
                )}
              </button>
            );
          })}
        </div>
      </div>

      <section className="mt-8 rounded-3xl bg-white p-5 text-slate-950 shadow-xl md:p-6">
        <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-sm font-medium uppercase tracking-[0.25em] text-sky-500">
              Publicações
            </p>

            <h2 className="text-3xl font-bold">
              {selectedDate
                ? `Publicações de ${selectedDate}`
                : "Seleciona um dia no calendário"}
            </h2>
          </div>

          {selectedDate && (
            <p className="text-sm text-slate-500">
              {selectedVideos.length} publicação
              {selectedVideos.length === 1 ? "" : "ões"}
            </p>
          )}
        </div>

        <div className="mt-6 grid gap-5">
          {selectedVideos.map((video) => (
            <div
              key={video.id}
              className="rounded-3xl border border-slate-200 bg-slate-50 p-5"
            >
              <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
                <div>
                  <h3 className="text-2xl font-bold">
                    {video.title}
                  </h3>

                  <div className="mt-3 flex flex-wrap gap-2 text-sm">
                    <span className="rounded-full bg-white px-3 py-1 text-slate-700">
                      Cliente: {video.clients?.name || "Sem cliente"}
                    </span>

                    <span className="rounded-full bg-white px-3 py-1 text-slate-700">
                      Estado: {video.status === "feito" ? "Feito" : "Não feito"}
                    </span>
                  </div>

                  {video.video_url && (
  video.video_url.match(/\.(mp4|mov|webm)$/i) ? (
    <video
      controls
      className="mt-5 w-full rounded-2xl border border-slate-200 bg-black"
    >
      <source src={video.video_url} />
    </video>
  ) : (
    <img
      src={video.video_url}
      alt={video.title}
      className="mt-5 w-full rounded-2xl border border-slate-200"
    />
  )
)}

                  {video.caption && (
                    <div className="mt-5 rounded-2xl bg-white p-4">
                      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-sky-500">
                        Legenda
                      </p>

                      <p className="mt-2 whitespace-pre-wrap text-slate-700">
                        {video.caption}
                      </p>
                    </div>
                  )}
                </div>

                <div className="space-y-4">
                  <div className="rounded-2xl bg-white p-4">
                    <p className="text-sm font-semibold text-slate-500">
                      Estado do vídeo
                    </p>

                    <p className="mt-1 text-xl font-bold">
                      {video.video_approval}
                    </p>

                    <textarea
                      className="mt-4 min-h-24 w-full rounded-2xl border border-slate-200 bg-slate-50 p-3 outline-none transition focus:border-slate-900"
                      placeholder="Notas sobre o vídeo..."
                      value={videoNotes[video.id] ?? video.video_note ?? ""}
                      onChange={(e) =>
                        setVideoNotes({
                          ...videoNotes,
                          [video.id]: e.target.value,
                        })
                      }
                    />

                    <div className="mt-3 grid gap-2">
                      <button
                        onClick={() =>
                          updateApproval(
                            video.id,
                            "video_approval",
                            "aprovado"
                          )
                        }
                        className="rounded-2xl bg-slate-950 px-4 py-3 font-semibold text-white transition hover:bg-slate-800"
                      >
                        Aprovar vídeo
                      </button>

                      <button
                        onClick={() =>
                          updateApproval(
                            video.id,
                            "video_approval",
                            "alterações"
                          )
                        }
                        className="rounded-2xl border border-slate-200 px-4 py-3 font-semibold transition hover:bg-slate-100"
                      >
                        Pedir alterações
                      </button>
                    </div>
                  </div>

                  <div className="rounded-2xl bg-white p-4">
                    <p className="text-sm font-semibold text-slate-500">
                      Estado da legenda
                    </p>

                    <p className="mt-1 text-xl font-bold">
                      {video.caption_approval}
                    </p>

                    <textarea
                      className="mt-4 min-h-24 w-full rounded-2xl border border-slate-200 bg-slate-50 p-3 outline-none transition focus:border-slate-900"
                      placeholder="Notas sobre a legenda..."
                      value={
                        captionNotes[video.id] ?? video.caption_note ?? ""
                      }
                      onChange={(e) =>
                        setCaptionNotes({
                          ...captionNotes,
                          [video.id]: e.target.value,
                        })
                      }
                    />

                    <div className="mt-3 grid gap-2">
                      <button
                        onClick={() =>
                          updateApproval(
                            video.id,
                            "caption_approval",
                            "aprovado"
                          )
                        }
                        className="rounded-2xl bg-slate-950 px-4 py-3 font-semibold text-white transition hover:bg-slate-800"
                      >
                        Aprovar legenda
                      </button>

                      <button
                        onClick={() =>
                          updateApproval(
                            video.id,
                            "caption_approval",
                            "alterações"
                          )
                        }
                        className="rounded-2xl border border-slate-200 px-4 py-3 font-semibold transition hover:bg-slate-100"
                      >
                        Pedir alterações
                      </button>
                    </div>
                  </div>

                  <button
                    onClick={() => saveNotes(video.id)}
                    className="w-full rounded-2xl bg-slate-950 px-5 py-4 font-semibold text-white transition hover:bg-slate-800"
                  >
                    Guardar notas
                  </button>
                </div>
              </div>
            </div>
          ))}

          {selectedVideos.length === 0 && (
            <div className="rounded-3xl border border-slate-200 bg-slate-50 p-10 text-center text-slate-500">
              Não existem publicações neste dia.
            </div>
          )}
        </div>
      </section>
    </div>
  </main>
);
}
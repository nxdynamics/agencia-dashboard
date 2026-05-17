"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";

export default function ContaPage() {
  const router = useRouter();

  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  async function updatePassword(e: React.FormEvent) {
    e.preventDefault();

    if (newPassword.length < 6) {
      alert("A password deve ter pelo menos 6 caracteres.");
      return;
    }

    if (newPassword !== confirmPassword) {
      alert("As passwords não coincidem.");
      return;
    }

    const { error } = await supabase.auth.updateUser({
      password: newPassword,
    });

    if (error) {
      alert(error.message);
      return;
    }

    alert("Password alterada com sucesso.");
    setNewPassword("");
    setConfirmPassword("");
    router.push("/calendario");
  }

  return (
    <main className="min-h-screen bg-slate-950 p-4 text-white md:p-8">
      <div className="mx-auto max-w-xl">
        <div className="rounded-3xl bg-white p-6 text-slate-950 shadow-xl">
          <p className="text-sm font-bold uppercase tracking-[0.25em] text-sky-500">
            Conta
          </p>

          <h1 className="mt-2 text-4xl font-black">
            Alterar password
          </h1>

          <form onSubmit={updatePassword} className="mt-8 space-y-4">
            <input
              type="password"
              className="w-full rounded-2xl border border-slate-200 bg-slate-50 p-4"
              placeholder="Nova password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
            />

            <input
              type="password"
              className="w-full rounded-2xl border border-slate-200 bg-slate-50 p-4"
              placeholder="Confirmar nova password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
            />

            <button
              type="submit"
              className="w-full rounded-2xl bg-sky-400 px-5 py-4 font-bold text-slate-950 transition hover:bg-sky-300"
            >
              Guardar nova password
            </button>
          </form>
        </div>
      </div>
    </main>
  );
}
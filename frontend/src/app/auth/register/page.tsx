"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { register } from "@/shared/auth/useAuth";

export default function RegisterPage() {
  const router = useRouter();
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");

    const form = e.currentTarget;
    const email = (form.elements.namedItem("email") as HTMLInputElement).value;
    const password = (form.elements.namedItem("password") as HTMLInputElement).value;

    try {
      await register(email, password);
      router.push("/");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Произошла ошибка");
    }
  }

  return (
    <div
      className="min-h-screen flex items-center justify-center px-4"
      style={{
        background: `linear-gradient(
          to bottom right,
          var(--color-background-start),
          var(--color-background-mid),
          var(--color-background-end)
        )`,
      }}
    >
      <div className="bg-white/80 backdrop-blur-xl shadow-xl rounded-3xl p-10 w-full max-w-md border border-white/30 animate-fadeUp">

        {/* Назад button */}
        <button
          onClick={() => router.back()}
          className="flex items-center text-[var(--color-text-dark)] mb-4 hover:opacity-80 transition-all duration-300 animate-fadeUp"
        >
          <span className="text-xl mr-1">←</span> Назад
        </button>

        {/* LOGO */}
        <div className="flex justify-center mb-6">
          <img
            src="/logo.svg"
            alt="Travel App logo"
            className="w-20 h-20 animate-softPop"
          />
        </div>

        <h1 className="text-3xl font-bold text-center mb-2" style={{ color: "var(--color-text-dark)" }}>
          Создание аккаунта
        </h1>

        <p className="text-center mb-6" style={{ color: "var(--color-text-dark)" }}>
          Заполните данные для регистрации
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">

          <input
            name="email"
            type="email"
            placeholder="Почта"
            required
            className="w-full px-4 py-3 rounded-xl border shadow-inner focus:outline-none focus:ring-2"
            style={{
              backgroundColor: "rgba(255,255,255,0.6)",
              borderColor: "var(--color-map-stroke)",
              color: "var(--color-text-dark)",
            }}
          />

          <input
            name="password"
            type="password"
            placeholder="Пароль"
            required
            className="w-full px-4 py-3 rounded-xl border shadow-inner focus:outline-none focus:ring-2"
            style={{
              backgroundColor: "rgba(255,255,255,0.6)",
              borderColor: "var(--color-map-stroke)",
              color: "var(--color-text-dark)",
            }}
          />

          {error && (
            <p className="text-red-600 text-sm text-center">
              {error}
            </p>
          )}

          <button
            type="submit"
            className="w-full py-3 text-white font-semibold rounded-xl shadow-md transition-all duration-300 hover:scale-[1.03]"
            style={{
              backgroundColor: "var(--color-primary)",
            }}
            onMouseOver={(e) =>
              (e.currentTarget.style.backgroundColor = "var(--color-primary-hover)")
            }
            onMouseOut={(e) =>
              (e.currentTarget.style.backgroundColor = "var(--color-primary)")
            }
          >
            Зарегистрироваться
          </button>
        </form>

        <p
          className="text-center text-sm mt-5"
          style={{ color: "var(--color-text-dark)" }}
        >
          Уже есть аккаунт?{" "}
          <Link href="/auth/login" style={{ color: "var(--color-text-dark)" }}>
            Войти
          </Link>
        </p>
      </div>
    </div>
  );
}

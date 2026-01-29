"use client";

import { useState } from "react";
import Link from "next/link";

export default function Home() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <header className="bg-brand-olive text-white py-4 px-4 md:px-6 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          {/* Mobile menu button + Logo */}
          <div className="flex items-center gap-4">
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden w-8 h-8 flex flex-col justify-center items-center gap-1.5"
              aria-label="Меню"
            >
              <span className="w-6 h-0.5 bg-white transition-all"></span>
              <span className="w-6 h-0.5 bg-white transition-all"></span>
              <span className="w-6 h-0.5 bg-white transition-all"></span>
            </button>
            <img
              src="/logo.svg"
              alt="Книгодар"
              className="h-8 md:h-9 w-auto"
            />
          </div>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex gap-6 lg:gap-8 text-sm lg:text-base">
            <a href="#how-it-works" className="hover:underline">
              Как это работает
            </a>
            <a href="#examples" className="hover:underline">
              Примеры
            </a>
            <a href="#questions" className="hover:underline">
              Вопросы
            </a>
            <Link href="/account/albums" className="hover:underline">
              Мои альбомы
            </Link>
            <Link href="/login" className="hover:underline">
              Войти
            </Link>
          </nav>

          {/* Mobile: Settings icon (optional) */}
          <button className="md:hidden w-8 h-8" aria-label="Настройки">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </button>
        </div>
      </header>

      {/* Mobile Menu Overlay */}
      {mobileMenuOpen && (
        <>
          <div
            className="fixed inset-0 bg-black bg-opacity-50 z-40 md:hidden"
            onClick={() => setMobileMenuOpen(false)}
          ></div>
          <div className="fixed top-0 left-0 bottom-0 w-72 bg-white z-50 shadow-xl md:hidden">
            <div className="p-6">
              <div className="flex justify-between items-center mb-8">
                <h2 className="text-xl font-serif font-bold">Меню</h2>
                <button
                  onClick={() => setMobileMenuOpen(false)}
                  className="w-8 h-8 flex items-center justify-center"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              <nav className="flex flex-col gap-4 text-lg">
                <a
                  href="#how-it-works"
                  className="py-2 hover:text-brand-orange transition"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  Как это работает
                </a>
                <a
                  href="#examples"
                  className="py-2 hover:text-brand-orange transition"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  Примеры
                </a>
                <a
                  href="#questions"
                  className="py-2 hover:text-brand-orange transition"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  Вопросы
                </a>
                <Link
                  href="/account/albums"
                  className="py-2 hover:text-brand-orange transition"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  Мои альбомы
                </Link>
                <Link
                  href="/login"
                  className="py-2 hover:text-brand-orange transition"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  Войти
                </Link>
              </nav>
            </div>
          </div>
        </>
      )}

      {/* Hero Section */}
      <main className="flex-1 px-6 py-16 md:px-8 md:py-20">
        <div className="max-w-6xl mx-auto">
          {/* Text Section */}
          <div className="mb-16 md:mb-20">
            <h2 className="text-3xl md:text-4xl lg:text-[2.75rem] font-serif font-bold leading-tight mb-8 md:mb-10">
              <span className="block uppercase text-left">ФОТОАЛЬБОМ,</span>
              <span className="block uppercase text-right">КОТОРЫЙ СОХРАНИТ</span>
              <span className="block text-brand-green uppercase text-right">— ВАШИ ИСТОРИИ</span>
            </h2>
            <p className="text-sm md:text-base text-gray-600 mb-8 md:mb-10 leading-relaxed max-w-xl font-light">
              Создаём профессиональные фотокниги, отображающие историю вашей семьи.
              Подарок, который тронет сердце и сохранится на всю жизнь.
            </p>
            <p className="text-sm md:text-base font-bold mb-10 md:mb-12 text-foreground text-center">
              PDF за 10 минут, печатный альбом за 5-7 дней
            </p>
            <div className="text-center">
              <Link
                href="/editor"
                className="btn-gradient inline-block px-12 md:px-14 py-3.5 md:py-4 text-base md:text-lg text-white font-semibold"
              >
                Создать альбом
              </Link>
            </div>
          </div>

          {/* Album Examples Grid */}
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4 md:gap-5 max-w-2xl md:max-w-none">
            {[1, 2, 3, 4].map((i) => (
              <div
                key={i}
                className="aspect-square bg-brand-gray rounded-lg md:rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-shadow"
              >
                <img
                  src={`/examples/example-${i}.jpg`}
                  alt={`Пример фотоальбома ${i}`}
                  className="w-full h-full object-cover"
                />
              </div>
            ))}
          </div>
        </div>
      </main>

      {/* Placeholder sections */}
      <section id="how-it-works" className="bg-white py-20 md:py-24 px-6 md:px-8">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-3xl md:text-4xl font-serif font-bold mb-4 text-center text-foreground">
            Как заказать книгу?
          </h2>
          <p className="text-gray-500 text-center text-sm md:text-base">Содержание раздела в разработке</p>
        </div>
      </section>

      <section id="examples" className="py-20 md:py-24 px-6 md:px-8">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-3xl md:text-4xl font-serif font-bold mb-4 text-center text-foreground">
            Примеры
          </h2>
          <p className="text-gray-500 text-center text-sm md:text-base">Содержание раздела в разработке</p>
        </div>
      </section>

      <section id="questions" className="bg-white py-20 md:py-24 px-6 md:px-8">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-3xl md:text-4xl font-serif font-bold mb-4 text-center text-foreground">
            Вопросы
          </h2>
          <p className="text-gray-500 text-center text-sm md:text-base">Содержание раздела в разработке</p>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-800 text-white py-10 md:py-12 px-6 md:px-8 text-center">
        <div className="max-w-6xl mx-auto">
          <p className="text-sm md:text-base font-light">© 2026 КНИГОДАР. Все права защищены.</p>
          <p className="mt-2 text-xs md:text-sm opacity-70 font-light">
            ИП Мурзаков Артур Александрович | ИНН: 540961931745
          </p>
        </div>
      </footer>
    </div>
  );
}

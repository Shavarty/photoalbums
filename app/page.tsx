"use client";

import { useState } from "react";
import Link from "next/link";

export default function Home() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <header className="bg-brand-olive text-white py-3 px-4 md:px-6 lg:px-24 sticky top-0 z-50 shadow-lg">
        <div className="max-w-[1400px] mx-auto flex justify-between items-center">
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
            <Link href="/">
              <img
                src="/logo.svg"
                alt="Книгодар"
                className="h-8 md:h-9 w-auto"
              />
            </Link>
          </div>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex gap-6 lg:gap-8 text-sm font-bold uppercase">
            <a href="#how-it-works" className="hover:opacity-70 transition-opacity">
              Как это работает
            </a>
            <a href="#examples" className="hover:opacity-70 transition-opacity">
              Примеры
            </a>
            <a href="#questions" className="hover:opacity-70 transition-opacity">
              Вопросы
            </a>
          </nav>

          {/* Desktop: CTA Buttons + Icons */}
          <div className="hidden md:flex items-center gap-2">
            <Link
              href="/editor"
              className="btn-gradient px-5 py-1.5 text-white font-semibold text-sm whitespace-nowrap"
            >
              Создать альбом
            </Link>
            <button className="w-8 h-8 hover:opacity-70 transition-opacity ml-1" aria-label="Telegram">
              <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm4.64 6.8c-.15 1.58-.8 5.42-1.13 7.19-.14.75-.42 1-.68 1.03-.58.05-1.02-.38-1.58-.75-.88-.58-1.38-.94-2.23-1.5-.99-.65-.35-1.01.22-1.59.15-.15 2.71-2.48 2.76-2.69a.2.2 0 00-.05-.18c-.06-.05-.14-.03-.21-.02-.09.02-1.49.95-4.22 2.79-.4.27-.76.41-1.08.4-.36-.01-1.04-.2-1.55-.37-.63-.2-1.12-.31-1.08-.66.02-.18.27-.36.74-.55 2.92-1.27 4.86-2.11 5.83-2.51 2.78-1.16 3.35-1.36 3.73-1.36.08 0 .27.02.39.12.1.08.13.19.14.27-.01.06.01.24 0 .38z"/>
              </svg>
            </button>
            <button className="w-8 h-8 hover:opacity-70 transition-opacity" aria-label="Настройки">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </button>
          </div>

          {/* Mobile: Settings icon */}
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
                <div className="pt-4 border-t border-gray-200 mt-2 flex flex-col gap-3">
                  <Link
                    href="/editor"
                    className="hover:text-brand-orange transition"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    Создать фотоальбом
                  </Link>
                </div>
              </nav>
            </div>
          </div>
        </>
      )}

      <main className="flex-1">
        {/* Photo Albums Section */}
        <section className="px-6 py-8 md:px-24 md:py-16">
          <div className="max-w-[1400px] mx-auto">
            {/* Mobile Layout */}
            <div className="md:hidden">
              {/* Text Section */}
              <div className="mb-8">
                <h2 className="text-2xl font-serif font-bold leading-tight mb-5">
                  <span className="block uppercase text-left">ФОТОАЛЬБОМ, КОТОРЫЙ СОХРАНИТ</span>
                  <span className="block text-brand-green uppercase text-right">— ВАШИ ИСТОРИИ</span>
                </h2>
                <p className="text-sm text-gray-600 mb-5 leading-relaxed max-w-xl font-light">
                  Создаём профессиональные фотокниги, отображающие историю вашей семьи.
                  Подарок, который тронет сердце и сохранится на всю жизнь.
                </p>
                <p className="text-sm font-bold mb-6 text-foreground text-center">
                  PDF за 10 минут, печатный альбом за 5-7 дней
                </p>
                <div className="text-center">
                  <Link
                    href="/editor"
                    className="btn-gradient inline-block px-12 py-3 text-base text-white font-semibold"
                  >
                    Создать альбом
                  </Link>
                </div>
              </div>

              {/* Album Examples Grid */}
              <div className="grid grid-cols-2 gap-3 max-w-2xl">
                {[1, 2, 3, 4].map((i) => (
                  <div
                    key={i}
                    className="aspect-square bg-brand-gray rounded-lg overflow-hidden shadow-sm hover:shadow-md transition-shadow"
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

            {/* Desktop Layout - Two Columns */}
            <div className="hidden md:grid md:grid-cols-2 md:gap-12 lg:gap-16 items-start">
              {/* Left Column - Text */}
              <div>
                <h2 className="text-3xl lg:text-[2.2rem] font-serif font-bold leading-tight mb-6">
                  <span className="block uppercase text-left">ФОТОАЛЬБОМ,</span>
                  <span className="block uppercase text-right">КОТОРЫЙ СОХРАНИТ</span>
                  <span className="block text-brand-green uppercase text-right">— ВАШИ ИСТОРИИ</span>
                </h2>
                <p className="text-base lg:text-[17px] text-gray-600 mb-6 leading-relaxed font-light">
                  Создаём профессиональные фотокниги, отображающие историю вашей семьи. Подарок, который тронет сердце и сохранится на всю жизнь.
                </p>
                <p className="text-sm lg:text-base font-bold mb-8 text-foreground">
                  PDF за 10 минут, печатный альбом за 5-7 дней
                </p>
                <Link
                  href="/editor"
                  className="btn-gradient inline-block px-10 py-3 text-base text-white font-semibold"
                >
                  Создать альбом
                </Link>
              </div>

              {/* Right Column - Examples 3x2 Grid with offset */}
              <div className="grid grid-cols-3 gap-3 lg:gap-4">
                {[1, 2, 3, 4, 5, 6].map((i) => (
                  <div
                    key={i}
                    className={`aspect-[3/4] bg-brand-gray rounded-lg overflow-hidden shadow-sm hover:shadow-md transition-shadow ${
                      i <= 3 ? 'transform translate-y-[-8px]' : ''
                    }`}
                  >
                    <img
                      src={`/examples/example-${i <= 4 ? i : i - 4}.jpg`}
                      alt={`Пример фотоальбома ${i}`}
                      className="w-full h-full object-cover"
                    />
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>
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

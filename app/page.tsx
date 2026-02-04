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
              className="px-4 py-1.5 text-sm font-semibold border border-white/50 rounded-full hover:bg-white/10 transition whitespace-nowrap"
            >
              Альбом
            </Link>
            <Link
              href="/comics"
              className="btn-gradient px-5 py-1.5 text-white font-semibold text-sm whitespace-nowrap"
            >
              Комикс
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
                    Фотоальбом
                  </Link>
                  <Link
                    href="/comics"
                    className="hover:text-brand-orange transition"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    Стилизованные комиксы
                  </Link>
                </div>
              </nav>
            </div>
          </div>
        </>
      )}

      {/* Hero Section - Two Products */}
      <main className="flex-1 py-12 md:py-20 px-6 md:px-24" style={{ background: 'linear-gradient(180deg, rgba(119,145,74,0.07) 0%, #FAF8FB 60%)' }}>
        <div className="max-w-[1100px] mx-auto">
          <div className="text-center mb-10 md:mb-14">
            <h1 className="text-3xl md:text-[3rem] font-serif font-bold leading-tight mb-4 text-foreground">
              Создайте свою <span className="text-brand-green">историю</span>
            </h1>
            <p className="text-gray-500 text-base md:text-lg max-w-xl mx-auto font-light leading-relaxed">
              Превратите любые фотографии в красивые альбомы или яркие стилизованные комиксы
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-5 lg:gap-8">
            {/* Photo Album Card */}
            <Link href="/editor" className="group block bg-white rounded-2xl shadow-sm hover:shadow-lg transition-all duration-300 border border-gray-200 overflow-hidden">
              <div className="h-1.5 bg-brand-olive"></div>
              <div className="p-6 md:p-7">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-11 h-11 rounded-xl flex items-center justify-center" style={{ backgroundColor: 'rgba(119,145,74,0.09)' }}>
                    <svg className="w-5 h-5 text-brand-olive" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                  </div>
                  <div>
                    <h2 className="text-lg font-serif font-bold text-foreground">Фотоальбом</h2>
                    <span className="text-xs text-brand-olive font-semibold uppercase tracking-wider">Классическое оформление</span>
                  </div>
                </div>
                <p className="text-gray-500 text-sm leading-relaxed mb-6">
                  Профессиональные фотокниги для семейных историй. Настраиваемые шаблоны разворотов, подписи и красивая вёстка.
                </p>
                <div className="flex items-center justify-between">
                  <span className="inline-block btn-gradient px-6 py-2 text-white text-sm font-semibold group-hover:opacity-90 transition">
                    Создать альбом
                  </span>
                  <span className="text-xs text-gray-400">PDF + печать</span>
                </div>
              </div>
            </Link>

            {/* Stylized Comics Card */}
            <Link href="/comics" className="group block bg-white rounded-2xl shadow-sm hover:shadow-lg transition-all duration-300 border border-gray-200 overflow-hidden">
              <div className="h-1.5 bg-brand-orange"></div>
              <div className="p-6 md:p-7">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-11 h-11 rounded-xl flex items-center justify-center" style={{ backgroundColor: 'rgba(241,146,13,0.09)' }}>
                    <svg className="w-5 h-5 text-brand-orange" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
                    </svg>
                  </div>
                  <div>
                    <h2 className="text-lg font-serif font-bold text-foreground">Стилизованные комиксы</h2>
                    <span className="text-xs text-brand-orange font-semibold uppercase tracking-wider">С поддержкой ИИ</span>
                  </div>
                </div>
                <p className="text-gray-500 text-sm leading-relaxed mb-6">
                  Превратите фотографии в комиксы с помощью ИИ. Облачки мыслей, текстовые блоки и стилизация сцен.
                </p>
                <div className="flex items-center justify-between">
                  <span className="inline-block btn-gradient px-6 py-2 text-white text-sm font-semibold group-hover:opacity-90 transition">
                    Создать комикс
                  </span>
                  <span className="text-xs text-gray-400">Генерация ИИ</span>
                </div>
              </div>
            </Link>
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

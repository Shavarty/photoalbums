import Link from "next/link";

export default function Home() {
  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <header className="bg-brand-olive text-white py-4 px-6">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <h1 className="text-3xl font-serif italic font-semibold">Книгодар</h1>
          <nav className="flex gap-8 text-base">
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
        </div>
      </header>

      {/* Hero Section */}
      <main className="flex-1 px-6 py-16">
        <div className="max-w-7xl mx-auto grid lg:grid-cols-2 gap-16 items-center">
          {/* Left Column - Text */}
          <div>
            <h2 className="text-4xl lg:text-5xl font-serif font-bold leading-tight mb-8 uppercase tracking-wide">
              ФОТОАЛЬБОМ,<br />
              ОТОБРАЖАЮЩИЙ<br />
              <span className="text-brand-green">— ВАШУ ИСТОРИЮ</span>
            </h2>
            <p className="text-lg text-gray-600 mb-8 leading-relaxed">
              Создаем профессиональные фотокниги, отображающие историю вашей семьи.
              Подарок, который тронет сердце и сохранится на всю жизнь.
            </p>
            <p className="text-xl font-bold mb-10 text-black">
              PDF за 10 минут, печатный альбом за 5-7 дней
            </p>
            <Link
              href="/editor"
              className="btn-gradient inline-block px-12 py-4 text-white text-lg font-semibold"
            >
              Создать альбом
            </Link>
          </div>

          {/* Right Column - Album Examples */}
          <div className="grid grid-cols-2 gap-6">
            {/* Placeholder images */}
            {[1, 2, 3, 4].map((i) => (
              <div
                key={i}
                className="aspect-square bg-brand-gray rounded-2xl overflow-hidden shadow-lg hover:shadow-xl transition-shadow"
              >
                <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-brand-gray to-gray-200">
                  <span className="text-gray-400 text-sm font-serif">Пример {i}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </main>

      {/* Placeholder sections */}
      <section id="how-it-works" className="bg-brand-gray py-20 px-6">
        <div className="max-w-7xl mx-auto text-center">
          <h2 className="text-4xl font-serif font-bold mb-4">Как это работает</h2>
          <p className="text-gray-600">Содержание раздела в разработке</p>
        </div>
      </section>

      <section id="examples" className="py-20 px-6">
        <div className="max-w-7xl mx-auto text-center">
          <h2 className="text-4xl font-serif font-bold mb-4">Примеры</h2>
          <p className="text-gray-600">Содержание раздела в разработке</p>
        </div>
      </section>

      <section id="questions" className="bg-brand-gray py-20 px-6">
        <div className="max-w-7xl mx-auto text-center">
          <h2 className="text-4xl font-serif font-bold mb-4">Вопросы</h2>
          <p className="text-gray-600">Содержание раздела в разработке</p>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-800 text-white py-8 px-6 text-center">
        <div className="max-w-6xl mx-auto">
          <p>© 2026 КНИГОДАР. Все права защищены.</p>
          <p className="mt-2 text-sm opacity-75">
            ИП Мурзаков Артур Александрович | ИНН: 540961931745
          </p>
        </div>
      </footer>
    </div>
  );
}

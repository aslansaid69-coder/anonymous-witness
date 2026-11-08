import { createContext, useContext } from "react";
export type Lang = "en" | "ru" | "kk";
export const Locale = createContext<{ lang: Lang; setLang: (l: Lang) => void }>(
  { lang: "en", setLang: () => {} },
);
const words: Record<string, [string, string]> = {
  "School Edition": ["Для школ", "Мектептерге арналған"],
  "A safer school starts with a voice.": [
    "Безопасная школа начинается с голоса.",
    "Қауіпсіз мектеп дауыстан басталады.",
  ],
  "Your message is anonymous. Nobody will ask who you are.": [
    "Твоё сообщение анонимно. Никто не будет спрашивать, кто ты.",
    "Хабарламаң анонимді. Ешкім сенің кім екеніңді сұрамайды.",
  ],
  "If something feels wrong, you can speak up. Tell your school police officer about bullying, threats, violence or something you witnessed.":
    [
      "Если что-то не так, расскажи об этом. Сообщи школьному полицейскому о травле, угрозах, насилии или о том, что ты видел.",
      "Бір нәрсе дұрыс болмаса, айта аласың. Мектеп полицейіне қорлау, қауіп, зорлық-зомбылық немесе көрген оқиғаң туралы хабарла.",
    ],
  "If someone is in immediate danger, call 112 now. This website is not monitored 24/7.":
    [
      "Если кто-то в опасности прямо сейчас, звони 112. Этот сайт не проверяют круглосуточно.",
      "Біреуге дәл қазір қауіп төніп тұрса, 112 нөміріне қоңырау шал. Бұл сайт тәулік бойы бақыланбайды.",
    ],
  "Select your school": ["Выбери свою школу", "Мектебіңді таңда"],
  "Search schools": ["Найти школу", "Мектепті іздеу"],
  "No matching schools": ["Школы не найдены", "Мектептер табылмады"],
  "Your school is not listed yet? Ask a trusted adult to contact your school.":
    [
      "Твоей школы пока нет? Попроси взрослого, которому доверяешь, обратиться в школу.",
      "Мектебің тізімде жоқ па? Сенетін ересек адамнан мектепке хабарласуын сұра.",
    ],
  "Write a message": ["Написать сообщение", "Хабарлама жазу"],
  "Check my case": ["Проверить моё дело", "Ісімді тексеру"],
  "No account needed": ["Без регистрации", "Тіркелу қажет емес"],
  "Only your school’s assigned officers": [
    "Только офицерам твоей школы",
    "Тек мектебіңе бекітілген офицерлерге",
  ],
  "Keep your Case Code": ["Сохрани код дела", "Іс кодын сақта"],
  "How it works": ["Как это работает", "Қалай жұмыс істейді"],
  "Choose your school, write what happened, and save your private Case Code. Return with that code to read replies and continue the conversation.":
    [
      "Выбери школу, напиши, что произошло, и сохрани личный код дела. Возвращайся по этому коду, чтобы читать ответы и продолжать разговор.",
      "Мектебіңді таңда, не болғанын жаз және жеке іс кодын сақта. Жауаптарды оқу және сөйлесуді жалғастыру үшін осы кодпен орал.",
    ],
  Privacy: ["Конфиденциальность", "Құпиялық"],
  "Staff sign in": ["Вход сотрудника", "Қызметкердің кіруі"],
  Home: ["Главная", "Басты бет"],
  "Tell us what happened": ["Расскажи, что произошло", "Не болғанын айт"],
  "You can share as much as you feel comfortable sharing. Avoid details that identify you, including faces in photos.":
    [
      "Расскажи столько, сколько считаешь нужным. Избегай деталей, которые раскрывают твою личность, в том числе лиц на фотографиях.",
      "Өзіңе ыңғайлы ақпаратпен бөліс. Жеке басыңды ашатын мәліметтерден, соның ішінде фотолардағы жүздерден сақ бол.",
    ],
  "Your message": ["Твоё сообщение", "Хабарламаң"],
  "I am… (optional)": ["Я… (необязательно)", "Мен… (міндетті емес)"],
  "Prefer not to say": ["Не хочу указывать", "Айтқым келмейді"],
  "A victim": ["Пострадавший", "Зардап шегуші"],
  "A witness": ["Свидетель", "Куәгер"],
  Victim: ["Пострадавший", "Зардап шегуші"],
  Witness: ["Свидетель", "Куәгер"],
  "Optional attachment": [
    "Вложение (необязательно)",
    "Тіркеме (міндетті емес)",
  ],
  "JPG, PNG or PDF · up to 3 MB · PDFs up to 12 pages. Original file metadata is removed.":
    [
      "JPG, PNG или PDF · до 3 МБ · PDF до 12 страниц. Исходные метаданные файла удаляются.",
      "JPG, PNG немесе PDF · 3 МБ дейін · PDF 12 бетке дейін. Файлдың бастапқы метадеректері жойылады.",
    ],
  "Original names, EXIF and GPS are not saved. Photos are re-encoded and PDF pages are converted to clean images. Visible personal information is not automatically hidden.":
    [
      "Исходные имена, EXIF и GPS не сохраняются. Фото перекодируются, страницы PDF преобразуются в чистые изображения. Видимые личные сведения автоматически не скрываются.",
      "Бастапқы атаулар, EXIF және GPS сақталмайды. Фотолар қайта кодталып, PDF беттері таза суреттерге айналады. Көрініп тұрған жеке ақпарат автоматты түрде жасырылмайды.",
    ],
  "Send anonymously": ["Отправить анонимно", "Анонимді жіберу"],
  "Sending…": ["Отправка…", "Жіберілуде…"],
  "Save this code": ["Сохрани этот код", "Бұл кодты сақта"],
  "Your message was sent. This Case Code is the only way to return. We cannot recover it if you lose it.":
    [
      "Сообщение отправлено. Только этот код позволяет вернуться к делу. Если потеряешь его, мы не сможем восстановить доступ.",
      "Хабарлама жіберілді. Іске тек осы кодпен ораласың. Оны жоғалтсаң, қол жеткізуді қалпына келтіре алмаймыз.",
    ],
  "Case Code": ["Код дела", "Іс коды"],
  "Copy code": ["Скопировать код", "Кодты көшіру"],
  "Download code": ["Скачать код", "Кодты жүктеу"],
  Copied: ["Скопировано", "Көшірілді"],
  "Open my case": ["Открыть моё дело", "Ісімді ашу"],
  "Enter the Case Code you saved after sending your message.": [
    "Введи код, сохранённый после отправки сообщения.",
    "Хабарламаны жібергенде сақтаған іс кодын енгіз.",
  ],
  "Open case": ["Открыть дело", "Істі ашу"],
  "Anonymous student": ["Анонимный ученик", "Анонимді оқушы"],
  "School police officer": ["Школьный полицейский", "Мектеп полицейі"],
  New: ["Новое", "Жаңа"],
  "In progress": ["В работе", "Жұмыста"],
  Closed: ["Закрыто", "Жабық"],
  "Send reply": ["Отправить ответ", "Жауап жіберу"],
  "Type your message": ["Напиши сообщение", "Хабарлама жаз"],
  Attachment: ["Вложение", "Тіркеме"],
  "Open attachment": ["Открыть вложение", "Тіркемені ашу"],
  Download: ["Скачать", "Жүктеу"],
  Close: ["Закрыть", "Жабу"],
  "This case is closed": ["Дело закрыто", "Іс жабық"],
  "Leave case": ["Выйти из дела", "Істен шығу"],
  "Your Case Code stays only in this page’s memory. Reloading the page requires entering it again.":
    [
      "Код дела хранится только в памяти этой страницы. После обновления его нужно ввести заново.",
      "Іс коды тек осы беттің жадында болады. Бет жаңартылса, оны қайта енгізу керек.",
    ],
  "Privacy in simple words": [
    "О конфиденциальности простыми словами",
    "Құпиялық туралы қарапайым тілмен",
  ],
  "We do not ask for your name, email, phone number or city. There are no student accounts.":
    [
      "Мы не спрашиваем имя, почту, телефон или город. У учеников нет аккаунтов.",
      "Атыңды, поштаңды, телефоныңды немесе қалаңды сұрамаймыз. Оқушы тіркелгілері жоқ.",
    ],
  "We do not store student IP addresses, device fingerprints, analytics trackers or student identity cookies. Your case is accessed only with its random code.":
    [
      "Приложение не хранит IP-адреса учеников, цифровые отпечатки устройств, аналитические трекеры или cookies, идентифицирующие ученика. Доступ к делу даёт только случайный код.",
      "Қолданба оқушылардың IP мекенжайларын, құрылғы таңбаларын, аналитикалық трекерлерін немесе тұлғаны анықтайтын cookie файлдарын сақтамайды. Іске тек кездейсоқ кодпен кіруге болады.",
    ],
  "Your school, messages, optional victim/witness choice and attachments are stored. Message contents and cleaned attachments are encrypted. Only officers assigned to your school can read them. The owner sees statistics, not conversations.":
    [
      "Сохраняются школа, сообщения, необязательная отметка «пострадавший/свидетель» и вложения. Текст и очищенные вложения зашифрованы. Читать их могут только офицеры твоей школы. Владелец видит статистику, а не переписку.",
      "Мектеп, хабарламалар, міндетті емес «зардап шегуші/куәгер» белгісі және тіркемелер сақталады. Мәтіндер мен тазартылған тіркемелер шифрланады. Оларды тек мектебіңе бекітілген офицерлер оқиды. Иесі хаттарды емес, статистиканы көреді.",
    ],
  "Hosting providers may process network information to deliver and protect the website. We cannot promise absolute anonymity if you include identifying details in your message.":
    [
      "Провайдеры хостинга могут обрабатывать сетевые сведения для работы и защиты сайта. Если ты сам укажешь личные сведения, мы не можем обещать абсолютную анонимность.",
      "Хостинг қызметтері сайтты жеткізу және қорғау үшін желілік ақпаратты өңдеуі мүмкін. Хабарламада жеке мәліметтер болса, толық анонимдікке кепілдік бере алмаймыз.",
    ],
  "Closed cases are deleted by a daily cleanup after the retention period set by the owner (30 days by default). Files are deleted from private storage too. Temporary spam checks expire after 5–60 minutes and are cleared automatically.":
    [
      "Закрытые дела удаляются ежедневной очисткой после срока, заданного владельцем (по умолчанию 30 дней). Файлы также удаляются из закрытого хранилища. Временные проверки спама истекают через 5–60 минут и автоматически очищаются.",
      "Жабық істер иесі белгілеген мерзімнен кейін күнделікті тазалаумен жойылады (әдепкісі 30 күн). Файлдар да жабық қоймадан өшіріледі. Уақытша спам тексерулері 5–60 минуттан кейін аяқталып, автоматты тазаланады.",
    ],
  "Language and display preferences may be saved on your device. Case Codes and conversations are never saved there by this application.":
    [
      "На устройстве могут сохраняться язык и тема оформления. Коды дел и переписка этим приложением на устройстве не сохраняются.",
      "Құрылғыда тіл мен көрініс таңдауы сақталуы мүмкін. Қолданба іс кодтары мен хаттарды құрылғыда сақтамайды.",
    ],
  Username: ["Логин", "Пайдаланушы аты"],
  Password: ["Пароль", "Құпиясөз"],
  "Authenticator code (if enabled)": [
    "Код аутентификатора (если включён)",
    "Аутентификатор коды (қосылса)",
  ],
  "Sign in": ["Войти", "Кіру"],
  "Sign out": ["Выйти", "Шығу"],
  "Officer workspace": ["Кабинет офицера", "Офицер кабинеті"],
  "Owner workspace": ["Кабинет владельца", "Иесі кабинеті"],
  "Sign in with your private owner account.": [
    "Войдите в свой личный аккаунт владельца.",
    "Иесінің жеке аккаунтына кіріңіз.",
  ],
  "Only owner-created officer accounts can sign in.": [
    "Войти могут только сотрудники, добавленные владельцем.",
    "Тек иесі қосқан қызметкерлер кіре алады.",
  ],
  "Change your temporary password": [
    "Смени временный пароль",
    "Уақытша құпиясөзді өзгерт",
  ],
  "Use a unique password with at least 16 characters. You will sign in again afterwards.":
    [
      "Используй уникальный пароль от 16 символов. После смены войди снова.",
      "Кемінде 16 таңбалы бірегей құпиясөз қолдан. Өзгерткен соң қайта кір.",
    ],
  "Current password": ["Текущий пароль", "Қазіргі құпиясөз"],
  "New password": ["Новый пароль", "Жаңа құпиясөз"],
  "Change password": ["Сменить пароль", "Құпиясөзді өзгерту"],
  Cases: ["Дела", "Істер"],
  "All statuses": ["Все статусы", "Барлық күйлер"],
  Unanswered: ["Без ответа", "Жауапсыз"],
  "No cases yet": ["Дел пока нет", "Әзірге істер жоқ"],
  "Choose a case": ["Выбери дело", "Істі таңда"],
  "Only cases from your assigned schools appear here.": [
    "Здесь только дела школ, к которым ты прикреплён.",
    "Мұнда тек саған бекітілген мектептердің істері көрсетіледі.",
  ],
  "Private internal notes": ["Служебные заметки", "Ішкі жазбалар"],
  "Never visible to students": ["Ученики их не видят", "Оқушыларға көрінбейді"],
  "Add note": ["Добавить заметку", "Жазба қосу"],
  "No messages yet": ["Сообщений пока нет", "Әзірге хабарламалар жоқ"],
  "Enable notifications": ["Включить уведомления", "Хабарландыруларды қосу"],
  "Notifications enabled": ["Уведомления включены", "Хабарландырулар қосылды"],
  "Notifications only name the school; they never include message contents.": [
    "Уведомления содержат только название школы, без текста сообщений.",
    "Хабарландыруларда тек мектеп атауы болады, хабарлама мәтіні болмайды.",
  ],
  "Notifications unavailable in this browser": [
    "В этом браузере уведомления недоступны",
    "Бұл браузерде хабарландырулар қолжетімсіз",
  ],
  "Allow notifications in browser settings": [
    "Разреши уведомления в настройках браузера",
    "Браузер баптауларында хабарландыруларға рұқсат бер",
  ],
  Schools: ["Школы", "Мектептер"],
  Officers: ["Офицеры", "Офицерлер"],
  "Audit log": ["Журнал действий", "Әрекеттер журналы"],
  Settings: ["Настройки", "Баптаулар"],
  "You can manage schools and accounts. Message contents are not available in this area.":
    [
      "Здесь можно управлять школами и аккаунтами. Содержание сообщений в этом разделе недоступно.",
      "Мұнда мектептер мен тіркелгілерді басқарасың. Хабарлама мазмұны бұл бөлімде қолжетімсіз.",
    ],
  "Add school": ["Добавить школу", "Мектеп қосу"],
  "School name": ["Название школы", "Мектеп атауы"],
  Number: ["Номер", "Нөмірі"],
  "District (optional)": ["Район (необязательно)", "Аудан (міндетті емес)"],
  Active: ["Активна", "Белсенді"],
  Inactive: ["Неактивна", "Белсенді емес"],
  Save: ["Сохранить", "Сақтау"],
  Cancel: ["Отмена", "Бас тарту"],
  Edit: ["Изменить", "Өзгерту"],
  "No schools yet. Add your first partner school.": [
    "Школ пока нет. Добавь первую партнёрскую школу.",
    "Әзірге мектеп жоқ. Алғашқы серіктес мектебіңді қос.",
  ],
  "Create officer": ["Добавить офицера", "Офицер қосу"],
  "Name (owner only)": ["Имя (только для владельца)", "Аты (тек иесі үшін)"],
  "Assigned schools": ["Прикреплённые школы", "Бекітілген мектептер"],
  "Reset password": ["Сбросить пароль", "Құпиясөзді қалпына келтіру"],
  "Delete officer": ["Удалить офицера", "Офицерді жою"],
  "Delete this officer account? This cannot be undone.": [
    "Удалить аккаунт офицера? Это действие нельзя отменить.",
    "Офицер тіркелгісін жою керек пе? Бұл әрекетті қайтару мүмкін емес.",
  ],
  "Temporary password": ["Временный пароль", "Уақытша құпиясөз"],
  "Save it now and share it with the officer securely. It is shown only once.":
    [
      "Сохрани сейчас и передай офицеру безопасным способом. Пароль показывается только один раз.",
      "Қазір сақтап, офицерге қауіпсіз жолмен жеткіз. Құпиясөз тек бір рет көрсетіледі.",
    ],
  "First sign-in password change required": [
    "При первом входе нужна смена пароля",
    "Алғашқы кіргенде құпиясөзді өзгерту керек",
  ],
  "Retention for closed cases (days)": [
    "Хранение закрытых дел (дней)",
    "Жабық істерді сақтау мерзімі (күн)",
  ],
  "Two-factor authentication": [
    "Двухфакторная аутентификация",
    "Екі факторлы аутентификация",
  ],
  "Set up authenticator": [
    "Настроить аутентификатор",
    "Аутентификаторды баптау",
  ],
  "Add this secret to your authenticator app, save it securely, and enter the 6-digit code.":
    [
      "Добавь этот ключ в приложение-аутентификатор, сохрани его безопасно и введи 6-значный код.",
      "Бұл кілтті аутентификатор қолданбасына қосып, қауіпсіз сақта және 6 таңбалы кодты енгіз.",
    ],
  "Enable 2FA": ["Включить 2FA", "2FA қосу"],
  Enabled: ["Включено", "Қосулы"],
  Actor: ["Сотрудник", "Қызметкер"],
  Action: ["Действие", "Әрекет"],
  Time: ["Время", "Уақыты"],
  "Loading…": ["Загрузка…", "Жүктелуде…"],
  Refresh: ["Обновить", "Жаңарту"],
  Back: ["Назад", "Артқа"],
  Saved: ["Сохранено", "Сақталды"],
  "Connection unavailable. Please try again.": [
    "Нет соединения. Попробуй ещё раз.",
    "Байланыс жоқ. Қайта көр.",
  ],
  "Request failed": ["Не удалось выполнить запрос", "Сұрау орындалмады"],
  "Invalid Case Code": ["Неверный код дела", "Іс коды қате"],
  "Invalid username or password": [
    "Неверный логин или пароль",
    "Пайдаланушы аты немесе құпиясөз қате",
  ],
  "Please select an active school": [
    "Выбери активную школу",
    "Белсенді мектепті таңда",
  ],
  "Please check the form fields": [
    "Проверь поля формы",
    "Нысан өрістерін тексер",
  ],
  "Please check the message": ["Проверь сообщение", "Хабарламаны тексер"],
  "File must be 3 MB or less": [
    "Файл должен быть не больше 3 МБ",
    "Файл 3 МБ аспауы керек",
  ],
  "Use a valid JPG, PNG or PDF (up to 12 pages)": [
    "Выбери корректный JPG, PNG или PDF (до 12 страниц)",
    "Дұрыс JPG, PNG немесе PDF таңда (12 бетке дейін)",
  ],
  "Use JPG, PNG or PDF only": [
    "Разрешены только JPG, PNG и PDF",
    "Тек JPG, PNG және PDF рұқсат етіледі",
  ],
  "This school is not ready to receive messages yet": [
    "Эта школа пока не готова принимать сообщения",
    "Бұл мектеп хабарламаларды қабылдауға әлі дайын емес",
  ],
  "Please sign in again": ["Войди снова", "Қайта кір"],
  "Too many attempts. Please try again later.": [
    "Слишком много попыток. Попробуй позже.",
    "Тым көп әрекет. Кейінірек көр.",
  ],
  "Please refresh the form and try again": [
    "Обнови форму и попробуй снова",
    "Нысанды жаңартып, қайта көр",
  ],
  "Current password is incorrect": [
    "Текущий пароль неверен",
    "Қазіргі құпиясөз қате",
  ],
  "Choose a different password": [
    "Выбери другой пароль",
    "Басқа құпиясөз таңда",
  ],
  "Enter a valid authenticator code": [
    "Введи верный код аутентификатора",
    "Дұрыс аутентификатор кодын енгіз",
  ],
  "Case not found": ["Дело не найдено", "Іс табылмады"],
  "File unavailable": ["Файл недоступен", "Файл қолжетімсіз"],
  "Username already exists": [
    "Этот логин уже занят",
    "Бұл пайдаланушы аты қолданылуда",
  ],
  "No officers yet": ["Офицеров пока нет", "Әзірге офицерлер жоқ"],
  "No activity yet": ["Действий пока нет", "Әзірге әрекеттер жоқ"],
  "Created by Aslan Saidakhmet, Davlatbek, Dinmukhamed": [
    "Created by Aslan Saidakhmet, Davlatbek, Dinmukhamed",
    "Created by Aslan Saidakhmet, Davlatbek, Dinmukhamed",
  ],
};
export function useT() {
  const { lang } = useContext(Locale);
  return (s: string) =>
    s === "__locale"
      ? lang
      : lang === "en"
        ? s
        : words[s]?.[lang === "ru" ? 0 : 1] || s;
}

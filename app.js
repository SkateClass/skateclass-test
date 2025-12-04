// === ИНИЦИАЛИЗАЦИЯ ===
document.addEventListener('DOMContentLoaded', () => {
    const tg = window.Telegram.WebApp;
    if(tg) tg.expand();

    // Шапка: Дата и Имя
    const d = new Date();
    const dateEl = document.getElementById('currentDate');
    if(dateEl) dateEl.innerText = "Сегодня " + d.toLocaleDateString('ru-RU', { weekday: 'long', month: 'long', day: 'numeric' });
    
    if(tg.initDataUnsafe && tg.initDataUnsafe.user) {
        const nameEl = document.getElementById('user-name-display');
        if(nameEl) nameEl.innerText = tg.initDataUnsafe.user.first_name;
    }

    applyAdminSettings();
    initScheduleSystem();
});

let scheduleCache = {};

// === 1. СИСТЕМА РАСПИСАНИЯ ===
function initScheduleSystem() {
    const calendarEl = document.getElementById('calendar');
    if(!calendarEl) return;

    const saved = localStorage.getItem('skate_schedule');
    if(saved) scheduleCache = JSON.parse(saved);

    const today = new Date();
    let html = '';
    
    // ГЕНЕРАЦИЯ ДНЕЙ: от -7 до +30
    for(let i = -7; i < 30; i++) {
        const d = new Date(today);
        d.setDate(today.getDate() + i);
        
        // Формируем ID (YYYY-MM-DD)
        const year = d.getFullYear();
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        const dateStr = `${year}-${month}-${day}`;
        
        const dayWeek = d.toLocaleDateString('ru-RU', { weekday: 'short' });
        const dayDate = d.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' }).replace('.', '');
        
        const isToday = (i === 0);
        let extraClass = isToday ? 'active' : '';
        // Зеленая подсветка для сегодняшнего дня (всегда)
        let inlineStyle = isToday ? 'border: 1px solid #00ff7f; box-shadow: 0 0 10px rgba(0, 255, 127, 0.4);' : '';
        
        // Добавил ID="day-YYYY-MM-DD", чтобы можно было найти этот день программно
        html += `
            <div id="day-${dateStr}" class="calendar-day ${extraClass}" onclick="selectDate(this, '${dateStr}')" style="${inlineStyle}">
                <span class="day-name" style="font-size:11px; text-transform:uppercase; opacity:0.7; margin-bottom:2px;">${dayWeek}</span>
                <span class="day-number" style="font-size:13px; font-weight:bold; line-height:1.1;">${dayDate}</span>
            </div>
        `;
    }
    calendarEl.innerHTML = html;

    // Открываем "Сегодня" при старте
    resetToToday();
}

// Функция сброса на "Сегодня"
function resetToToday() {
    const d = new Date();
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    const todayStr = `${year}-${month}-${day}`;

    const el = document.getElementById(`day-${todayStr}`);
    if(el) {
        selectDate(el, todayStr);
    }
}

// Выбор даты
window.selectDate = function(el, dateStr) {
    document.querySelectorAll('.calendar-day').forEach(d => d.classList.remove('active'));
    el.classList.add('active');
    el.scrollIntoView({ inline: "center", behavior: "smooth" });
    renderSlotsForDate(dateStr);
}

// Отрисовка слотов
function renderSlotsForDate(dateStr) {
    const container = document.getElementById('schedule-slots');
    container.innerHTML = "";
    const dayData = scheduleCache[dateStr];
    const startHour = 9; const endHour = 22;

    for(let h = startHour; h <= endHour; h++) {
        const time = `${h.toString().padStart(2, '0')}:00`;
        let rawSlot = dayData ? dayData[time] : 'closed';
        let status = 'closed';
        let location = 'Локация уточняется';

        if (typeof rawSlot === 'string') { status = rawSlot; } 
        else if (rawSlot) { status = rawSlot.status || 'closed'; location = rawSlot.location || 'Локация уточняется'; }

        let cardStyle = '';
        let title = '';
        let sub = '';
        let btn = '';
        let click = '';

        if (status === 'free') {
            cardStyle = 'background:rgba(0, 255, 127, 0.1); border:1px solid #00ff7f;';
            title = 'Свободно';
            sub = `📍 ${location}`;
            click = 'openRegistrationForm()';
            btn = `<button style="background:#00ff7f; border:none; padding:6px 12px; border-radius:6px; color:#000; font-weight:bold;">Записаться</button>`;
        } else if (status === 'booked') {
            cardStyle = 'background:rgba(135, 206, 250, 0.1); border:1px solid #87cefa; opacity: 0.7;';
            title = 'Занято';
            sub = `📍 ${location}`;
        } else if (status === 'group') {
            cardStyle = 'background:rgba(255, 165, 0, 0.1); border:1px solid #ffa500;';
            title = 'Группа';
            sub = `📍 ${location}`;
            click = 'openRegistrationForm()';
            btn = `<button style="background:#ffa500; border:none; padding:6px 12px; border-radius:6px; color:#000; font-weight:bold;">Записаться</button>`;
        } else {
            cardStyle = 'background:rgba(255,255,255,0.03); border:1px solid #333; color:#555;';
            title = 'Нет записи';
            sub = '-';
        }

        const html = `
            <div class="time-slot" onclick="${click}" style="${cardStyle} display:flex; justify-content:space-between; align-items:center; padding:15px; border-radius:12px; margin-bottom:8px; cursor:${click?'pointer':'default'}; transition:0.2s;">
                <div style="font-size:18px; font-weight:bold; width:60px;">${time}</div>
                <div style="flex:1; padding-left:10px;">
                    <div style="font-weight:bold; font-size:15px;">${title}</div>
                    <div style="font-size:12px; opacity:0.7;">${sub}</div>
                </div>
                <div>${btn}</div>
            </div>
        `;
        container.innerHTML += html;
    }
}

// === НАВИГАЦИЯ ===
function navigateTo(pageId) {
    document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
    const target = document.getElementById(pageId.includes('page') ? pageId : pageId + '-page');
    if(target) target.classList.add('active');
    
    document.querySelectorAll('.nav-item').forEach(btn => btn.classList.remove('active'));
    const buttons = document.querySelectorAll('.nav-item');
    buttons.forEach(btn => {
        if(btn.getAttribute('onclick') && btn.getAttribute('onclick').includes(pageId)) {
            btn.classList.add('active');
        }
    });
    
    // ЕСЛИ ПЕРЕШЛИ В РАСПИСАНИЕ -> СБРОСИТЬ НА СЕГОДНЯ
    if (pageId === 'schedule') {
        resetToToday();
    }
    
    window.scrollTo(0,0);
}

// === 2. НАСТРОЙКИ ГЛАВНОЙ И УСЛУГ ===
function applyAdminSettings() {
    const saved = localStorage.getItem('skate_full_data');
    if (saved) {
        const data = JSON.parse(saved);
        if (data.home) {
            const img = document.querySelector('.banner-image');
            if (img && data.home.img) img.src = data.home.img;
            const link = document.querySelector('.banner-link');
            if (link && data.home.link) { link.href = data.home.link; link.target = "_blank"; link.removeAttribute('onclick'); }
            const title = document.getElementById('dyn-banner-title');
            if (title && data.home.title) { title.innerText = data.home.title; title.style.fontSize = data.home.titleSize; }
            const desc = document.getElementById('dyn-banner-desc');
            if (desc && data.home.desc) { desc.innerText = data.home.desc; desc.style.fontSize = data.home.descSize; }
            const btn = document.querySelector('.yellow-participate-button');
            if (btn) {
                if(data.home.btnText) btn.innerText = data.home.btnText;
                if(data.home.btnSize) btn.style.fontSize = data.home.btnSize;
                if(data.home.btnLink) {
                    const newBtn = btn.cloneNode(true);
                    btn.parentNode.replaceChild(newBtn, btn);
                    newBtn.addEventListener('click', (e) => { e.preventDefault(); window.open(data.home.btnLink, '_blank'); });
                }
            }
        }
        const container = document.getElementById('services-container-dynamic');
        if (container && data.services) {
            container.innerHTML = '';
            data.services.forEach(s => {
                container.innerHTML += `
                    <div class="service-card">
                        <div class="service-header"><span class="service-type" style="font-size:${s.titleSize}">${s.title}</span><span class="service-price" style="font-size:${s.priceSize}">${s.price}</span></div>
                        <div class="service-details"><span>${s.duration}</span><span>${s.people}</span></div>
                        <p class="service-description" style="font-size:${s.descSize}">${s.desc}</p>
                    </div>`;
            });
        }
    }
}

function openRegistrationForm() { document.getElementById('registration-modal').style.display = 'flex'; }
function closeRegistrationForm() { document.getElementById('registration-modal').style.display = 'none'; }

const form = document.getElementById('registrationForm');
if(form) {
    form.addEventListener('submit', function(e) {
        e.preventDefault();
        form.style.display = 'none';
        document.getElementById('successMessage').style.display = 'block';
        setTimeout(() => { closeRegistrationForm(); form.reset(); form.style.display = 'block'; document.getElementById('successMessage').style.display = 'none'; }, 2000);
    });
}
function simulateQRScan() { alert("QR-код успешно отсканирован!"); }

// StudyFlow - Student Productivity Dashboard
// Versi diperbaiki: inisialisasi setelah HTML siap dan penyimpanan aman.
'use strict';

document.addEventListener('DOMContentLoaded', () => {
  const STORAGE_KEYS = {
    tasks: 'studyflow_tasks_v1',
    notes: 'studyflow_notes_v1',
    sessions: 'studyflow_sessions_v1'
  };

  const get = (id) => {
    const element = document.getElementById(id);
    if (!element) {
      console.error(`StudyFlow: elemen #${id} tidak ditemukan. Pastikan index.html yang digunakan adalah satu paket dengan script.js.`);
    }
    return element;
  };

  function readStorage(key, fallback) {
    try {
      const raw = window.localStorage.getItem(key);
      return raw === null ? fallback : JSON.parse(raw);
    } catch (error) {
      console.warn(`StudyFlow: tidak bisa membaca ${key} dari localStorage.`, error);
      return fallback;
    }
  }

  function writeStorage(key, value) {
    try {
      window.localStorage.setItem(key, JSON.stringify(value));
      return true;
    } catch (error) {
      console.warn(`StudyFlow: tidak bisa menyimpan ${key} ke localStorage.`, error);
      const status = get('saveStatus');
      if (status) status.textContent = 'Penyimpanan browser tidak tersedia.';
      return false;
    }
  }

  const taskForm = get('taskForm');
  const taskInput = get('taskInput');
  const taskPriority = get('taskPriority');
  const taskList = get('taskList');
  const emptyTasks = get('emptyTasks');
  const noteInput = get('noteInput');
  const saveStatus = get('saveStatus');
  const timerDisplay = get('timerDisplay');
  const timerStart = get('timerStart');
  const timerRing = get('timerRing');

  // Jangan jalankan aplikasi jika file HTML tidak cocok dengan script ini.
  const requiredElements = [taskForm, taskInput, taskPriority, taskList, emptyTasks,
    noteInput, timerDisplay, timerStart, timerRing];
  if (requiredElements.some((element) => !element)) {
    console.error('StudyFlow gagal dimulai. Pastikan index.html, style.css, dan script.js berasal dari folder project yang sama.');
    return;
  }

  let tasks = readStorage(STORAGE_KEYS.tasks, []);
  if (!Array.isArray(tasks)) tasks = [];
  // Rapikan data lama jika formatnya tidak lengkap.
  tasks = tasks.filter((task) => task && typeof task === 'object' && typeof task.text === 'string')
    .map((task, index) => ({
      id: task.id ?? `old-${index}-${Date.now()}`,
      text: task.text,
      priority: ['Low', 'Medium', 'High'].includes(task.priority) ? task.priority : 'Medium',
      completed: Boolean(task.completed)
    }));

  let currentFilter = 'all';
  let sessions = Number(readStorage(STORAGE_KEYS.sessions, 0));
  if (!Number.isFinite(sessions) || sessions < 0) sessions = 0;

  function setSaveStatus(message) {
    if (saveStatus) saveStatus.textContent = message;
  }

  function saveTasks() {
    writeStorage(STORAGE_KEYS.tasks, tasks);
  }

  function updateStats() {
    const completed = tasks.filter((task) => task.completed).length;
    const percent = tasks.length ? Math.round((completed / tasks.length) * 100) : 0;
    const totalTasks = get('totalTasks');
    const completedTasks = get('completedTasks');
    const progressPercent = get('progressPercent');
    const progressBar = get('progressBar');
    const focusSessions = get('focusSessions');
    const sessionCount = get('sessionCount');

    if (totalTasks) totalTasks.textContent = String(tasks.length);
    if (completedTasks) completedTasks.textContent = String(completed);
    if (progressPercent) progressPercent.textContent = String(percent);
    if (progressBar) progressBar.style.width = `${percent}%`;
    if (focusSessions) focusSessions.textContent = String(sessions);
    if (sessionCount) sessionCount.textContent = String(sessions);
  }

  function renderTasks() {
    taskList.replaceChildren();
    const visibleTasks = tasks.filter((task) => {
      if (currentFilter === 'active') return !task.completed;
      if (currentFilter === 'done') return task.completed;
      return true;
    });

    visibleTasks.forEach((task) => {
      const item = document.createElement('li');
      item.className = `task-item${task.completed ? ' completed' : ''}`;

      const checkbox = document.createElement('input');
      checkbox.type = 'checkbox';
      checkbox.className = 'task-check';
      checkbox.checked = task.completed;
      checkbox.setAttribute('aria-label', `Tandai ${task.text} sebagai selesai`);
      checkbox.addEventListener('change', () => {
        task.completed = checkbox.checked;
        saveTasks();
        renderTasks();
      });

      const name = document.createElement('span');
      name.className = 'task-name';
      name.textContent = task.text;

      const priority = document.createElement('span');
      priority.className = `priority ${task.priority.toLowerCase()}`;
      priority.textContent = task.priority;

      const deleteButton = document.createElement('button');
      deleteButton.className = 'delete-task';
      deleteButton.type = 'button';
      deleteButton.textContent = '×';
      deleteButton.setAttribute('aria-label', `Hapus tugas ${task.text}`);
      deleteButton.addEventListener('click', () => {
        tasks = tasks.filter((entry) => entry.id !== task.id);
        saveTasks();
        renderTasks();
      });

      item.append(checkbox, name, priority, deleteButton);
      taskList.append(item);
    });

    emptyTasks.hidden = visibleTasks.length > 0;
    const countPill = get('taskCountPill');
    if (countPill) countPill.textContent = `${tasks.length} tasks`;
    updateStats();
  }

  taskForm.addEventListener('submit', (event) => {
    event.preventDefault();
    const text = taskInput.value.trim();
    if (!text) {
      taskInput.focus();
      return;
    }

    let id;
    if (window.crypto && typeof window.crypto.randomUUID === 'function') {
      id = window.crypto.randomUUID();
    } else {
      id = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
    }

    tasks.unshift({
      id,
      text,
      priority: ['Low', 'Medium', 'High'].includes(taskPriority.value) ? taskPriority.value : 'Medium',
      completed: false
    });
    saveTasks();
    taskInput.value = '';
    taskPriority.value = 'Medium';
    renderTasks();
    taskInput.focus();
  });

  document.querySelectorAll('.filter-button').forEach((button) => {
    button.addEventListener('click', () => {
      currentFilter = button.dataset.filter || 'all';
      document.querySelectorAll('.filter-button').forEach((filter) => {
        filter.classList.toggle('active', filter === button);
      });
      renderTasks();
    });
  });

  // Tanggal hari ini
  const today = new Date();
  const dateFormatter = new Intl.DateTimeFormat('id-ID', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'
  });
  const todayLabel = get('todayLabel');
  const scheduleDate = get('scheduleDate');
  if (todayLabel) todayLabel.textContent = dateFormatter.format(today);
  if (scheduleDate) scheduleDate.textContent = dateFormatter.format(today);

  // Catatan otomatis tersimpan di browser
  noteInput.value = readStorage(STORAGE_KEYS.notes, '');
  function updateCharacterCount() {
    const count = get('characterCount');
    if (count) count.textContent = `${noteInput.value.length}/1200`;
  }

  noteInput.addEventListener('input', () => {
    const saved = writeStorage(STORAGE_KEYS.notes, noteInput.value);
    setSaveStatus(saved ? 'Tersimpan otomatis ✓' : 'Gagal menyimpan catatan.');
    updateCharacterCount();
  });

  const clearNote = get('clearNote');
  if (clearNote) {
    clearNote.addEventListener('click', () => {
      if (!noteInput.value) return;
      if (!window.confirm('Hapus semua catatan?')) return;
      noteInput.value = '';
      const saved = writeStorage(STORAGE_KEYS.notes, '');
      setSaveStatus(saved ? 'Catatan sudah dihapus.' : 'Catatan dihapus dari tampilan, tetapi gagal disimpan.');
      updateCharacterCount();
    });
  }
  updateCharacterCount();

  // Pomodoro timer
  let selectedMinutes = 25;
  let remainingSeconds = selectedMinutes * 60;
  let timerInterval = null;
  let timerRunning = false;
  let timerMode = 'FOCUS TIME';

  function updateTimerDisplay() {
    const minutes = Math.floor(remainingSeconds / 60);
    const seconds = remainingSeconds % 60;
    timerDisplay.textContent = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
    const modeLabel = get('timerMode');
    if (modeLabel) modeLabel.textContent = timerMode;
    const totalSeconds = selectedMinutes * 60;
    const elapsedRatio = totalSeconds ? (totalSeconds - remainingSeconds) / totalSeconds : 0;
    const degrees = Math.max(0, Math.min(360, elapsedRatio * 360));
    timerRing.style.background = `conic-gradient(var(--blue) ${degrees}deg, #e8effb ${degrees}deg)`;
  }

  function stopTimer() {
    if (timerInterval !== null) {
      window.clearInterval(timerInterval);
      timerInterval = null;
    }
    timerRunning = false;
    timerStart.textContent = 'Start focus';
  }

  function finishTimer() {
    stopTimer();
    if (timerMode === 'FOCUS TIME') {
      sessions += 1;
      writeStorage(STORAGE_KEYS.sessions, sessions);
      updateStats();
      window.alert('Sesi fokus selesai! Bagus, ambil waktu untuk istirahat.');
    } else {
      window.alert('Waktu istirahat selesai. Siap fokus lagi?');
    }
    remainingSeconds = selectedMinutes * 60;
    updateTimerDisplay();
  }

  timerStart.addEventListener('click', () => {
    if (timerRunning) {
      stopTimer();
      return;
    }
    if (remainingSeconds <= 0) remainingSeconds = selectedMinutes * 60;
    timerRunning = true;
    timerStart.textContent = 'Pause';
    timerInterval = window.setInterval(() => {
      remainingSeconds -= 1;
      updateTimerDisplay();
      if (remainingSeconds <= 0) finishTimer();
    }, 1000);
  });

  const timerReset = get('timerReset');
  if (timerReset) {
    timerReset.addEventListener('click', () => {
      stopTimer();
      remainingSeconds = selectedMinutes * 60;
      updateTimerDisplay();
    });
  }

  document.querySelectorAll('.mode-button').forEach((button) => {
    button.addEventListener('click', () => {
      const minutes = Number(button.dataset.minutes);
      if (!Number.isFinite(minutes) || minutes <= 0) return;
      stopTimer();
      selectedMinutes = minutes;
      timerMode = button.dataset.mode || 'FOCUS TIME';
      remainingSeconds = selectedMinutes * 60;
      document.querySelectorAll('.mode-button').forEach((modeButton) => {
        modeButton.classList.toggle('selected', modeButton === button);
      });
      updateTimerDisplay();
    });
  });

  // Navigasi menu mobile
  const sidebar = get('sidebar');
  const mobileMenu = get('mobileMenu');
  if (sidebar && mobileMenu) {
    mobileMenu.addEventListener('click', () => sidebar.classList.toggle('open'));
    document.querySelectorAll('.nav-link').forEach((link) => {
      link.addEventListener('click', () => {
        document.querySelectorAll('.nav-link').forEach((navLink) => navLink.classList.remove('active'));
        link.classList.add('active');
        sidebar.classList.remove('open');
      });
    });
  }

  renderTasks();
  updateTimerDisplay();
  console.info('StudyFlow berhasil dimuat.');
});

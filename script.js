/* StudyMate - beginner-friendly front-end demo.
   Data is stored in this browser using localStorage. No server or real AI API is connected. */
const STORAGE_KEY = "studymate-v1";
const $ = (selector) => document.querySelector(selector);
const todayISO = () => {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,"0")}-${String(now.getDate()).padStart(2,"0")}`;
};
const escapeHTML = (value) => String(value).replace(/[&<>"']/g, char => ({
  "&":"&amp;", "<":"&lt;", ">":"&gt;", '"':"&quot;", "'":"&#39;"
}[char]));

let state = loadState();
function loadState() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
    if (saved && Array.isArray(saved.tasks) && Array.isArray(saved.schedule) && Array.isArray(saved.exams)) return saved;
  } catch (error) { console.warn("Saved data could not be loaded.", error); }
  return { tasks: [], schedule: [], exams: [] };
}
function saveState() {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); }
  catch (error) { showToast("Could not save data in this browser."); }
}
function showToast(message) {
  const toast = $("#toast");
  toast.textContent = message;
  toast.classList.add("show");
  clearTimeout(showToast.timer);
  showToast.timer = setTimeout(() => toast.classList.remove("show"), 2300);
}
function makeId() { return `${Date.now()}-${Math.random().toString(16).slice(2)}`; }
function formatDate(date) {
  if (!date) return "No due date";
  return new Date(`${date}T12:00:00`).toLocaleDateString(undefined, {day:"numeric",month:"short",year:"numeric"});
}
function renderStats() {
  const total = state.tasks.length;
  const completed = state.tasks.filter(task => task.completed).length;
  const percent = total ? Math.round(completed / total * 100) : 0;
  $("#totalTasks").textContent = total;
  $("#completedTasks").textContent = completed;
  $("#progressPercent").textContent = `${percent}%`;
  $("#progressFill").style.width = `${percent}%`;
  $("#examCount").textContent = state.exams.filter(exam => exam.date >= todayISO()).length;
}
function renderTasks() {
  const filter = $("#taskFilter").value;
  const tasks = state.tasks.filter(task => filter === "all" || (filter === "active" ? !task.completed : task.completed));
  const list = $("#taskList");
  if (!tasks.length) {
    list.innerHTML = `<div class="empty-state">${filter === "completed" ? "🌼 Completed tasks will appear here." : "🌱 Your next win starts with one task."}</div>`;
    return;
  }
  list.innerHTML = tasks.map(task => `
    <article class="task-item ${task.completed ? "done" : ""}">
      <input class="task-check" type="checkbox" aria-label="Mark ${escapeHTML(task.title)} complete" data-complete="${task.id}" ${task.completed ? "checked" : ""}>
      <div class="task-content">
        <div class="task-title">${escapeHTML(task.title)}</div>
        <div class="task-meta">
          ${task.subject ? `<span class="pill">${escapeHTML(task.subject)}</span>` : ""}
          <span class="pill priority-${task.priority.toLowerCase()}">${escapeHTML(task.priority)} priority</span>
          <span class="pill">◷ ${task.minutes} min</span>
          <span class="pill">Due: ${escapeHTML(formatDate(task.date))}</span>
        </div>
      </div>
      <button class="delete-button" type="button" data-delete-task="${task.id}" aria-label="Delete task">×</button>
    </article>`).join("");
}
function renderSchedule() {
  const list = $("#scheduleList");
  const entries = [...state.schedule].sort((a,b) => ["Monday","Tuesday","Wednesday","Thursday","Friday","Saturday","Sunday"].indexOf(a.day) - ["Monday","Tuesday","Wednesday","Thursday","Friday","Saturday","Sunday"].indexOf(b.day) || a.time.localeCompare(b.time));
  if (!entries.length) { list.innerHTML = `<div class="empty-state small">Add a study session to get started.</div>`; return; }
  list.innerHTML = entries.map(item => `
    <article class="schedule-entry">
      <div class="time-block">${escapeHTML(item.time)}</div>
      <div class="entry-main"><strong>${escapeHTML(item.subject)}</strong><span>${escapeHTML(item.day)}</span></div>
      <button class="delete-button" type="button" data-delete-schedule="${item.id}" aria-label="Delete schedule item">×</button>
    </article>`).join("");
}
function daysUntil(date) {
  const target = new Date(`${date}T00:00:00`);
  const today = new Date(`${todayISO()}T00:00:00`);
  return Math.round((target - today) / 86400000);
}
function renderExams() {
  const list = $("#examList");
  const exams = [...state.exams].sort((a,b) => a.date.localeCompare(b.date));
  if (!exams.length) { list.innerHTML = `<div class="empty-state small">No exam reminders yet.</div>`; return; }
  list.innerHTML = exams.map(exam => {
    const day = Number(exam.date.slice(8,10));
    const month = new Date(`${exam.date}T12:00:00`).toLocaleDateString(undefined,{month:"short"}).toUpperCase();
    const remaining = daysUntil(exam.date);
    const countdown = remaining < 0 ? "Past date" : remaining === 0 ? "Today!" : `${remaining} day${remaining === 1 ? "" : "s"} left`;
    return `<article class="exam-entry"><div class="exam-date"><strong>${day}</strong>${month}</div><div class="entry-main"><strong>${escapeHTML(exam.name)}</strong><span>${countdown}</span></div><button class="delete-button" type="button" data-delete-exam="${exam.id}" aria-label="Delete reminder">×</button></article>`;
  }).join("");
}
function renderRecommendations() {
  const pending = state.tasks.filter(task => !task.completed);
  const high = pending.filter(task => task.priority === "High");
  const overdue = pending.filter(task => task.date && task.date < todayISO());
  const upcoming = state.exams.filter(exam => daysUntil(exam.date) >= 0 && daysUntil(exam.date) <= 7);
  const suggestions = [];
  if (!state.tasks.length) suggestions.push({icon:"💡", title:"Start with one task", text:"Add one small study task. A clear next step makes it easier to begin."});
  else if (pending.length === 0) suggestions.push({icon:"🎉", title:"Great progress!", text:"All tasks are complete. Take a break, then plan your next study session."});
  if (high.length) suggestions.push({icon:"🔥", title:"Prioritize important work", text:`You have ${high.length} high-priority task${high.length===1?"":"s"}. Try completing one before moving to smaller tasks.`});
  if (overdue.length) suggestions.push({icon:"📌", title:"Review overdue tasks", text:`${overdue.length} task${overdue.length===1?" is":"s are"} past the due date. Update the deadline or schedule a short session.`});
  if (upcoming.length) suggestions.push({icon:"🗓️", title:"Prepare for exams", text:`You have ${upcoming.length} exam reminder${upcoming.length===1?"":"s"} within the next 7 days. Divide revision into short sessions.`});
  if (pending.length && !high.length && !overdue.length) suggestions.push({icon:"🍅", title:"Try a focus session", text:"Study for 25 minutes, take a 5-minute break, and repeat if you have energy."});
  if (!state.schedule.length) suggestions.push({icon:"⏰", title:"Make a routine", text:"Add a timetable session for your most focused time of day."});
  if (!suggestions.length) suggestions.push({icon:"🌿", title:"Keep your rhythm", text:"Review your tasks each evening and choose the three most important things for tomorrow."});
  $("#recommendations").innerHTML = suggestions.slice(0,3).map(item => `<article class="tip-card"><span>${item.icon}</span><h3>${escapeHTML(item.title)}</h3><p>${escapeHTML(item.text)}</p></article>`).join("");
}
function renderAll() { renderStats(); renderTasks(); renderSchedule(); renderExams(); renderRecommendations(); }

$("#taskForm").addEventListener("submit", event => {
  event.preventDefault();
  const title = $("#taskTitle").value.trim();
  if (!title) return;
  state.tasks.push({
    id: makeId(), title, subject: $("#taskSubject").value.trim(),
    date: $("#taskDate").value, priority: $("#taskPriority").value,
    minutes: Math.max(5, Math.min(600, Number($("#taskMinutes").value) || 30)), completed: false
  });
  saveState(); renderAll(); event.target.reset(); $("#taskMinutes").value = 30;
  showToast("Task added. One step at a time! 🌱");
});
$("#taskFilter").addEventListener("change", renderTasks);
$("#taskList").addEventListener("change", event => {
  const id = event.target.dataset.complete;
  if (!id) return;
  const task = state.tasks.find(item => item.id === id);
  if (task) { task.completed = event.target.checked; saveState(); renderAll(); showToast(task.completed ? "Task completed. Well done! 🎉" : "Task moved back to your list."); }
});
$("#taskList").addEventListener("click", event => {
  const button = event.target.closest("[data-delete-task]");
  if (!button) return;
  state.tasks = state.tasks.filter(task => task.id !== button.dataset.deleteTask);
  saveState(); renderAll(); showToast("Task deleted.");
});
$("#scheduleForm").addEventListener("submit", event => {
  event.preventDefault();
  const subject = $("#scheduleSubject").value.trim();
  if (!subject) return;
  state.schedule.push({id:makeId(),day:$("#scheduleDay").value,time:$("#scheduleTime").value,subject});
  saveState(); renderAll(); $("#scheduleSubject").value = "";
  showToast("Study session added to your timetable.");
});
$("#scheduleList").addEventListener("click", event => {
  const button = event.target.closest("[data-delete-schedule]");
  if (!button) return;
  state.schedule = state.schedule.filter(item => item.id !== button.dataset.deleteSchedule);
  saveState(); renderAll(); showToast("Timetable session deleted.");
});
$("#examForm").addEventListener("submit", event => {
  event.preventDefault();
  const name = $("#examName").value.trim(), date = $("#examDate").value;
  if (!name || !date) return;
  state.exams.push({id:makeId(),name,date});
  saveState(); renderAll(); event.target.reset(); showToast("Exam reminder saved. Check your dates! 🗓️");
});
$("#examList").addEventListener("click", event => {
  const button = event.target.closest("[data-delete-exam]");
  if (!button) return;
  state.exams = state.exams.filter(exam => exam.id !== button.dataset.deleteExam);
  saveState(); renderAll(); showToast("Exam reminder deleted.");
});

// The browser demo displays reminders inside the app; it does not send push/email notifications.
renderAll();

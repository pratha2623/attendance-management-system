// State Management
let subjects = [];
let timetable = {};
let logs = [];
let currentCalendarDate = new Date();

const DEFAULT_SUBJECTS = [
    { name: "Java", total: 41, attended: 29, required: 75.0 },
    { name: "Physics", total: 26, attended: 17, required: 75.0 },
    { name: "Discrete Mathematics", total: 32, attended: 22, required: 75.0 },
    { name: "Linear Algebra", total: 29, attended: 22, required: 75.0 },
    { name: "Digital Design", total: 34, attended: 26, required: 75.0 },
    { name: "Soft Skills and Personality", total: 7, attended: 2, required: 75.0 },
    { name: "EVS", total: 14, attended: 12, required: 75.0 }
];

const DEFAULT_TIMETABLE = {
    "0-0": "Java",
    "0-1": "Physics",
    "0-2": "Discrete Mathematics",
    "1-0": "Linear Algebra",
    "1-1": "Digital Design",
    "1-2": "Java",
    "2-0": "Physics",
    "2-1": "Discrete Mathematics",
    "2-2": "Linear Algebra",
    "3-0": "Digital Design",
    "3-1": "Soft Skills and Personality",
    "3-2": "EVS",
    "4-0": "Java",
    "4-1": "Physics",
    "4-2": "Discrete Mathematics"
};

// Initialize Application
document.addEventListener("DOMContentLoaded", () => {
    loadState();
    setupNavigation();
    setupEventListeners();
    renderAll();
});

// Load data from LocalStorage or use defaults
function loadState() {
    const savedSubjects = localStorage.getItem("attendance_subjects");
    const savedTimetable = localStorage.getItem("attendance_timetable");
    const savedLogs = localStorage.getItem("attendance_logs");

    if (savedSubjects) {
        subjects = JSON.parse(savedSubjects);
    } else {
        subjects = JSON.parse(JSON.stringify(DEFAULT_SUBJECTS));
    }

    if (savedTimetable) {
        timetable = JSON.parse(savedTimetable);
    } else {
        timetable = JSON.parse(JSON.stringify(DEFAULT_TIMETABLE));
    }

    if (savedLogs) {
        logs = JSON.parse(savedLogs);
    } else {
        logs = [];
    }
}

// Save state to LocalStorage
function saveState() {
    localStorage.setItem("attendance_subjects", JSON.stringify(subjects));
    localStorage.setItem("attendance_timetable", JSON.stringify(timetable));
    localStorage.setItem("attendance_logs", JSON.stringify(logs));
}

// Navigation Tab switching
function setupNavigation() {
    const navItems = document.querySelectorAll(".nav-item");
    const tabContents = document.querySelectorAll(".tab-content");
    const pageTitle = document.getElementById("page-title");
    const pageSubtitle = document.getElementById("page-subtitle");

    navItems.forEach(item => {
        item.addEventListener("click", () => {
            const tabId = item.getAttribute("data-tab");
            
            navItems.forEach(nav => nav.classList.remove("active"));
            tabContents.forEach(tab => tab.classList.remove("active"));
            
            item.classList.add("active");
            document.getElementById(`tab-${tabId}`).classList.add("active");

            // Update Header Title based on tab
            switch(tabId) {
                case "dashboard":
                    pageTitle.textContent = "Dashboard";
                    pageSubtitle.textContent = "Welcome back, Pratha. Here is your current attendance standing.";
                    break;
                case "timetable":
                    pageTitle.textContent = "Weekly Timetable";
                    pageSubtitle.textContent = "Organize your weekly classes and quickly log attendance.";
                    break;
                case "predictions":
                    pageTitle.textContent = "Smart Prediction Engine";
                    pageSubtitle.textContent = "Simulate how future attendance decisions affect your grades.";
                    break;
                case "calendar-logs":
                    pageTitle.textContent = "History & Logs";
                    pageSubtitle.textContent = "Review past entries and manage detailed daily logs.";
                    break;
            }
            renderAll();
        });
    });
}

// Core Math Calculations
function getPercentage(attended, total) {
    if (total === 0) return 0;
    return (attended / total) * 100;
}

function calculateAttendanceStatus(subject) {
    const pct = getPercentage(subject.attended, subject.total);
    const req = subject.required;
    
    if (subject.total === 0) {
        return {
            status: "neutral",
            message: "No classes conducted",
            badgeClass: "percentage-warning",
            color: "var(--warning)"
        };
    }

    if (pct >= req) {
        // Safe: calculate how many classes can be missed
        // A / (T + y) >= R => y <= A/R - T
        const R = req / 100;
        let missable = 0;
        if (R > 0) {
            missable = Math.floor(subject.attended / R - subject.total);
        }
        missable = Math.max(0, missable);
        
        return {
            status: "safe",
            message: missable === 0 ? "Critical: Do not miss next class!" : `Safe to skip ${missable} class${missable > 1 ? 'es' : ''}`,
            badgeClass: "percentage-safe",
            color: "var(--success)"
        };
    } else {
        // At Risk: calculate how many classes need to be attended
        // (A + x) / (T + x) >= R => x >= (R*T - A) / (1 - R)
        const R = req / 100;
        let requiredClasses = 0;
        if (R < 1) {
            requiredClasses = Math.ceil((R * subject.total - subject.attended) / (1 - R));
        } else {
            requiredClasses = Infinity; // R = 100% and already missed
        }
        
        return {
            status: "danger",
            message: requiredClasses === Infinity ? "Impossible to hit 100%" : `Must attend next ${requiredClasses} class${requiredClasses > 1 ? 'es' : ''}`,
            badgeClass: "percentage-danger",
            color: "var(--danger)"
        };
    }
}

// Render everything
function renderAll() {
    renderDashboard();
    renderSubjectDropdowns();
    renderTimetable();
    renderPredictions();
    renderCalendar();
    renderLogsList();
}

// 1. Render Dashboard
function renderDashboard() {
    const cardsContainer = document.getElementById("subject-cards-container");
    cardsContainer.innerHTML = "";
    
    let totalConducted = 0;
    let totalAttended = 0;
    let atRiskSubjects = [];
    let lowestPct = 101;
    let worstSubject = null;

    subjects.forEach((sub, index) => {
        totalConducted += sub.total;
        totalAttended += sub.attended;
        
        const pct = getPercentage(sub.attended, sub.total);
        const calc = calculateAttendanceStatus(sub);
        
        if (calc.status === "danger") {
            atRiskSubjects.push(sub.name);
        }
        
        if (pct < lowestPct && sub.total > 0) {
            lowestPct = pct;
            worstSubject = sub;
        }

        // Determine border and progress color based on status
        let accentColor = "var(--primary)";
        if (calc.status === "safe") accentColor = "var(--success)";
        if (calc.status === "danger") accentColor = "var(--danger)";
        if (calc.status === "neutral") accentColor = "var(--warning)";

        const card = document.createElement("div");
        card.className = "glass-card subject-card";
        card.style.setProperty("--card-accent", accentColor);
        card.innerHTML = `
            <div class="subject-card-header">
                <div class="subject-card-title">
                    <h3>${escapeHtml(sub.name)}</h3>
                    <p>Required: ${sub.required}%</p>
                </div>
                <div class="subject-percentage-badge ${calc.badgeClass}">
                    ${pct.toFixed(1)}%
                </div>
            </div>
            
            <div class="progress-bar-wrapper">
                <div class="progress-bar-label-row">
                    <span>Attended: ${sub.attended}/${sub.total}</span>
                    <span>Target: ${Math.ceil(sub.required / 100 * sub.total)}</span>
                </div>
                <div class="progress-bar-bg">
                    <div class="progress-bar-fill" style="width: ${Math.min(100, pct)}%"></div>
                </div>
            </div>
            
            <div class="subject-card-footer">
                <span class="subject-status-text" style="color: ${calc.color}">${calc.message}</span>
                <div class="subject-actions">
                    <button class="action-btn-mini btn-present" data-index="${index}" title="Log Attendance">+ P</button>
                    <button class="action-btn-mini action-btn-mini-danger btn-absent" data-index="${index}" title="Log Absence">- A</button>
                    <button class="action-btn-mini btn-edit" data-index="${index}" title="Edit Subject">
                        <svg viewBox="0 0 24 24" width="12" height="12" stroke="currentColor" stroke-width="2" fill="none"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/></svg>
                    </button>
                    <button class="action-btn-mini action-btn-mini-danger btn-delete" data-index="${index}" title="Delete Subject">
                        <svg viewBox="0 0 24 24" width="12" height="12" stroke="currentColor" stroke-width="2" fill="none"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
                    </button>
                </div>
            </div>
        `;
        cardsContainer.appendChild(card);
    });

    // Add buttons click handlers inside dashboard
    cardsContainer.querySelectorAll(".btn-present").forEach(btn => {
        btn.addEventListener("click", (e) => {
            e.stopPropagation();
            logQuickAttendance(btn.getAttribute("data-index"), "present");
        });
    });
    cardsContainer.querySelectorAll(".btn-absent").forEach(btn => {
        btn.addEventListener("click", (e) => {
            e.stopPropagation();
            logQuickAttendance(btn.getAttribute("data-index"), "absent");
        });
    });
    cardsContainer.querySelectorAll(".btn-edit").forEach(btn => {
        btn.addEventListener("click", (e) => {
            e.stopPropagation();
            openEditSubjectModal(btn.getAttribute("data-index"));
        });
    });
    cardsContainer.querySelectorAll(".btn-delete").forEach(btn => {
        btn.addEventListener("click", (e) => {
            e.stopPropagation();
            deleteSubject(btn.getAttribute("data-index"));
        });
    });

    // Compute and Render Overall Gauge
    const overallPct = getPercentage(totalAttended, totalConducted);
    document.getElementById("overall-percentage-txt").textContent = `${overallPct.toFixed(1)}%`;
    document.getElementById("overall-fraction-txt").textContent = `${totalAttended} / ${totalConducted} Classes`;
    
    document.getElementById("ring-pct").textContent = `${Math.round(overallPct)}%`;
    
    // SVG DashOffset animation
    const circle = document.getElementById("overall-progress-circle");
    const radius = circle.r.baseVal.value;
    const circumference = radius * 2 * Math.PI;
    circle.style.strokeDasharray = `${circumference} ${circumference}`;
    const offset = circumference - (Math.min(100, overallPct) / 100) * circumference;
    circle.style.strokeDashoffset = offset;

    // Set ring color
    if (overallPct >= 75) {
        circle.style.stroke = "var(--success)";
        circle.style.boxShadow = "var(--glow-shadow-success)";
    } else if (overallPct >= 65) {
        circle.style.stroke = "var(--warning)";
    } else {
        circle.style.stroke = "var(--danger)";
    }

    // Render Metric Cards info
    const statusHealthCard = document.getElementById("card-status-health");
    const statusHealthTxt = document.getElementById("status-health-txt");
    const statusHealthDesc = document.getElementById("status-health-desc");

    if (atRiskSubjects.length === 0) {
        statusHealthCard.className = "glass-card metric-card glow-success";
        statusHealthTxt.textContent = "Safe";
        statusHealthTxt.className = "value text-success";
        statusHealthDesc.textContent = "All subjects above target!";
        
        // Hide danger alert banner
        document.getElementById("danger-alert").style.display = "none";
    } else {
        statusHealthCard.className = "glass-card metric-card glow-danger";
        statusHealthTxt.textContent = "At Risk";
        statusHealthTxt.className = "value text-danger";
        statusHealthDesc.textContent = `${atRiskSubjects.length} subject(s) low`;

        // Show danger alert banner with most at risk info
        const banner = document.getElementById("danger-alert");
        const alertTitle = document.getElementById("alert-title");
        const alertDesc = document.getElementById("alert-description");
        banner.style.display = "flex";
        alertTitle.textContent = "Attendance Warning Alert";
        alertDesc.textContent = `Warning: ${atRiskSubjects.join(", ")} attendance requires attention!`;
    }

    // At risk info
    const dangerSubCard = document.getElementById("card-danger-sub");
    const dangerSubName = document.getElementById("danger-sub-name");
    const dangerSubDesc = document.getElementById("danger-sub-desc");

    if (worstSubject) {
        const worstPct = getPercentage(worstSubject.attended, worstSubject.total);
        dangerSubName.textContent = worstSubject.name;
        dangerSubDesc.textContent = `Lowest at ${worstPct.toFixed(1)}%`;
        if (worstPct < worstSubject.required) {
            dangerSubCard.className = "glass-card metric-card glow-danger";
        } else {
            dangerSubCard.className = "glass-card metric-card glow-warning";
        }
    } else {
        dangerSubName.textContent = "None";
        dangerSubDesc.textContent = "Keep it up!";
        dangerSubCard.className = "glass-card metric-card glow-success";
    }

    // Recommendation card
    const quickTipTitle = document.getElementById("quick-tip-title");
    const quickTipDesc = document.getElementById("quick-tip-desc");
    
    // Find how many total classes the user can miss across safe subjects, or overall
    let totalMissable = 0;
    let minAttendToSafe = 0;
    
    subjects.forEach(sub => {
        const calc = calculateAttendanceStatus(sub);
        if (calc.status === "safe") {
            const R = sub.required / 100;
            const m = Math.floor(sub.attended / R - sub.total);
            totalMissable += Math.max(0, m);
        } else if (calc.status === "danger") {
            const R = sub.required / 100;
            const r = Math.ceil((R * sub.total - sub.attended) / (1 - R));
            minAttendToSafe += Math.max(0, r);
        }
    });

    if (minAttendToSafe > 0) {
        quickTipTitle.textContent = `Attend ${minAttendToSafe} Classes`;
        quickTipDesc.textContent = "Needed to get all subjects back in safe zone.";
        document.getElementById("card-quick-tip").className = "glass-card metric-card glow-warning";
    } else if (totalMissable > 0) {
        quickTipTitle.textContent = `Can Skip ${totalMissable}`;
        quickTipDesc.textContent = "Total safe skips available across subjects.";
        document.getElementById("card-quick-tip").className = "glass-card metric-card glow-success";
    } else {
        quickTipTitle.textContent = "On the line";
        quickTipDesc.textContent = "Maintain attendance precisely. No skips allowed.";
        document.getElementById("card-quick-tip").className = "glass-card metric-card glow-primary";
    }
}

// 2. Render Subject Dropdowns
function renderSubjectDropdowns() {
    const selectors = [
        document.getElementById("sim-subject-select"),
        document.getElementById("calendar-filter-subject"),
        document.getElementById("modal-slot-subject"),
        document.getElementById("modal-log-subject")
    ];

    selectors.forEach(select => {
        if (!select) return;
        
        // Keep initial option if it is calendar filter
        const hasAllOption = select.id === "calendar-filter-subject";
        const hasClearOption = select.id === "modal-slot-subject";
        
        const selectedVal = select.value;
        select.innerHTML = "";

        if (hasAllOption) {
            select.innerHTML += `<option value="all">Show All Subjects</option>`;
        }
        if (hasClearOption) {
            select.innerHTML += `<option value="">-- Clear Slot / Empty --</option>`;
        }

        subjects.forEach((sub, i) => {
            select.innerHTML += `<option value="${escapeHtml(sub.name)}">${escapeHtml(sub.name)}</option>`;
        });

        // Restore selected value if it exists
        if (selectedVal) {
            select.value = selectedVal;
        }
    });
}

// 3. Render Weekly Timetable
function renderTimetable() {
    const slots = document.querySelectorAll(".timetable-slot");
    slots.forEach(slot => {
        const day = slot.getAttribute("data-day");
        const period = slot.getAttribute("data-period");
        const key = `${day}-${period}`;
        const subjectName = timetable[key];

        slot.innerHTML = "";
        slot.className = "timetable-slot";

        if (subjectName && subjects.some(s => s.name === subjectName)) {
            slot.classList.add("filled");
            
            // Find subject index
            const subIndex = subjects.findIndex(s => s.name === subjectName);
            const sub = subjects[subIndex];
            const pct = getPercentage(sub.attended, sub.total);

            let statusColor = "var(--primary)";
            if (pct >= sub.required) statusColor = "var(--success)";
            else if (sub.total > 0) statusColor = "var(--danger)";

            slot.innerHTML = `
                <span class="slot-subject-name">${escapeHtml(subjectName)}</span>
                <span class="slot-details" style="color: ${statusColor}">${pct.toFixed(0)}%</span>
                <div class="slot-quick-log">
                    <button class="slot-log-btn slot-log-present" data-index="${subIndex}" title="Logged Present Today">&check;</button>
                    <button class="slot-log-btn slot-log-absent" data-index="${subIndex}" title="Logged Absent Today">&times;</button>
                </div>
            `;
            
            // Log attendance from timetable buttons
            slot.querySelector(".slot-log-present").addEventListener("click", (e) => {
                e.stopPropagation();
                logQuickAttendance(subIndex, "present");
            });
            slot.querySelector(".slot-log-absent").addEventListener("click", (e) => {
                e.stopPropagation();
                logQuickAttendance(subIndex, "absent");
            });
        } else {
            slot.innerHTML = `<span class="slot-details" style="color: var(--text-muted); font-size: 1.25rem;">+</span>`;
        }

        // Slot click handler -> Assign/Edit slot
        slot.addEventListener("click", () => {
            openSlotSetupModal(day, period, subjectName || "");
        });
    });
}

// 4. Render Predictions Panel
function renderPredictions() {
    const select = document.getElementById("sim-subject-select");
    const subjectName = select.value;
    const subject = subjects.find(s => s.name === subjectName);

    if (!subject) {
        document.getElementById("sim-current-pct").textContent = "--%";
        document.getElementById("sim-projected-pct").textContent = "--%";
        document.getElementById("sim-summary-text").textContent = "Please select or create a subject first.";
        return;
    }

    const currentPct = getPercentage(subject.attended, subject.total);
    document.getElementById("sim-current-pct").textContent = `${currentPct.toFixed(1)}%`;
    
    // Sliders
    const attendSlider = document.getElementById("sim-attend-slider");
    const missSlider = document.getElementById("sim-miss-slider");
    
    const attendVal = parseInt(attendSlider.value);
    const missVal = parseInt(missSlider.value);
    
    document.getElementById("sim-attend-value-lbl").textContent = `${attendVal} class${attendVal !== 1 ? 'es' : ''}`;
    document.getElementById("sim-miss-value-lbl").textContent = `${missVal} class${missVal !== 1 ? 'es' : ''}`;

    // Calculate projection
    // New total = current total + simulated classes
    // New attended = current attended + simulated attended
    const projTotal = subject.total + attendVal + missVal;
    const projAttended = subject.attended + attendVal;
    const projPct = getPercentage(projAttended, projTotal);

    const projField = document.getElementById("sim-projected-pct");
    projField.textContent = `${projPct.toFixed(1)}%`;
    
    // Update color of projected
    if (projPct >= subject.required) {
        projField.style.color = "var(--success)";
    } else {
        projField.style.color = "var(--danger)";
    }

    // Build prediction summary description
    let summary = `If you attend ${attendVal} classes and miss ${missVal} classes, your attendance will be ${projPct.toFixed(1)}%. `;
    
    if (projPct >= subject.required) {
        const diff = projPct - subject.required;
        summary += `You will be <strong style="color: var(--success)">SAFE</strong> by ${diff.toFixed(1)}% above your target threshold of ${subject.required}%.`;
    } else {
        const diff = subject.required - projPct;
        summary += `You will be <strong style="color: var(--danger)">AT RISK</strong>, falling ${diff.toFixed(1)}% below your target threshold of ${subject.required}%.`;
    }
    
    document.getElementById("sim-summary-text").innerHTML = summary;
}

// 5. Render History Calendar
function renderCalendar() {
    const container = document.getElementById("calendar-days-container");
    container.innerHTML = "";

    const filterSubject = document.getElementById("calendar-filter-subject").value;
    
    const month = currentCalendarDate.getMonth();
    const year = currentCalendarDate.getFullYear();

    // Set Calendar month name header
    const months = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
    document.getElementById("calendar-month-title").textContent = `${months[month]} ${year}`;

    // Add weekday headers
    const weekdays = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    weekdays.forEach(day => {
        const el = document.createElement("div");
        el.className = "calendar-weekday";
        el.textContent = day;
        container.appendChild(el);
    });

    // Start calculations for month grid
    const firstDayIndex = new Date(year, month, 1).getDay();
    const lastDayDate = new Date(year, month + 1, 0).getDate();
    const prevLastDayDate = new Date(year, month, 0).getDate();

    // Render previous month cells (disabled/other-month)
    for (let i = firstDayIndex; i > 0; i--) {
        const day = prevLastDayDate - i + 1;
        const cell = document.createElement("div");
        cell.className = "calendar-day-cell other-month";
        cell.innerHTML = `<span class="calendar-day-number">${day}</span>`;
        container.appendChild(cell);
    }

    // Render current month cells
    const today = new Date();
    for (let day = 1; day <= lastDayDate; day++) {
        const cell = document.createElement("div");
        cell.className = "calendar-day-cell";
        
        const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        
        if (today.getFullYear() === year && today.getMonth() === month && today.getDate() === day) {
            cell.classList.add("today");
        }

        // Find logs for this specific day
        const dayLogs = logs.filter(log => {
            const isMatch = log.date === dateStr;
            const isSubMatch = filterSubject === "all" || log.subjectName === filterSubject;
            return isMatch && isSubMatch;
        });

        // Add dots for logs
        let dotsHtml = "";
        if (dayLogs.length > 0) {
            dotsHtml = `<div class="calendar-day-dots">`;
            dayLogs.slice(0, 4).forEach(log => {
                let dotClass = "calendar-dot-present";
                if (log.status === "absent") dotClass = "calendar-dot-absent";
                if (log.status === "holiday") dotClass = "calendar-dot-holiday";
                
                const titleText = `${escapeHtml(log.subjectName)}: ${log.status.toUpperCase()}`;
                dotsHtml += `<div class="calendar-dot ${dotClass}" title="${titleText}"></div>`;
            });
            dotsHtml += `</div>`;
        }

        cell.innerHTML = `
            <span class="calendar-day-number">${day}</span>
            ${dotsHtml}
        `;
        
        cell.addEventListener("click", () => {
            openLogDayModal(dateStr, dayLogs);
        });

        container.appendChild(cell);
    }

    // Render next month cells to fill grid (assuming 42 cells grid standard)
    const totalCells = 42;
    const filledCells = firstDayIndex + lastDayDate;
    const remainingCells = totalCells - filledCells;
    
    // If we exceed 35 cells we display 42, else if <= 35 we can display 35
    const cellsToDraw = filledCells <= 35 ? 35 : 42;
    const nextCells = cellsToDraw - filledCells;

    for (let day = 1; day <= nextCells; day++) {
        const cell = document.createElement("div");
        cell.className = "calendar-day-cell other-month";
        cell.innerHTML = `<span class="calendar-day-number">${day}</span>`;
        container.appendChild(cell);
    }
}

// 6. Render Logs List
function renderLogsList() {
    const list = document.getElementById("logs-list-container");
    list.innerHTML = "";

    if (logs.length === 0) {
        list.innerHTML = `<li style="text-align: center; color: var(--text-muted); font-size: 0.9rem; padding: 2rem;">No attendance logged yet.</li>`;
        return;
    }

    // Display logs sorted by timestamp (newest first)
    const sortedLogs = [...logs].sort((a, b) => b.timestamp - a.timestamp);

    sortedLogs.forEach(log => {
        let badgeClass = "log-badge-present";
        if (log.status === "absent") badgeClass = "log-badge-absent";
        if (log.status === "holiday") badgeClass = "log-badge-holiday";

        const formattedDate = formatDateString(log.date);

        const li = document.createElement("li");
        li.className = "log-item";
        li.innerHTML = `
            <div class="log-info">
                <span class="log-title">${escapeHtml(log.subjectName)}</span>
                <span class="log-meta">${formattedDate}</span>
            </div>
            <div style="display: flex; align-items: center; gap: 0.75rem;">
                <span class="log-badge ${badgeClass}">${log.status.toUpperCase()}</span>
                <button class="action-btn-mini action-btn-mini-danger btn-delete-log" data-id="${log.id}" title="Delete Log Entry" style="width: 26px; height: 26px; font-size: 0.8rem;">&times;</button>
            </div>
        `;

        li.querySelector(".btn-delete-log").addEventListener("click", () => {
            deleteLog(log.id);
        });

        list.appendChild(li);
    });
}

// Quick Attendance Logger (Present/Absent buttons on Subject Cards & Timetable slots)
function logQuickAttendance(subjectIndex, status) {
    const subject = subjects[subjectIndex];
    if (!subject) return;

    const todayStr = getLocalDateString(new Date());

    // Update counts
    if (status === "present") {
        subject.total += 1;
        subject.attended += 1;
    } else if (status === "absent") {
        subject.total += 1;
    }
    // Holiday doesn't alter counts

    // Add log
    logs.push({
        id: Date.now(),
        subjectName: subject.name,
        status: status,
        date: todayStr,
        timestamp: Date.now()
    });

    saveState();
    renderAll();
    showToast(`Logged ${status} for ${subject.name}`);
}

// Delete Log Entry & Revert Attendance Counts
function deleteLog(logId) {
    const logIndex = logs.findIndex(l => l.id === logId);
    if (logIndex === -1) return;

    const log = logs[logIndex];
    const subject = subjects.find(s => s.name === log.subjectName);

    if (subject) {
        if (log.status === "present") {
            subject.total = Math.max(0, subject.total - 1);
            subject.attended = Math.max(0, subject.attended - 1);
        } else if (log.status === "absent") {
            subject.total = Math.max(0, subject.total - 1);
        }
    }

    logs.splice(logIndex, 1);
    saveState();
    renderAll();
    showToast("Attendance entry deleted");
}

// Add or Edit Subject
function saveSubject() {
    const indexInput = document.getElementById("modal-subject-index");
    const nameInput = document.getElementById("modal-subject-name");
    const totalInput = document.getElementById("modal-subject-total");
    const attendedInput = document.getElementById("modal-subject-attended");
    const requiredInput = document.getElementById("modal-subject-required");

    const name = nameInput.value.trim();
    const total = parseInt(totalInput.value);
    const attended = parseInt(attendedInput.value);
    const required = parseFloat(requiredInput.value);

    if (!name) {
        alert("Please enter subject name");
        return;
    }
    if (isNaN(total) || total < 0) {
        alert("Total conducted must be a non-negative number");
        return;
    }
    if (isNaN(attended) || attended < 0 || attended > total) {
        alert("Attended classes must be non-negative and less than or equal to total classes");
        return;
    }
    if (isNaN(required) || required < 0 || required > 100) {
        alert("Required percentage must be between 0 and 100");
        return;
    }

    const index = indexInput.value;
    if (index === "") {
        // Add new
        // Check duplication
        if (subjects.some(s => s.name.toLowerCase() === name.toLowerCase())) {
            alert("Subject already exists!");
            return;
        }
        subjects.push({ name, total, attended, required });
        showToast(`Added ${name}`);
    } else {
        // Edit existing
        const oldName = subjects[index].name;
        subjects[index] = { name, total, attended, required };
        
        // Update subject name in logs if changed
        if (oldName !== name) {
            logs.forEach(l => {
                if (l.subjectName === oldName) l.subjectName = name;
            });
            // Update timetable
            for (let key in timetable) {
                if (timetable[key] === oldName) timetable[key] = name;
            }
        }
        showToast(`Updated ${name}`);
    }

    saveState();
    closeModal("modal-subject-overlay");
    renderAll();
}

function deleteSubject(index) {
    const name = subjects[index].name;
    if (confirm(`Are you sure you want to delete ${name}? This will remove all its attendance logs and timetable slots.`)) {
        // Remove logs
        logs = logs.filter(l => l.subjectName !== name);
        // Remove from timetable
        for (let key in timetable) {
            if (timetable[key] === name) {
                delete timetable[key];
            }
        }
        // Remove subject
        subjects.splice(index, 1);
        saveState();
        renderAll();
        showToast(`Deleted ${name}`);
    }
}

// Timetable Slot Assignments
function saveSlot() {
    const day = document.getElementById("modal-slot-day").value;
    const period = document.getElementById("modal-slot-period").value;
    const select = document.getElementById("modal-slot-subject");
    const selectedSubject = select.value;

    const key = `${day}-${period}`;
    if (selectedSubject === "") {
        delete timetable[key];
    } else {
        timetable[key] = selectedSubject;
    }

    saveState();
    closeModal("modal-slot-overlay");
    renderTimetable();
    showToast("Timetable slot updated");
}

// Log Calendar day modal entries
function logDayAttendance(status) {
    const dateStr = document.getElementById("modal-log-date").value;
    const subjectName = document.getElementById("modal-log-subject").value;
    
    const subject = subjects.find(s => s.name === subjectName);
    if (!subject) return;

    // Remove any existing log for this subject on this day to avoid duplicate counting
    const existingLogIdx = logs.findIndex(l => l.date === dateStr && l.subjectName === subjectName);
    if (existingLogIdx !== -1) {
        const oldLog = logs[existingLogIdx];
        if (oldLog.status === "present") {
            subject.total = Math.max(0, subject.total - 1);
            subject.attended = Math.max(0, subject.attended - 1);
        } else if (oldLog.status === "absent") {
            subject.total = Math.max(0, subject.total - 1);
        }
        logs.splice(existingLogIdx, 1);
    }

    // Add new log & adjust count
    if (status !== "delete") {
        if (status === "present") {
            subject.total += 1;
            subject.attended += 1;
        } else if (status === "absent") {
            subject.total += 1;
        }
        
        logs.push({
            id: Date.now(),
            subjectName: subjectName,
            status: status,
            date: dateStr,
            timestamp: Date.now()
        });
        showToast(`Logged ${status} for ${subjectName} on ${dateStr}`);
    } else {
        showToast("Log entry cleared");
    }

    saveState();
    closeModal("modal-log-day-overlay");
    renderAll();
}

// Export / Import JSON Data
function exportData() {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify({
        subjects, timetable, logs
    }, null, 2));
    const downloadAnchor = document.createElement("a");
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", "attendance_backup.json");
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
}

function importData(e) {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = function(event) {
        try {
            const data = JSON.parse(event.target.result);
            if (data.subjects && Array.isArray(data.subjects)) {
                subjects = data.subjects;
                timetable = data.timetable || {};
                logs = data.logs || [];
                saveState();
                renderAll();
                showToast("Data imported successfully!");
            } else {
                alert("Invalid backup file format!");
            }
        } catch (err) {
            alert("Error parsing backup file!");
        }
    };
    reader.readAsText(file);
}

// Setup Event Listeners
function setupEventListeners() {
    // Add subject modal buttons
    document.getElementById("btn-add-subject").addEventListener("click", () => {
        openAddSubjectModal();
    });
    document.getElementById("btn-close-subject-modal").addEventListener("click", () => closeModal("modal-subject-overlay"));
    document.getElementById("btn-cancel-subject-modal").addEventListener("click", () => closeModal("modal-subject-overlay"));
    document.getElementById("btn-save-subject").addEventListener("click", saveSubject);

    // Timetable slot modal buttons
    document.getElementById("btn-close-slot-modal").addEventListener("click", () => closeModal("modal-slot-overlay"));
    document.getElementById("btn-cancel-slot-modal").addEventListener("click", () => closeModal("modal-slot-overlay"));
    document.getElementById("btn-save-slot").addEventListener("click", saveSlot);

    // Calendar navigation
    document.getElementById("btn-prev-month").addEventListener("click", () => {
        currentCalendarDate.setMonth(currentCalendarDate.getMonth() - 1);
        renderCalendar();
    });
    document.getElementById("btn-next-month").addEventListener("click", () => {
        currentCalendarDate.setMonth(currentCalendarDate.getMonth() + 1);
        renderCalendar();
    });
    document.getElementById("calendar-filter-subject").addEventListener("change", renderCalendar);

    // Log day modal buttons
    document.getElementById("btn-close-log-day-modal").addEventListener("click", () => closeModal("modal-log-day-overlay"));
    document.getElementById("btn-cancel-log-day-modal").addEventListener("click", () => closeModal("modal-log-day-overlay"));
    document.getElementById("btn-log-status-present").addEventListener("click", () => logDayAttendance("present"));
    document.getElementById("btn-log-status-absent").addEventListener("click", () => logDayAttendance("absent"));
    document.getElementById("btn-log-status-holiday").addEventListener("click", () => logDayAttendance("holiday"));
    document.getElementById("btn-delete-log-day").addEventListener("click", () => logDayAttendance("delete"));

    // Simulator Sliders
    const simSelect = document.getElementById("sim-subject-select");
    const simAttend = document.getElementById("sim-attend-slider");
    const simMiss = document.getElementById("sim-miss-slider");

    simSelect.addEventListener("change", () => {
        simAttend.value = 0;
        simMiss.value = 0;
        renderPredictions();
    });
    simAttend.addEventListener("input", renderPredictions);
    simMiss.addEventListener("input", renderPredictions);

    // Calculate Target Path Button
    document.getElementById("btn-calc-target").addEventListener("click", () => {
        const subName = simSelect.value;
        const sub = subjects.find(s => s.name === subName);
        if (!sub) return;

        const targetPct = parseFloat(document.getElementById("sim-target-pct").value);
        if (isNaN(targetPct) || targetPct <= 0 || targetPct > 100) {
            alert("Please enter a valid target percentage between 1 and 100.");
            return;
        }

        const currentPct = getPercentage(sub.attended, sub.total);
        const R = targetPct / 100;
        
        let msg = "";
        if (currentPct >= targetPct) {
            // Safe: how many can miss
            let missable = 0;
            if (R > 0) {
                missable = Math.floor(sub.attended / R - sub.total);
            }
            missable = Math.max(0, missable);
            msg = `You already meet the ${targetPct}% requirement! You can safely miss up to <strong>${missable} class${missable !== 1 ? 'es' : ''}</strong> consecutively before dropping below the target.`;
        } else {
            // Need to attend
            let requiredClasses = 0;
            if (R < 1) {
                requiredClasses = Math.ceil((R * sub.total - sub.attended) / (1 - R));
            } else {
                requiredClasses = Infinity;
            }
            
            if (requiredClasses === Infinity) {
                msg = `To hit <strong>100%</strong> attendance, you can never miss another class. However, since you have already missed classes, hitting exactly 100.0% is mathematically impossible.`;
            } else {
                msg = `To reach your target of ${targetPct}%, you must attend the next <strong>${requiredClasses} class${requiredClasses !== 1 ? 'es' : ''}</strong> consecutively without missing any.`;
            }
        }

        document.getElementById("sim-summary-text").innerHTML = msg;
    });

    // Clear history logs
    document.getElementById("btn-clear-logs").addEventListener("click", () => {
        if (confirm("Are you sure you want to clear ALL logged history? This does not alter current attendance totals, only deletes the timeline visual calendar points.")) {
            logs = [];
            saveState();
            renderAll();
            showToast("Logged history cleared");
        }
    });

    // Import/Export hooks
    document.getElementById("btn-export").addEventListener("click", exportData);
    const importTrigger = document.getElementById("btn-import-trigger");
    const fileImport = document.getElementById("file-import");
    importTrigger.addEventListener("click", () => fileImport.click());
    fileImport.addEventListener("change", importData);
}

// Modal open/close helpers
function openModal(id) {
    document.getElementById(id).classList.add("active");
}
function closeModal(id) {
    document.getElementById(id).classList.remove("active");
}

function openAddSubjectModal() {
    document.getElementById("subject-modal-title").textContent = "Add Subject";
    document.getElementById("modal-subject-index").value = "";
    document.getElementById("modal-subject-name").value = "";
    document.getElementById("modal-subject-total").value = "";
    document.getElementById("modal-subject-attended").value = "";
    document.getElementById("modal-subject-required").value = "75";
    openModal("modal-subject-overlay");
}

function openEditSubjectModal(index) {
    const sub = subjects[index];
    document.getElementById("subject-modal-title").textContent = "Edit Subject";
    document.getElementById("modal-subject-index").value = index;
    document.getElementById("modal-subject-name").value = sub.name;
    document.getElementById("modal-subject-total").value = sub.total;
    document.getElementById("modal-subject-attended").value = sub.attended;
    document.getElementById("modal-subject-required").value = sub.required;
    openModal("modal-subject-overlay");
}

function openSlotSetupModal(day, period, currentSubject) {
    document.getElementById("modal-slot-day").value = day;
    document.getElementById("modal-slot-period").value = period;
    document.getElementById("modal-slot-subject").value = currentSubject;
    openModal("modal-slot-overlay");
}

function openLogDayModal(dateStr, dayLogs) {
    document.getElementById("modal-log-date").value = dateStr;
    document.getElementById("modal-log-day-label").textContent = `Date: ${formatDateString(dateStr)}`;
    
    const deleteBtn = document.getElementById("btn-delete-log-day");
    if (dayLogs.length > 0) {
        deleteBtn.style.display = "block";
        // Pre-fill subject select if log exists
        document.getElementById("modal-log-subject").value = dayLogs[0].subjectName;
    } else {
        deleteBtn.style.display = "none";
    }
    
    openModal("modal-log-day-overlay");
}

// Toast Notification Widget
function showToast(message) {
    let toast = document.querySelector(".app-toast");
    if (!toast) {
        toast = document.createElement("div");
        toast.className = "app-toast";
        // Inline Toast styling matching design theme
        Object.assign(toast.style, {
            position: "fixed",
            bottom: "2rem",
            right: "2rem",
            background: "rgba(11, 15, 30, 0.9)",
            border: "1px solid var(--primary)",
            boxShadow: "var(--glow-shadow-primary)",
            padding: "0.85rem 1.5rem",
            borderRadius: "10px",
            color: "#fff",
            zIndex: "2000",
            fontSize: "0.9rem",
            fontFamily: "var(--font-body)",
            fontWeight: "500",
            pointerEvents: "none",
            opacity: "0",
            transform: "translateY(10px)",
            transition: "all 0.3s"
        });
        document.body.appendChild(toast);
    }
    toast.textContent = message;
    
    // Animate
    setTimeout(() => {
        toast.style.opacity = "1";
        toast.style.transform = "translateY(0)";
    }, 10);
    
    setTimeout(() => {
        toast.style.opacity = "0";
        toast.style.transform = "translateY(10px)";
    }, 3000);
}

// Utility Helpers
function escapeHtml(str) {
    const div = document.createElement('div');
    div.appendChild(document.createTextNode(str));
    return div.innerHTML;
}

function getLocalDateString(date) {
    return date.toISOString().split('T')[0];
}

function formatDateString(dateStr) {
    const parts = dateStr.split('-');
    if (parts.length !== 3) return dateStr;
    const date = new Date(parts[0], parts[1] - 1, parts[2]);
    const options = { month: 'short', day: 'numeric', year: 'numeric' };
    return date.toLocaleDateString('en-US', options);
}

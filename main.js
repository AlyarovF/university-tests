// State
let appData = null;
let currentSubject = null;
let currentVariant = null;
let currentQuestions = [];
let userAnswers = {};
let timerInterval = null;
let timeLeft = 25 * 60; // 25 minutes in seconds
let vibrationEnabled = localStorage.getItem('vibrationEnabled') !== 'false'; // default ON

// Vibration helper
function triggerVibration(pattern) {
    if (!vibrationEnabled) return;
    if (navigator.vibrate) {
        navigator.vibrate(pattern);
    }
}

// DOM Elements
const screens = {
    home: document.getElementById('homeScreen'),
    variants: document.getElementById('variantsScreen'),
    quiz: document.getElementById('quizScreen'),
    results: document.getElementById('resultsScreen')
};

const ui = {
    header: document.querySelector('.header'),
    logo: document.getElementById('logo'),
    themeToggleBtn: document.getElementById('themeToggleBtn'),
    loginBtn: document.getElementById('loginBtn'),
    logoutBtn: document.getElementById('logoutBtn'),
    userInfo: document.getElementById('userInfo'),
    subjectsGrid: document.getElementById('subjectsGrid'),
    subjectTitle: document.getElementById('subjectTitle'),
    variantsGrid: document.getElementById('variantsGrid'),
    backToHomeBtn: document.getElementById('backToHomeBtn'),
    timer: document.getElementById('timer'),
    questionList: document.getElementById('questionList'),
    finishQuizBtn: document.getElementById('finishQuizBtn'),
    exitQuizBtn: document.getElementById('exitQuizBtn'),
    correctCount: document.getElementById('correctCount'),
    incorrectCount: document.getElementById('incorrectCount'),
    bestScoreInfo: document.getElementById('bestScoreInfo'),
    retakeBtn: document.getElementById('retakeBtn'),
    reviewBtn: document.getElementById('reviewBtn'),
    homeBtn: document.getElementById('homeBtn'),
    reviewSection: document.getElementById('reviewSection'),
    reviewQuestions: document.getElementById('reviewQuestions'),
    reviewBackHomeBtn: document.getElementById('reviewBackHomeBtn'),
    reviewRetakeBtn: document.getElementById('reviewRetakeBtn'),
    confettiCanvas: document.getElementById('confettiCanvas')
};

// Initialize
async function init() {
    initTheme();
    initVibrationToggle();
    setupEventListeners();
    await loadData();
    renderSubjects();
}

// Theme Logic
function initTheme() {
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme === 'dark') {
        document.body.classList.add('dark-mode');
        if(ui.themeToggleBtn) ui.themeToggleBtn.textContent = '☀️';
    } else {
        if(ui.themeToggleBtn) ui.themeToggleBtn.textContent = '🌙';
    }
}

function toggleTheme() {
    document.body.classList.toggle('dark-mode');
    const isDark = document.body.classList.contains('dark-mode');
    localStorage.setItem('theme', isDark ? 'dark' : 'light');
    if(ui.themeToggleBtn) ui.themeToggleBtn.textContent = isDark ? '☀️' : '🌙';
}

function setupEventListeners() {
    ui.logo.addEventListener('click', showHomeScreen);
    if(ui.themeToggleBtn) ui.themeToggleBtn.addEventListener('click', toggleTheme);
    ui.backToHomeBtn.addEventListener('click', () => {
        stopTimer();
        switchScreen('variants');
    });
    ui.homeBtn.addEventListener('click', showHomeScreen);
    ui.finishQuizBtn.addEventListener('click', finishQuiz);
    ui.exitQuizBtn.addEventListener('click', exitQuiz);
    
    // Vibration toggle
    const vibToggle = document.getElementById('vibrationToggleBtn');
    if (vibToggle) {
        vibToggle.addEventListener('click', toggleVibration);
    }
    
    // Retake button — restart the same variant with fresh randomization
    ui.retakeBtn.addEventListener('click', () => {
        if (currentVariant) {
            startQuiz(currentVariant);
        }
    });
    
    // Review button — show error review (one-time toggle)
    ui.reviewBtn.addEventListener('click', () => {
        ui.reviewSection.classList.remove('hidden');
        ui.reviewBtn.classList.add('hidden'); // Hide the review button after clicking
        ui.reviewSection.scrollIntoView({ behavior: 'smooth' });
    });
    
    // Review section bottom buttons
    ui.reviewBackHomeBtn.addEventListener('click', showHomeScreen);
    ui.reviewRetakeBtn.addEventListener('click', () => {
        if (currentVariant) {
            startQuiz(currentVariant);
        }
    });
}

import appDataRaw from './data.json';

async function loadData() {
    try {
        appData = JSON.parse(JSON.stringify(appDataRaw)); // deep copy to avoid mutating original import
        
        // Dynamically create variants of 25 questions each
        if (appData && appData.subjects) {
            appData.subjects.forEach(subject => {
                if (subject.questions && !subject.variants) {
                    subject.variants = [];
                    const chunkSize = 25;
                    for (let i = 0; i < subject.questions.length; i += chunkSize) {
                        const chunk = subject.questions.slice(i, i + chunkSize);
                        subject.variants.push({
                            id: `var${Math.floor(i/chunkSize) + 1}`,
                            title: `Variant ${Math.floor(i/chunkSize) + 1}`,
                            questions: chunk
                        });
                    }
                }
            });
        }
    } catch (error) {
        console.error("Error loading data", error);
        alert("Ma'lumotlarni yuklashda xatolik yuz berdi.");
    }
}

// Best Score helpers (localStorage)
function getBestScoreKey(subjectId, variantId) {
    return `bestScore_${subjectId}_${variantId}`;
}

function getBestScore(subjectId, variantId) {
    const key = getBestScoreKey(subjectId, variantId);
    const val = localStorage.getItem(key);
    return val !== null ? parseInt(val, 10) : null;
}

function saveBestScore(subjectId, variantId, score) {
    const key = getBestScoreKey(subjectId, variantId);
    const prev = getBestScore(subjectId, variantId);
    if (prev === null || score > prev) {
        localStorage.setItem(key, score.toString());
        return true; // new best
    }
    return false;
}

// Navigation
function switchScreen(screenName) {
    Object.values(screens).forEach(s => s.classList.add('hidden'));
    screens[screenName].classList.remove('hidden');
    
    if (screenName === 'quiz') {
        ui.header.classList.add('hidden');
    } else {
        ui.header.classList.remove('hidden');
    }
    
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

function showHomeScreen() {
    stopTimer();
    switchScreen('home');
}

function showVariantsScreen(subject) {
    currentSubject = subject;
    ui.subjectTitle.textContent = subject.title;
    ui.variantsGrid.innerHTML = '';
    
    subject.variants.forEach(variant => {
        const card = document.createElement('div');
        card.className = 'card variant-card';
        
        const bestScore = getBestScore(subject.id || subject.title, variant.id);
        const bestScoreHTML = bestScore !== null 
            ? `<div class="variant-best-score"><span class="best-icon">🏆</span> Eng yaxshi: <strong>${bestScore}/25</strong></div>` 
            : `<div class="variant-best-score no-score"><span class="best-icon">📝</span> Hali topshirilmagan</div>`;
        
        card.innerHTML = `
            <h2>${variant.title}</h2>
            <p>${variant.questions.length} ta savol</p>
            <p>Vaqt: 25 daqiqa</p>
            ${bestScoreHTML}
        `;
        card.addEventListener('click', () => startQuiz(variant));
        ui.variantsGrid.appendChild(card);
    });
    
    switchScreen('variants');
}

function exitQuiz() {
    const confirmExit = confirm("Testni rostdan ham to'xtatmoqchimisiz? Barcha natijalaringiz o'chib ketadi.");
    if (confirmExit) {
        stopTimer();
        if (currentSubject) {
            showVariantsScreen(currentSubject);
        } else {
            showHomeScreen();
        }
    }
}

// Utility
function shuffleArray(array) {
    const newArray = [...array];
    for (let i = newArray.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [newArray[i], newArray[j]] = [newArray[j], newArray[i]];
    }
    return newArray;
}

// Quiz Logic
function startQuiz(variant) {
    currentVariant = variant;
    // Deep clone to avoid mutating the original data during shuffling
    let questions = JSON.parse(JSON.stringify(variant.questions.slice(0, 25)));
    
    // 1. Shuffle question ORDER (randomize the 25 questions)
    questions = shuffleArray(questions);
    
    // 2. Shuffle options for each question (keep correct answer tracked)
    questions.forEach(q => {
        if (q.options && q.options.length > 0) {
            const indexedOptions = q.options.map((text, index) => ({ 
                text, 
                originalIndex: index + 1 
            }));
            const shuffled = shuffleArray(indexedOptions);
            q.options = shuffled.map(item => item.text);
            
            // Find the new index of the original correct answer
            const newCorrectIndex = shuffled.findIndex(item => item.originalIndex === q.answer) + 1;
            q.answer = newCorrectIndex;
        }
    });
    
    currentQuestions = questions;
    userAnswers = {};
    
    renderQuiz();
    startTimer();
    switchScreen('quiz');
}

function renderQuiz() {
    ui.questionList.innerHTML = '';
    
    currentQuestions.forEach((q, index) => {
        const card = document.createElement('div');
        card.className = 'question-card';
        card.id = `q-${q.id}`;
        
        const qNum = document.createElement('div');
        qNum.className = 'question-number';
        qNum.textContent = index + 1;
        
        const qText = document.createElement('div');
        qText.className = 'question-text';
        qText.textContent = q.qn;
        
        const optionsDiv = document.createElement('div');
        optionsDiv.className = 'options';
        
        q.options.forEach((optText, optIndex) => {
            const optBtn = document.createElement('div');
            optBtn.className = 'option';
            optBtn.textContent = optText;
            
            // Note: answer in JSON is 1-indexed (e.g. 1 means 0th option)
            const isCorrectOption = (optIndex + 1) === q.answer;
            
            optBtn.addEventListener('click', () => {
                // If already answered, do nothing
                if (userAnswers[q.id] !== undefined) return;
                
                // Save answer (1-indexed)
                userAnswers[q.id] = optIndex + 1;
                
                // Lock options in this card
                const allOpts = optionsDiv.querySelectorAll('.option');
                allOpts.forEach((o, i) => {
                    o.classList.add('locked');
                    // Show correct answer anyway
                    if ((i + 1) === q.answer) {
                        o.classList.add('correct');
                    }
                });
                
                // Show if chosen is incorrect with animation
                if (!isCorrectOption) {
                    optBtn.classList.add('incorrect');
                    // Shake animation for wrong answer
                    card.classList.add('shake');
                    setTimeout(() => card.classList.remove('shake'), 500);
                    // Vibrate on wrong answer (short burst pattern)
                    triggerVibration([100, 50, 100]);
                } else {
                    // Celebration for correct answer
                    optBtn.classList.add('correct-pop');
                    launchMiniCelebration(optBtn);
                }
            });
            
            optionsDiv.appendChild(optBtn);
        });
        
        card.appendChild(qNum);
        card.appendChild(qText);
        card.appendChild(optionsDiv);
        ui.questionList.appendChild(card);
    });
}

// Mini celebration sparkles for correct answer
function launchMiniCelebration(element) {
    const rect = element.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    
    const emojis = ['🎉', '✨', '⭐', '🌟', '💫', '🎊'];
    
    for (let i = 0; i < 8; i++) {
        const particle = document.createElement('div');
        particle.className = 'celebration-particle';
        particle.textContent = emojis[Math.floor(Math.random() * emojis.length)];
        
        const angle = (Math.PI * 2 * i) / 8;
        const distance = 60 + Math.random() * 40;
        const tx = Math.cos(angle) * distance;
        const ty = Math.sin(angle) * distance;
        
        particle.style.left = `${centerX}px`;
        particle.style.top = `${centerY}px`;
        particle.style.setProperty('--tx', `${tx}px`);
        particle.style.setProperty('--ty', `${ty}px`);
        
        document.body.appendChild(particle);
        
        setTimeout(() => particle.remove(), 800);
    }
}

// Full confetti celebration for results screen
function launchConfetti() {
    const canvas = ui.confettiCanvas;
    if (!canvas) return;
    
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    canvas.classList.add('active');
    
    const ctx = canvas.getContext('2d');
    const particles = [];
    const colors = ['#4f46e5', '#818cf8', '#8b5cf6', '#059669', '#34d399', '#f59e0b', '#ef4444', '#ec4899'];
    
    for (let i = 0; i < 120; i++) {
        particles.push({
            x: Math.random() * canvas.width,
            y: Math.random() * canvas.height - canvas.height,
            w: Math.random() * 10 + 5,
            h: Math.random() * 6 + 3,
            color: colors[Math.floor(Math.random() * colors.length)],
            speed: Math.random() * 3 + 2,
            angle: Math.random() * Math.PI * 2,
            spin: (Math.random() - 0.5) * 0.2,
            drift: (Math.random() - 0.5) * 1.5
        });
    }
    
    let frame = 0;
    const maxFrames = 420; // ~7 seconds for longer celebration
    
    function animate() {
        frame++;
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        particles.forEach(p => {
            p.y += p.speed;
            p.x += p.drift;
            p.angle += p.spin;
            
            ctx.save();
            ctx.translate(p.x, p.y);
            ctx.rotate(p.angle);
            ctx.fillStyle = p.color;
            ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
            ctx.restore();
        });
        
        if (frame < maxFrames) {
            requestAnimationFrame(animate);
        } else {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            canvas.classList.remove('active');
        }
    }
    
    animate();
}

// Timer
function startTimer() {
    timeLeft = 25 * 60;
    ui.timer.classList.remove('warning');
    updateTimerDisplay();
    
    timerInterval = setInterval(() => {
        timeLeft--;
        updateTimerDisplay();
        
        if (timeLeft <= 60) {
            ui.timer.classList.add('warning');
        }
        
        if (timeLeft <= 0) {
            stopTimer();
            alert("Vaqt tugadi!");
            finishQuiz();
        }
    }, 1000);
}

function stopTimer() {
    if (timerInterval) {
        clearInterval(timerInterval);
        timerInterval = null;
    }
}

function updateTimerDisplay() {
    const m = Math.floor(timeLeft / 60).toString().padStart(2, '0');
    const s = (timeLeft % 60).toString().padStart(2, '0');
    ui.timer.textContent = `${m}:${s}`;
}

// Results
async function finishQuiz() {
    stopTimer();
    
    let correct = 0;
    let incorrect = 0;
    
    currentQuestions.forEach(q => {
        const ans = userAnswers[q.id];
        if (ans === q.answer) {
            correct++;
        } else if (ans !== undefined) {
            incorrect++;
        } else {
            // Unanswered counts as incorrect
            incorrect++;
            userAnswers[q.id] = null; // Mark as null (unanswered)
        }
    });
    
    ui.correctCount.textContent = correct;
    ui.incorrectCount.textContent = incorrect;
    
    // Save best score
    const subjectId = currentSubject ? (currentSubject.id || currentSubject.title) : 'unknown';
    const variantId = currentVariant ? currentVariant.id : 'unknown';
    const isNewBest = saveBestScore(subjectId, variantId, correct);
    const prevBest = getBestScore(subjectId, variantId);
    
    // Show best score info
    if (isNewBest) {
        ui.bestScoreInfo.textContent = `🏆 Yangi rekord! ${correct}/25`;
        ui.bestScoreInfo.className = 'best-score-info new-best';
    } else {
        ui.bestScoreInfo.textContent = `🏆 Eng yaxshi natija: ${prevBest}/25`;
        ui.bestScoreInfo.className = 'best-score-info';
    }
    ui.bestScoreInfo.classList.remove('hidden');
    
    // Reset review button visibility
    ui.reviewBtn.classList.remove('hidden');
    ui.reviewSection.classList.add('hidden');
    renderReview();
    
    switchScreen('results');
    
    // Launch confetti celebration:
    // If 16+ questions: trigger when more than 16 correct
    // If fewer than 16 questions: trigger only on 100% correct
    const totalQns = currentQuestions.length;
    const shouldCelebrate = totalQns >= 16 ? correct > 16 : correct === totalQns;
    if (shouldCelebrate) {
        setTimeout(() => launchConfetti(), 300);
    }
}

function renderReview() {
    ui.reviewQuestions.innerHTML = '';
    
    // Only show incorrect & unanswered questions
    const wrongQuestions = currentQuestions.filter(q => {
        const ans = userAnswers[q.id];
        return ans !== q.answer;
    });
    
    if (wrongQuestions.length === 0) {
        const noErrors = document.createElement('p');
        noErrors.className = 'no-errors-msg';
        noErrors.textContent = "🎉 Barcha javoblar to'g'ri! Ajoyib!";
        ui.reviewQuestions.appendChild(noErrors);
        return;
    }
    
    wrongQuestions.forEach((q, index) => {
        const card = document.createElement('div');
        card.className = 'question-card';
        
        const qNum = document.createElement('div');
        qNum.className = 'question-number';
        qNum.textContent = index + 1;
        
        const qText = document.createElement('div');
        qText.className = 'question-text';
        qText.textContent = q.qn;
        
        const optionsDiv = document.createElement('div');
        optionsDiv.className = 'options';
        
        const userAns = userAnswers[q.id];
        
        q.options.forEach((optText, optIndex) => {
            const optBtn = document.createElement('div');
            optBtn.className = 'option locked';
            optBtn.textContent = optText;
            
            const optionNum = optIndex + 1;
            
            if (optionNum === q.answer) {
                optBtn.classList.add('correct');
            } else if (userAns === optionNum) {
                optBtn.classList.add('incorrect');
            }
            
            optionsDiv.appendChild(optBtn);
        });
        
        const statusText = document.createElement('p');
        statusText.className = 'review-status';
        if (userAns === null || userAns === undefined) {
            statusText.textContent = "❌ Javob berilmagan";
            statusText.classList.add('status-unanswered');
        } else {
            statusText.textContent = "❌ Noto'g'ri javob";
            statusText.classList.add('status-wrong');
        }
        
        card.appendChild(qNum);
        card.appendChild(qText);
        card.appendChild(optionsDiv);
        card.appendChild(statusText);
        ui.reviewQuestions.appendChild(card);
    });
}

// Vibration toggle logic
function initVibrationToggle() {
    const btn = document.getElementById('vibrationToggleBtn');
    if (!btn) return;
    updateVibrationButton(btn);
}

function toggleVibration() {
    vibrationEnabled = !vibrationEnabled;
    localStorage.setItem('vibrationEnabled', vibrationEnabled.toString());
    const btn = document.getElementById('vibrationToggleBtn');
    if (btn) updateVibrationButton(btn);
    // Give a quick test vibration when turning on
    if (vibrationEnabled) {
        triggerVibration(50);
    }
}

function updateVibrationButton(btn) {
    if (vibrationEnabled) {
        btn.innerHTML = '📳 Tebranish: <strong>Yoqilgan</strong>';
        btn.classList.remove('vibration-off');
        btn.classList.add('vibration-on');
    } else {
        btn.innerHTML = '📴 Tebranish: <strong>O\'chirilgan</strong>';
        btn.classList.remove('vibration-on');
        btn.classList.add('vibration-off');
    }
}

// Initial Render
function renderSubjects() {
    ui.subjectsGrid.innerHTML = '';
    if (!appData || !appData.subjects) return;
    
    appData.subjects.forEach(subject => {
        const card = document.createElement('div');
        card.className = 'card';
        card.innerHTML = `
            <h2>${subject.title}</h2>
            <p>${subject.variants.length} ta variant mavjud</p>
        `;
        card.addEventListener('click', () => showVariantsScreen(subject));
        ui.subjectsGrid.appendChild(card);
    });
}

// Run app
init();

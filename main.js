// State
let appData = null;
let currentSubject = null;
let currentVariant = null;
let currentQuestions = [];
let userAnswers = {};
let timerInterval = null;
let timeLeft = 25 * 60; // 25 minutes in seconds

// DOM Elements
const screens = {
    home: document.getElementById('homeScreen'),
    variants: document.getElementById('variantsScreen'),
    quiz: document.getElementById('quizScreen'),
    results: document.getElementById('resultsScreen')
};

const ui = {
    logo: document.getElementById('logo'),
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
    correctCount: document.getElementById('correctCount'),
    incorrectCount: document.getElementById('incorrectCount'),
    savingStatus: document.getElementById('savingStatus'),
    reviewBtn: document.getElementById('reviewBtn'),
    homeBtn: document.getElementById('homeBtn'),
    reviewSection: document.getElementById('reviewSection'),
    reviewQuestions: document.getElementById('reviewQuestions')
};

// Initialize
async function init() {
    setupEventListeners();
    await loadData();
    renderSubjects();
}



function setupEventListeners() {
    ui.logo.addEventListener('click', showHomeScreen);
    ui.backToHomeBtn.addEventListener('click', showHomeScreen);
    ui.homeBtn.addEventListener('click', showHomeScreen);
    ui.finishQuizBtn.addEventListener('click', finishQuiz);
    ui.reviewBtn.addEventListener('click', () => {
        ui.reviewSection.classList.remove('hidden');
        ui.reviewSection.scrollIntoView({ behavior: 'smooth' });
    });
}

async function loadData() {
    try {
        const response = await fetch('/data.json');
        appData = await response.json();
        
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
        console.error("Error loading data.json", error);
        alert("Ma'lumotlarni yuklashda xatolik yuz berdi.");
    }
}

// Navigation
function switchScreen(screenName) {
    Object.values(screens).forEach(s => s.classList.add('hidden'));
    screens[screenName].classList.remove('hidden');
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
        card.className = 'card';
        card.innerHTML = `
            <h2>${variant.title}</h2>
            <p>${variant.questions.length} ta savol</p>
            <p>Vaqt: 25 daqiqa</p>
        `;
        card.addEventListener('click', () => startQuiz(variant));
        ui.variantsGrid.appendChild(card);
    });
    
    switchScreen('variants');
}

// Quiz Logic
function startQuiz(variant) {
    currentVariant = variant;
    // Limit to 25 questions or less
    currentQuestions = variant.questions.slice(0, 25);
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
                
                // Show if chosen is incorrect
                if (!isCorrectOption) {
                    optBtn.classList.add('incorrect');
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
    
    ui.reviewSection.classList.add('hidden');
    renderReview();
    
    switchScreen('results');
}

function renderReview() {
    ui.reviewQuestions.innerHTML = '';
    
    currentQuestions.forEach((q, index) => {
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
        statusText.style.marginTop = '16px';
        statusText.style.fontWeight = 'bold';
        if (userAns === q.answer) {
            statusText.textContent = "Javobingiz: To'g'ri";
            statusText.style.color = "#065f46";
        } else if (userAns === null || userAns === undefined) {
            statusText.textContent = "Javobingiz: Belgilanmagan";
            statusText.style.color = "#991b1b";
        } else {
            statusText.textContent = "Javobingiz: Noto'g'ri";
            statusText.style.color = "#991b1b";
        }
        
        card.appendChild(qNum);
        card.appendChild(qText);
        card.appendChild(optionsDiv);
        card.appendChild(statusText);
        ui.reviewQuestions.appendChild(card);
    });
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

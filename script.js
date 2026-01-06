// 学習履歴管理
const StudyHistory = {
    // 学習履歴を取得
    getHistory: function() {
        const history = localStorage.getItem('gtest_history');
        return history ? JSON.parse(history) : {};
    },
    
    // 学習履歴を保存
    saveHistory: function(history) {
        localStorage.setItem('gtest_history', JSON.stringify(history));
    },
    
    // 問題の回答を記録
    recordAnswer: function(category, questionIndex, isCorrect, selectedAnswer, correctAnswer) {
        const history = this.getHistory();
        if (!history[category]) {
            history[category] = {
                questions: [],
                totalQuestions: 0,
                correctAnswers: 0,
                lastStudied: null
            };
        }
        
        // 問題の回答状況を更新
        if (!history[category].questions[questionIndex]) {
            history[category].questions[questionIndex] = {
                answered: true,
                isCorrect: isCorrect,
                selectedAnswer: selectedAnswer,
                correctAnswer: correctAnswer,
                timestamp: new Date().toISOString()
            };
            history[category].totalQuestions++;
            if (isCorrect) {
                history[category].correctAnswers++;
            }
        } else {
            // 既に回答済みの場合は更新（再挑戦）
            const oldCorrect = history[category].questions[questionIndex].isCorrect;
            if (oldCorrect && !isCorrect) {
                history[category].correctAnswers--;
            } else if (!oldCorrect && isCorrect) {
                history[category].correctAnswers++;
            }
            history[category].questions[questionIndex].isCorrect = isCorrect;
            history[category].questions[questionIndex].selectedAnswer = selectedAnswer;
            history[category].questions[questionIndex].timestamp = new Date().toISOString();
        }
        
        history[category].lastStudied = new Date().toISOString();
        this.saveHistory(history);
    },
    
    // 分野の進捗率を取得
    getProgress: function(category) {
        const history = this.getHistory();
        if (!history[category] || history[category].totalQuestions === 0) {
            return 0;
        }
        return Math.round((history[category].correctAnswers / history[category].totalQuestions) * 100);
    },
    
    // 全分野の進捗を取得
    getAllProgress: function() {
        const categories = ['category1', 'category2', 'category3', 'category4', 'category5', 
                          'category6', 'category7', 'category8', 'category9', 'category10'];
        const progress = {};
        categories.forEach(cat => {
            progress[cat] = this.getProgress(cat);
        });
        return progress;
    },
    
    // 学習履歴をクリア
    clearHistory: function() {
        localStorage.removeItem('gtest_history');
    },
    
    // 正解率を取得（回答済み問題のみ）
    getAccuracyRate: function(category) {
        const history = this.getHistory();
        if (!history[category] || history[category].totalQuestions === 0) {
            return null;
        }
        return Math.round((history[category].correctAnswers / history[category].totalQuestions) * 100);
    },
    
    // 全分野の正解率を取得
    getAllAccuracyRates: function() {
        const categories = ['category1', 'category2', 'category3', 'category4', 'category5', 
                          'category6', 'category7', 'category8', 'category9', 'category10'];
        const rates = {};
        categories.forEach(cat => {
            rates[cat] = this.getAccuracyRate(cat);
        });
        return rates;
    },
    
    // 学習セッションを保存（一時停止用）
    saveSession: function(category, questionIndex, scrollPosition) {
        const session = {
            category: category,
            questionIndex: questionIndex,
            scrollPosition: scrollPosition,
            timestamp: new Date().toISOString()
        };
        localStorage.setItem('gtest_session', JSON.stringify(session));
    },
    
    // 学習セッションを取得
    getSession: function() {
        const session = localStorage.getItem('gtest_session');
        return session ? JSON.parse(session) : null;
    },
    
    // 学習セッションをクリア
    clearSession: function() {
        localStorage.removeItem('gtest_session');
    }
};

// 現在の出題セットを管理
const SET_SIZE = 15; // ★1セットあたりの問題数
let currentQuestionSet = {
    startIndex: 0,
    endIndex: 0,
    answeredCount: 0,
    totalSets: 1,
    part: 0 // 0=全問, 1=分割モード
};

document.addEventListener('DOMContentLoaded', function() {
    document.querySelectorAll('.options li').forEach(option => {
        option.addEventListener('click', function() {
            const question = this.closest('.question');
            // 既に回答済みの場合は選択を無効化
            if (question.classList.contains('answered-correct') || question.classList.contains('answered-incorrect')) {
                return;
            }
            question.querySelectorAll('.options li').forEach(li => {
                li.classList.remove('selected');
            });
            this.classList.add('selected');
        });
    });
    
    // ページ読み込み時に過去の回答状況を復元
    restoreQuestionStates();

    // 出題セットの初期化と表示
    initializeQuestionSet();
    
    // ページ読み込み時に進捗を表示
    updateProgressDisplay();
});

// 初期化：URLパラメータに応じて表示する問題を決定
function initializeQuestionSet() {
    const allQuestions = document.querySelectorAll('.question');
    const totalQuestions = allQuestions.length;
    const urlParams = new URLSearchParams(window.location.search);
    
    // part=1なら分割モード、それ以外（0または指定なし）は全問モード
    const part = parseInt(urlParams.get('part') || '0');
    // set=0 (1ページ目), set=1 (2ページ目)...
    const setIndex = parseInt(urlParams.get('set') || '0'); 
    
    if (part === 0) {
        // ■ 全問表示モード
        currentQuestionSet.startIndex = 0;
        currentQuestionSet.endIndex = totalQuestions - 1;
        currentQuestionSet.part = 0;
        currentQuestionSet.totalSets = 1;
        
        // 全ての問題を表示
        allQuestions.forEach(q => q.style.display = 'block');
        
        // セット情報表示（もしあれば削除）
        const existingInfo = document.getElementById('set-info');
        if (existingInfo) existingInfo.remove();
        
    } else {
        // ■ 15問ずつ分割モード
        currentQuestionSet.part = 1;
        currentQuestionSet.startIndex = setIndex * SET_SIZE;
        // 最後の問題インデックスが、総問題数を超えないように調整
        currentQuestionSet.endIndex = Math.min(currentQuestionSet.startIndex + SET_SIZE - 1, totalQuestions - 1);
        currentQuestionSet.totalSets = Math.ceil(totalQuestions / SET_SIZE);

        // 範囲外の問題を非表示にする
        allQuestions.forEach((question, index) => {
            if (index >= currentQuestionSet.startIndex && index <= currentQuestionSet.endIndex) {
                question.style.display = 'block';
            } else {
                question.style.display = 'none';
            }
        });

        // セット情報を画面に表示
        const quizSection = document.querySelector('.quiz-section');
        if (quizSection) {
            const setInfo = document.createElement('div');
            setInfo.id = 'set-info';
            setInfo.style.cssText = 'background: #e8f4f8; padding: 15px; border-radius: 8px; margin-bottom: 20px; text-align: center; font-weight: bold; color: #555;';
            
            // 例: 「問題 1 ～ 15 を表示中 (全30問)」
            const displayStart = currentQuestionSet.startIndex + 1;
            const displayEnd = currentQuestionSet.endIndex + 1;
            setInfo.innerHTML = `問題 ${displayStart} ～ ${displayEnd} を表示中 （全${totalQuestions}問）`;
            
            // 既存の情報を削除して挿入
            const existingInfo = document.getElementById('set-info');
            if (existingInfo) existingInfo.remove();
            
            const quizTitle = quizSection.querySelector('h2');
            if (quizTitle && quizTitle.parentNode) {
                quizTitle.parentNode.insertBefore(setInfo, quizTitle.nextSibling);
            }
        }
    }
    
    // 現在表示されている範囲内での回答済み数をカウント
    currentQuestionSet.answeredCount = 0;
    for (let i = currentQuestionSet.startIndex; i <= currentQuestionSet.endIndex; i++) {
        if (allQuestions[i] && (allQuestions[i].classList.contains('answered-correct') || allQuestions[i].classList.contains('answered-incorrect'))) {
            currentQuestionSet.answeredCount++;
        }
    }
    
    // すでに条件を満たしているかチェック（リロード時など）
    checkAndShowNextButton();
}

// 15問（またはそのページの全問）解いたかチェックして「次へ」ボタンを表示
function checkAndShowNextButton() {
    // 全問表示モードのときは何もしない
    if (currentQuestionSet.part === 0) return;

    // 現在のページに表示されている問題数
    const currentCountInPage = currentQuestionSet.endIndex - currentQuestionSet.startIndex + 1;
    
    if (currentQuestionSet.answeredCount >= currentCountInPage) {
        showNextSetButton();
    }
}

// 「次へ」ボタンを表示
function showNextSetButton() {
    // 既にボタンがある場合は追加しない
    if (document.getElementById('next-set-btn')) return;
    
    // 最後のセットなら表示しない
    const urlParams = new URLSearchParams(window.location.search);
    const currentSet = parseInt(urlParams.get('set') || '0');
    if (currentSet >= currentQuestionSet.totalSets - 1) return;

    const quizSection = document.querySelector('.quiz-section');
    if (!quizSection) return;
    
    const nextButton = document.createElement('button');
    nextButton.id = 'next-set-btn';
    nextButton.className = 'next-set-btn';
    nextButton.textContent = '▶️ 次の15問へ';
    nextButton.style.cssText = 'background: #4caf50; color: white; border: none; padding: 15px 40px; border-radius: 8px; cursor: pointer; font-size: 1.1em; margin: 30px auto; display: block; font-weight: bold;';
    
    nextButton.addEventListener('click', function() {
        const nextSet = currentSet + 1;
        const currentPage = window.location.pathname.split('/').pop().replace('.html', '');
        
        // 次のセットへ移動（part=1を維持）
        window.location.href = `${currentPage}.html?part=1&set=${nextSet}`;
    });
    
    quizSection.appendChild(nextButton);
}

function checkAnswer(button, correctAnswer) {
    const question = button.closest('.question');
    const selected = question.querySelector('.options li.selected');
    const result = question.querySelector('.result');
    const options = question.querySelectorAll('.options li');
    
    if (!selected) {
        alert('選択肢を選んでください');
        return;
    }
    
    const selectedAnswer = selected.getAttribute('data-option');
    const isCorrect = selectedAnswer === correctAnswer;
    
    // 現在のページのカテゴリーを取得
    const currentPage = window.location.pathname.split('/').pop().replace('.html', '');
    const allQuestions = Array.from(document.querySelectorAll('.question'));
    const questionIndex = allQuestions.indexOf(question);
    
    // 学習履歴に記録
    StudyHistory.recordAnswer(currentPage, questionIndex, isCorrect, selectedAnswer, correctAnswer);
    
    // 問題全体の背景色を変更
    question.classList.remove('answered-correct', 'answered-incorrect');
    if (isCorrect) {
        question.classList.add('answered-correct');
    } else {
        question.classList.add('answered-incorrect');
    }
    
    // 選択肢の色を変更
    options.forEach(option => {
        option.classList.remove('correct', 'incorrect', 'selected');
        const optionValue = option.getAttribute('data-option');
        if (optionValue === correctAnswer) {
            option.classList.add('correct');
        } else if (optionValue === selectedAnswer && selectedAnswer !== correctAnswer) {
            option.classList.add('incorrect');
        }
    });
    
    // 答えを表示
    result.style.display = 'block';
    if (isCorrect) {
        result.classList.add('correct');
        result.classList.remove('incorrect');
    } else {
        result.classList.add('incorrect');
        result.classList.remove('correct');
    }
    
    // ボタンを無効化（再回答防止）
    button.disabled = true;
    button.style.opacity = '0.6';
    button.textContent = isCorrect ? '✓ 正解しました！' : '✗ 不正解';
    
    // 回答数をカウント（既に回答済みでない場合のみ）
    // ※現在のセット範囲内の問題だけをカウントする
    const wasAlreadyAnswered = false; // ボタンが押せた時点で未回答扱いとする
    if (!wasAlreadyAnswered) {
        currentQuestionSet.answeredCount++;
    }
    
    // 全問解答したら「次へ」ボタンを表示（全問表示モード以外）
    checkAndShowNextButton();
    
    // 次の問題へのボタンを追加
    addNextQuestionButton(question);
    
    // 進捗表示を更新
    updateProgressDisplay();
}

// 次の問題へのボタンを追加
function addNextQuestionButton(currentQuestion) {
    // 既にボタンがある場合は追加しない
    if (currentQuestion.querySelector('.next-question-btn')) {
        return;
    }
    
    const allQuestions = document.querySelectorAll('.question');
    const currentIndex = Array.from(allQuestions).indexOf(currentQuestion);
    
    // 次の問題が存在し、かつ現在の表示セット範囲内かどうか確認
    let nextQuestion = null;
    if (currentIndex < currentQuestionSet.endIndex) {
        nextQuestion = allQuestions[currentIndex + 1];
    }
    
    const nextButton = document.createElement('button');
    nextButton.className = 'next-question-btn';
    
    if (nextQuestion) {
        nextButton.textContent = '▶️ 次の問題へ';
        nextButton.onclick = function() {
            nextQuestion.scrollIntoView({ behavior: 'smooth', block: 'start' });
        };
    } else {
        // セットの最後、または全問の最後
        nextButton.textContent = '📋 ページ上部へ戻る';
        nextButton.onclick = function() {
            window.scrollTo({ top: 0, behavior: 'smooth' });
        };
    }

    nextButton.style.cssText = 'background: #667eea; color: white; border: none; padding: 12px 30px; border-radius: 5px; cursor: pointer; font-size: 1em; margin-top: 15px; display: block;';
    
    // 結果表示の後にボタンを追加
    const result = currentQuestion.querySelector('.result');
    if (result) {
        result.parentNode.insertBefore(nextButton, result.nextSibling);
    } else {
        currentQuestion.appendChild(nextButton);
    }
}

// 進捗表示を更新
function updateProgressDisplay() {
    const currentPage = window.location.pathname.split('/').pop().replace('.html', '');
    if (currentPage && currentPage.startsWith('category')) {
        const progress = StudyHistory.getProgress(currentPage);
        const progressBar = document.querySelector('.progress-bar-fill');
        const progressText = document.querySelector('.progress-text');
        if (progressBar && progressText) {
            progressBar.style.width = progress + '%';
            progressText.textContent = `進捗: ${progress}%`;
        }
    }
}

// ページ読み込み時に過去の回答状況を復元
function restoreQuestionStates() {
    const currentPage = window.location.pathname.split('/').pop().replace('.html', '');
    if (!currentPage || !currentPage.startsWith('category')) {
        return;
    }
    
    const history = StudyHistory.getHistory();
    if (!history[currentPage] || !history[currentPage].questions) {
        return;
    }
    
    const questions = document.querySelectorAll('.question');
    questions.forEach((question, index) => {
        const questionData = history[currentPage].questions[index];
        if (questionData && questionData.answered) {
            const options = question.querySelectorAll('.options li');
            const result = question.querySelector('.result');
            const button = question.querySelector('.answer-btn');
            
            // 問題全体の背景色を設定
            if (questionData.isCorrect) {
                question.classList.add('answered-correct');
            } else {
                question.classList.add('answered-incorrect');
            }
            
            // 選択肢の色を設定
            options.forEach(option => {
                const optionValue = option.getAttribute('data-option');
                if (optionValue === questionData.correctAnswer) {
                    option.classList.add('correct');
                } else if (optionValue === questionData.selectedAnswer && !questionData.isCorrect) {
                    option.classList.add('incorrect');
                }
            });
            
            // 結果を表示
            if (result) {
                result.style.display = 'block';
                if (questionData.isCorrect) {
                    result.classList.add('correct');
                    result.classList.remove('incorrect');
                } else {
                    result.classList.add('incorrect');
                    result.classList.remove('correct');
                }
            }
            
            // ボタンを無効化
            if (button) {
                button.disabled = true;
                button.style.opacity = '0.6';
                button.textContent = questionData.isCorrect ? '✓ 正解しました！' : '✗ 不正解';
            }
            
            // 次の問題へのボタンを追加（既に回答済みの場合）
            addNextQuestionButton(question);
        }
    });
}
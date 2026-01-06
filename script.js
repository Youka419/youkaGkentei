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
            return null; // まだ回答がない場合はnull
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
    
    // 15問ずつ出題の初期化（各章は15問ずつ）
    initializeQuestionSet();
    
    // 現在のセットに応じて問題を表示/非表示
    showCurrentQuestionSet();
    
    // ページ読み込み時に進捗を表示
    updateProgressDisplay();
    
    // 過去の回答状況を復元
    restoreQuestionStates();
});

// 現在のセットの問題のみを表示
function showCurrentQuestionSet() {
    const allQuestions = document.querySelectorAll('.question');
    const totalQuestions = allQuestions.length;
    const urlParams = new URLSearchParams(window.location.search);
    const part = parseInt(urlParams.get('part') || '0'); // 0=全問, 1=第1部, 2=第2部
    
    // 章の分割を考慮
    let partStartIndex = 0;
    let partEndIndex = totalQuestions - 1;
    let partName = '';
    
    if (part === 1) {
        partEndIndex = Math.floor(totalQuestions / 2) - 1;
        partName = '第1部';
    } else if (part === 2) {
        partStartIndex = Math.floor(totalQuestions / 2);
        partEndIndex = totalQuestions - 1;
        partName = '第2部';
    } else {
        partName = '全問';
    }
    
    // 表示範囲内の問題のみ表示
    allQuestions.forEach((question, index) => {
        if (index >= partStartIndex && index <= partEndIndex) {
            // currentQuestionSet が全問範囲になっている場合は全表示される
            if (index >= currentQuestionSet.startIndex && index <= currentQuestionSet.endIndex) {
                question.style.display = 'block';
            } else {
                question.style.display = 'none';
            }
        } else {
            question.style.display = 'none';
        }
    });
    
    // セット情報を表示
    const quizSection = document.querySelector('.quiz-section');
    if (quizSection) {
        const setIndex = parseInt(urlParams.get('set') || '0');
        const partQuestionCount = partEndIndex - partStartIndex + 1;
        const totalSets = Math.ceil(partQuestionCount / SET_SIZE);
        const setInfo = document.createElement('div');
        setInfo.id = 'set-info';
        setInfo.style.cssText = 'background: #e8f4f8; padding: 15px; border-radius: 8px; margin-bottom: 20px; text-align: center;';
        
        if (part > 0) {
            setInfo.innerHTML = `<strong>${partName} - 問題セット ${setIndex + 1}/${totalSets}</strong> (問題 ${currentQuestionSet.startIndex + 1}-${Math.min(currentQuestionSet.endIndex + 1, partEndIndex + 1)})`;
        } else {
            // part === 0 のときは「全問」を表示（全ての問題が出る）
            setInfo.innerHTML = `<strong>全問表示</strong> (問題 ${partStartIndex + 1}-${partEndIndex + 1})`;
        }
        
        // 既存のセット情報を削除
        const existingInfo = document.getElementById('set-info');
        if (existingInfo) {
            existingInfo.remove();
        }
        
        // 問題演習の見出しの後に挿入
        const quizTitle = quizSection.querySelector('h2');
        if (quizTitle && quizTitle.parentNode) {
            quizTitle.parentNode.insertBefore(setInfo, quizTitle.nextSibling);
        }
    }
}

// 現在の出題セットを管理
const SET_SIZE = 15; // 各セットは15問ずつ
let currentQuestionSet = {
    startIndex: 0,
    endIndex: SET_SIZE - 1,
    answeredCount: 0,
    totalSets: 1,
    part: 0
};

// 15問ずつ出題する機能
function initializeQuestionSet() {
    const currentPage = window.location.pathname.split('/').pop().replace('.html', '');
    const urlParams = new URLSearchParams(window.location.search);
    const setIndex = parseInt(urlParams.get('set') || '0');
    const part = parseInt(urlParams.get('part') || '0'); // 0=全問, 1=第1部, 2=第2部
    
    const allQuestions = document.querySelectorAll('.question');
    const totalQuestions = allQuestions.length;
    
    // 章の分割を考慮した開始・終了インデックスを計算
    let partStartIndex = 0;
    let partEndIndex = totalQuestions - 1;
    
    if (part === 1) {
        // 第1部：前半の問題
        partEndIndex = Math.floor(totalQuestions / 2) - 1;
    } else if (part === 2) {
        // 第2部：後半の問題
        partStartIndex = Math.floor(totalQuestions / 2);
        partEndIndex = totalQuestions - 1;
    }
    
    const partQuestionCount = partEndIndex - partStartIndex + 1;
    const maxSetIndex = Math.ceil(partQuestionCount / SET_SIZE) - 1;
    const actualSetIndex = Math.min(setIndex, Math.max(0, maxSetIndex));
    
    // part === 0 (全問) の場合はすべての問題を表示する
    if (part === 0) {
        currentQuestionSet.startIndex = partStartIndex;
        currentQuestionSet.endIndex = partEndIndex;
        currentQuestionSet.totalSets = 1;
        currentQuestionSet.part = 0;
    } else {
        currentQuestionSet.startIndex = partStartIndex + (actualSetIndex * SET_SIZE);
        currentQuestionSet.endIndex = Math.min(currentQuestionSet.startIndex + SET_SIZE - 1, partEndIndex);
        currentQuestionSet.totalSets = Math.ceil(partQuestionCount / SET_SIZE);
        currentQuestionSet.part = part;
    }
    currentQuestionSet.answeredCount = 0;
    
    // 表示されている問題数をカウント（表示されているもののみ）
    const visibleQuestions = document.querySelectorAll('.question:not([style*="display: none"])');
    visibleQuestions.forEach(q => {
        if (q.classList.contains('answered-correct') || q.classList.contains('answered-incorrect')) {
            currentQuestionSet.answeredCount++;
        }
    });
    
    // 15問（1セット）解いたら「次へ」ボタンを表示（ただし part===0 全問表示時は表示しない）
    checkAndShowNextButton();
}

// 15問解いたかチェックして「次へ」ボタンを表示
function checkAndShowNextButton() {
    // 全問表示(=part 0) のときはセット移動しない
    if (currentQuestionSet.part === 0) return;
    if (currentQuestionSet.answeredCount >= SET_SIZE) {
        showNextSetButton();
    }
}

// 「次へ」ボタンを表示
function showNextSetButton() {
    // 既にボタンがある場合は追加しない
    if (document.getElementById('next-set-btn')) {
        return;
    }
    
    const quizSection = document.querySelector('.quiz-section');
    if (!quizSection) return;
    
    const nextButton = document.createElement('button');
    nextButton.id = 'next-set-btn';
    nextButton.className = 'next-set-btn';
    nextButton.textContent = '▶️ 次の15問へ';
    nextButton.style.cssText = 'background: #4caf50; color: white; border: none; padding: 15px 40px; border-radius: 8px; cursor: pointer; font-size: 1.1em; margin: 30px auto; display: block; font-weight: bold;';
    
    nextButton.addEventListener('click', function() {
        const currentPage = window.location.pathname.split('/').pop().replace('.html', '');
        const urlParams = new URLSearchParams(window.location.search);
        const currentSet = parseInt(urlParams.get('set') || '0');
        const part = urlParams.get('part') || '';
        const nextSet = currentSet + 1;
        
        // 次のセットに移動
        const allQuestions = document.querySelectorAll('.question');
        const totalQuestions = allQuestions.length;
        
        // 章の分割を考慮
        let partStartIndex = 0;
        let partEndIndex = totalQuestions - 1;
        const partNum = parseInt(part || '0');
        
        if (partNum === 1) {
            partEndIndex = Math.floor(totalQuestions / 2) - 1;
        } else if (partNum === 2) {
            partStartIndex = Math.floor(totalQuestions / 2);
            partEndIndex = totalQuestions - 1;
        }
        
        const partQuestionCount = partEndIndex - partStartIndex + 1;
        const totalSets = Math.ceil(partQuestionCount / SET_SIZE);
        
        let nextUrl = `${currentPage}.html`;
        const params = [];
        if (part) {
            params.push(`part=${part}`);
        }
        
        if (nextSet < totalSets) {
            params.push(`set=${nextSet}`);
            nextUrl += '?' + params.join('&');
            window.location.href = nextUrl;
        } else {
            alert('このセクションの問題をすべて完了しました！🎉');
        }
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
    const questionIndex = Array.from(document.querySelectorAll('.question')).indexOf(question);
    
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
    const wasAlreadyAnswered = question.classList.contains('answered-correct') || question.classList.contains('answered-incorrect');
    if (!wasAlreadyAnswered) {
        currentQuestionSet.answeredCount++;
    }
    
    // 15問解いたら「次へ」ボタンを表示（ただし全問表示中は表示しない）
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
    const nextQuestion = allQuestions[currentIndex + 1];
    
    const nextButton = document.createElement('button');
    nextButton.className = 'next-question-btn';
    nextButton.textContent = nextQuestion ? '▶️ 次の問題へ' : '📋 問題一覧に戻る';
    nextButton.style.cssText = 'background: #667eea; color: white; border: none; padding: 12px 30px; border-radius: 5px; cursor: pointer; font-size: 1em; margin-top: 15px; display: block;';
    
    nextButton.addEventListener('click', function() {
        if (nextQuestion) {
            // 次の問題にスクロール
            nextQuestion.scrollIntoView({ behavior: 'smooth', block: 'start' });
            // URLのハッシュも更新
            window.location.hash = 'question-' + (currentIndex + 1);
        } else {
            // 最後の問題の場合は、問題セクションの先頭に戻る
            const quizSection = document.querySelector('.quiz-section');
            if (quizSection) {
                quizSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }
        }
    });
    
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
// ▼▼▼ ここから書き換え ▼▼▼

// 15問ずつ出題する機能（修正版）
function initializeQuestionSet() {
    const urlParams = new URLSearchParams(window.location.search);
    const setIndex = parseInt(urlParams.get('set') || '0');
    // part=1なら「15問ずつモード」、part=0または指定なしなら「全問モード」
    const part = parseInt(urlParams.get('part') || '0'); 
    
    const allQuestions = document.querySelectorAll('.question');
    const totalQuestions = allQuestions.length;
    
    // ■ 全問モード（part=0）の場合
    if (part === 0) {
        currentQuestionSet.startIndex = 0;
        currentQuestionSet.endIndex = totalQuestions - 1;
        currentQuestionSet.totalSets = 1;
        currentQuestionSet.part = 0;
        
        // 全て表示
        allQuestions.forEach(q => q.style.display = 'block');
        
        // セット情報表示（もしあれば削除）
        const existingInfo = document.getElementById('set-info');
        if (existingInfo) existingInfo.remove();
        
        return; // ここで終了
    }

    // ■ 15問ずつモード（part=1）の場合
    // 以前のような「半分で分割」はせず、純粋に15問ずつ区切る
    currentQuestionSet.startIndex = setIndex * SET_SIZE;
    currentQuestionSet.endIndex = Math.min(currentQuestionSet.startIndex + SET_SIZE - 1, totalQuestions - 1);
    currentQuestionSet.totalSets = Math.ceil(totalQuestions / SET_SIZE);
    currentQuestionSet.part = part;

    // 現在のセット以外の問題を非表示にする
    allQuestions.forEach((question, index) => {
        if (index >= currentQuestionSet.startIndex && index <= currentQuestionSet.endIndex) {
            question.style.display = 'block';
        } else {
            question.style.display = 'none';
        }
    });
    
    currentQuestionSet.answeredCount = 0;
    
    // 表示されている範囲で回答済みの数をカウント
    for (let i = currentQuestionSet.startIndex; i <= currentQuestionSet.endIndex; i++) {
        if (allQuestions[i] && (allQuestions[i].classList.contains('answered-correct') || allQuestions[i].classList.contains('answered-incorrect'))) {
            currentQuestionSet.answeredCount++;
        }
    }
    
    // セット情報を表示（例：1〜15問目 / 全30問）
    const quizSection = document.querySelector('.quiz-section');
    if (quizSection) {
        const setInfo = document.createElement('div');
        setInfo.id = 'set-info';
        setInfo.style.cssText = 'background: #e8f4f8; padding: 15px; border-radius: 8px; margin-bottom: 20px; text-align: center; font-weight: bold; color: #555;';
        
        setInfo.innerHTML = `問題 ${currentQuestionSet.startIndex + 1} ～ ${currentQuestionSet.endIndex + 1} を表示中 （全${totalQuestions}問）`;
        
        const existingInfo = document.getElementById('set-info');
        if (existingInfo) existingInfo.remove();
        
        const quizTitle = quizSection.querySelector('h2');
        if (quizTitle && quizTitle.parentNode) {
            quizTitle.parentNode.insertBefore(setInfo, quizTitle.nextSibling);
        }
    }

    // 15問（1セット）解いたら「次へ」ボタンを表示
    checkAndShowNextButton();
}

// ▲▲▲ ここまで書き換え ▲▲▲
import { useState } from 'react'

// 質問データ
const questions = [
  {
    id: 1,
    question: '友達が悩んでいる時、あなたはどうする？',
    options: [
      { text: 'すぐに話を聞いてあげる', type: 'A', points: 3 },
      { text: 'アドバイスをする', type: 'B', points: 2 },
      { text: '一緒に解決策を考える', type: 'C', points: 2 },
      { text: '見守りながらサポートする', type: 'D', points: 1 }
    ]
  },
  {
    id: 2,
    question: '休日の過ごし方は？',
    options: [
      { text: '友達と楽しく遊ぶ', type: 'A', points: 2 },
      { text: '一人でゆっくり過ごす', type: 'D', points: 3 },
      { text: '新しいことにチャレンジ', type: 'B', points: 2 },
      { text: '家族と過ごす', type: 'C', points: 2 }
    ]
  },
  {
    id: 3,
    question: 'あなたが大切にしていることは？',
    options: [
      { text: '人との絆', type: 'A', points: 3 },
      { text: '自分の成長', type: 'B', points: 2 },
      { text: 'みんなの笑顔', type: 'C', points: 2 },
      { text: '心の安らぎ', type: 'D', points: 3 }
    ]
  },
  {
    id: 4,
    question: 'ストレスを感じた時は？',
    options: [
      { text: '誰かに話を聞いてもらう', type: 'A', points: 2 },
      { text: '運動して発散する', type: 'B', points: 2 },
      { text: '好きなことをして気分転換', type: 'C', points: 2 },
      { text: 'ゆっくり休む', type: 'D', points: 3 }
    ]
  },
  {
    id: 5,
    question: '自分の長所は？',
    options: [
      { text: '思いやりがある', type: 'A', points: 3 },
      { text: '前向きで明るい', type: 'B', points: 2 },
      { text: '協調性がある', type: 'C', points: 2 },
      { text: '落ち着いている', type: 'D', points: 3 }
    ]
  },
  {
    id: 6,
    question: 'チームで何かをする時、あなたの役割は？',
    options: [
      { text: 'みんなの意見を聞く調整役', type: 'A', points: 2 },
      { text: '率先して動くリーダー', type: 'B', points: 2 },
      { text: '雰囲気を盛り上げるムードメーカー', type: 'C', points: 3 },
      { text: '冷静にサポートする縁の下の力持ち', type: 'D', points: 2 }
    ]
  },
  {
    id: 7,
    question: '理想の癒しの時間は？',
    options: [
      { text: '大切な人とおしゃべり', type: 'A', points: 3 },
      { text: '好きな趣味に没頭', type: 'B', points: 2 },
      { text: 'みんなでわいわい楽しむ', type: 'C', points: 3 },
      { text: '静かな場所で一人の時間', type: 'D', points: 3 }
    ]
  },
  {
    id: 8,
    question: '誰かを励ます時、どんな言葉をかける？',
    options: [
      { text: '「大丈夫、あなたなら乗り越えられるよ」', type: 'A', points: 3 },
      { text: '「こうしてみたらどう？」', type: 'B', points: 2 },
      { text: '「一緒に頑張ろう！」', type: 'C', points: 2 },
      { text: '「無理しないで、ゆっくり休んでね」', type: 'D', points: 3 }
    ]
  }
]

// 診断結果データ
const results = {
  A: {
    type: '聖なるホイミー',
    emoji: '✨',
    description: 'あなたは思いやりと優しさに満ちた聖なるホイミーです！周りの人の痛みに敏感で、いつも誰かのために力を使うことができる存在です。',
    traits: [
      '人の話を真剣に聞くことができる',
      '困っている人を放っておけない',
      '優しさが周囲を癒やす',
      '共感力が高い'
    ],
    healingPower: '95%',
    advice: 'あなたの優しさは素晴らしい才能です。でも時には自分自身も癒やしてあげることを忘れずに。'
  },
  B: {
    type: 'アクティブホイミー',
    emoji: '⚡',
    description: 'あなたは元気いっぱいのアクティブホイミーです！前向きなエネルギーで周りを明るくし、困難も笑顔で乗り越えていきます。',
    traits: [
      'ポジティブ思考の持ち主',
      '行動力がある',
      '明るい雰囲気を作れる',
      'チャレンジ精神旺盛'
    ],
    healingPower: '88%',
    advice: '行動力は素晴らしいですが、時にはペースを落として周りを見渡すことも大切です。'
  },
  C: {
    type: 'フレンドリーホイミー',
    emoji: '🌟',
    description: 'あなたは人との繋がりを大切にするフレンドリーホイミーです！チームワークを大切にし、みんなと一緒に成長していくことが得意です。',
    traits: [
      '協調性が高い',
      'コミュニケーション能力抜群',
      'チームの雰囲気作りが得意',
      '周りを巻き込む力がある'
    ],
    healingPower: '90%',
    advice: 'みんなのことを考えるのは素敵ですが、自分の意見も大切に表現していきましょう。'
  },
  D: {
    type: 'ピースフルホイミー',
    emoji: '🌙',
    description: 'あなたは穏やかで落ち着いたピースフルホイミーです！その静かな存在感が、周りの人に安心感を与えています。',
    traits: [
      '落ち着いた雰囲気',
      '冷静な判断ができる',
      '聞き上手',
      '心の余裕がある'
    ],
    healingPower: '92%',
    advice: '落ち着きは大きな強みです。時には積極的に自分から動くことで、新しい発見があるかもしれません。'
  }
}

function PsychologyTest() {
  const [currentQuestion, setCurrentQuestion] = useState(0)
  const [answers, setAnswers] = useState([])
  const [showResult, setShowResult] = useState(false)
  const [result, setResult] = useState(null)
  const [started, setStarted] = useState(false)

  const handleStart = () => {
    setStarted(true)
  }

  const handleAnswer = (option) => {
    const newAnswers = [...answers, option]
    setAnswers(newAnswers)

    if (currentQuestion < questions.length - 1) {
      setCurrentQuestion(currentQuestion + 1)
    } else {
      calculateResult(newAnswers)
    }
  }

  const calculateResult = (finalAnswers) => {
    const typeCount = { A: 0, B: 0, C: 0, D: 0 }

    finalAnswers.forEach(answer => {
      typeCount[answer.type] += answer.points
    })

    const maxType = Object.keys(typeCount).reduce((a, b) =>
      typeCount[a] > typeCount[b] ? a : b
    )

    setResult(results[maxType])
    setShowResult(true)
  }

  const handleReset = () => {
    setCurrentQuestion(0)
    setAnswers([])
    setShowResult(false)
    setResult(null)
    setStarted(false)
  }

  const handleShare = () => {
    const text = `ホイミー心理テスト結果\n\n${result.emoji} ${result.type}\n${result.description}\n\n癒やし力: ${result.healingPower}\n\n#ホイミー心理テスト`

    if (navigator.share) {
      navigator.share({
        title: 'ホイミー心理テスト',
        text: text,
      }).catch(() => {
        copyToClipboard(text)
      })
    } else {
      copyToClipboard(text)
    }
  }

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text).then(() => {
      alert('結果をクリップボードにコピーしました！')
    }).catch(() => {
      alert('コピーに失敗しました')
    })
  }

  if (!started) {
    return (
      <div className="container">
        <div className="welcome-screen">
          <div className="hoimi-animation">
            <span className="hoimi-emoji">🧪</span>
          </div>
          <h1 className="title">ホイミー心理テスト</h1>
          <p className="subtitle">あなたはどんなタイプのホイミー？</p>
          <p className="description">
            8つの質問に答えて、あなたの癒やし系タイプを診断しましょう！<br/>
            ホイミーのように、周りを癒やす力を持つあなた。<br/>
            さあ、あなたの真の姿を見つけましょう！
          </p>
          <button className="start-button" onClick={handleStart}>
            診断をはじめる
          </button>
        </div>
      </div>
    )
  }

  if (showResult && result) {
    return (
      <div className="container">
        <div className="result-screen">
          <div className="result-emoji">{result.emoji}</div>
          <h2 className="result-type">{result.type}</h2>
          <div className="healing-power">
            <span className="power-label">癒やし力</span>
            <div className="power-bar">
              <div
                className="power-fill"
                style={{ width: result.healingPower }}
              ></div>
            </div>
            <span className="power-value">{result.healingPower}</span>
          </div>
          <p className="result-description">{result.description}</p>
          <div className="traits">
            <h3>あなたの特徴</h3>
            <ul>
              {result.traits.map((trait, index) => (
                <li key={index}>
                  <span className="trait-icon">✓</span> {trait}
                </li>
              ))}
            </ul>
          </div>
          <div className="advice-box">
            <h4>アドバイス</h4>
            <p>{result.advice}</p>
          </div>
          <div className="button-group">
            <button className="share-button" onClick={handleShare}>
              結果をシェア
            </button>
            <button className="retry-button" onClick={handleReset}>
              もう一度診断する
            </button>
          </div>
        </div>
      </div>
    )
  }

  const question = questions[currentQuestion]
  const progress = ((currentQuestion + 1) / questions.length) * 100

  return (
    <div className="container">
      <div className="test-screen">
        <div className="progress-bar">
          <div className="progress-fill" style={{ width: `${progress}%` }}></div>
        </div>
        <div className="question-number">
          質問 {currentQuestion + 1} / {questions.length}
        </div>
        <h2 className="question-text">{question.question}</h2>
        <div className="options">
          {question.options.map((option, index) => (
            <button
              key={index}
              className="option-button"
              onClick={() => handleAnswer(option)}
            >
              {option.text}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}

export default PsychologyTest

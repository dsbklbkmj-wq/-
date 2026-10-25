'use strict';

/* =========================================================
   퇴사하고 싶어요 v3 - 답변 내용 판정 + 멀티 엔딩 5종
   - 외부 라이브러리 없음. 모든 판정은 아래 RULES(정규식)로 수행.
   - 난이도는 DIFFICULTY에서 조절.
   ========================================================= */

const DIFFICULTY = {
  timeLimit: 15,      // 턴당 제한 시간(초). 0이면 타이머 없음
  successScore: 5,    // 3턴 종료 후 이 점수 이상 → 탈출성공
  collapseScore: -4,  // 도중 이 점수 이하 → 즉시 잔류 엔딩
  shortLimit: 10,     // 이 글자 수(공백 포함)까지는 감점 없음
  longLimit: 20       // 초과 시 -2 (shortLimit 초과 ~ longLimit 이하는 -1)
};

/* ---------- 판정 규칙 ----------
   우선순위: 즉시 엔딩(proxy/loud/accept) → 가산(clear/refuse/date) → 감산(waver/quiet/hedge/길이) */
const RULES = {
  proxy:  /대행|대리인|노무사|변호사|법무|대신\s?전달/,
  loud:   /브이로그|틱톡|큇톡|영상|찍고|찍었|생방|라이브|업로드|구독|씨발|시발|ㅅㅂ|지랄|꺼져|때려치|못\s?해먹|개같|엿이나/,
  accept: /감사|좋아요|좋습니다|좋네요|다니겠|다닐게|콜$|오케이|^ok/i,   // 2턴 전용
  waver:  /얼마|조건|몇\s?퍼|더\s?주|더\s?올려|그 정도|그정도/,            // 2턴 전용
  clear:  /퇴사|사직|그만(?!큼)|퇴직|마지막\s?출근|나가겠|떠나|관두/,
  refuse: /아니|아닙|안\s?돼|안\s?됩|어렵|괜찮|필요\s?없|됐어|결정|변함|바뀌|안\s?받|사양/,
  date:   /한\s?달|30일|다음\s?달|말까지|\d+일|\d+월|주\s?후|주일|이번\s?달|월말|내일/,
  quiet:  /적당히|그렇게\s?하|해볼게|노력|버텨|버틸|다녀볼|후임\s?오면|일단은|알겠|생각해\s?볼/,
  hedge:  [/죄송/, /혹시/, /그게/, /생각/, /고민/, /글쎄/, /아마/, /…|\.\.\./, /ㅠ/, /ㅋ/, /어쩌면/, /(^|\s)음+/, /근데/, /사실/, /좀/]
};

/* ---------- 대본 ---------- */
const SCRIPT = [
  {
    boss: ["할 말 있다고? 뭔데", "요즘 힘들어서 그래? 다 그런 시기 있어 ㅋㅋ"],
    choices: [
      "그게… 요즘 좀 힘들어서요ㅠ",
      "퇴사하겟습니다".replace("겟", "겠"),
      "아 그냥 다 때려치고 싶어요"
    ]
  },
  {
    boss: ["아 진짜? 1년도 안 됐잖아", "그래… 연봉 10% 올려줄게. 그러면 되지?"],
    choices: [
      "감사합니다…!",
      "연봉 문제 아닙니다",
      "얼마나요?"
    ]
  },
  {
    boss: ["하… 알았어", "그래도 후임 올 때까지는 있어줘야지. 응? 팀 생각도 해야지"],
    choices: [
      "네… 후임 오면요",
      "다음 달 말까지요",
      "대행업체에서 연락 갈 겁니다"
    ]
  }
];

const REACTIONS = {
  clear:   ["…어? 아, 그래.", "뭐야 갑자기 정색이야 ㅋㅋ", "짧게 치고 들어오네"],
  refuse:  ["단호하네…", "요즘 애들 왜 이렇게 단호해", "협상이 안 되네"],
  date:    ["날짜까지 박네… 준비 많이 했구나.", "뭐야 캘린더 보고 왔어?"],
  hedge:   ["ㅋㅋ 그럴 줄 알았다", "말 돌리는 거 보니 아직 결심 안 섰네", "그게… 뭐? 끝까지 말해"],
  quiet:   ["그래그래, 그러면 되지.", "역시 말이 통하네", "오케이 접수"],
  long:    ["길다… 세 줄 요약 좀.", "읽다가 회의 시작하겠다", "장문 보내는 거 보니 아직 미련 있네"],
  silence: ["…? 바빠? 읽씹하네", "답 없는 거 보니 아직 생각 중이구나"],
  waver:   ["ㅋㅋ 흔들리네? 솔직히 돈이지?", "얼마면 돼? 얼마면 되겐니"]
};

const ENDINGS = {
  success: {
    tag: "탈출성공", tagClass: "good", mood: "happy", fx: "confetti bounce",
    title: "탈출성공!",
    desc: "3번의 방어를 전부 뚫었습니다. 짧고, 단호하고, 날짜까지 박았네요. 마지막 출근일이 캘린더에 찍혔습니다.",
    bubbles: ["…그래, 잘 가.", "송별회는 해야지?"],
    fact: {
      head: "📊 '후임 올 때까지'는 법적 의무가 아닙니다",
      body: "민법 제660조: 고용 기간 약정이 없으면 근로자는 언제든 사직을 통보할 수 있고, 통보 후 1개월이 지나면 해지 효력이 생깁니다. 날짜를 명시하는 게 가장 깔끔한 퇴사 방법인 이유입니다.",
      url: "https://www.law.go.kr/법령/민법/제660조"
    },
    share: "부장님 3단 방어를 뚫고 탈출성공!"
  },
  quiet: {
    tag: "조용한 퇴사", tagClass: "gray", mood: "smug", fx: "",
    title: "조용한 퇴사",
    desc: "퇴사는 못 했습니다. 하지만 오늘부터 6시 땡 퇴근, 퇴근 후 카톡 알림 OFF, 회식 불참. 몸은 회사에, 마음은 이미 퇴사.",
    bubbles: ["그래, 열심히 하자!", "(이번 주 금요일 회식이야)"],
    fact: {
      head: "📊 Quiet Quitting(조용한 퇴사)",
      body: "실제로 사직하지는 않고 맡은 일은 하되, 과도한 야근·희생·퇴근 후 연락에는 선을 긋는 태도. 일을 거부하는 게 아니라 업무와 사생활의 경계를 지키는 방식으로 해석됩니다. 애매하게 답하면 부장님은 '남는다'로 받아들입니다.",
      url: "https://www.dbblog.co.kr/3411"
    },
    share: "퇴사 못 하고 '조용한 퇴사' 엔딩… 6시 땡 퇴근으로 복수한다."
  },
  stay: {
    tag: "잔류", tagClass: "bad", mood: "smug", fx: "shake",
    title: "탈출실패…",
    desc: "부장님이 이겼습니다. 다음 주 월요일 9시, 같은 자리, 같은 모니터. 연봉 10%는… 내년 평가 보고 결정하겠다네요.",
    bubbles: ["ㅋㅋ 그럴 줄 알았다", "월요일에 보자~"],
    fact: {
      head: "📊 2026년의 반전: 퇴사 밈보다 '버티기' 콘텐츠",
      body: "2024년 무렵 퇴사 밈이 주목받았다면, 최근에는 채용시장이 어려워지면서 퇴사보다 회사 안에서 버티는 콘텐츠가 인기를 얻고 있다는 분석이 나왔습니다(한국경제, 2026.8). 그러니 잔류도 어쩌면 트렌드입니다.",
      url: "https://www.hankyung.com/article/202608248726H"
    },
    share: "부장님 연봉 10% 역제안에 넘어가 잔류 엔딩…"
  },
  proxy: {
    tag: "퇴사 대행", tagClass: "", mood: "shocked", fx: "shake",
    title: "퇴사 대행 엔딩",
    desc: "부장님 폰에 모르는 번호가 뜹니다. \"○○님의 퇴직 의사를 대신 전달드립니다. 추후 연락은 저희를 통해 주십시오.\" 부장님은 아직 상황 파악 중입니다.",
    bubbles: ["???", "이게 뭐야 전화 왔는데"],
    fact: {
      head: "📊 퇴사 대행 서비스",
      body: "일본에서는 대행업체가 본인 대신 회사에 퇴직 의사를 전달해 감정적 부담과 갈등을 줄이는 서비스가 확산됐고, 2026년에는 입사 당일 의뢰 사례도 보도됐습니다(2026.4). 한국에서는 아직 보편적인 방식은 아니라 이 게임에서는 '히든 엔딩'으로 넣었습니다.",
      url: "https://v.daum.net/v/20260403213325822"
    },
    share: "퇴사 대행 히든 엔딩 발견! 부장님 멘붕."
  },
  loud: {
    tag: "요란한 퇴사", tagClass: "bad", mood: "angry", fx: "shake",
    title: "큇톡 엔딩",
    desc: "퇴사 브이로그 조회수 32만. 댓글 1위: \"부장님 실화냐\". 부장님 댓글: \"우리 회사 아님\". 퇴사는 했지만 업계가 좁습니다.",
    bubbles: ["💢 이거 뭐야", "지금 찍고 있어?"],
    fact: {
      head: "📊 Loud Quitting · Quit-Tok(큇톡)",
      body: "퇴사 결심과 과정을 SNS나 영상으로 공개하고 직장 경험·퇴사 이유를 나누는 현상. 한국의 '퇴사 브이로그'와 해외의 큇톡 챌린지가 함께 언급됩니다. 통쾌하지만 다음 회사 인사팀도 그 영상을 봅니다.",
      url: "https://zdnet.co.kr/view/?no=20250506221802"
    },
    share: "요란하게 때려치고 큇톡 엔딩! 조회수 32만."
  }
};

/* ---------- 판정 함수 (순수 함수) ----------
   text: 플레이어 답변, turn: 0~2
   return { delta, tags[], ending|null, why[] } */
function judge(text, turn) {
  const t = (text || "").trim().replace(/\s+/g, " ");
  const res = { delta: 0, tags: [], ending: null, why: [] };

  if (!t) {
    res.delta = -2; res.tags.push("silence"); res.why.push("무응답 -2");
    return res;
  }

  // 1) 즉시 엔딩
  if (RULES.proxy.test(t)) { res.ending = "proxy"; res.tags.push("proxy"); res.why.push("대행/대리 키워드 → 퇴사 대행 엔딩"); return res; }
  if (RULES.loud.test(t))  { res.ending = "loud";  res.tags.push("loud");  res.why.push("욕설/영상 키워드 → 요란한 퇴사 엔딩"); return res; }
  if (turn === 1 && (RULES.accept.test(t) || /알겠/.test(t))) {
    res.ending = "stay"; res.tags.push("accept"); res.why.push("연봉 인상 수락 → 잔류 엔딩"); return res;
  }

  // 2) 가산
  if (RULES.clear.test(t))  { res.delta += 2; res.tags.push("clear");  res.why.push("퇴사 의사 명시 +2"); }
  if (turn >= 1 && RULES.refuse.test(t)) { res.delta += 2; res.tags.push("refuse"); res.why.push("제안 거절 +2"); }
  if (RULES.date.test(t)) {
    const d = turn === 2 ? 2 : 1;
    res.delta += d; res.tags.push("date"); res.why.push("날짜 명시 +" + d);
  }

  // 3) 감산
  if (turn === 1 && RULES.waver.test(t)) { res.delta -= 2; res.tags.push("waver"); res.why.push("금액에 흔들림 -2"); }
  if (RULES.quiet.test(t)) { res.delta -= 1; res.tags.push("quiet"); res.why.push("애매한 수용 -1"); }

  let hedgeHits = 0;
  for (const re of RULES.hedge) { if (re.test(t)) hedgeHits++; }
  if (hedgeHits > 0) {
    const h = Math.min(hedgeHits, 2);
    res.delta -= h; res.tags.push("hedge"); res.why.push("쿠션어/말줄임 " + hedgeHits + "개 -" + h);
  }

  const len = t.length;
  if (len > DIFFICULTY.longLimit) { res.delta -= 2; res.tags.push("long"); res.why.push(len + "자 (장문) -2"); }
  else if (len > DIFFICULTY.shortLimit) { res.delta -= 1; res.tags.push("long"); res.why.push(len + "자 -1"); }

  if (res.why.length === 0) res.why.push("판정 키워드 없음 ±0");
  return res;
}

function pickReaction(tags) {
  const order = ["silence", "waver", "long", "hedge", "quiet", "date", "refuse", "clear"];
  for (const k of order) {
    if (tags.includes(k)) {
      const arr = REACTIONS[k];
      return arr[Math.floor(Math.random() * arr.length)];
    }
  }
  return "…그래서?";
}

/* ---------- 부장님 얼굴 SVG ---------- */
/* v4: 인트로·채팅 프사는 그림 파일, 결과 화면 표정은 기존 SVG 유지 */
const BOSS_PROFILE_IMG = `<img src="img/boss-profile.jpg" alt="김부장 프로필" class="boss-avatar-img" draggable="false">`;
const BOSS_INTRO_IMG   = `<img src="img/boss-intro.jpg" alt="김부장" class="boss-intro-img" draggable="false">`;

const BOSS_SVG = `
<svg class="boss-face" id="boss-face" data-mood="neutral" viewBox="0 0 120 120" xmlns="http://www.w3.org/2000/svg" aria-label="부장님">
  <circle cx="60" cy="62" r="50" fill="#f6d6b8" stroke="#2b2b2b" stroke-width="3"/>
  <path d="M18 50 Q60 0 102 50 Q90 30 60 28 Q30 30 18 50 Z" fill="#3b3b3b"/>
  <circle cx="44" cy="62" r="4" fill="#2b2b2b"/>
  <circle cx="76" cy="62" r="4" fill="#2b2b2b"/>
  <g class="brow-set b-neutral" stroke="#2b2b2b" stroke-width="3" fill="none"><path d="M35 50 L53 50"/><path d="M67 50 L85 50"/></g>
  <g class="brow-set b-angry" stroke="#2b2b2b" stroke-width="3" fill="none"><path d="M35 46 L53 53"/><path d="M85 46 L67 53"/></g>
  <g class="brow-set b-smug" stroke="#2b2b2b" stroke-width="3" fill="none"><path d="M35 52 L53 48"/><path d="M67 50 L85 50"/></g>
  <g class="brow-set b-shocked" stroke="#2b2b2b" stroke-width="3" fill="none"><path d="M35 44 L53 44"/><path d="M67 44 L85 44"/></g>
  <path class="mouth m-neutral" d="M48 84 L72 84" stroke="#2b2b2b" stroke-width="3" fill="none"/>
  <path class="mouth m-happy" d="M44 80 Q60 96 76 80" stroke="#2b2b2b" stroke-width="3" fill="none"/>
  <path class="mouth m-angry" d="M44 90 Q60 76 76 90" stroke="#2b2b2b" stroke-width="3" fill="none"/>
  <path class="mouth m-smug" d="M46 84 Q62 92 76 80" stroke="#2b2b2b" stroke-width="3" fill="none"/>
  <ellipse class="mouth m-shocked" cx="60" cy="86" rx="8" ry="11" fill="#2b2b2b"/>
  <text class="extra x-note" x="94" y="30" font-size="22">♪</text>
  <text class="extra x-vein" x="88" y="30" font-size="22">💢</text>
  <text class="extra x-sweat" x="92" y="36" font-size="20">💦</text>
</svg>`;

/* ---------- 사운드 (Web Audio, 외부 파일 없음) ---------- */
const Sound = {
  on: true, ctx: null,
  ensure() { if (!this.ctx) { try { this.ctx = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { this.on = false; } } },
  beep(freq, dur, type, vol) {
    if (!this.on) return;
    this.ensure(); if (!this.ctx) return;
    const o = this.ctx.createOscillator(), g = this.ctx.createGain();
    o.type = type || "sine"; o.frequency.value = freq;
    g.gain.value = vol || 0.08;
    o.connect(g); g.connect(this.ctx.destination);
    const now = this.ctx.currentTime;
    g.gain.setValueAtTime(vol || 0.08, now);
    g.gain.exponentialRampToValueAtTime(0.0001, now + dur);
    o.start(now); o.stop(now + dur);
  },
  send()    { this.beep(880, 0.08, "square", 0.05); },
  receive() { this.beep(660, 0.12); setTimeout(() => this.beep(990, 0.12), 110); },
  tick()    { this.beep(1200, 0.04, "square", 0.03); },
  success() { [523, 659, 784, 1046].forEach((f, i) => setTimeout(() => this.beep(f, 0.25), i * 120)); },
  fail()    { [400, 300, 200].forEach((f, i) => setTimeout(() => this.beep(f, 0.3, "sawtooth", 0.06), i * 160)); }
};

/* ---------- 상태 ---------- */
const state = { turn: 0, courage: 0, log: [], timer: null, timeLeft: 0, busy: false, started: false };

const $ = (s) => document.querySelector(s);
const el = {
  screens: { start: $("#screen-start"), chat: $("#screen-chat"), result: $("#screen-result") },
  chatLog: $("#chat-log"), choices: $("#choices"), form: $("#input-form"), input: $("#msg-input"),
  charCount: $("#char-count"), roundLabel: $("#round-label"), courageFill: $("#courage-fill"),
  courageText: $("#courage-text"), timer: $("#timer"), bossStatus: $("#boss-status"),
  bossFaceWrap: $("#boss-face-wrap"), startFace: $("#start-face"), resultFaceWrap: $("#result-face-wrap"),
  endingTag: $("#ending-tag"), resultTitle: $("#result-title"), resultDesc: $("#result-desc"),
  resultLog: $("#result-log"), resultFact: $("#result-fact"), bubbleL: $("#bubble-left"), bubbleR: $("#bubble-right"),
  courageFinal: $("#courage-fill-final"), courageFinalText: $("#courage-final-text"), confetti: $("#confetti"),
  endingCount: $("#ending-count"), resultCard: document.querySelector(".result-card")
};

/* ---------- 유틸 ---------- */
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const nowStr = () => { const d = new Date(); return d.getHours() + ":" + String(d.getMinutes()).padStart(2, "0"); };
function shuffle(a) { const b = a.slice(); for (let i = b.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [b[i], b[j]] = [b[j], b[i]]; } return b; }
function showScreen(name) { Object.values(el.screens).forEach((s) => s.classList.remove("active")); el.screens[name].classList.add("active"); }
function setMood(wrap, mood) { const f = wrap.querySelector(".boss-face"); if (f) f.dataset.mood = mood; }

function addMsg(who, text, meta) {
  const m = document.createElement("div");
  m.className = "msg " + who;
  const b = document.createElement("div"); b.className = "bubble"; b.textContent = text; m.appendChild(b);
  if (meta !== false && who !== "system") { const md = document.createElement("div"); md.className = "meta"; md.textContent = (who === "me" ? "읽음 " : "") + nowStr(); m.appendChild(md); }
  el.chatLog.appendChild(m); el.chatLog.scrollTop = el.chatLog.scrollHeight;
  return m;
}
async function bossSay(lines) {
  for (const line of lines) {
    el.bossStatus.textContent = "입력 중…";
    const t = document.createElement("div"); t.className = "msg boss typing";
    t.innerHTML = '<div class="bubble"><i></i><i></i><i></i></div>';
    el.chatLog.appendChild(t); el.chatLog.scrollTop = el.chatLog.scrollHeight;
    await sleep(500 + Math.min(line.length * 35, 900));
    t.remove(); addMsg("boss", line); Sound.receive();
    await sleep(250);
  }
  el.bossStatus.textContent = "온라인";
}

function updateCourage() {
  const pct = Math.max(0, Math.min(100, 50 + state.courage * 8));
  el.courageFill.style.width = pct + "%";
  el.courageFill.style.background = state.courage >= DIFFICULTY.successScore ? "var(--ok)" : state.courage < 0 ? "var(--danger)" : "var(--primary)";
  el.courageText.textContent = "용기 " + (state.courage > 0 ? "+" : "") + state.courage;
}

/* ---------- 타이머 ---------- */
function startTimer() {
  stopTimer();
  if (!DIFFICULTY.timeLimit) { el.timer.textContent = "∞"; return; }
  state.timeLeft = DIFFICULTY.timeLimit;
  el.timer.textContent = state.timeLeft; el.timer.classList.remove("urgent");
  state.timer = setInterval(() => {
    state.timeLeft--; el.timer.textContent = state.timeLeft;
    if (state.timeLeft <= 3 && state.timeLeft > 0) { el.timer.classList.add("urgent"); Sound.tick(); }
    if (state.timeLeft <= 0) { stopTimer(); handleAnswer("", true); }
  }, 1000);
}
function stopTimer() { if (state.timer) { clearInterval(state.timer); state.timer = null; } el.timer.classList.remove("urgent"); }

/* ---------- 게임 흐름 ---------- */
function renderChoices(turn) {
  el.choices.innerHTML = "";
  shuffle(SCRIPT[turn].choices).forEach((c) => {
    const b = document.createElement("button"); b.className = "choice";
    b.innerHTML = "<span></span><small></small>";
    b.querySelector("span").textContent = c; b.querySelector("small").textContent = c.length + "자";
    b.addEventListener("click", () => handleAnswer(c, false));
    el.choices.appendChild(b);
  });
}
function setInputEnabled(on) {
  el.input.disabled = !on; el.form.querySelector("button").disabled = !on;
  el.choices.querySelectorAll("button").forEach((b) => (b.disabled = !on));
}

async function startGame() {
  state.turn = 0; state.courage = 0; state.log = []; state.busy = false;
  el.chatLog.innerHTML = ""; el.input.value = ""; el.charCount.textContent = "0";
  setMood(el.bossFaceWrap, "neutral"); updateCourage();
  showScreen("chat");
  addMsg("system", "김부장님과의 대화", false);
  await runTurn();
}

async function runTurn() {
  el.roundLabel.textContent = (state.turn + 1) + " / 3";
  setInputEnabled(false);
  await bossSay(SCRIPT[state.turn].boss);
  renderChoices(state.turn); setInputEnabled(true); el.input.focus();
  startTimer();
}

async function handleAnswer(text, timeout) {
  if (state.busy) return;
  state.busy = true; stopTimer(); setInputEnabled(false); el.choices.innerHTML = "";

  const t = text.trim();
  if (timeout) addMsg("system", "⏰ 시간 초과 - 읽씹", false);
  else { addMsg("me", t); Sound.send(); }
  el.input.value = ""; el.charCount.textContent = "0"; el.charCount.classList.remove("over");

  const r = judge(t, state.turn);
  state.courage += r.delta;
  state.log.push({ turn: state.turn + 1, text: timeout ? "(무응답)" : t, delta: r.delta, why: r.why.join(", "), ending: r.ending });
  updateCourage();
  await sleep(400);

  if (r.ending) { await finish(r.ending); return; }

  // 부장님 표정 + 반응
  const mood = r.tags.includes("clear") || r.tags.includes("refuse") || r.tags.includes("date") ? "shocked"
             : r.tags.includes("hedge") || r.tags.includes("quiet") || r.tags.includes("waver") ? "smug" : "neutral";
  setMood(el.bossFaceWrap, mood);
  await bossSay([pickReaction(r.tags)]);

  if (state.courage <= DIFFICULTY.collapseScore) {
    await bossSay(["ㅋㅋ 됐다, 월요일에 보자"]);
    await finish("stay"); return;
  }

  state.turn++;
  if (state.turn >= SCRIPT.length) {
    const key = state.courage >= DIFFICULTY.successScore ? "success" : state.courage >= 0 ? "quiet" : "stay";
    await bossSay(key === "success" ? ["…하. 알았다. 날짜 맞춰서 정리하자."] : key === "quiet" ? ["그래, 그럼 계속 잘 부탁해~"] : ["결론은 남는 거네? 오케이 ㅋㅋ"]);
    await finish(key); return;
  }
  state.busy = false;
  await runTurn();
}

/* ---------- 결과 ---------- */
const endingSeen = JSON.parse(localStorage.getItem("quitgame.endings") || "{}");

async function finish(key) {
  await sleep(600);
  const E = ENDINGS[key];
  endingSeen[key] = true; localStorage.setItem("quitgame.endings", JSON.stringify(endingSeen));

  el.resultCard.className = "result-card " + (E.fx.includes("shake") ? "shake" : "") + (E.fx.includes("bounce") ? " bounce" : "");
  setMood(el.resultFaceWrap, E.mood);
  el.endingTag.textContent = E.tag; el.endingTag.className = "ending-tag " + E.tagClass;
  el.resultTitle.textContent = E.title; el.resultDesc.textContent = E.desc;
  el.bubbleL.textContent = E.bubbles[0] || ""; el.bubbleR.textContent = E.bubbles[1] || "";

  const pct = Math.max(0, Math.min(100, 50 + state.courage * 8));
  el.courageFinal.style.width = pct + "%";
  el.courageFinal.style.background = key === "success" ? "var(--ok)" : state.courage < 0 ? "var(--danger)" : "var(--primary)";
  el.courageFinalText.textContent = (state.courage > 0 ? "+" : "") + state.courage + " / " + DIFFICULTY.successScore;

  el.resultLog.innerHTML = '<div class="row"><span class="t">턴</span><span>내 답변 · 판정 근거</span><span class="d">점수</span></div>';
  state.log.forEach((L) => {
    const row = document.createElement("div"); row.className = "row";
    const d = L.ending ? "END" : (L.delta > 0 ? "+" : "") + L.delta;
    row.innerHTML = '<span class="t"></span><span class="a"></span><span class="d"></span>';
    row.querySelector(".t").textContent = L.turn;
    const a = row.querySelector(".a"); a.textContent = L.text;
    const why = document.createElement("span"); why.className = "why"; why.textContent = L.why; a.appendChild(why);
    const dd = row.querySelector(".d"); dd.textContent = d; dd.className = "d " + (L.delta > 0 ? "plus" : L.delta < 0 ? "minus" : "");
    el.resultLog.appendChild(row);
  });

  el.resultFact.innerHTML = "<b></b><span></span><br><a target=\"_blank\" rel=\"noopener\"></a>";
  el.resultFact.querySelector("b").textContent = E.fact.head;
  el.resultFact.querySelector("span").textContent = E.fact.body;
  const a = el.resultFact.querySelector("a"); a.href = E.fact.url; a.textContent = "출처 보기 →";

  el.endingCount.textContent = "발견한 엔딩 " + Object.keys(endingSeen).length + " / " + Object.keys(ENDINGS).length;

  showScreen("result");
  if (key === "success") { Sound.success(); launchConfetti(); } else if (key === "proxy") { Sound.receive(); } else { Sound.fail(); }
}

function launchConfetti() {
  el.confetti.innerHTML = "";
  const colors = ["#2563eb", "#16a34a", "#f59e0b", "#ec4899", "#8b5cf6"];
  for (let i = 0; i < 60; i++) {
    const p = document.createElement("i");
    p.style.left = Math.random() * 100 + "%"; p.style.background = colors[i % colors.length];
    p.style.animationDuration = 1.8 + Math.random() * 1.6 + "s"; p.style.animationDelay = Math.random() * 0.6 + "s";
    el.confetti.appendChild(p);
  }
  setTimeout(() => (el.confetti.innerHTML = ""), 4000);
}

/* ---------- 이벤트 ---------- */
function init() {
  el.bossFaceWrap.innerHTML = BOSS_PROFILE_IMG;   // 채팅 헤더 프사
  el.startFace.innerHTML   = BOSS_INTRO_IMG;     // 인트로 일러스트
  el.resultFaceWrap.innerHTML = BOSS_SVG;         // 결과 화면 표정(기존 유지)

  // 프사 탭하면 크게 보기 (카톡 느낌)
  el.bossFaceWrap.addEventListener("click", () => {
    const ov = document.createElement("div"); ov.id = "profile-overlay";
    ov.innerHTML = `<div class="profile-sheet"><img src="img/boss-intro.jpg" alt="김부장"><b>김부장</b><span>영업2팀 · "요즘 애들은 말이야"</span></div>`;
    ov.addEventListener("click", () => ov.remove());
    document.body.appendChild(ov);
  });

  $("#btn-start").addEventListener("click", () => { Sound.ensure(); startGame(); });
  $("#btn-retry").addEventListener("click", startGame);
  $("#btn-sound").addEventListener("click", (e) => { Sound.on = !Sound.on; e.currentTarget.textContent = Sound.on ? "🔊" : "🔇"; });

  el.input.addEventListener("input", () => {
    const n = el.input.value.trim().length;
    el.charCount.textContent = n; el.charCount.classList.toggle("over", n > DIFFICULTY.shortLimit);
  });
  el.form.addEventListener("submit", (e) => {
    e.preventDefault();
    const v = el.input.value.trim(); if (!v) return;
    handleAnswer(v, false);
  });

  $("#btn-share").addEventListener("click", async (e) => {
    const last = state.log[state.log.length - 1];
    const key = Object.keys(ENDINGS).find((k) => ENDINGS[k].title === el.resultTitle.textContent) || "stay";
    const text = "[퇴사하고 싶어요] " + ENDINGS[key].share + " (용기 " + state.courage + ") " + location.href;
    try { await navigator.clipboard.writeText(text); e.currentTarget.textContent = "복사됨!"; setTimeout(() => (e.currentTarget.textContent = "결과 복사"), 1500); }
    catch (err) { prompt("복사해서 공유하세요", text); }
  });
}
document.addEventListener("DOMContentLoaded", init);

// 테스트/디버그용 노출
window.QuitGame = { judge, DIFFICULTY, RULES, ENDINGS };

(() => {
  'use strict';

  const $ = id => document.getElementById(id);
  const canvas = $('field');
  const ctx = canvas.getContext('2d');
  const stage = $('stage'), fullscreen = $('fullscreen');
  const pitch = $('pitch'), menuPanel = $('menu'), picker = $('character-picker');
  const cards = [...picker.querySelectorAll('.character')];
  const portraits = cards.map(card => card.querySelector('img'));
  const roles = cards.map(card => card.querySelector('.character-role'));
  const quotes = cards.map(card => card.querySelector('q'));
  const names = cards.map(card => card.querySelector('strong').textContent);
  const rosterPreview = $('roster-preview'), keyboardGuide = $('keyboard-guide');
  const visibleColumns = 5, rosterColumns = 15, rosterRows = 2;
  const rosterCapacity = rosterColumns * rosterRows;
  const cursorLabels = [$('cursor-p1'), $('cursor-p2')], rosterRange = $('roster-range');
  for (let i = cards.length; i < rosterCapacity; i++) {
    const slot = document.createElement('span');
    slot.className = 'character-empty';
    slot.setAttribute('aria-hidden', 'true');
    picker.append(slot);
  }
  const rosterSlots = [...picker.children];
  const audio = window.arenaSound;
  const reducedMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)');
  const W = canvas.width, H = canvas.height, floor = 355, crossbar = 231;
  const goalLeft = 77, goalRight = W - goalLeft, radius = 14, playerScale = .9;
  const maxBallSpeed = 56, recharge = 600, aimLimit = 108;
  const comboHits = 4, comboSpeed = 87;
  const keeperZone = 45, keeperAdvance = 24, keeperWarning = 5 * 60, keeperGrace = 3 * 60;
  const slapCooldown = 4 * 60;
  const basicBallSpeed = .85, alignedHitBoost = 1.05;
  const ballTimeScale = .5;
  const aimGreenMin = -.29, aimGreenMax = -.04;
  const clamp = (n, min, max) => Math.max(min, Math.min(n, max));
  const colors = ['#69c9ff', '#ffa058'];
  const victoryLines = [
    'Parece que {perdedor} não aguentou o amansa-boi de {vencedor}!',
    '{perdedor} foi buscar a bola. {vencedor} aproveitou e buscou a vitória.',
    '{vencedor} jogou futebol. {perdedor} jogou no modo espectador.',
    '{perdedor} trouxe a chuteira. O futebol ficou todo com {vencedor}.',
    '{vencedor} pediu passagem e {perdedor} ainda abriu o portão.',
    '{perdedor} marcou presença. {vencedor} marcou no placar.',
    '{vencedor} mandou a bola pro gol. {perdedor} mandou um “foi lag”.',
    '{perdedor} deixou o gol tão aberto que {vencedor} quase entrou de carro.',
    '{vencedor} ganhou. {perdedor} já tá pedindo revisão no VAR da cozinha.',
    '{perdedor} foi com sede ao pote. {vencedor} já tinha bebido a água.',
    '{vencedor} fez a festa e {perdedor} saiu com a louça pra lavar.',
    '{perdedor} botou a culpa na física. {vencedor} também não entendeu, mas ganhou.',
    '{vencedor} jogou no simples. {perdedor} complicou até o cadarço.',
    '{perdedor} veio de salto alto. {vencedor} nem limpou a chuteira.',
    '{vencedor} foi pro gol. {perdedor} foi na fé.',
    '{perdedor} pediu revanche antes de {vencedor} terminar de comemorar.',
    '{vencedor} ganhou no campo. {perdedor} ganhou no “quase” por unanimidade.',
    '{perdedor} tentou estacionar o ônibus, mas {vencedor} achou a vaga primeiro.',
    '{vencedor} levou a vitória. Pra {perdedor} sobrou o áudio de três minutos explicando.',
    '{perdedor} tinha um plano. Aí {vencedor} encostou na bola.',
    '{vencedor} tocou o terror. {perdedor} tocou pra lateral.',
    '{perdedor} foi ler o manual. Quando voltou, {vencedor} já tava comemorando.',
    '{vencedor} pegou o atalho pro gol. {perdedor} ficou preso na rotatória.',
    '{perdedor} jurou que era só aquecimento. {vencedor} agradeceu pelo treino.',
    '{vencedor} resolveu no campo. {perdedor} vai tentar resolver no grupo.',
    '{perdedor} chutou com tanta esperança que até {vencedor} ficou com pena.',
    '{vencedor} deu trabalho. {perdedor} deu trabalho pro gandula.',
    '{perdedor} trouxe o dominó. {vencedor} trouxe a bola.',
    '{vencedor} comemorou. {perdedor} jurou que tava testando os botões.',
    '{perdedor} saiu pra lavar um carro. {vencedor} ficou com a vitória.',
  ];
  let victoryBag = [], lastVictoryLine = null;
  const selection = [cards.indexOf($('pick-paulo')), cards.indexOf($('pick-natalino'))];
  const cursors = [...selection];
  let firstColumn = 0;
  let lineup = [...selection];
  const keys = [
    ['KeyA', 'KeyD', 'KeyW', 'KeyS', 'KeyC', 'KeyV', 'KeyB', 'KeyN'],
    ['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Digit1', 'Digit2', 'Digit3', 'Digit4'],
  ];
  const aliases = { Numpad1: 'Digit1', Numpad2: 'Digit2', Numpad3: 'Digit3', Numpad4: 'Digit4', Numpad5: 'Digit5' };
  const slapKeys = new Map([['KeyM', 0], ['Digit5', 1]]);
  const playStyles = {
    paulo: { speed: 1.03, offset: 12, reach: 6, jump: 4, low: 1, high: 2, special: true },
    natalino: { speed: .97, offset: -14, reach: 16, jump: 12, low: 2, high: 1, special: true },
    betael: { speed: 1.08, offset: 22, reach: 0, jump: 8, low: 1, high: 2, special: false },
    txuco: { speed: .93, offset: -20, reach: 10, jump: 18, low: 2, high: 1, special: true },
    elliton: { speed: 1, offset: 0, reach: 20, jump: 0, low: 1, high: 2, special: true },
    ivo: { speed: .9, offset: -8, reach: 24, jump: 6, low: 2, high: 1, special: false },
    negricius: { speed: 1.05, offset: 28, reach: 4, jump: 10, low: 1, high: 2, special: true },
    tony: { speed: .98, offset: -24, reach: 14, jump: 2, low: 2, high: 1, special: true },
    kayna: { speed: 1.1, offset: 16, reach: 2, jump: 16, low: 1, high: 2, special: false },
    'nego-ju': { speed: .95, offset: -4, reach: 22, jump: 4, low: 2, high: 1, special: true },
    neri: { speed: 1.02, offset: 10, reach: 8, jump: 20, low: 1, high: 2, special: true },
    'ali-baba': { speed: .92, offset: -18, reach: 18, jump: 8, low: 2, high: 1, special: false },
    brazil: { speed: 1.06, offset: 26, reach: 0, jump: 12, low: 1, high: 2, special: true },
    lembrancinha: { speed: .88, offset: -28, reach: 26, jump: 2, low: 2, high: 1, special: false },
    romario: { speed: 1.09, offset: 18, reach: 12, jump: 14, low: 1, high: 2, special: true },
  };
  const selectionKeys = new Map(keys.flatMap((bindings, side) =>
    bindings.slice(0, 5).map((code, action) => [code, [side, action]])));
  const controls = new Set([...keys.flat(), ...slapKeys.keys(), 'KeyP']);
  const held = new Set(), pressed = new Set(), pointers = new Map();
  const touchDevice = window.matchMedia?.('(pointer: coarse), (any-pointer: coarse)').matches || navigator.maxTouchPoints > 0;
  const touchStick = { x: 0, y: 0, jump: false, pointer: null };
  let touchKnob = null, modeNoticeTimer = 0;
  const sc = [$('blue-score'), $('orange-score')];
  const yellowCards = [$('blue-yellow'), $('orange-yellow')];
  const specials = [$('blue-special'), $('orange-special')];
  const combos = ['blue', 'orange'].map(team => ({ root: $(`${team}-combo`), bar: $(`${team}-combo-bar`), label: $(`${team}-combo-value`) }));
  const overlay = $('overlay'), play = $('play'), pause = $('pause');
  const resultScreen = $('result-screen'), resultReplay = $('result-replay'), resultRoster = $('result-roster');
  const bracketScreen = $('bracket-screen'), bracketNext = $('bracket-next'), bracketExit = $('bracket-exit');
  const highlightBar = $('highlight-bar'), highlightLabel = $('highlight-label'), highlightSkip = $('highlight-skip');
  const announcement = $('announcement'), timer = $('time'), period = $('period');
  const callout = $('play-call');
  const keeperAlerts = [$('blue-keeper'), $('orange-keeper')];
  const players = colors.map((color, i) => ({ color, i, recharge: 0, combo: 0, slapCount: 0, slapCooldown: 0, warned: false }));
  const ball = {};
  let score = [0, 0], clock = 60, phase = 'menu', resumedPhase;
  let cpu = false, mode = 'local', sound = true, freeze = 0, shake = 0;
  const tournament = { active: false, user: 0, round: 0, rounds: [], stats: new Map(), eliminated: false, finished: false, exitRound: -1, view: 'bracket', previousSelection: null };
  let highlight = null;
  let sparks = [], trail = [], trailTick = 0;
  let aim = null;
  let callTime = 0, crowdEnergy = 0, sceneTime = 0, netCooldown = 0;
  let celebrating = null, urgent = false;

  function playCall(text, color = '#d9fc66', duration = 57) {
    callout.textContent = text;
    callout.style.color = color;
    callout.hidden = false;
    callTime = duration;
  }

  function clearCall() { callTime = 0; callout.hidden = true; }

  function clearCelebration() {
    celebrating?.classList.remove('is-celebrating');
    celebrating = null;
  }

  function setUrgent(value) {
    urgent = value;
    timer.classList.toggle('urgent', value);
  }

  function resetPositions(serve = false) {
    players.forEach((p, i) => Object.assign(p, {
      x: i ? 722 : 278, y: floor, vx: 0, vy: 0, kick: 0, kickType: 0,
      cooldown: 0, struck: false, crouch: false, gait: 0,
      slapTime: 0, slapDir: 0, knockback: 0,
      keeperTicks: 0, keeperAnchor: null,
    }));
    keeperAlerts.forEach(alert => { alert.hidden = true; });
    Object.assign(ball, { x: W / 2, y: 174, vx: serve ? (Math.random() - .5) * 3 : 0, vy: 0, angle: 0, spin: 0, boost: 0, comboFlight: false, clearOf: null, clearance: 0 });
    aim = null;
    trail = [];
  }

  function updateHUD() {
    sc.forEach((node, i) => { if (node.textContent !== String(score[i])) node.textContent = score[i]; });
    const seconds = Math.ceil(clock);
    const text = `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`;
    if (timer.textContent !== text) timer.textContent = text;
    players.forEach((p, i) => {
      const aiming = aim?.owner === p;
      const state = aiming ? (aim.green ? 'green' : 'red') : p.recharge > 0 ? 'cooling' : 'ready';
      const label = aiming ? (aim.green ? 'VERDE!' : 'MIRANDO') : p.recharge > 0 ? `BICUDO ${Math.ceil(p.recharge / 60)}s` : 'BICUDO OK';
      if (specials[i].dataset.state !== state) specials[i].dataset.state = state;
      if (specials[i].textContent !== label) specials[i].textContent = label;
      const combo = combos[i];
      if (combo.bar.value !== p.combo) {
        const ready = p.combo === comboHits;
        combo.bar.value = p.combo;
        combo.label.textContent = ready ? 'PRONTO!' : `${p.combo}/${comboHits}`;
        combo.root.classList.toggle('combo-ready', ready);
      }
    });
  }

  function shuffle(items) {
    const result = [...items];
    for (let i = result.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [result[i], result[j]] = [result[j], result[i]];
    }
    return result;
  }

  // ---------- Mata-mata: chave de 16 (oitavas → quartas → semifinal → final) ----------
  const roundLabels = ['OITAVAS', 'QUARTAS', 'SEMIFINAL', 'FINAL'];
  const roundPhrases = ['nas oitavas', 'nas quartas', 'na semifinal', 'na final'];
  const BYE = -1;
  const trophySVG = '<svg viewBox="0 0 48 48" aria-hidden="true"><path fill="#ffde64" stroke="#7a5d14" stroke-width="2" stroke-linejoin="round" d="M14 6h20v8c0 8-4 14-10 15-6-1-10-7-10-15z"/><path fill="none" stroke="#ffde64" stroke-width="3" d="M14 10H7c0 7 3 11 8 12M34 10h7c0 7-3 11-8 12"/><path fill="#e8bb3c" stroke="#7a5d14" stroke-width="2" d="M21 29h6v6h-6z"/><path fill="#ffde64" stroke="#7a5d14" stroke-width="2" stroke-linejoin="round" d="M15 41c0-4 4-6 9-6s9 2 9 6z"/><path fill="#fff6c9" opacity=".7" d="M18 9h3v9c0 3 1 6 2 8-3-1-5-5-5-9z"/></svg>';

  function slotName(index) { return index === BYE ? 'W.O.' : index === null ? 'A DEFINIR' : names[index]; }
  function makeMatch(a = null, b = null) { return { a, b, score: null, pens: null, winner: null, done: false, wo: false }; }
  function isUserMatch(match) { return match.a === tournament.user || match.b === tournament.user; }
  function opponentOf(match) { return match.a === tournament.user ? match.b : match.a; }
  function currentMatch() { return tournament.rounds[tournament.round]?.find(isUserMatch) ?? null; }
  function championOf() { return tournament.rounds.at(-1)?.[0].winner ?? null; }

  function statsOf(index) {
    if (!tournament.stats.has(index)) tournament.stats.set(index, { gf: 0, ga: 0, wins: 0, played: 0, best: 0 });
    return tournament.stats.get(index);
  }

  function shootout() {
    let a = 0, b = 0;
    for (let kick = 0; kick < 5; kick++) { a += Math.random() < .75; b += Math.random() < .75; }
    while (a === b) { a += Math.random() < .75; b += Math.random() < .75; }
    return [a, b];
  }

  function randomGoals() {
    const r = Math.random();
    return r < .2 ? 0 : r < .47 ? 1 : r < .72 ? 2 : r < .89 ? 3 : r < .97 ? 4 : 5;
  }

  function closeMatch(match, roundIndex, score, pens, winner) {
    Object.assign(match, { score, pens, winner, done: true });
    [match.a, match.b].forEach((index, side) => {
      const stats = statsOf(index);
      stats.played++;
      stats.gf += score[side];
      stats.ga += score[1 - side];
      stats.best = Math.max(stats.best, roundIndex + (winner === index ? 1 : 0));
      if (winner === index) stats.wins++;
    });
  }

  // Partidas sem o jogador são "sorteadas": placar aleatório e pênaltis se empatar.
  function simulateMatch(match, roundIndex) {
    if (match.done) return;
    if (match.a === BYE || match.b === BYE) {
      const winner = match.a === BYE ? match.b : match.a;
      Object.assign(match, { winner, done: true, wo: true });
      statsOf(winner).best = Math.max(statsOf(winner).best, roundIndex + 1);
      return;
    }
    const score = [randomGoals(), randomGoals()];
    const pens = score[0] === score[1] ? shootout() : null;
    const decider = pens ?? score;
    closeMatch(match, roundIndex, score, pens, decider[0] > decider[1] ? match.a : match.b);
  }

  function buildTournament(user) {
    const field = shuffle(cards.map((_, index) => index).filter(index => index !== user)).slice(0, 15);
    const byes = Math.min(8, 15 - field.length);
    const lucky = field.slice(0, byes);
    const rest = shuffle([user, ...field.slice(byes)]);
    const pairs = lucky.map(index => [index, BYE]);
    for (let i = 0; i < rest.length; i += 2) pairs.push(Math.random() < .5 ? [rest[i], rest[i + 1]] : [rest[i + 1], rest[i]]);
    tournament.rounds = [shuffle(pairs).map(([a, b]) => makeMatch(a, b)),
      ...[4, 2, 1].map(size => Array.from({ length: size }, () => makeMatch()))];
    tournament.rounds[0].forEach(match => { if (match.b === BYE) simulateMatch(match, 0); });
  }

  // Fecha a rodada atual (sorteia o resto) e leva os vencedores para a próxima fase.
  function completeRound() {
    const index = tournament.round;
    tournament.rounds[index].forEach(match => simulateMatch(match, index));
    const next = tournament.rounds[index + 1];
    if (!next) { tournament.finished = true; return; }
    next.forEach((match, i) => {
      match.a = tournament.rounds[index][i * 2].winner;
      match.b = tournament.rounds[index][i * 2 + 1].winner;
    });
    tournament.round++;
  }

  function recordUserMatch(userGoals, rivalGoals, forcedWinner) {
    const match = currentMatch();
    if (!match || match.done) return null;
    const userIsA = match.a === tournament.user;
    const score = userIsA ? [userGoals, rivalGoals] : [rivalGoals, userGoals];
    let pens = null, userPens = null, userWon;
    if (forcedWinner !== null) userWon = forcedWinner === 0;
    else if (userGoals !== rivalGoals) userWon = userGoals > rivalGoals;
    else {
      userPens = shootout();
      pens = userIsA ? userPens : [userPens[1], userPens[0]];
      userWon = userPens[0] > userPens[1];
    }
    closeMatch(match, tournament.round, score, pens, userWon ? tournament.user : opponentOf(match));
    if (!userWon) { tournament.eliminated = true; tournament.exitRound = tournament.round; }
    completeRound();
    return { userWon, userPens };
  }

  function startTournament() {
    if (!tournament.active) tournament.previousSelection = [...selection];
    Object.assign(tournament, { active: true, user: selection[0], round: 0, stats: new Map(),
      eliminated: false, finished: false, exitRound: -1, view: 'bracket' });
    buildTournament(tournament.user);
    cpu = true;
    $('orange-controls').classList.add('cpu');
    showTournamentScreen();
  }

  function pickHighlightMatch(roundIndex) {
    const candidates = (tournament.rounds[roundIndex] ?? [])
      .filter(m => m.done && !m.wo && !isUserMatch(m) && m.score);
    if (!candidates.length) return null;
    candidates.sort((a, b) => (b.score[0] + b.score[1]) - (a.score[0] + a.score[1]));
    return candidates[0];
  }

  function startHighlight(match, roundIndex, nextView = 'bracket') {
    if (!match) {
      if (nextView === 'podium') showPodium();
      else showTournamentScreen();
      return;
    }
    highlight = { match, roundIndex, nextView };
    selection[0] = match.a;
    selection[1] = match.b;
    applyLineup();
    players.forEach(p => { p.aiStyle = null; p.aiLevel = roundIndex + 2; p.speedScale = 1.08; p.jumpScale = 1.05; p.recharge = 0; p.combo = 2; p.slapCount = 0; p.slapCooldown = 0; p.warned = false; });
    yellowCards.forEach(card => { card.hidden = true; });
    overlay.hidden = true;
    resultScreen.hidden = true;
    bracketScreen.hidden = true;
    pitch.classList.remove('is-selecting', 'is-bracket');
    resetPositions(true);
    ball.vx = (Math.random() < .5 ? -1 : 1) * 9;
    ball.vy = -5;
    sparks = [];
    shake = 0;
    crowdEnergy = .45;
    netCooldown = 0;
    clearCall();
    clearCelebration();
    clearInput();
    setUrgent(false);
    score = [...match.score];
    clock = 10;
    phase = 'highlight';
    pause.disabled = true;
    period.textContent = 'MELHORES JOGADAS';
    announcement.textContent = '';
    const penText = match.pens ? ` (${match.pens[0]}×${match.pens[1]} PÊN)` : '';
    highlightLabel.textContent = `★ ${roundLabels[roundIndex]} · ${names[match.a]} ${match.score[0]} × ${match.score[1]} ${names[match.b]}${penText}`;
    highlightBar.hidden = false;
    audio?.unlock();
    audio?.setInPlay(true);
    updateHUD();
    syncTouchVisibility();
  }

  function endHighlight() {
    if (!highlight) return;
    const { nextView } = highlight;
    highlight = null;
    highlightBar.hidden = true;
    selection[0] = tournament.user;
    if (nextView === 'podium') showPodium();
    else showTournamentScreen();
  }

  function advanceTournament() {
    if (!tournament.active) return;
    if (tournament.view === 'podium') { startTournament(); return; }
    if (tournament.finished) { showPodium(); return; }
    if (tournament.eliminated) {
      while (!tournament.finished) completeRound();
      const finalMatch = tournament.rounds.at(-1)?.[0];
      if (finalMatch && !finalMatch.wo && !isUserMatch(finalMatch)) {
        startHighlight(finalMatch, tournament.rounds.length - 1, 'bracket');
      } else showTournamentScreen();
      return;
    }
    start();
  }

  function exitTournament() {
    highlight = null;
    highlightBar.hidden = true;
    tournament.active = false;
    tournament.view = 'bracket';
    if (tournament.previousSelection) selection.splice(0, 2, ...tournament.previousSelection);
    tournament.previousSelection = null;
    bracketScreen.hidden = true;
    resultScreen.hidden = true;
    pitch.classList.remove('is-bracket');
    phase = 'menu';
    applyLineup();
    updatePicker();
    menu('ESCOLHA SEU CRAQUE', 'Escolha seu craque e encare o mata-mata.', 'COMEÇAR MATA-MATA', '●  MATA-MATA', true);
  }

  function syncModeButtons() {
    for (const [id, selected] of [['local', mode === 'local'], ['solo', mode === 'cpu'], ['tournament', mode === 'tournament']]) {
      $(id).classList.toggle('selected', selected);
      $(id).setAttribute('aria-pressed', String(selected));
    }
  }

  function syncResultButtons() {
    resultReplay.firstChild.textContent = tournament.active ? 'VER CHAVE ' : 'REVANCHE ';
    resultRoster.firstChild.textContent = tournament.active ? 'SAIR DO TORNEIO ' : 'TROCAR CRAQUES ';
  }

  function enterTournamentPhase() {
    highlight = null;
    highlightBar.hidden = true;
    phase = 'tournament';
    pause.disabled = true;
    period.textContent = 'MATA-MATA';
    announcement.textContent = '';
    clearCall();
    clearCelebration();
    clearInput();
    setUrgent(false);
    audio?.setInPlay(false);
    overlay.hidden = true;
    resultScreen.hidden = true;
    bracketScreen.hidden = false;
    pitch.classList.remove('is-selecting');
    pitch.classList.add('is-bracket');
    syncResultButtons();
    syncTouchVisibility();
  }

  function showTournamentScreen() {
    enterTournamentPhase();
    tournament.view = 'bracket';
    $('bracket-scroll').hidden = false;
    $('podium').hidden = true;
    renderBracket();
    const user = names[tournament.user];
    let status, action;
    if (tournament.finished) {
      status = `${names[championOf()]} levantou a taça!`;
      action = 'VER PÓDIO';
    } else if (tournament.eliminated) {
      status = `${user} caiu ${roundPhrases[tournament.exitRound]}. Veja quem leva a taça!`;
      action = 'SIMULAR ATÉ A FINAL';
    } else {
      const label = roundLabels[tournament.round];
      status = `${label}: ${user} × ${names[opponentOf(currentMatch())]}`;
      action = `JOGAR ${label}`;
    }
    $('bracket-kicker').textContent = '●  MATA-MATA · 16 CRAQUES';
    $('bracket-title').textContent = tournament.finished ? 'TEMOS UM CAMPEÃO!' : 'CHAVE DO TORNEIO';
    $('bracket-status').textContent = status;
    bracketNext.firstChild.textContent = `${action} `;
    bracketExit.firstChild.textContent = 'SAIR DO TORNEIO ';
  }

  function portraitNode(index) {
    if (index === null || index === BYE) return document.createElement('i');
    const img = document.createElement('img');
    img.src = portraits[index].getAttribute('src');
    img.alt = '';
    return img;
  }

  function bracketCard(match) {
    const card = document.createElement('div');
    const mine = isUserMatch(match);
    const next = mine && !match.done && !tournament.eliminated;
    card.className = `bracket-match${mine ? ' is-user' : ''}${next ? ' is-next' : ''}${match.done ? ' is-done' : ''}`;
    [match.a, match.b].forEach((index, side) => {
      const row = document.createElement('div');
      const won = match.done && match.winner === index;
      row.className = `bracket-player${won ? ' is-winner' : match.done ? ' is-loser' : ''}`
        + `${index === tournament.user ? ' is-you' : ''}${index === BYE || index === null ? ' is-empty' : ''}`;
      const name = document.createElement('span');
      name.textContent = slotName(index);
      const goals = document.createElement('b');
      if (match.wo) goals.textContent = won ? '✓' : '';
      else if (match.done) goals.textContent = `${match.score[side]}${match.pens ? ` (${match.pens[side]})` : ''}`;
      row.append(portraitNode(index), name, goals);
      card.append(row);
    });
    return card;
  }

  function renderBracket() {
    const last = tournament.rounds.length - 1;
    const column = (roundIndex, matches, side) => {
      const col = document.createElement('div');
      const current = roundIndex === tournament.round && !tournament.finished;
      col.className = `bracket-round side-${side}${current ? ' is-current' : ''}`;
      const heading = document.createElement('h3');
      heading.textContent = roundLabels[roundIndex];
      const list = document.createElement('div');
      list.className = 'bracket-list';
      matches.forEach(match => list.append(bracketCard(match)));
      col.append(heading, list);
      return col;
    };
    const columns = [];
    for (let r = 0; r < last; r++) {
      const round = tournament.rounds[r];
      columns.push(column(r, round.slice(0, round.length / 2), 'left'));
    }
    const final = column(last, tournament.rounds[last], 'final');
    const trophy = document.createElement('div');
    trophy.className = 'bracket-trophy';
    trophy.innerHTML = trophySVG;
    const champ = document.createElement('span');
    champ.textContent = tournament.finished ? `CAMPEÃO: ${names[championOf()]}` : 'TAÇA DO QUINTAL';
    trophy.append(champ);
    final.querySelector('.bracket-list').prepend(trophy);
    columns.push(final);
    for (let r = last - 1; r >= 0; r--) {
      const round = tournament.rounds[r];
      columns.push(column(r, round.slice(round.length / 2), 'right'));
    }
    $('bracket-rounds').replaceChildren(...columns);
  }

  function showPodium() {
    enterTournamentPhase();
    tournament.view = 'podium';
    $('bracket-scroll').hidden = true;
    $('podium').hidden = false;
    const final = tournament.rounds.at(-1)[0];
    const champion = final.winner, runnerUp = final.a === champion ? final.b : final.a;
    const balance = index => { const s = statsOf(index); return [s.gf - s.ga, s.gf]; };
    const [third] = tournament.rounds.at(-2).map(match => (match.winner === match.a ? match.b : match.a))
      .sort((x, y) => { const [a1, a2] = balance(x), [b1, b2] = balance(y); return b1 - a1 || b2 - a2; });
    const spots = [[runnerUp, 2], [champion, 1], [third, 3]].map(([index, place]) => {
      const stats = statsOf(index);
      const spot = document.createElement('div');
      spot.className = `podium-spot place-${place}${index === tournament.user ? ' is-you' : ''}`;
      const name = document.createElement('strong');
      name.textContent = names[index];
      const info = document.createElement('small');
      info.textContent = `${stats.gf} GOLS · ${stats.ga} SOFRIDOS`;
      const step = document.createElement('div');
      step.className = 'podium-step';
      step.textContent = `${place}º`;
      spot.append(portraitNode(index), name, info, step);
      return spot;
    });
    $('podium-stage').replaceChildren(...spots);

    const ranking = [...tournament.stats.entries()].filter(([, s]) => s.played)
      .sort(([, a], [, b]) => b.gf - a.gf || (b.gf - b.ga) - (a.gf - a.ga) || b.best - a.best).slice(0, 5);
    $('podium-scorers').replaceChildren(...ranking.map(([index, s]) => {
      const item = document.createElement('li');
      if (index === tournament.user) item.className = 'is-you';
      const name = document.createElement('span');
      name.textContent = names[index];
      const goals = document.createElement('b');
      goals.textContent = `${s.gf} ${s.gf === 1 ? 'GOL' : 'GOLS'}`;
      item.append(name, goals);
      return item;
    }));

    const mine = statsOf(tournament.user);
    const campaign = champion === tournament.user ? 'CAMPEÃO 🏆'
      : runnerUp === tournament.user ? 'vice-campeão'
        : third === tournament.user ? '3º lugar' : `caiu ${roundPhrases[tournament.exitRound]}`;
    $('podium-campaign').textContent = `Sua campanha com ${names[tournament.user]}: ${campaign} · ${mine.wins} `
      + `${mine.wins === 1 ? 'vitória' : 'vitórias'} · ${mine.gf} gols marcados · ${mine.ga} sofridos`;
    $('bracket-kicker').textContent = '●  MATA-MATA · RESULTADO FINAL';
    $('bracket-title').textContent = 'PÓDIO';
    $('bracket-status').textContent = champion === tournament.user
      ? `${names[champion]} é o grande campeão!` : `${names[champion]} é o campeão do mata-mata!`;
    bracketNext.firstChild.textContent = 'NOVO TORNEIO ';
    bracketExit.firstChild.textContent = 'VOLTAR AO MENU ';
    audio?.play(champion === tournament.user ? 'goal' : 'finish');
  }

  function menu(title, description, button, kicker, modes, card = '') {
    $('menu-title').textContent = title;
    $('menu-description').textContent = description;
    $('menu-kicker').textContent = kicker;
    $('modes').hidden = !modes;
    picker.hidden = !modes;
    rosterPreview.hidden = !modes;
    keyboardGuide.hidden = !modes;
    pitch.classList.toggle('is-selecting', modes);
    menuPanel.classList.toggle('selection-menu', modes);
    menuPanel.dataset.card = card;
    play.firstChild.textContent = `${button} `;
    overlay.hidden = false;
    bracketScreen.hidden = true;
    syncResultButtons();
    syncTouchVisibility();
  }

  function clearInput() {
    held.clear();
    pressed.clear();
    pointers.clear();
    resetTouchStick();
  }

  function start() {
    stopPreview();
    highlight = null;
    highlightBar.hidden = true;
    resultScreen.hidden = true;
    bracketScreen.hidden = true;
    pitch.classList.remove('is-bracket');
    if (tournament.active) {
      const match = currentMatch();
      if (!match || match.done) { showTournamentScreen(); return; }
      selection[0] = tournament.user;
      selection[1] = opponentOf(match);
    }
    applyLineup();
    const style = playStyles[cards[lineup[1]].id.replace('pick-', '')] ?? null;
    players.forEach(p => { p.aiStyle = null; p.aiLevel = 1; p.speedScale = 1; p.jumpScale = 1; });
    if (tournament.active && style) {
      players[1].aiStyle = style;
      players[1].aiLevel = tournament.round + 1;
      players[1].speedScale = style.speed;
      players[1].jumpScale = 1 + style.jump / 120;
    }
    pitch.classList.remove('is-selecting');
    audio?.unlock();
    audio?.setInPlay(true);
    resetPositions(true);
    players.forEach(p => { p.recharge = 0; p.combo = 0; p.slapCount = 0; p.slapCooldown = 0; p.warned = false; });
    yellowCards.forEach(card => { card.hidden = true; });
    clearInput();
    sparks = [];
    shake = 0;
    crowdEnergy = netCooldown = 0;
    clearCall();
    clearCelebration();
    setUrgent(false);
    score = [0, 0];
    clock = 60;
    phase = 'kickoff';
    freeze = 1.2;
    overlay.hidden = true;
    canvas.focus();
    pause.disabled = false;
    $('pause-label').textContent = 'PAUSAR';
    period.textContent = 'TEMPO DE JOGO';
    announcement.textContent = 'VAI!';
    announcement.style.color = '';
    updateHUD();
    syncTouchVisibility();
  }

  function togglePause(foul = null) {
    if (phase === 'menu' || phase === 'end' || phase === 'tournament' || phase === 'highlight' || phase === 'highlight-goal') return;
    clearInput();
    if (phase === 'paused') {
      phase = resumedPhase;
      audio?.setInPlay(true);
      overlay.hidden = true;
      canvas.focus();
      $('pause-label').textContent = 'PAUSAR';
      period.textContent = urgent ? 'RETA FINAL' : 'TEMPO DE JOGO';
    } else {
      resumedPhase = phase;
      phase = 'paused';
      audio?.setInPlay(false);
      $('pause-label').textContent = 'VOLTAR';
      period.textContent = foul ? 'FALTA' : 'PAUSADO';
      if (foul) {
        menu('FALTA!', `${playerName(foul.i)} recebeu amarelo. Aperte P ou Enter para continuar.`,
          'CONTINUAR', 'CARTÃO AMARELO', false, 'yellow');
      } else menu('PAUSA', 'Aperte P ou Enter para continuar.', 'CONTINUAR', '●  PARTIDA PAUSADA', false);
    }
    syncTouchVisibility();
  }

  function finish(expelled = null) {
    aim = null;
    clearCall();
    clearCelebration();
    setUrgent(false);
    updateHUD();
    phase = 'end';
    pause.disabled = true;
    period.textContent = 'FIM DE JOGO';
    announcement.textContent = '';
    const winner = expelled ? 1 - expelled.i : score[0] === score[1] ? null : Number(score[1] > score[0]);
    const loser = winner === null ? null : 1 - winner;
    let matchWinner = winner;
    let penalties = null;
    if (tournament.active) {
      const outcome = recordUserMatch(score[0], score[1], expelled ? winner : null);
      if (outcome) {
        matchWinner = outcome.userWon ? 0 : 1;
        penalties = outcome.userPens;
      }
    }
    for (const [side, team] of ['blue', 'orange'].entries()) {
      $(`result-${team}-name`).textContent = names[lineup[side]];
      $(`result-${team}-score`).textContent = score[side];
    }
    $('result-status').textContent = matchWinner === null ? 'EMPATE!'
      : penalties ? `${playerName(matchWinner)} VENCEU NOS PÊNALTIS (${penalties[0]}×${penalties[1]})!`
        : `${playerName(matchWinner)} VENCEU!`;
    $('result-quote').textContent = expelled ? `${playerName(loser)} ganhou um cartão vermelho e passagem só de ida pro vestiário.`
      : matchWinner === null ? 'Tanto amansa-boi e ninguém conseguiu amansar ninguém.'
        : randomVictoryLine(matchWinner, 1 - matchWinner);
    resultScreen.dataset.winner = matchWinner === null ? 'draw' : matchWinner === 0 ? 'blue' : 'orange';
    resultScreen.dataset.card = expelled ? 'red' : '';
    overlay.hidden = true;
    resultScreen.hidden = false;
    audio?.play('finish');
    audio?.setInPlay(false);
    syncResultButtons();
    syncTouchVisibility();
  }

  function randomVictoryLine(winner, loser) {
    if (!victoryBag.length) {
      victoryBag = [...victoryLines];
      for (let i = victoryBag.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [victoryBag[i], victoryBag[j]] = [victoryBag[j], victoryBag[i]];
      }
      const end = victoryBag.length - 1;
      if (victoryBag[end] === lastVictoryLine) [victoryBag[0], victoryBag[end]] = [victoryBag[end], victoryBag[0]];
    }
    lastVictoryLine = victoryBag.pop();
    return lastVictoryLine.replace('{vencedor}', playerName(winner)).replace('{perdedor}', playerName(loser));
  }

  function openRematchRoster() {
    resultScreen.hidden = true;
    menu('ESCOLHA SEU CRAQUE', 'Mude a escalação para a revanche.', 'JOGAR DE NOVO', '●  REVANCHE', true);
    picker.focus({ preventScroll: true });
  }

  function burst(x, y, color, count, speed) {
    for (let i = 0; i < (reducedMotion?.matches ? Math.ceil(count / 3) : count); i++) {
      const a = Math.random() * Math.PI * 2, v = (Math.random() * .8 + .2) * speed;
      sparks.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, life: 18 + Math.random() * 22, color });
    }
  }

  function confetti(color) {
    if (reducedMotion?.matches) return;
    for (let i = 0; i < 76; i++) {
      const x = i < 38 ? W * .2 : W * .8;
      const ink = [color, '#d9fc66', '#f2eee1'][i % 3];
      sparks.push({ x, y: H - 22, vx: (W / 2 - x) * .012 + (Math.random() - .5) * 10,
        vy: -8 - Math.random() * 9, life: 43 + Math.random() * 30, color: ink, paper: true, angle: i, spin: (Math.random() - .5) * .36 });
    }
  }

  function goal(i) {
    if (phase === 'highlight') {
      phase = 'highlight-goal';
      freeze = .65;
      clearCall();
      announcement.textContent = `GOLAÇO DO ${playerName(i)}!`;
      announcement.style.color = colors[i];
      shake = 9;
      crowdEnergy = 1;
      burst(ball.x, ball.y, colors[i], 55, 12);
      confetti(colors[i]);
      audio?.play('goal');
      return;
    }
    score[i]++;
    updateHUD();
    phase = 'goal';
    freeze = 1.25;
    clearCall();
    clearCelebration();
    celebrating = sc[i].parentElement;
    celebrating.classList.add('is-celebrating');
    announcement.textContent = `GOL DO ${playerName(i)}!`;
    announcement.style.color = colors[i];
    shake = 9;
    crowdEnergy = 1;
    burst(ball.x, ball.y, colors[i], 55, 12);
    confetti(colors[i]);
    audio?.play('goal');
  }

  function human(i) {
    const [left, right, up, down, groundKick, lob, reverse, special] = keys[i];
    const isHeld = key => held.has(key) || Array.from(pointers.values()).includes(key);
    const stick = i === 0 ? touchStick : null;
    const keyDir = Number(isHeld(right)) - Number(isHeld(left));
    const dir = stick && Math.abs(stick.x) > .16 ? stick.x : keyDir;
    let jump = pressed.has(up);
    if (stick) {
      const wantJump = stick.y < -.55;
      if (wantJump && !stick.jump) jump = true;
      stick.jump = wantJump;
    }
    const crouch = isHeld(down) || Boolean(stick && stick.y > .55);
    return [dir, jump, crouch,
      pressed.has(reverse) ? 3 : pressed.has(lob) ? 2 : Number(pressed.has(groundKick)), pressed.has(special)];
  }

  function ai(p) {
    if (aim?.owner === p) return [0, false, false, 0, aim.elapsed > 20 && aim.green];
    if (p.i === 0) {
      const target = clamp(ball.x - (ball.x < 480 ? -ball.vx * ballTimeScale * 8 + 44 : 125), 120, 570);
      const dx = target - p.x, near = ball.x > p.x - 16 && ball.x < p.x + 98;
      const jump = near && ball.y < p.y - 78 && ball.y > p.y - 172 && ball.vy > -3;
      const kick = near && Math.abs(ball.y - (p.y - 27)) < 52 ? (ball.y < p.y - 34 ? 2 : 1) : 0;
      return [Math.abs(dx) < 8 ? 0 : Math.sign(dx), jump, false, kick, ball.x > 230 && ball.x < 430 && canAim(p)];
    }
    if (!p.aiStyle) {
      const target = clamp(ball.x + (ball.x > 520 ? ball.vx * ballTimeScale * 8 + 44 : 125), 430, 880);
      const dx = target - p.x, near = ball.x < p.x + 16 && ball.x > p.x - 98;
      const jump = near && ball.y < p.y - 78 && ball.y > p.y - 172 && ball.vy > -3;
      const kick = near && Math.abs(ball.y - (p.y - 27)) < 52 ? (ball.y < p.y - 34 ? 2 : 1) : 0;
      return [Math.abs(dx) < 9 ? 0 : Math.sign(dx), jump, false, kick, ball.x > 570 && ball.x < 770 && canAim(p)];
    }
    const style = p.aiStyle;
    const level = p.aiLevel ?? 1;
    const target = clamp(ball.x + (ball.x > 520 ? ball.vx * ballTimeScale * (8 + level) + 44 : 125) + style.offset, 430, 880);
    const dx = target - p.x, reach = 16 + style.reach, near = ball.x < p.x + reach && ball.x > p.x - reach - 82;
    const jump = near && ball.y < p.y - 78 - style.jump && ball.y > p.y - 172 && ball.vy > -3;
    const kick = near && Math.abs(ball.y - (p.y - 27)) < 52 ? (ball.y < p.y - 34 ? style.high : style.low) : 0;
    const special = style.special && ball.x > 570 - level * 12 && ball.x < 770 + level * 12 && canAim(p);
    return [Math.abs(dx) < Math.max(4, 9 - level) ? 0 : Math.sign(dx), jump, false, kick, special];
  }

  function stepPlayer(p, [dir, jump, crouch, kick], dt) {
    const oldY = p.y;
    const shouldCrouch = crouch && p.y >= floor;
    p.crouch = shouldCrouch;
    p.cooldown = Math.max(0, p.cooldown - dt);
    p.kick = Math.max(0, p.kick - dt);
    if (jump && p.y >= floor && !shouldCrouch) {
      p.vy = -12.9 * (p.jumpScale ?? 1);
      audio?.play('jump');
    }
    if (kick && !p.cooldown && (kick !== 3 || p.y < floor || p.vy < 0)) {
      p.kick = 12;
      p.kickType = kick;
      p.cooldown = 21;
      p.struck = false;
    }
    const target = dir * (shouldCrouch ? 2.9 : 7.5) * (p.speedScale ?? 1);
    p.vx += (target - p.vx) * (1 - Math.pow(.72, dt));
    p.vy += .61 * dt;
    p.x = clamp(p.x + (p.vx + p.knockback) * dt, goalLeft + 21, goalRight - 21);
    p.knockback *= Math.pow(.855, dt);
    p.y += p.vy * dt;
    if (p.y >= floor) {
      if (oldY < floor && p.vy > 4) {
        audio?.play('land');
        burst(p.x, floor, '#c8ba83', 5, 2.1);
      }
      p.y = floor; p.vy = 0;
    }
    p.gait += p.vx * dt * .16;
  }

  function slap(p) {
    if (p.slapCooldown > 0) return;
    p.slapCooldown = slapCooldown;
    const rival = players[1 - p.i];
    const dx = rival.x - p.x;
    p.slapDir = Math.sign(dx) || (p.i ? -1 : 1);
    p.slapTime = 7;
    if (Math.abs(dx) > 76 || Math.abs(headY(p) - headY(rival)) > 43) return;

    rival.knockback = 12 * p.slapDir;
    if (aim?.owner === rival) aim = null;
    burst((p.x + rival.x) / 2, (headY(p) + headY(rival)) / 2, '#fff09e', 6, 3);
    audio?.play('slap');

    if (++p.slapCount < 3) return;
    p.slapCount = 0;
    if (p.warned) {
      finish(p);
      return;
    }
    p.warned = true;
    yellowCards[p.i].hidden = false;
    clearCall();
    audio?.play('foul');
    togglePause(p);
  }

  function trackKeepers(dt) {
    for (const p of players) {
      const ownGoal = p.i ? goalRight : goalLeft;
      const distance = Math.abs(p.x - ownGoal);
      const alert = keeperAlerts[p.i];
      // A faixa curta só pune quem cola no gol; passos pequenos não reiniciam a contagem.
      if (p.keeperAnchor === null && distance > keeperZone) continue;
      if (p.keeperAnchor !== null && distance - p.keeperAnchor >= keeperAdvance) {
        p.keeperTicks = 0;
        p.keeperAnchor = distance <= keeperZone ? distance : null;
        alert.hidden = true;
        continue;
      }

      p.keeperAnchor = Math.min(p.keeperAnchor ?? distance, distance);
      p.keeperTicks += dt;
      const remaining = keeperWarning + keeperGrace - p.keeperTicks;
      if (remaining <= 0) {
        if (aim?.owner === p) aim = null;
        p.vx = 0;
        p.knockback = p.i ? -24 : 24;
        p.keeperTicks = 0;
        p.keeperAnchor = null;
        alert.hidden = true;
        playCall(`${playerName(p.i)} foi afastado do gol`, p.color);
      } else if (p.keeperTicks >= keeperWarning) {
        const text = `${playerName(p.i)} acha que ele é goleiro · avance! ${Math.ceil(remaining / 60)} s`;
        if (alert.textContent !== text) alert.textContent = text;
        alert.hidden = false;
      }
    }
  }

  function headY(p) { return p.y - (p.crouch ? 43 : 65) * playerScale; }

  function kickPose(p) {
    const reverse = p.kickType === 3;
    return {
      stretch: (reverse ? -46 : 43) * Math.sin(p.kick / 12 * Math.PI * .75),
      shoeY: p.kickType === 2 || reverse ? -24 : -12,
    };
  }

  function toeContact(p, facing, kickDir) {
    const { stretch, shoeY } = kickPose(p);
    const dx = ball.x - (p.x + (facing * (14 + stretch) + kickDir * 14) * playerScale);
    const dy = ball.y - (p.y + shoeY * playerScale);
    if (dx * kickDir < -2) return 0;
    return clamp(1 - Math.abs(Math.hypot(dx, dy) - radius) / 21, 0, 1);
  }

  function followsBall(vx, vy, incomingX, incomingY) {
    return Math.hypot(incomingX, incomingY) > .1 && vx * incomingX + vy * incomingY >= 0;
  }

  function accelerateBall(vx, vy, speedFactor = basicBallSpeed) {
    const base = Math.hypot(vx, vy);
    const basic = base * speedFactor;
    const speed = followsBall(vx, vy, ball.vx, ball.vy)
      ? Math.max(basic, Math.hypot(ball.vx, ball.vy)) * alignedHitBoost : basic;
    const scale = Math.min(speed, maxBallSpeed) / base;
    ball.vx = vx * scale;
    ball.vy = vy * scale;
  }

  function canAim(p) {
    const ahead = (ball.x - p.x) * (p.i ? -1 : 1);
    return !aim && !p.recharge && ahead > 9 && ahead < 76 && Math.abs(ball.y - (p.y - 25)) < 49;
  }

  function pointAim(a) {
    a.angle = -.43 + Math.sin(a.offset + a.elapsed * a.rate) * .72;
    a.green = a.angle >= aimGreenMin && a.angle <= aimGreenMax;
  }

  function beginAim(p) {
    aim = { owner: p, elapsed: 0, offset: Math.random() * Math.PI * 2, rate: .059 + Math.random() * .012 };
    pointAim(aim);
    p.vx = 0;
    p.kick = 0;
    audio?.play('charge');
  }

  function fireSpecial() {
    const { owner: p, green, angle } = aim;
    aim = null;
    const dir = p.i ? -1 : 1;
    const shotAngle = green ? angle : clamp(angle + (Math.random() - .5) * .64, -1.26, .58);
    const power = green ? 49 + Math.random() * 4 : 32 + Math.random() * 14;
    ball.comboFlight = false;
    accelerateBall(dir * Math.cos(shotAngle) * power, Math.sin(shotAngle) * power, 1);
    ball.spin = dir * (green ? .24 : (Math.random() - .5) * 1.55);
    ball.boost = 28;
    ball.boostColor = green ? '188,255,121' : '255,117,91';
    ball.clearOf = p;
    ball.clearance = 3;
    p.recharge = recharge;
    p.kick = 12;
    p.kickType = 4;
    p.cooldown = 21;
    p.struck = true;
    shake = 13;
    burst(ball.x, ball.y, green ? '#bcff79' : '#ff755b', 38, 11);
    crowdEnergy = Math.max(crowdEnergy, green ? .9 : .55);
    playCall(green ? 'BICUDO PERFEITO!' : 'BICUDO!', green ? '#bcff79' : '#ff9e91');
    audio?.play(green ? 'perfect' : 'special');
  }

  function fireCombo(p, dir, high) {
    const distance = Math.max(36, (p.i ? goalLeft - ball.x : goalRight - ball.x) * dir);
    const targetY = crossbar + (floor - crossbar) * (high ? .28 : .66);
    const angle = clamp(Math.atan2(targetY - ball.y, distance) - .235 * distance / (comboSpeed ** 2)
      + (Math.random() - .5) * .17, -.40, .26);
    ball.vx = dir * Math.cos(angle) * comboSpeed;
    ball.vy = Math.sin(angle) * comboSpeed;
    ball.spin = dir * (high ? -.17 : .22);
    ball.comboFlight = true;
    ball.boost = 42;
    ball.boostColor = '255,222,100';
    p.combo = 0;
    shake = 15;
    crowdEnergy = 1;
    burst(ball.x, ball.y, '#ffde64', 46, 13);
    playCall('SUPERCHUTE!', '#ffde64');
    audio?.play('combo-fire');
  }

  function bumpCircle(x, y, r, vx, vy, bounce, playerHit = false) {
    const dx = ball.x - x, dy = ball.y - y, distance = Math.hypot(dx, dy);
    if (distance >= r + radius) return false;
    const nx = distance > .001 ? dx / distance : 0, ny = distance > .001 ? dy / distance : -1;
    const overlap = r + radius - distance;
    ball.x += nx * overlap;
    ball.y += ny * overlap;
    const speed = (ball.vx - vx) * nx + (ball.vy - vy) * ny;
    if (speed >= 0) return false;
    const outX = ball.vx - (1 + bounce) * speed * nx;
    const outY = ball.vy - (1 + bounce) * speed * ny;
    if (playerHit && Math.hypot(outX, outY) > .001) {
      ball.comboFlight = false;
      accelerateBall(outX, outY);
    }
    else { ball.vx = outX; ball.vy = outY; }
    ball.spin += (nx * (ball.vy - vy) - ny * (ball.vx - vx)) * .016;
    return true;
  }

  function playerBall(p) {
    const dir = p.i ? -1 : 1, foot = p.y - (p.crouch ? 11 : 25) * playerScale;
    const ahead = (ball.x - p.x) * dir;
    const reverse = p.kickType === 3;
    const reachable = reverse
      ? p.y < floor && Math.abs(ahead) < 65 * playerScale && ball.y > headY(p) - 35 * playerScale && ball.y < p.y + 30 * playerScale
      : ahead > -12 * playerScale && ahead < 76 * playerScale && Math.abs(ball.y - foot) < 47 * playerScale;
    if (p.kick > 0 && !p.struck && reachable) {
      const high = p.kickType === 2;
      const kickDir = reverse ? -dir : dir;
      p.struck = true;
      // O mesmo movimento só conta uma vez, mesmo com vários passos de colisão.
      ball.clearOf = p;
      ball.clearance = reverse ? 13 : 5;
      if (!reverse && p.combo === comboHits) {
        fireCombo(p, dir, high);
        return;
      }
      ball.comboFlight = false;
      const run = Math.max(0, p.vx * kickDir);
      const contact = toeContact(p, dir, kickDir);
      const power = (reverse ? 14 : high ? 10.5 : 14.5) + run * (1.15 + contact * 3.1) + contact * 3.5;
      const runningToeKick = run >= 5.5 && contact >= .55;
      accelerateBall(kickDir * power,
        (reverse ? -4.8 : high ? -10.4 : -2.35) + p.vy * .2);
      ball.spin = kickDir * (reverse ? -.25 : high ? -.28 : .3);
      shake = runningToeKick ? 8 : high ? 3 : 5;
      burst(ball.x, ball.y, p.color, runningToeKick ? 28 : reverse ? 23 : 14, runningToeKick ? 8 : 5);
      if (runningToeKick) {
        ball.boost = 22;
        ball.boostColor = p.i ? '255,160,88' : '105,201,255';
        playCall('BICO DE CORRIDA!', p.color);
      } else if (reverse) playCall('RECUO AÉREO!', p.color);
      else if (Math.hypot(ball.vx, ball.vy) >= 32) playCall('QUE BOMBA!', p.color);
      audio?.play(reverse ? 'reverse' : high ? 'high' : 'ground');
      if (!reverse && ++p.combo === comboHits) {
        playCall('COMBO PRONTO!', p.color);
        audio?.play('ready');
      }
      return;
    }
    if (ball.clearOf === p && ball.clearance > 0) return;
    if (bumpCircle(p.x, headY(p), 28 * playerScale, p.vx, p.vy, 1.04, true)) {
      burst(ball.x, ball.y, p.color, 5, 3);
      audio?.play('header');
    }
    bumpCircle(p.x, p.y - 19 * playerScale, 16 * playerScale, p.vx, p.vy, .67, true);
  }

  function stepBall(dt) {
    ball.clearance = Math.max(0, ball.clearance - dt);
    ball.vx += ball.spin * .035 * dt;
    ball.vy += (.47 + ball.spin * ball.vx * .009) * dt;
    const speed = Math.hypot(ball.vx, ball.vy);
    const limit = ball.comboFlight ? comboSpeed : maxBallSpeed;
    if (speed > limit) {
      ball.vx *= limit / speed;
      ball.vy *= limit / speed;
    }
    ball.x += ball.vx * dt;
    ball.y += ball.vy * dt;
    ball.angle += ball.spin * dt;
    ball.spin *= Math.pow(.993, dt);
    ball.vx *= Math.pow(.999, dt);
    for (const p of players) playerBall(p);
    for (const x of [goalLeft, goalRight]) {
      if (bumpCircle(x, crossbar, 6, 0, 0, .96) && netCooldown <= 0) {
        netCooldown = 24;
        crowdEnergy = Math.max(crowdEnergy, .7);
        burst(x, crossbar, '#f7e8aa', 19, 5);
        playCall('NA TRAVE!', '#f7e8aa');
        audio?.play('post');
      }
    }
    if (ball.y < radius + 10) {
      if (ball.vy < -6) audio?.play('wall', clamp(-ball.vy / 24, .35, 1));
      ball.y = radius + 10;
      ball.vy = Math.abs(ball.vy) * .95;
    }
    if (ball.y > floor - radius) {
      ball.y = floor - radius;
      if (ball.vy > 4) audio?.play('bounce', clamp(ball.vy / 22, .2, 1));
      ball.vy = ball.vy > 1.25 ? -ball.vy * .82 : 0;
      ball.vx *= Math.pow(.983, dt);
      ball.spin += (clamp(ball.vx / radius, -1.2, 1.2) - ball.spin) * .08 * dt;
    }
    if (ball.y - radius <= crossbar) {
      if (ball.x < goalLeft + radius) { ball.x = goalLeft + radius; ball.vx = Math.abs(ball.vx) * .94; }
      if (ball.x > goalRight - radius) { ball.x = goalRight - radius; ball.vx = -Math.abs(ball.vx) * .94; }
    } else if (ball.x + radius < goalLeft) goal(1);
    else if (ball.x - radius > goalRight) goal(0);

    trailTick += dt;
    if (trailTick >= 1) {
      trailTick = 0;
      if (Math.hypot(ball.vx, ball.vy) > 11) trail.unshift([ball.x, ball.y]);
      else trail.pop();
      trail.length = Math.min(trail.length, 7);
    }
  }

  function update(dt) {
    if (phase === 'paused' || phase === 'menu' || phase === 'end' || phase === 'tournament') return;
    sceneTime += dt;
    crowdEnergy = Math.max(0, crowdEnergy - dt * .011);
    netCooldown = Math.max(0, netCooldown - dt);
    if (callTime > 0 && (callTime -= dt) <= 0) clearCall();
    shake *= Math.pow(.83, dt);
    for (const s of sparks) {
      s.x += s.vx * dt;
      s.y += s.vy * dt;
      s.vy += (s.paper ? .31 : .22) * dt;
      if (s.paper) s.angle += s.spin * dt;
      s.life -= dt;
    }
    sparks = sparks.filter(s => s.life > 0);
    if (phase === 'goal' || phase === 'kickoff' || phase === 'highlight-goal') {
      pressed.clear();
      freeze -= dt / 60;
      if (freeze > 0) return;
      const wasHighlight = phase === 'highlight-goal';
      if (phase === 'goal' || wasHighlight) { resetPositions(true); clearCelebration(); }
      else audio?.play('start');
      phase = wasHighlight ? 'highlight' : 'playing';
      announcement.textContent = '';
      announcement.style.color = '';
    }
    const isHighlight = phase === 'highlight';
    const actions = isHighlight ? [ai(players[0]), ai(players[1])] : [human(0), cpu ? ai(players[1]) : human(1)];
    players.forEach(p => {
      p.slapTime = Math.max(0, p.slapTime - dt);
      p.slapCooldown = Math.max(0, p.slapCooldown - dt);
      if (p.recharge > 0 && p.recharge <= dt && (p.i === 0 || !cpu)) audio?.play('ready');
      p.recharge = Math.max(0, p.recharge - dt);
    });
    const aimingAtStart = aim;
    if (aim) {
      if (actions[aim.owner.i][4]) fireSpecial();
      else {
        const wasGreen = aim.green;
        aim.elapsed += dt;
        pointAim(aim);
        if (!wasGreen && aim.green) audio?.play('green');
        if (aim.elapsed >= aimLimit) fireSpecial();
      }
    } else {
      const owner = players.find(p => actions[p.i][4] && canAim(p));
      if (owner) beginAim(owner);
    }
    const caster = (aim || aimingAtStart)?.owner;
    for (const p of players) if (p !== caster) stepPlayer(p, actions[p.i], dt);
    pressed.clear();
    const [left, right] = players;
    if (Math.abs(left.y - right.y) < 62 * playerScale && Math.abs(left.x - right.x) < 46 * playerScale) {
      const gap = 46 * playerScale - Math.abs(left.x - right.x);
      const sign = Math.sign(right.x - left.x) || 1;
      if (left !== caster) left.x = clamp(left.x - gap * sign * (caster ? 1 : .5), goalLeft + 21, goalRight - 21);
      if (right !== caster) right.x = clamp(right.x + gap * sign * (caster ? 1 : .5), goalLeft + 21, goalRight - 21);
    }
    if (!aim) {
      ball.boost = Math.max(0, ball.boost - dt);
      const ballStep = dt * ballTimeScale / 2;
      stepBall(ballStep);
      if (phase === 'playing' || phase === 'highlight') stepBall(ballStep);
    }
    if (phase === 'playing') trackKeepers(dt);
    const before = Math.ceil(clock);
    clock = Math.max(0, clock - dt / 60);
    const leftOnClock = Math.ceil(clock);
    if (phase === 'playing' && leftOnClock < before && leftOnClock > 0 && leftOnClock <= 10) {
      if (leftOnClock === 10) {
        setUrgent(true);
        period.textContent = 'RETA FINAL';
        playCall('ÚLTIMOS 10 SEGUNDOS!', '#ffae86');
        audio?.play('closing');
      } else if (leftOnClock <= 5) audio?.play('tick');
    }
    updateHUD();
    if (clock <= 1e-8) {
      clock = 0;
      updateHUD();
      if (isHighlight) endHighlight();
      else finish();
    }
  }

  const background = document.createElement('canvas');
  background.width = W;
  background.height = H;
  const bg = background.getContext('2d');

  function oval(g, x, y, rx, ry, color) {
    g.fillStyle = color;
    g.beginPath();
    g.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2);
    g.fill();
  }

  function line(g, points, color, width = 1) {
    g.strokeStyle = color;
    g.lineWidth = width;
    g.beginPath();
    points.forEach(([x, y], i) => i ? g.lineTo(x, y) : g.moveTo(x, y));
    g.stroke();
  }

  function drawBackground() {
    const sky = bg.createLinearGradient(0, 0, 0, floor);
    sky.addColorStop(0, '#182824');
    sky.addColorStop(1, '#46754e');
    bg.fillStyle = sky;
    bg.fillRect(0, 0, W, H);
    let seed = 279;
    const rand = () => ((seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0) / 4294967296);
    for (let x = 0; x < W; x += 28) {
      const h = 40 + rand() * 101;
      bg.fillStyle = '#243a33';
      bg.fillRect(x, 215 - h, 25 + rand() * 13, h);
      for (let y = 222 - h; y < 202; y += 13) for (let k = 5; k < 23; k += 8) {
        if (rand() < .33) { bg.fillStyle = '#66877b66'; bg.fillRect(x + k, y, 3, 4); }
      }
    }
    for (const x of [108, 892]) {
      const glow = bg.createRadialGradient(x, 88, 4, x, 88, 105);
      glow.addColorStop(0, '#e8ffd763');
      glow.addColorStop(1, '#e8ffd700');
      oval(bg, x, 88, 105, 105, glow);
      line(bg, [[x, 217], [x, 92]], '#57746a', 5);
      bg.fillStyle = '#152522'; bg.fillRect(x - 31, 72, 62, 25);
      for (let j = -24; j < 29; j += 12) for (const y of [78, 88]) oval(bg, x + j, y, 3, 2.5, '#e5ffe9');
    }
    bg.fillStyle = '#142722'; bg.fillRect(0, 195, W, 79);
    const seats = ['#34574a', '#496c52', '#293f38', '#678464', '#8c835a'];
    for (let y = 202; y < 257; y += 9) for (let x = 0; x < W; x += 8) {
      if (rand() < .78) oval(bg, x + rand() * 4, y + rand() * 4, 2 + rand() * 2, 2.3, seats[Math.floor(rand() * seats.length)]);
    }
    bg.fillStyle = '#20372b'; bg.fillRect(0, 258, W, 27);
    line(bg, [[0, 260], [W, 260]], '#72947b75', 2);
    bg.font = 'bold 11px monospace'; bg.textAlign = 'center'; bg.fillStyle = '#8eb39b';
    for (const x of [180, 500, 820]) bg.fillText('✦  QUINTAL ARCADE  ✦', x, 276);
    bg.fillStyle = '#397149'; bg.fillRect(0, 284, W, H - 284);
    for (let i = 0; i < 12; i++) {
      const top = (i - 6) * 81 + W / 2, bottom = (i - 6) * 104 + W / 2;
      bg.fillStyle = i % 2 ? '#407c4d' : '#367047';
      bg.beginPath(); bg.moveTo(top, 284); bg.lineTo(top + 81, 284); bg.lineTo(bottom + 104, H); bg.lineTo(bottom, H); bg.fill();
    }
    for (let i = 0; i < 650; i++) {
      bg.fillStyle = rand() > .5 ? '#d0f0aa25' : '#15392639';
      bg.fillRect(rand() * W, 285 + rand() * (H - 285), 1 + rand() * 4, 1);
    }
    const paint = '#e4f2d7bb';
    line(bg, [[19, floor], [981, floor]], paint, 2);
    line(bg, [[W / 2, 285], [W / 2, H]], paint, 2);
    bg.strokeStyle = paint; bg.lineWidth = 2;
    bg.beginPath(); bg.ellipse(W / 2, floor, 80, 28, 0, 0, Math.PI * 2); bg.stroke();
    for (const dir of [1, -1]) {
      bg.save(); bg.translate(dir === 1 ? 0 : W, 0); bg.scale(dir, 1);
      line(bg, [[0, 320], [142, 320], [178, 388], [0, 388]], paint, 2);
      bg.fillStyle = '#152d2870'; bg.fillRect(18, crossbar + 5, goalLeft - 18, floor - crossbar - 5);
      for (let y = crossbar + 11; y < floor; y += 10) line(bg, [[18, y], [goalLeft, y]], '#cae9db59');
      for (let x = 20; x < goalLeft; x += 9) line(bg, [[x, crossbar], [x, floor]], '#cae9db59');
      bg.lineJoin = 'round';
      line(bg, [[17, floor], [17, crossbar], [goalLeft, crossbar]], '#142e26', 10);
      line(bg, [[17, floor], [17, crossbar], [goalLeft, crossbar]], '#e6f5e1', 5);
      bg.restore();
    }
  }

  function drawPlayer(p) {
    const character = lineup[p.i], portrait = portraits[character];
    const inverted = p.i === 1 && mirrorMatch();
    const dir = p.i ? -1 : 1, hy = (headY(p) - p.y) / playerScale;
    const skin = p.i ? '#cb855e' : '#efad7e';
    const outline = '#19262b';
    oval(ctx, p.x, floor + 4, (39 - Math.min((floor - p.y) / 8, 14)) * playerScale, 8 * playerScale, '#14302885');
    if (inverted) oval(ctx, p.x, floor + 4, 21, 3, '#ffa058b0');
    ctx.save();
    ctx.translate(p.x, p.y); ctx.scale(dir * playerScale, playerScale);
    ctx.lineJoin = ctx.lineCap = 'round';
    const stride = p.y < floor ? 7 : Math.sin(p.gait) * Math.min(Math.abs(p.vx) * 1.6, 10);
    const { stretch, shoeY } = p.kick ? kickPose(p) : { stretch: stride, shoeY: -4 };
    line(ctx, [[-7, -22], [-10 - stride, -5]], outline, 12);
    oval(ctx, -9 - stride, -5, 13, 5, '#dfebe7');
    const shirtY = p.crouch ? -19 : -29;
    const shirtWidth = cards[character].dataset.build === 'slim' ? 16 : 20;
    oval(ctx, 0, shirtY, shirtWidth, p.crouch ? 11 : 16, outline);
    oval(ctx, 0, shirtY, shirtWidth - 4, p.crouch ? 8 : 12, character === 0 ? (p.i ? '#b66b37' : '#32678a') : p.color);
    if (character === 0) {
      line(ctx, [[-9, shirtY - 5], [0, shirtY + 2], [9, shirtY - 5]], p.color, 2.3);
      line(ctx, [[0, shirtY + 2], [0, shirtY + 7]], outline, 2);
    }
    line(ctx, [[6, -21], [11 + stretch, shoeY]], outline, 12);
    oval(ctx, 14 + stretch, shoeY, 14, 6, '#f5f3df');
    line(ctx, [[10 + stretch, shoeY + 4], [24 + stretch, shoeY + 4]], outline, 3);
    if (p.slapTime) {
      const side = p.slapDir * dir;
      const hand = side * (21 + 19 * Math.sin(p.slapTime / 7 * Math.PI));
      line(ctx, [[side * 11, shirtY], [hand, -52]], outline, 10);
      line(ctx, [[side * 13, shirtY - 1], [hand, -52]], skin, 6);
      oval(ctx, hand, -53, 7, 5, skin);
    }
    ctx.save(); ctx.translate(0, hy);
    if (inverted) ctx.filter = 'invert(1)';
    if (portrait.naturalWidth) {
      ctx.drawImage(portrait, -42, -45, 84, 84);
      ctx.restore(); ctx.restore();
      return;
    }
    oval(ctx, 0, 0, 31, 30, outline);
    oval(ctx, 1, 1, 27, 26, skin);
    oval(ctx, 25, 3, 7, 5, skin);
    oval(ctx, -25, 5, 7, 9, skin);
    if (p.i) {
      oval(ctx, -3, -16, 27, 11, '#502c28');
      for (let x = -23; x <= 19; x += 10) oval(ctx, x, -24 + Math.abs(x) * .17, 8, 9, '#67352b');
    } else {
      oval(ctx, -5, -17, 24, 12, '#293539');
      oval(ctx, 12, -22, 17, 7, '#344548');
      line(ctx, [[-20, -23], [-8, -27], [8, -27]], '#52706f', 2);
    }
    oval(ctx, 11, -2, 11, 9, '#fff9df');
    oval(ctx, 16, -2, 4, 6, outline);
    line(ctx, [[5, -13], [19, -10]], outline, 3);
    oval(ctx, 12, 15, 10, 5, outline);
    line(ctx, [[7, 13], [17, 13]], '#fff1cf', 2);
    ctx.restore();
    ctx.restore();
  }

  function drawBall() {
    oval(ctx, ball.x, floor + 3, 18, 5, '#172b2455');
    trail.forEach(([x, y], i) => {
      const rgb = ball.boost ? ball.boostColor : '249,252,187';
      const opacity = (ball.boost ? .55 : .25) * (1 - i / 7);
      oval(ctx, x, y, 12 - i, 12 - i, `rgba(${rgb},${opacity})`);
    });
    ctx.save(); ctx.translate(ball.x, ball.y); ctx.rotate(ball.angle);
    if (ball.comboFlight && ball.boost) oval(ctx, 0, 0, 20, 20, '#ffde64a8');
    oval(ctx, 0, 0, 16, 16, '#111b1d');
    oval(ctx, 0, 0, 12.6, 12.6, '#fffdf1');
    ctx.fillStyle = '#243135';
    ctx.beginPath();
    for (let i = 0; i < 5; i++) {
      const a = i * Math.PI * .4 - Math.PI / 2;
      const x = Math.cos(a) * 5, y = Math.sin(a) * 5;
      if (!i) ctx.moveTo(x, y); else ctx.lineTo(x, y);
      ovalDot(a);
    }
    ctx.closePath(); ctx.fill();
    function ovalDot(a) {
      // The rim panels are drawn separately to preserve the central pentagon path.
      const x = Math.cos(a) * 10.7, y = Math.sin(a) * 10.7;
      ctx.fillRect(x - 1.7, y - 1.7, 3.4, 3.4);
    }
    ctx.restore();
  }

  function drawAim() {
    const dir = aim.owner.i ? -1 : 1;
    const color = aim.green ? '#bcff79' : '#ff8274';
    ctx.save();
    ctx.translate(ball.x, ball.y);
    ctx.scale(dir, 1);
    ctx.lineCap = ctx.lineJoin = 'round';
    ctx.lineWidth = 5;
    ctx.strokeStyle = '#ff82746e';
    ctx.beginPath(); ctx.arc(0, 0, 79, -1.15, .29); ctx.stroke();
    ctx.strokeStyle = '#bcff79';
    ctx.beginPath(); ctx.arc(0, 0, 79, aimGreenMin, aimGreenMax); ctx.stroke();
    ctx.rotate(aim.angle);
    for (const [ink, weight] of [['#182724', 9], [color, 5]]) {
      line(ctx, [[19, 0], [68, 0]], ink, weight);
      line(ctx, [[58, -9], [69, 0], [58, 9]], ink, weight);
    }
    ctx.restore();
    ctx.save();
    const x = clamp(ball.x + dir * 38, 64, W - 64), y = Math.max(42, ball.y - 91);
    ctx.fillStyle = '#14231eeb';
    ctx.fillRect(x - 57, y - 15, 114, 25);
    ctx.font = 'bold 12px monospace'; ctx.textAlign = 'center';
    ctx.fillStyle = color;
    ctx.fillText(aim.green ? 'AGORA!' : '✦ BICUDO', x, y + 1);
    ctx.fillRect(x - 53, y + 6, 106 * (1 - aim.elapsed / aimLimit), 2);
    ctx.restore();
  }

  function render() {
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.globalAlpha = 1;
    ctx.filter = 'none';
    ctx.clearRect(0, 0, W, H);
    ctx.drawImage(background, 0, 0);
    if (sceneTime && !reducedMotion?.matches) {
      ctx.save();
      for (let i = 0; i < 42; i++) {
        const x = 12 + i * 24, y = 209 + (i * 13 % 41);
        const wave = Math.max(0, Math.sin(sceneTime * .16 - i * .52));
        const lean = wave * (.75 + 5 * crowdEnergy);
        const inks = ['#537d73', '#8cbeac', '#a17d51'];
        ctx.globalAlpha = .5 + .4 * crowdEnergy;
        oval(ctx, x, y - lean, 2.4, 2.7, inks[i % 3]);
        if (crowdEnergy > .25) line(ctx, [[x - 5, y - lean - 2], [x, y - lean + 4], [x + 5, y - lean - 2]], inks[i % 3]);
      }
      ctx.restore();
    }
    ctx.save();
    if (shake > .4 && !reducedMotion?.matches) ctx.translate(Math.sin(sceneTime * 2.4) * shake * .45, Math.cos(sceneTime * 2.1) * shake * .42);
    players.forEach(drawPlayer);
    drawBall();
    if (aim) drawAim();
    for (const s of sparks) {
      ctx.globalAlpha = Math.min(1, s.life / 12);
      ctx.fillStyle = s.color;
      if (s.paper) {
        ctx.save(); ctx.translate(s.x, s.y); ctx.rotate(s.angle);
        ctx.fillRect(-3, -2, 6, 4);
        ctx.restore();
      } else ctx.fillRect(s.x, s.y, 4, 3);
    }
    ctx.restore();
  }

  function mirrorMatch() { return lineup[0] === lineup[1]; }

  function playerName(side) {
    const name = names[lineup[side]];
    return mirrorMatch() ? `${name} (${side ? 'LARANJA' : 'AZUL'})` : name;
  }

  function updateOrangeLabel() {
    $('orange-label').textContent = `${names[lineup[1]]}${mirrorMatch() ? ' · INV' : ''}${cpu ? ' · CPU' : ''}`;
  }

  function applyLineup() {
    lineup = [...selection];
    const [blue, orange] = lineup.map(index => names[index]);
    $('blue-name').textContent = cards[lineup[0]].dataset.scoreName || blue;
    $('blue-label').textContent = blue;
    $('orange-name').textContent = cards[lineup[1]].dataset.scoreName || orange;
    updateOrangeLabel();
    canvas.setAttribute('aria-label', `${blue} de azul à esquerda e ${orange} de laranja à direita${mirrorMatch() ? ', com retrato invertido' : ''}`);
  }

  function updatePicker() {
    cards.forEach((card, index) => {
      const blue = selection[0] === index, orange = selection[1] === index;
      card.classList.toggle('blue', blue);
      card.classList.toggle('orange', orange);
      card.classList.toggle('reserve', !blue && !orange);
      card.classList.toggle('mirror-pick', blue && orange);
      roles[index].textContent = blue && orange ? `J1 + ${cpu ? 'CPU' : 'J2'}` : blue ? 'J1 · AZUL' : orange ? (cpu ? 'CPU · LARANJA' : 'J2 · LARANJA') : 'RESERVA';
    });
    rosterSlots.forEach((slot, index) => {
      slot.classList.toggle('cursor-p1', index === cursors[0]);
      slot.classList.toggle('cursor-p2', index === cursors[1]);
    });
    syncRosterWindow();
  }

  function columnOf(slot) { return Math.floor(slot / rosterRows); }

  function revealCursor(side) {
    const column = columnOf(cursors[side]);
    if (column < firstColumn) firstColumn = column;
    else if (column >= firstColumn + visibleColumns) firstColumn = column - visibleColumns + 1;
  }

  function syncRosterWindow() {
    const end = firstColumn + visibleColumns;
    const range = `COLUNAS ${firstColumn + 1}–${end} / ${rosterColumns}`;
    if (rosterRange.textContent !== range) rosterRange.textContent = range;
    cursorLabels.forEach((label, side) => {
      const column = columnOf(cursors[side]);
      label.textContent = column < firstColumn ? `← P${side + 1}` : column >= end ? `P${side + 1} →` : `P${side + 1}`;
      label.title = names[cursors[side]] || 'Espaço vazio';
    });
    cards.forEach((card, index) => {
      const col = columnOf(index);
      card.inert = col < firstColumn || col >= end;
    });
    if (picker.clientWidth) picker.scrollLeft = rosterSlots[firstColumn * rosterRows].offsetLeft;
  }

  function stopPreview() { window.speechSynthesis?.cancel(); }

  function showCharacterQuote(index) {
    rosterPreview.textContent = `${names[index]}: “${quotes[index].textContent}”`;
  }

  function speakCharacter(index) {
    showCharacterQuote(index);
    if (!sound || !window.speechSynthesis || !window.SpeechSynthesisUtterance) return;
    stopPreview();
    const speech = new window.SpeechSynthesisUtterance(quotes[index].textContent);
    speech.lang = 'pt-BR';
    speech.pitch = [1.1, .86, 1, .93][index] ?? 1;
    window.speechSynthesis.speak(speech);
  }

  function moveCursor(side, action) {
    const current = cursors[side];
    const row = current % rosterRows, column = columnOf(current);
    const nextRow = clamp(row + (action === 2 ? -1 : action === 3 ? 1 : 0), 0, rosterRows - 1);
    const nextColumn = clamp(column + (action === 0 ? -1 : action === 1 ? 1 : 0), 0, rosterColumns - 1);
    const next = nextColumn * rosterRows + nextRow;
    cursors[side] = next;
    if (next < cards.length && next !== selection[side]) {
      selection[side] = next;
      if (phase === 'menu') applyLineup();
      showCharacterQuote(next);
    }
    revealCursor(side);
    updatePicker();
  }

  function showModeNotice() {
    const notice = $('mode-notice');
    notice.textContent = 'Esse modo não tem suporte mobile.';
    notice.hidden = false;
    clearTimeout(modeNoticeTimer);
    modeNoticeTimer = setTimeout(() => { notice.hidden = true; }, 3200);
  }

  function syncTouchVisibility() {
    const playing = ['kickoff', 'playing', 'goal'].includes(phase);
    $('touch').hidden = !touchDevice || mode === 'local' || !playing;
  }

  function resetTouchStick() {
    touchStick.x = touchStick.y = 0;
    touchStick.jump = false;
    touchStick.pointer = null;
    if (touchKnob) touchKnob.style.transform = 'translate(-50%, -50%)';
  }

  function setCPU(value) { setMode(value ? 'cpu' : 'local'); }

  function setMode(next) {
    if (tournament.active) return;
    if (touchDevice && next === 'local') {
      showModeNotice();
      return;
    }
    mode = next;
    cpu = next !== 'local';
    if (phase === 'menu' && !picker.hidden) {
      play.firstChild.textContent = next === 'tournament' ? 'COMEÇAR MATA-MATA ' : 'JOGAR AGORA ';
      $('menu-description').textContent = next === 'tournament'
        ? 'Escolha seu craque (P1): 16 na chave, oitavas até a final.'
        : 'Mova o cursor pelo teclado para escolher seu craque.';
    }
    syncModeButtons();
    updateOrangeLabel();
    $('orange-controls').classList.toggle('cpu', cpu);
    updatePicker();
    syncTouchVisibility();
  }

  let changingFullscreen = false;
  function syncFullscreen() {
    const active = document.fullscreenElement === stage || stage.classList.contains('is-expanded');
    fullscreen.setAttribute('aria-pressed', String(active));
    $('fullscreen-label').textContent = active ? 'SAIR DA TELA CHEIA' : 'TELA CHEIA';
    fullscreen.title = active ? 'Sair da tela cheia (F)' : 'Tela cheia (F)';
  }

  function expandArena(value) {
    stage.classList.toggle('is-expanded', value);
    document.body.classList.toggle('expanded-arena', value);
    syncFullscreen();
  }

  async function toggleFullscreen() {
    if (changingFullscreen) return;
    changingFullscreen = true;
    try {
      if (document.fullscreenElement === stage) await document.exitFullscreen();
      else if (stage.classList.contains('is-expanded')) expandArena(false);
      else if (stage.requestFullscreen && document.fullscreenEnabled) {
        try { await stage.requestFullscreen(); }
        catch { expandArena(true); }
      } else expandArena(true);
    } finally {
      changingFullscreen = false;
    }
  }

  play.addEventListener('click', () => {
    if (phase === 'paused') togglePause();
    else if (mode === 'tournament' && !tournament.active) startTournament();
    else start();
  });
  resultReplay.addEventListener('click', () => {
    if (!tournament.active) { start(); return; }
    const lastRound = tournament.finished ? tournament.rounds.length - 1 : Math.max(0, tournament.round - 1);
    const clip = pickHighlightMatch(lastRound);
    if (clip) startHighlight(clip, lastRound, 'bracket');
    else showTournamentScreen();
  });
  resultRoster.addEventListener('click', () => tournament.active ? exitTournament() : openRematchRoster());
  highlightSkip.addEventListener('click', endHighlight);
  bracketNext.addEventListener('click', advanceTournament);
  bracketExit.addEventListener('click', exitTournament);
  pause.addEventListener('click', () => togglePause());
  fullscreen.addEventListener('click', toggleFullscreen);
  document.addEventListener('fullscreenchange', syncFullscreen);
  if (window.ResizeObserver) new ResizeObserver(syncRosterWindow).observe(picker);
  else window.addEventListener('resize', syncRosterWindow);
  $('local').addEventListener('click', () => setCPU(false));
  $('solo').addEventListener('click', () => setCPU(true));
  $('tournament').addEventListener('click', () => setMode('tournament'));
  $('sound').addEventListener('click', () => {
    sound = !sound;
    $('sound').setAttribute('aria-pressed', String(sound));
    $('sound').lastElementChild.textContent = sound ? 'SOM LIGADO' : 'SOM DESLIGADO';
    audio?.setEnabled(sound);
    if (!sound) stopPreview();
  });
  window.addEventListener('keydown', e => {
    const key = aliases[e.code] || e.code;
    if (e.altKey || e.ctrlKey || e.metaKey) return;
    if (key === 'KeyF') {
      e.preventDefault();
      if (!e.repeat) void toggleFullscreen();
      return;
    }
    if (key === 'Escape' && stage.classList.contains('is-expanded')) { expandArena(false); return; }
    if (phase === 'end' && !resultScreen.hidden && key !== 'KeyQ') {
      if (key === 'KeyR' || ((key === 'Enter' || key === 'NumpadEnter') && !e.target?.closest?.('button'))) {
        e.preventDefault();
        if (!e.repeat) key === 'KeyR' ? resultRoster.click() : resultReplay.click();
      }
      return;
    }
    if ((phase === 'highlight' || phase === 'highlight-goal') && key !== 'KeyQ') {
      if (key === 'Enter' || key === 'NumpadEnter' || key === 'Space' || key === 'Escape') {
        e.preventDefault();
        if (!e.repeat) endHighlight();
      }
      return;
    }
    if (phase === 'tournament' && !bracketScreen.hidden && key !== 'KeyQ') {
      if (key === 'KeyR' || ((key === 'Enter' || key === 'NumpadEnter') && !e.target?.closest?.('button'))) {
        e.preventDefault();
        if (!e.repeat) key === 'KeyR' ? bracketExit.click() : bracketNext.click();
      }
      return;
    }
    const selecting = phase === 'menu' || phase === 'end';
    if (key === 'KeyQ' || (selecting && key === 'KeyT')) {
      e.preventDefault();
      if (!e.repeat) key === 'KeyQ' ? $('sound').click()
        : setMode(mode === 'local' ? 'cpu' : mode === 'cpu' ? 'tournament' : touchDevice ? 'cpu' : 'local');
      return;
    }
    if ((key === 'Enter' || key === 'NumpadEnter') && (selecting || phase === 'paused') && !e.target?.closest?.('button')) {
      e.preventDefault();
      if (!e.repeat) play.click();
      return;
    }
    if (selecting) {
      const binding = selectionKeys.get(key);
      if (!binding) return;
      e.preventDefault();
      if (document.activeElement?.matches('button')) picker.focus({ preventScroll: true });
      const [side, action] = binding;
      if (action < 4) moveCursor(side, action);
      else if (!e.repeat) speakCharacter(selection[side]);
      return;
    }
    if (!controls.has(key)) return;
    e.preventDefault();
    if (key === 'KeyP') { if (!e.repeat) togglePause(); return; }
    if (phase === 'paused') return;
    if (slapKeys.has(key)) {
      const side = slapKeys.get(key);
      if (phase === 'playing' && !(side === 1 && cpu) && !held.has(key) && !e.repeat) slap(players[side]);
      held.add(key);
      return;
    }
    if (!held.has(key) && !e.repeat) pressed.add(key);
    held.add(key);
  });
  window.addEventListener('keyup', e => held.delete(aliases[e.code] || e.code));
  window.addEventListener('blur', () => {
    clearInput();
    if (!changingFullscreen && ['playing', 'kickoff', 'goal'].includes(phase)) togglePause();
  });

  function buildTouchControls() {
    const touch = $('touch');
    const stick = document.createElement('div');
    stick.className = 'touch-stick';
    const base = document.createElement('div');
    base.className = 'touch-stick-base';
    base.setAttribute('role', 'slider');
    base.setAttribute('aria-label', 'Analógico: mover, pular para cima e abaixar para baixo');
    base.setAttribute('aria-valuemin', '-1');
    base.setAttribute('aria-valuemax', '1');
    base.setAttribute('aria-valuenow', '0');
    const knob = document.createElement('div');
    knob.className = 'touch-stick-knob';
    base.append(knob);
    touchKnob = knob;
    const stickLabel = document.createElement('span');
    stickLabel.textContent = 'MOVER / PULAR';
    stick.append(base, stickLabel);

    const actions = document.createElement('div');
    actions.className = 'touch-actions';
    const bindings = [
      ['ground', 'CHUTE', 'KeyC', 'Chute rasteiro'],
      ['high', 'ALTO', 'KeyV', 'Chute alto'],
      ['reverse', 'RECUO', 'KeyB', 'Recuo no ar'],
      ['special', 'BICUDO', 'KeyN', 'Bicudo'],
      ['slap', 'TAPA', null, 'Tapa'],
    ];
    for (const [action, label, key, description] of bindings) {
      const button = document.createElement('button');
      button.type = 'button';
      button.dataset.action = action;
      button.textContent = label;
      button.setAttribute('aria-label', description);
      button.addEventListener('pointerdown', e => {
        if (phase !== 'playing') return;
        e.preventDefault();
        try { button.setPointerCapture(e.pointerId); } catch {}
        if (action === 'slap') {
          slap(players[0]);
          return;
        }
        pointers.set(e.pointerId, key);
        pressed.add(key);
      });
      for (const type of ['pointerup', 'pointercancel', 'lostpointercapture']) {
        button.addEventListener(type, e => pointers.delete(e.pointerId));
      }
      actions.append(button);
    }

    touch.replaceChildren(stick, actions);
    touch.addEventListener('contextmenu', e => e.preventDefault());

    const moveStick = e => {
      const rect = base.getBoundingClientRect();
      const radius = rect.width * .34;
      let dx = e.clientX - (rect.left + rect.width / 2);
      let dy = e.clientY - (rect.top + rect.height / 2);
      const distance = Math.hypot(dx, dy);
      if (distance > radius) {
        dx *= radius / distance;
        dy *= radius / distance;
      }
      touchStick.x = clamp(dx / radius, -1, 1);
      touchStick.y = clamp(dy / radius, -1, 1);
      base.setAttribute('aria-valuenow', touchStick.x.toFixed(2));
      knob.style.transform = `translate(calc(-50% + ${dx}px), calc(-50% + ${dy}px))`;
    };
    base.addEventListener('pointerdown', e => {
      if (phase !== 'playing') return;
      e.preventDefault();
      touchStick.pointer = e.pointerId;
      try { base.setPointerCapture(e.pointerId); } catch {}
      moveStick(e);
    });
    base.addEventListener('pointermove', e => {
      if (e.pointerId !== touchStick.pointer) return;
      e.preventDefault();
      moveStick(e);
    });
    for (const type of ['pointerup', 'pointercancel', 'lostpointercapture']) {
      base.addEventListener(type, e => {
        if (e.pointerId !== touchStick.pointer) return;
        resetTouchStick();
        base.setAttribute('aria-valuenow', '0');
      });
    }
  }

  buildTouchControls();
  $('local').title = touchDevice ? 'Esse modo não tem suporte mobile' : '';

  drawBackground();
  resetPositions();
  applyLineup();
  updatePicker();
  if (touchDevice) setCPU(true);
  let prev = 0, accumulator = 0;
  const step = 1000 / 120;
  function frame(now) {
    if (prev) accumulator += Math.min(67, now - prev);
    prev = now;
    while (accumulator >= step) { update(.5); accumulator -= step; }
    render();
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
})();

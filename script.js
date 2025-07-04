document.addEventListener('DOMContentLoaded', () => {
    // DOM Elements
    const gameGridElement = document.querySelector('.game-grid');
    const minesSelectButton = document.getElementById('minesSelectButton');
    const minesSelectList = document.getElementById('minesSelectList');
    const customDropdown = minesSelectButton.closest('.custom-dropdown');
    const betAmountInput = document.getElementById('betAmountInput');
    const betAmountUSDDisplay = document.getElementById('betAmountUSDDisplay');
    const halfBetButton = document.getElementById('halfBetButton');
    const doubleBetButton = document.getElementById('doubleBetButton');
    const mainActionButton = document.getElementById('mainActionButton');
    const userBalanceDisplay = document.getElementById('userBalanceDisplay');
    const refreshBalanceButton = document.getElementById('refreshBalanceButton');
    const preGameControls = document.getElementById('preGameControls');
    const inGameControls = document.getElementById('inGameControls');
    const activeMinesDisplay = document.getElementById('activeMinesDisplay');
    const activeGemsDisplay = document.getElementById('activeGemsDisplay');
    const totalProfitLabel = document.getElementById('totalProfitLabel');
    const totalProfitAmount = document.getElementById('totalProfitAmount');
    const totalProfitUSD = document.getElementById('totalProfitUSD');
    const cashoutPopup = document.getElementById('cashoutPopup');
    const popupMultiplierDisplay = document.getElementById('popupMultiplierDisplay');
    const popupWinningsDisplay = document.getElementById('popupWinningsDisplay');
    const betHistoryList = document.getElementById('betHistoryList');

    // Game Constants & State
    const GRID_SIZE = 25;
    let tileElements = [];
    let mineLocations = [];
    let selectedMines = 3;
    let gameActive = false;
    let postGameState = false;
    let userBalance = 1000.00;
    let currentBet = 0.00;
    let currentMultiplier = 1.00;
    let revealedGemsCount = 0;
    let betHistory = [];
    const MAX_HISTORY_ITEMS = 20;

    // --- MULTIPLIER CHART (CRITICAL: FILL WITH YOUR ACTUAL DATA) ---
    const multiplierChart = {
        1: { 1: 1.03, 2: 1.07, 3: 1.11, 4: 1.15, 5: 1.20, 6: 1.25, 7: 1.30, 8: 1.36, 9: 1.42, 10: 1.49, 11: 1.56, 12: 1.64, 13: 1.73, 14: 1.83, 15: 1.94, 16: 2.06, 17: 2.20, 18: 2.35, 19: 2.53, 20: 2.73, 21: 3.00, 22: 3.50, 23: 4.50, 24: 24.75 },
        3: { 1: 1.07, 2: 1.23, 3: 1.41, 4: 1.64, 5: 1.91, 6: 2.27, 7: 2.79, 8: 3.28, 9: 3.81, 10: 4.52, 11: 5.26, 12: 6.14, 13: 8.50, 14: 12.04, 15: 14.17, 16: 17.52, 17: 21.09, 18: 26.77, 19: 35.03, 20: 40.87, 21: 58.38, 22: 66.41 },
        24: { 1: 24.75 }
    };

    // --- BET HISTORY FUNCTIONS ---
    function addBetToHistory(betAmountVal, minesCountVal, payoutMultiplierVal, statusVal, profitVal) {
        const entry = {
            betAmount: betAmountVal.toFixed(2), minesCount: minesCountVal,
            payout: payoutMultiplierVal.toFixed(2) + 'x', status: statusVal, profit: profitVal
        };
        betHistory.unshift(entry);
        if (betHistory.length > MAX_HISTORY_ITEMS) betHistory.pop();
        renderBetHistory();
    }
    function renderBetHistory() {
        betHistoryList.innerHTML = '';
        if (betHistory.length === 0) {
            betHistoryList.innerHTML = '<p style="text-align:center; color: var(--subtle-text-color);">No bets yet.</p>'; return;
        }
        betHistory.forEach(entry => {
            const card = document.createElement('div'); card.classList.add('history-card');
            let statusClass = '', profitDisplay = '', profitClassVal = '';
            if (entry.status === 'Lost') {
                statusClass = 'status-lost'; profitDisplay = `-$${Math.abs(entry.profit).toFixed(2)}`; profitClassVal = 'profit-negative';
            } else { // Won or Cashed Out
                statusClass = entry.status.startsWith('Cashed') ? 'status-cashedout' : 'status-won';
                profitDisplay = entry.profit >= 0 ? `+$${entry.profit.toFixed(2)}` : `-$${Math.abs(entry.profit).toFixed(2)}`; // Handle 1.0x cashout
                profitClassVal = entry.profit > 0 ? 'profit-positive' : (entry.profit < 0 ? 'profit-negative' : '');
            }
            card.classList.add(statusClass);
            card.innerHTML = `
                <div class="history-item"><span class="history-label">Bet</span><span class="value">$${entry.betAmount}</span></div>
                <div class="history-item"><span class="history-label">Mines</span><span class="value">${entry.minesCount}</span></div>
                <div class="history-item"><span class="history-label">Payout</span><span class="value">${entry.payout}</span></div>
                <div class="history-item ${profitClassVal}"><span class="history-label">Profit</span><span class="value">${profitDisplay}</span></div>`;
            betHistoryList.appendChild(card);
        });
    }

    // --- BALANCE FUNCTIONS ---
    function updateUserBalanceDisplay() { userBalanceDisplay.textContent = `$${userBalance.toFixed(2)}`; }
    function resetBalance() {
        userBalance = 1000.00; updateUserBalanceDisplay();
        if (gameActive || postGameState) { gameActive = false; postGameState = false; hideCashoutPopup(); resetUIForNewGameCycle(); }
    }
    refreshBalanceButton.addEventListener('click', resetBalance);

    // --- GRID & TILE FUNCTIONS ---
    function createTiles() {
        gameGridElement.innerHTML = ''; tileElements = [];
        for (let i = 0; i < GRID_SIZE; i++) {
            const tile = document.createElement('div'); tile.classList.add('tile'); tile.dataset.index = i;
            tile.addEventListener('click', () => handleTileClick(i));
            gameGridElement.appendChild(tile); tileElements.push(tile);
        }
        gameGridElement.appendChild(cashoutPopup); cashoutPopup.classList.add('hidden');
    }
    function placeMines() {
        mineLocations = []; const idx = Array.from(Array(GRID_SIZE).keys());
        for (let i=0; i<selectedMines; i++) { if(idx.length===0)break; const rIdx=Math.floor(Math.random()*idx.length); mineLocations.push(idx.splice(rIdx,1)[0]); }
    }
    function revealTile(idx, type) {
        if(!tileElements[idx]||tileElements[idx].classList.contains('revealed'))return;
        tileElements[idx].classList.add('revealed',type,'disabled'); tileElements[idx].innerHTML=`<span class="icon">${type==='gem'?'💎':'💣'}</span>`;
    }
    function revealAllTilesAfterGameEnd() {
        mineLocations.forEach(mIdx => { if(tileElements[mIdx]) revealTile(mIdx,'mine'); });
        for(let i=0;i<GRID_SIZE;i++){
            if(tileElements[i]&&!tileElements[i].classList.contains('revealed')){
                if(!mineLocations.includes(i)){tileElements[i].innerHTML=`<span class="icon" style="opacity:0.5;">💎</span>`;tileElements[i].classList.add('revealed','gem-unclicked','disabled');}
                else{tileElements[i].classList.add('disabled');}
            } else if(tileElements[i]){tileElements[i].classList.add('disabled');}
        }
    }

    // --- GAME LOGIC FUNCTIONS ---
    function startGame() {
        if(postGameState) hideCashoutPopup();
        gameActive=true;postGameState=false;currentMultiplier=1.00;revealedGemsCount=0;
        placeMines();createTiles();
        preGameControls.classList.add('hidden');inGameControls.classList.remove('hidden');
        mainActionButton.textContent='Cashout';mainActionButton.disabled=true;
        activeMinesDisplay.value=selectedMines;activeGemsDisplay.value=GRID_SIZE-selectedMines;updateInGameProfitDisplay();
        betAmountInput.disabled=true;halfBetButton.disabled=true;doubleBetButton.disabled=true;
        minesSelectButton.disabled=true;customDropdown.classList.remove('open');
    }
    function handleGameEnd(isWin, finalMultiplierForHistory) {
        gameActive=false;postGameState=true;revealAllTilesAfterGameEnd();
        if(!isWin) { // Loss
            const profit = -currentBet;
            addBetToHistory(currentBet, selectedMines, 0, 'Lost', profit);
            setTimeout(resetControlsForNextBetAttempt,1500);
        }
        // For wins, history is added in cashout() before calling this.
        // finalMultiplierForHistory is passed from cashout.
    }
    function handleTileClick(idx) {
        if(!gameActive||!tileElements[idx]||tileElements[idx].classList.contains('revealed'))return;
        if(mineLocations.includes(idx)){revealTile(idx,'mine');handleGameEnd(false, 0);}
        else{
            revealTile(idx,'gem');revealedGemsCount++;mainActionButton.disabled=false;
            const M=multiplierChart[selectedMines];
            if(M&&M[revealedGemsCount])currentMultiplier=M[revealedGemsCount];
            else console.warn(`No mult for ${selectedMines} mines, ${revealedGemsCount} gems.`);
            updateInGameProfitDisplay();
            if(revealedGemsCount===(GRID_SIZE-selectedMines))cashout();
        }
    }
    function cashout() {
        if(!gameActive||mainActionButton.disabled)return;
        const winnings = currentBet * currentMultiplier;
        const profit = winnings - currentBet;
        if(winnings > 0 && currentBet > 0){userBalance+=winnings;updateUserBalanceDisplay();}
        
        showCashoutPopup(currentMultiplier,winnings);
        addBetToHistory(currentBet, selectedMines, currentMultiplier, `Cashed @ ${currentMultiplier.toFixed(2)}x`, profit);
        handleGameEnd(true, currentMultiplier); // Pass currentMultiplier for consistency
        resetControlsForNextBetAttempt();
    }

    // --- UI & POPUP FUNCTIONS ---
    function updateInGameProfitDisplay(){const W=currentBet*currentMultiplier;totalProfitLabel.textContent=`Total profit (${currentMultiplier.toFixed(2)}x)`;totalProfitAmount.value=W.toFixed(2);totalProfitUSD.textContent=`$${W.toFixed(2)}`;}
    function showCashoutPopup(mult,win){popupMultiplierDisplay.textContent=`${mult.toFixed(2)}x`;popupWinningsDisplay.textContent=win.toFixed(2);cashoutPopup.classList.remove('hidden');}
    function hideCashoutPopup(){cashoutPopup.classList.add('hidden');}

    function resetControlsForNextBetAttempt() {
        inGameControls.classList.add('hidden'); preGameControls.classList.remove('hidden');
        mainActionButton.textContent = 'Bet'; mainActionButton.disabled = false;
        betAmountInput.disabled = false; halfBetButton.disabled = false; doubleBetButton.disabled = false;
        minesSelectButton.disabled = false; customDropdown.classList.remove('open');
        updateBetUSD();
    }
    function resetUIForNewGameCycle() {
        gameActive=false;postGameState=false;hideCashoutPopup();
        currentMultiplier=1.00;revealedGemsCount=0;mineLocations=[];
        inGameControls.classList.add('hidden');preGameControls.classList.remove('hidden');
        mainActionButton.textContent='Bet';mainActionButton.disabled=false;
        betAmountInput.disabled=false;updateBetUSD();
        halfBetButton.disabled=false;doubleBetButton.disabled=false;minesSelectButton.disabled=false;
        customDropdown.classList.remove('open');createTiles();
    }

    // --- BET AMOUNT & MINES DROPDOWN ---
    function updateBetUSD(){const a=parseFloat(betAmountInput.value);betAmountUSDDisplay.textContent=(!isNaN(a)&&a>=0)?`$${a.toFixed(2)}`:"$0.00";}
    betAmountInput.addEventListener('input',updateBetUSD);
    betAmountInput.addEventListener('change',()=>{let v=parseFloat(betAmountInput.value);if(isNaN(v)||v<0)v=0.00;betAmountInput.value=v.toFixed(2);updateBetUSD();});
    halfBetButton.addEventListener('click',()=>{if(betAmountInput.disabled)return;let v=Math.max(0,(parseFloat(betAmountInput.value)||0)/2);betAmountInput.value=v.toFixed(2);updateBetUSD();});
    doubleBetButton.addEventListener('click',()=>{if(betAmountInput.disabled)return;let v=(parseFloat(betAmountInput.value)||0)*2;if(v===0&&parseFloat(betAmountInput.value)===0)v=0.01;betAmountInput.value=v.toFixed(2);updateBetUSD();});
    function populateMinesDropdown(){
        minesSelectList.innerHTML='';for(let i=1;i<=24;i++){const li=document.createElement('li');li.textContent=i;li.dataset.value=i;
        li.addEventListener('click',()=>{if(gameActive)return;selectedMines=i;minesSelectButton.textContent=i;customDropdown.classList.remove('open');});
        minesSelectList.appendChild(li);}
    }
    minesSelectButton.addEventListener('click',(e)=>{e.stopPropagation();if(gameActive)return;customDropdown.classList.toggle('open');});
    document.addEventListener('click',(e)=>{if(customDropdown&&!customDropdown.contains(e.target)&&customDropdown.classList.contains('open'))customDropdown.classList.remove('open');});

    // --- MAIN ACTION BUTTON ---
    mainActionButton.addEventListener('click',()=>{
        if(mainActionButton.textContent==='Bet'){
            currentBet=parseFloat(betAmountInput.value);
            if(isNaN(currentBet)||currentBet<0){alert("Please enter a valid, non-negative bet amount.");updateBetUSD();return;}
            if(currentBet>userBalance){alert("Insufficient balance.");return;}
            if(currentBet>0){userBalance-=currentBet;updateUserBalanceDisplay();}
            startGame();
        }else if(mainActionButton.textContent==='Cashout'){cashout();}
    });

    // --- INITIALIZATION ---
    function initializeGameUI(){
        betAmountInput.value="0.00";updateUserBalanceDisplay();
        populateMinesDropdown();minesSelectButton.textContent=selectedMines;updateBetUSD();
        resetUIForNewGameCycle();
        renderBetHistory(); // Initial render of bet history
    }
    initializeGameUI();
});

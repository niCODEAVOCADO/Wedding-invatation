// =====================================================
// CONFIGURATION
// =====================================================

// Page 1: front cover | Page 2: back of cover (left page)
// Page 3: right page  | Page 4: back of page 3 (last left page)
// Page 5: last right-hand page. It is a picture; "We are hoping to see you"
// is laid over its middle by the CSS (.page-message / .end-text).
const pageImages = [
    "cards/1.png",
    "cards/2.png",
    "cards/3.png",
    "cards/4.png",
    "cards/5.png",
];

// The closing scene re-centers the last page
const FINALE_IMAGE = pageImages[pageImages.length - 1];

// Must match the real file name and folder exactly (case-sensitive on most hosts)
const AUDIO_SRC = "music/song.mp3";

const MOVE_DURATION = 700;
const TURN_DURATION = 1500;
const PHONE_TURN_DURATION = 1200;
const WELCOME_DURATION = 800;

// Finale timings (ms, counted from the moment the finale starts)
const FINALE_FADE = 900;          // background fade (match .finale transition in CSS)
const FINALE_WORDS_IN = 900;      // "YOU ARE INVITED!" fades in beside the centered card
const FINALE_WORDS_OUT = 4000;    // ...and fades away
const FINALE_TEXT_IN = 4700;      // "WE ARE HOPING TO SEE YOU" fades in on the card
const FINALE_DONE = 6200;         // Previous button comes back


// =====================================================
// ELEMENTS
// =====================================================

const welcomeScreen = document.getElementById("welcomeScreen");
const proceedButton = document.getElementById("proceedButton");

const recordScene = document.getElementById("recordScene");
const welcomeAudio = document.getElementById("welcomeAudio");
const musicToggle = document.getElementById("musicToggle");

const mail = document.getElementById("mail");
const insideCard = document.getElementById("insideCard");
const peekingImage = document.getElementById("peekingImage");

const invitationStage = document.getElementById("invitationStage");
const booklet = document.getElementById("booklet");
const coverPage = document.getElementById("coverPage");

const coverFrontImage = document.getElementById("coverFrontImage");
const coverBackImage = document.getElementById("coverBackImage");
const rightPageImage = document.getElementById("rightPageImage");

const nextButton = document.getElementById("nextButton");
const prevButton = document.getElementById("prevButton");

const finale = document.getElementById("finale");
const endImage = document.getElementById("endImage");

endImage.onerror = () => console.error("Final card image not found:", FINALE_IMAGE);
endImage.src = FINALE_IMAGE;


// =====================================================
// STATE
// =====================================================

let welcomeHasStarted = false;
let envelopeOpened = false;
let invitationOpened = false;

let bookletOpened = false;
let mobilePageIndex = 0;
let currentRightPageIndex = 2;
let turnCount = 0;
let turnedSheets = [];   // desktop sheets sitting on the left, in order

let isAnimating = false;

let finaleShown = false;
let finaleTimers = [];


// =====================================================
// RESPONSIVE CHECK
// =====================================================

function isPhone() {
    return window.matchMedia("(max-width: 767px)").matches;
}


// =====================================================
// IMAGE SETUP AND PRELOADING
// =====================================================

peekingImage.src = pageImages[0];
coverFrontImage.src = pageImages[0];
coverBackImage.src = pageImages[1];
rightPageImage.src = pageImages[2];

pageImages.forEach((src) => {
    const image = new Image();
    image.onerror = () => console.error("Card image not found:", src);
    image.src = src;
});


// =====================================================
// AUDIO SETUP
// =====================================================

welcomeAudio.src = AUDIO_SRC;

welcomeAudio.addEventListener("error", () => {
    console.error("Music failed to load:", welcomeAudio.src, welcomeAudio.error);
    musicToggle.textContent = "♫ Music unavailable";
});


// =====================================================
// LETTER-BY-LETTER WELCOME ANIMATION
// =====================================================

function animateLetters() {
    const elements = welcomeScreen.querySelectorAll(".letter-reveal");

    elements.forEach((element) => {
        const text = element.textContent;
        const fragment = document.createDocumentFragment();

        Array.from(text).forEach((character, index) => {
            const span = document.createElement("span");

            span.className = "letter";
            span.textContent = character;
            span.style.setProperty("--letter-delay", `${index * 30}ms`);

            fragment.appendChild(span);
        });

        element.replaceChildren(fragment);
    });
}

animateLetters();


// =====================================================
// NEXT / PREVIOUS BUTTON HELPERS
// =====================================================

function showNextButton() {
    nextButton.hidden = false;
    requestAnimationFrame(() => {
        nextButton.classList.add("show");
    });
}

function hideNextButton() {
    nextButton.classList.remove("show");
    nextButton.hidden = true;
}

function disableNextButton() {
    nextButton.disabled = true;
    hideNextButton();
}

function showPrevButton() {
    prevButton.hidden = false;
    requestAnimationFrame(() => {
        prevButton.classList.add("show");
    });
}

function hidePrevButton() {
    prevButton.classList.remove("show");
    prevButton.hidden = true;
}


// =====================================================
// MUSIC CONTROL
// =====================================================

function updateMusicState(isPlaying) {
    recordScene.classList.toggle("music-paused", !isPlaying);

    musicToggle.textContent = isPlaying ? "♫ Music on" : "♫ Play music";
    musicToggle.setAttribute("aria-pressed", String(isPlaying));
    musicToggle.setAttribute("aria-label", isPlaying ? "Pause music" : "Play music");
}

welcomeAudio.addEventListener("play", () => updateMusicState(true));
welcomeAudio.addEventListener("pause", () => updateMusicState(false));
welcomeAudio.addEventListener("ended", () => updateMusicState(false));


// =====================================================
// WELCOME SCREEN: PROCEED
// =====================================================

proceedButton.addEventListener("click", async () => {
    if (welcomeHasStarted) {
        return;
    }

    welcomeHasStarted = true;
    proceedButton.disabled = true;

    // Start audio first, straight from the user's click
    welcomeAudio.volume = 0.4;

    try {
        await welcomeAudio.play();
    } catch (error) {
        console.warn("Music could not start:", error);
        updateMusicState(false);
    }

    welcomeScreen.classList.add("leaving");
    recordScene.classList.add("out", "docked");

    musicToggle.hidden = false;
    requestAnimationFrame(() => {
        musicToggle.classList.add("visible");
    });

    setTimeout(() => {
        welcomeScreen.classList.add("gone");
        welcomeScreen.setAttribute("aria-hidden", "true");
    }, WELCOME_DURATION);
});


// =====================================================
// MUSIC PLAY / PAUSE
// =====================================================

musicToggle.addEventListener("click", async () => {
    if (!welcomeAudio.paused) {
        welcomeAudio.pause();
        return;
    }

    try {
        await welcomeAudio.play();
    } catch (error) {
        console.warn("Music could not start:", error);
        updateMusicState(false);
    }
});


// =====================================================
// ENVELOPE: OPEN
// =====================================================

function openEnvelope() {
    if (envelopeOpened || invitationOpened) {
        return;
    }

    envelopeOpened = true;

    mail.classList.add("open");
    mail.setAttribute("aria-expanded", "true");
}

mail.addEventListener("click", openEnvelope);

mail.addEventListener("keydown", (event) => {
    if (event.target !== mail) {
        return;
    }

    if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        openEnvelope();
    }
});


// =====================================================
// ENVELOPE: SELECT THE PEEKING INVITATION
// =====================================================

insideCard.addEventListener("click", (event) => {
    event.stopPropagation();

    if (!envelopeOpened || invitationOpened) {
        return;
    }

    invitationOpened = true;

    mail.classList.add("card-selected");

    mail.setAttribute("aria-hidden", "true");
    mail.removeAttribute("tabindex");
    mail.removeAttribute("role");

    setTimeout(() => {
        mail.classList.add("hide");
    }, 100);

    if (isPhone()) {
        setTimeout(() => {
            invitationStage.classList.add("show");

            setTimeout(() => {
                invitationStage.classList.add("text-moved-up");

                setTimeout(() => {
                    invitationStage.classList.add("card-revealed");

                    setTimeout(() => {
                        showNextButton();
                    }, 800);
                }, 600);
            }, 1400);
        }, 450);
    } else {
        setTimeout(() => {
            invitationStage.classList.add("show");
            setTimeout(() => {
                showNextButton();
            }, 900);
        }, 450);
    }
});


// =====================================================
// DESKTOP: SET THE RIGHT-HAND PAGE
// A missing image (null) means the plain coloured last page
// =====================================================

function setDesktopRightPage(src) {
    const rightPage = rightPageImage.parentElement;

    // The message sits over the last page only
    rightPage.classList.toggle(
        "has-message",
        src === pageImages[pageImages.length - 1]
    );

    if (src) {
        rightPageImage.src = src;
        rightPageImage.alt = "Wedding invitation page";

        rightPageImage.style.visibility = "visible";
        rightPage.classList.remove("empty");
    } else {
        rightPageImage.removeAttribute("src");
        rightPageImage.alt = "";

        rightPageImage.style.visibility = "hidden";
        rightPage.classList.add("empty");
    }
}


// =====================================================
// DESKTOP: CHECK IF ANOTHER PAGE CAN TURN
// =====================================================

function canTurnNextPage() {
    return currentRightPageIndex + 1 < pageImages.length;
}


// =====================================================
// DESKTOP: UPDATE NAVIGATION
// =====================================================

function updateDesktopNav() {
    // On the last spread, Next stays visible and starts the finale
    const atEnd = bookletOpened && !canTurnNextPage();

    if (canTurnNextPage() || atEnd) {
        nextButton.disabled = false;
        showNextButton();
    } else {
        nextButton.disabled = true;
        hideNextButton();
    }

    if (bookletOpened) {
        showPrevButton();
    } else {
        hidePrevButton();
    }
}


// =====================================================
// MOBILE: NAVIGATION + FLIP
// =====================================================

function updateMobileNav() {
    // Next is always available: on the last page it starts the finale
    nextButton.disabled = false;
    showNextButton();

    if (mobilePageIndex > 0) {
        showPrevButton();
    } else {
        hidePrevButton();
    }
}

function turnMobilePage(direction = 1) {
    if (isAnimating) {
        return;
    }

    const nextIndex = mobilePageIndex + direction;

    if (nextIndex < 0 || nextIndex >= pageImages.length) {
        return;
    }

    isAnimating = true;
    disableNextButton();
    hidePrevButton();

    invitationStage.classList.add("mobile-card-active");

    if (direction === 1) {
        coverBackImage.src = pageImages[nextIndex];
        coverPage.classList.add("mobile-flipped");
    } else {
        coverFrontImage.src = pageImages[nextIndex];
        coverBackImage.src = pageImages[mobilePageIndex];

        coverPage.style.transition = "none";
        coverPage.classList.add("mobile-flipped");
        void coverPage.offsetWidth;
        coverPage.style.transition = "";

        coverPage.classList.remove("mobile-flipped");
    }

    setTimeout(() => {
        mobilePageIndex = nextIndex;

        coverFrontImage.src = pageImages[mobilePageIndex];

        coverPage.style.transition = "none";
        coverPage.classList.remove("mobile-flipped");
        void coverPage.offsetWidth;

        coverBackImage.src =
            pageImages[Math.min(mobilePageIndex + 1, pageImages.length - 1)];

        coverPage.style.transition = "";

        if (mobilePageIndex === 0) {
            invitationStage.classList.remove("mobile-card-active");
        }

        isAnimating = false;
        updateMobileNav();
    }, PHONE_TURN_DURATION);
}


// =====================================================
// DESKTOP: OPEN THE BOOKLET
// =====================================================

function openBooklet() {
    if (bookletOpened || isAnimating) {
        return;
    }

    isAnimating = true;
    bookletOpened = true;

    disableNextButton();
    hidePrevButton();
    invitationStage.classList.add("booklet-active");

    coverPage.classList.add("move-to-right");

    setTimeout(() => {
        booklet.classList.add("show");
        coverPage.classList.add("turning");
    }, MOVE_DURATION + 20);

    setTimeout(() => {
        coverPage.classList.add("finished");

        currentRightPageIndex = 2;
        isAnimating = false;

        updateDesktopNav();
    }, MOVE_DURATION + TURN_DURATION + 50);
}


// =====================================================
// DESKTOP: CLOSE THE BOOKLET
// =====================================================

function closeBooklet() {
    isAnimating = true;

    disableNextButton();
    hidePrevButton();

    coverPage.classList.remove("finished", "turning");
    coverPage.classList.add("returning");

    setTimeout(() => {
        booklet.classList.remove("show");

        coverPage.classList.remove("returning", "move-to-right");
        invitationStage.classList.remove("booklet-active");

        bookletOpened = false;
        currentRightPageIndex = 2;
        setDesktopRightPage(pageImages[2]);

        setTimeout(() => {
            isAnimating = false;
            nextButton.disabled = false;
            showNextButton();
        }, MOVE_DURATION);
    }, TURN_DURATION);
}


// =====================================================
// DESKTOP: CREATE A TURNING PAGE
// =====================================================

function createTurningPage(frontImage, backImage, zIndex) {
    const page = document.createElement("div");

    page.className = "turning-sheet";
    page.style.zIndex = String(zIndex);

    const front = document.createElement("div");
    front.className = "page-face page-front";

    const frontImg = document.createElement("img");
    frontImg.src = frontImage;
    frontImg.alt = "Front of invitation page";
    front.appendChild(frontImg);

    const back = document.createElement("div");
    back.className = "page-face page-back";

    const backImg = document.createElement("img");
    backImg.src = backImage;
    backImg.alt = "Reverse of invitation page";
    back.appendChild(backImg);

    page.appendChild(front);
    page.appendChild(back);

    invitationStage.appendChild(page);

    return page;
}


// =====================================================
// DESKTOP: TURN THE NEXT PAGE
// =====================================================

function turnNextPage() {
    if (isAnimating || !canTurnNextPage()) {
        return;
    }

    isAnimating = true;
    disableNextButton();
    hidePrevButton();

    const frontImage = pageImages[currentRightPageIndex];
    const backImage = pageImages[currentRightPageIndex + 1];

    // null means the plain coloured last page
    const followingRightImage = pageImages[currentRightPageIndex + 2] || null;

    const page = createTurningPage(frontImage, backImage, 31 + turnCount);

    setDesktopRightPage(followingRightImage);

    requestAnimationFrame(() => {
        requestAnimationFrame(() => {
            page.classList.add("turning");
        });
    });

    setTimeout(() => {
        page.classList.add("finished");

        page.style.zIndex = String(13 + turnCount);
        turnedSheets.push(page);

        currentRightPageIndex += 2;
        turnCount++;

        isAnimating = false;

        updateDesktopNav();
    }, TURN_DURATION);
}


// =====================================================
// DESKTOP: TURN BACK ONE PAGE
// =====================================================

function turnPreviousPage() {
    if (isAnimating || !bookletOpened) {
        return;
    }

    if (turnedSheets.length === 0) {
        closeBooklet();
        return;
    }

    isAnimating = true;
    disableNextButton();
    hidePrevButton();

    const sheet = turnedSheets.pop();
    turnCount--;

    sheet.classList.remove("finished");
    sheet.style.zIndex = "40";

    requestAnimationFrame(() => {
        requestAnimationFrame(() => {
            sheet.classList.remove("turning");
        });
    });

    setTimeout(() => {
        currentRightPageIndex -= 2;
        setDesktopRightPage(pageImages[currentRightPageIndex]);

        sheet.remove();

        isAnimating = false;
        updateDesktopNav();
    }, TURN_DURATION);
}


// =====================================================
// FINALE: CARD RE-CENTERS, MESSAGE FADES IN
// =====================================================

function later(fn, ms) {
    finaleTimers.push(setTimeout(fn, ms));
}

function clearFinaleTimers() {
    finaleTimers.forEach(clearTimeout);
    finaleTimers = [];
}

function startFinale() {
    if (finaleShown || isAnimating) {
        return;
    }

    finaleShown = true;
    isAnimating = true;

    disableNextButton();
    hidePrevButton();

    finale.setAttribute("aria-hidden", "false");
    finale.classList.add("show");

    later(() => finale.classList.add("show-words"), FINALE_WORDS_IN);
    later(() => finale.classList.remove("show-words"), FINALE_WORDS_OUT);
    later(() => finale.classList.add("show-text"), FINALE_TEXT_IN);

    later(() => {
        isAnimating = false;
        showPrevButton();
    }, FINALE_DONE);
}

function exitFinale() {
    clearFinaleTimers();

    isAnimating = true;
    hidePrevButton();

    finale.classList.remove("show", "show-words", "show-text");
    finale.setAttribute("aria-hidden", "true");

    later(() => {
        finaleShown = false;
        isAnimating = false;

        if (isPhone()) {
            updateMobileNav();
        } else {
            updateDesktopNav();
        }
    }, FINALE_FADE);
}


// =====================================================
// NEXT / PREVIOUS BUTTONS
// =====================================================

nextButton.addEventListener("click", () => {
    if (isAnimating || nextButton.disabled || finaleShown) {
        return;
    }

    if (isPhone()) {
        if (mobilePageIndex >= pageImages.length - 1) {
            startFinale();
        } else {
            turnMobilePage(1);
        }
        return;
    }

    if (!bookletOpened) {
        openBooklet();
        return;
    }

    if (!canTurnNextPage()) {
        startFinale();
        return;
    }

    turnNextPage();
});

prevButton.addEventListener("click", () => {
    if (isAnimating) {
        return;
    }

    if (finaleShown) {
        exitFinale();
        return;
    }

    if (isPhone()) {
        turnMobilePage(-1);
    } else {
        turnPreviousPage();
    }
});


// =====================================================
// INITIAL STATE
// =====================================================

hideNextButton();
hidePrevButton();
updateMusicState(false);